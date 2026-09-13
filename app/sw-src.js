// Handgeschriebener Service-Worker-Quellcode — Phase 20 Plan 03 Task 2 (DEPLOY-03).
// `workbox injectManifest` (siehe app/workbox-config.js) ersetzt den Precache-
// Manifest-Platzhalter unten durch das generierte Manifest und schreibt das
// Ergebnis nach dist/sw.js.
//
// Modul-Frage (RESEARCH Open Question 1) empirisch geklärt: `workbox
// injectManifest` bündelt/transpiliert `import`-Statements NICHT — es ist
// reine String-Ersetzung des Manifest-Platzhalters (verifiziert gegen
// node_modules/workbox-build/build/inject-manifest.js: "This method will not
// compile or bundle your swSrc file"). Ein mit ES-Modul-Syntax (import-
// Statements) geschriebener Worker wäre in jedem echten Browser ein
// SyntaxError, da klassische (nicht als `{type:'module'}` registrierte)
// Service Worker kein `import` unterstützen — und ein Modul-Worker könnte die
// bloßen Workbox-Paketnamen ohne Bundler ohnehin nicht auflösen.
// Lösung: klassischer Worker + `importScripts()` auf die von workbox-sw
// bereitgestellte Runtime, lokal gehostet (kein CDN-Aufruf, siehe
// scripts/copy-workbox-runtime.mjs — DSGVO/EU-Hosting, Offline-Start DEPLOY-07).
// workbox-sw lädt seine eigenen Abhängigkeiten (core, strategies, routing,
// precaching) beim ersten Zugriff auf `workbox.<modul>` rekursiv über
// importScripts nach — deshalb reicht der eine importScripts-Aufruf unten.
importScripts('/workbox-v7.4.1/workbox-sw.js');
workbox.setConfig({ modulePathPrefix: '/workbox-v7.4.1/' });

const { precacheAndRoute, createHandlerBoundToURL } = workbox.precaching;
const { registerRoute, NavigationRoute } = workbox.routing;

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/_expo\//, /^\/share-target/],
  })
);

// Kein automatisches skipWaiting: die neue Version aktiviert sich ausschliesslich
// nach der Nachricht SKIP_WAITING (siehe app/app/_layout.tsx Update-Controller).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Web Share Target (Phase 20 Plan 03 Task 3, DEPLOY-04) ──────────────────
// manifest.json share_target -> Chrome POSTet geteilte Inhalte (z.B. aus der
// Claude-App) hierher. Diese Konstanten sind der Vertrag mit
// app/src/lib/shareInbox.ts — dieselbe Datenbank/Store/Schluessel auf beiden
// Seiten. Der Worker verwendet die ROHE IndexedDB-API (kein `idb`-Import;
// dieser Quellcode wird nicht durch Metro gebuendelt, siehe Kommentar oben).
const SHARE_DB_NAME = 'spatenstich-share';
const SHARE_STORE_NAME = 'inbox';
const SHARE_KEY = 'latest';
const SHARE_DB_VERSION = 1;

function putShareInboxEntry(entry) {
  return new Promise((resolve, reject) => {
    const openReq = indexedDB.open(SHARE_DB_NAME, SHARE_DB_VERSION);
    openReq.onupgradeneeded = () => {
      const db = openReq.result;
      if (!db.objectStoreNames.contains(SHARE_STORE_NAME)) {
        db.createObjectStore(SHARE_STORE_NAME);
      }
    };
    openReq.onsuccess = () => {
      const db = openReq.result;
      const tx = db.transaction(SHARE_STORE_NAME, 'readwrite');
      tx.objectStore(SHARE_STORE_NAME).put(entry, SHARE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    openReq.onerror = () => reject(openReq.error);
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') {
    return; // alle anderen Anfragen unveraendert durchlassen
  }
  event.respondWith(
    (async () => {
      const formData = await event.request.formData();
      const file = formData.get('file');
      const text =
        file && typeof file.text === 'function'
          ? await file.text()
          : String(formData.get('text') || '');
      await putShareInboxEntry({ text, receivedAt: Date.now() });
      return Response.redirect('/import?from=share', 303);
    })()
  );
});
