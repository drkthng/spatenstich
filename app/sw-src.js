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

// Fundament dieser Scheibe: Precache + Navigation-Route + SKIP_WAITING-Message-
// Listener. Der Teilen-Handler (POST /share-target) kommt in Task 3 dazu — die
// Navigation-Route nimmt /share-target hier bereits aus der denylist aus, damit
// Task 3 den Pfad ohne Aenderung an dieser Route ergaenzen kann.
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
