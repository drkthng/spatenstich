# Phase 20: Fundament, Aufräumen, PWA-Deploy — Context

**Gathered:** 2026-09-09 (abgeleitet aus `.planning/MASTERPLAN-v2.md` Kap. 2, 3.1, 4 → WP 20.1–20.4 und Kap. 5; keine separate Discuss-Runde, der User hat den Masterplan als Entscheidungsgrundlage bestätigt)
**Status:** Ready for planning

<domain>
## Phase Boundary

Repo sauber (Lint/CI grün, Legacy raus), installierbare PWA für Android-Chrome mit Web Share Target, automatischer Deploy nach Cloudflare Pages, Supabase-Keep-alive. Keine Sync-, Editor-, Navigations- oder Design-Änderungen (Phasen 21–24). Native Builds bleiben aus.

</domain>

<decisions>
## Implementation Decisions

### Distribution und Betrieb
- **D-01**: Distribution = PWA in Chrome auf beiden Android-Handys + Desktop-Browser. Kein nativer Build in v2.0.
- **D-02**: Hosting = Cloudflare Pages (Free, Direct Upload via `wrangler pages deploy` aus GitHub Actions) + Supabase Free mit Keep-alive-Cron (alle 3 Tage) und Task-Scheduler-Ping vom 24/7-PC.
- **D-15**: Ziel-Browser Chrome/Android. Keine iOS/Safari-spezifischen Metas oder Workarounds.
- **D-13**: SDK-Mix (expo 53.0.27 / RN 0.76.7 / React 18.3.1 / expo-router 4 / zwei SDK-55-Module) bleibt unangetastet; Web-Export funktioniert damit. Keine Dependency-Upgrades in dieser Phase außer den in Masterplan Anhang A genannten Entfernungen/Ergänzungen.

### Aufräumen (WP 20.2)
- **D-06**: Foto-Pipeline (`app/src/lib/photos/**`, Jest-Projekt `photos` in `app/jest.config.ts`), `captureStore`, `settingsStore` + GPS-Opt-in-Screen `settings/privacy.tsx` (Link entfernen; Neubau in Phase 24), `useFlag` + Supabase-Anbindung in `packages/shared/src/constants/flags.ts`, `expo-share-intent` (+ Provider in `(app)/_layout.tsx`, Plugin in `app.config.ts`) werden gelöscht. Dependencies raus: `@lodev09/react-native-exify`, `expo-image-manipulator`, `expo-image-picker`, `piexifjs`, `@types/piexifjs`, `expo-share-intent`, `jest-expo` (ungenutzt).
- **D-04 (User-Entscheidung 2026-09-09)**: Lokal-Modus bleibt vollständig im Code (`migrateLocalToAccount.ts`, `auth.ts`-Local-UUID, KV-Zweige, `mode === 'local'`-Verzweigungen). Einzige Änderung: Home-Buttons, die im Lokal-Modus eine Exception auslösen („Plan öffnen", „Importieren", „Kalender" in `(app)/index.tsx:183-224`), zeigen stattdessen den Hinweis `common.accountRequired` („Dafür brauchst du ein Konto").
- **D-05 (User-Entscheidung 2026-09-09)**: Vereinsregeln bleiben (Screens, Store, Repo, Hook, Tests). Nur Aufräumen: `profile/vereinsregeln/upload.tsx` (Stub mit ASCII-Umlauten) und die PDF-Karte in `profile/vereinsregeln/index.tsx:56-62` samt `rules.upload.*`-Keys und `VereinsregelSource 'pdf_extraction'` entfernen; `packages/shared/src/constants/flags.ts` wird zur Compile-Time-Konstante `FEATURES = { vereinsregeln: false }`; Banner in `profile/index.tsx`, Routen unter `profile/vereinsregeln/` und der Sync-Push für `vereinsregeln` werden hinter `FEATURES.vereinsregeln` gelegt (keine `22P02`-Outbox-Einträge mehr). Tests laufen mit Flag `true` im Test-Setup. Reparatur der IDs erst in WP 21.6.
- **Migration 020** (`supabase/migrations/20260910000020_cleanup_legacy.sql`, Skizze Masterplan Anhang C.1): drop `photo_queue`, `enqueue_photo_analysis()`, `feature_flags`; Buckets `photos`/`vereinsregeln` + Policies nur wenn `storage.objects` für sie leer ist; `profiles.plz/klimazone/archetype` droppen (vorher Migrationen auf Referenzen greppen, abhängige Funktionen neu definieren); `transfer_ownership` ohne die `created_by_user_id`-Überschreibung (Regression aus Migration 013:316-320) neu anlegen. Stale SQL-Tests unter `supabase/tests/` löschen/anpassen. Push nur nach 3-Gate-Protokoll (Masterplan Kap. 0.5) und erst nach bestätigtem Backup (manueller Schritt M5) — bis dahin Migration committen, nicht pushen; das ist ein `checkpoint:human-action`.

### CI und Repo-Hygiene (WP 20.1)
- `master` ist Basis; Arbeit auf Branch `gsd/phase-20-fundament-aufr-umen-pwa-deploy`, PR nur als Draft (`gh pr create --draft`).
- Lint grün durch ESLint-Overrides für `**/__tests__/**` und `**/__mocks__/**` (`react/display-name`, `import/first`, `@typescript-eslint/no-require-imports` off) plus echte Fixes im Quellcode: `import/no-duplicates` in `app/app/(app)/settings.tsx:14-15`; ungenutzte Importe in `SyncWorker.ts:14-24`, `plan/index.tsx:25`, `import/preview.tsx:17`, `SyncStatusBadge.tsx:7`, `WebPaletteBar.tsx:11`, `WebPlanEditor.tsx:12`, `IndexedDbAdapter.ts:16`; `react-hooks/exhaustive-deps` in `(app)/_layout.tsx:21`, `import/index.tsx:46`, `EditorCanvas.tsx:52` fachlich beheben (kein eslint-disable).
- Test-Rauschen: `create-garden-entrypoints.test.tsx:61-64` `useAuthStore`-Mock um `getState` ergänzen (Object.assign-Muster wie in `useKalenderData.test.ts`); Worker-Leak in `reconnect-*.integration.test.ts` mit `--detectOpenHandles` lokalisieren und Timer schließen.
- `ci.yml`: `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` aus GitHub-Vars (`vars.*`) als `env:` setzen. `eas-build.yml` auf `workflow_dispatch` umstellen.
- Doku: `CLAUDE.md`-Stack-Tabelle, `pnpm-workspace.yaml`-Kommentar und `README.md` auf Ist-Stack + „Web-first PWA, nativer Build deaktiviert bis Phase 29" korrigieren; README-Abschnitte „Installation auf dem Android-Handy (Chrome)", „Import aus der Claude-App per Teilen", „Claude-Projekt einrichten".

### PWA-Shell (WP 20.3)
- `app/public/manifest.json` mit `id`/`start_url`/`scope` = `/`, `display: standalone`, `lang: de`, `background_color #F6F1E7`, `theme_color #4A7C59`, Icons 192/512 `any`, 192/512 `maskable`, 512 `monochrome`, und `share_target` (`POST /share-target`, `multipart/form-data`, params `title`/`text`/`url`, `files: [{ name: "file", accept: ["application/json", ".json", "text/plain", ".txt"] }]`).
- Icons aus `app/assets/icon.svg` (Line-Art Spaten + Keimblatt, `erde #5B4636` auf `paper #F6F1E7`) per `scripts/gen-icons.mjs` mit `sharp` (devDependency) → `app/public/icons/*`; `app.config.ts`: `icon`, `web.favicon`, `splash.backgroundColor "#F6F1E7"`, `orientation "default"`, `userInterfaceStyle "light"`, `web.headers` entfernen, `expo-share-intent`-Plugin raus, `typedRoutes` behalten.
- HTML-Template `app/public/index.html` (`lang="de"`, viewport `viewport-fit=cover`, manifest-Link, theme-color, favicon, Basis-Style `overscroll-behavior: none; touch-action: manipulation`). **Verifikation nach `expo export`**: `dist/index.html` enthält die Tags; sonst Fallback `scripts/inject-html-head.mjs` im Build-Script — SUMMARY dokumentiert, welcher Weg griff.
- Service Worker handgeschrieben: `app/sw-src.js` (Workbox `precacheAndRoute(self.__WB_MANIFEST)`, `NavigationRoute` auf `/index.html` mit denylist `/_expo/` und `/share-target`, kein automatisches `skipWaiting`, Teilen-Handler für `POST /share-target` → Text/Datei in IndexedDB `spatenstich-share` / Store `inbox` / Key `latest` → `Response.redirect("/import?from=share", 303)`); `workbox-config.js` mit `injectManifest`; Script `build:web` = `expo export --platform web && node ../scripts/inject-html-head.mjs && workbox injectManifest workbox-config.js`. Registrierung in `app/app/_layout.tsx` nur bei `Platform.OS === "web" && "serviceWorker" in navigator && location.protocol === "https:"`; Update-Toast „Neue Version verfügbar · Neu laden" (postMessage `SKIP_WAITING` + reload), nie automatisch während `hasPendingSaves()`.
- App-Seite: `app/src/lib/shareInbox.ts` liest/leert die Inbox; `app/app/(app)/import/index.tsx` verarbeitet `?from=share` (Textfeld füllen, validieren, bei Erfolg direkt zur Vorschau); nicht angemeldet → Ziel-Route in `authStore.pendingRoute` merken, nach Login dorthin.
- `beforeinstallprompt` in `_layout.tsx` abfangen, Event im Store; Banner „Spatenstich als App installieren" (vorerst unter Settings; „Heute" kommt in Phase 23); ausblenden bei `display-mode: standalone`.
- Nach Login `navigator.storage.persist()`; `navigator.storage.estimate()` beim Start, Warn-Banner ab 80 %.
- `app/public/_headers`: `/index.html`, `/sw.js` → `Cache-Control: no-cache`; `/_expo/static/*` → immutable 1 Jahr; `/*` → `X-Content-Type-Options: nosniff`. Keine `404.html`.
- `app/src/lib/supabase.ts`: Web `detectSessionInUrl: true`.

### Deploy und Keep-alive (WP 20.4)
- `.github/workflows/deploy-web.yml`: push auf master + `workflow_dispatch`; pnpm install --frozen-lockfile → `pnpm --filter app run build:web` (env aus Vars/Secrets) → `bash scripts/check-claude-key-in-bundle.sh app/dist` → `cloudflare/wrangler-action@v3` `pages deploy app/dist --project-name spatenstich --branch main` (Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
- `.github/workflows/supabase-keepalive.yml`: cron `0 6 */3 * *` + `workflow_dispatch`, `curl -sf "$URL/rest/v1/plants?select=slug&limit=1"` mit apikey/Bearer = Anon-Key.
- `scripts/keepalive.ps1` (Task Scheduler) und `scripts/backup-supabase.ps1` (`pg_dump` mit 30-Tage-Rotation, Passwort aus Windows Credential Manager) — Masterplan Kap. 7.3/7.4.
- Manuelle Schritte M1–M3 (Cloudflare-Konto/Token, GitHub-Vars/Secrets, Supabase Site-URL) sind Voraussetzung für den ersten echten Deploy → `checkpoint:human-action` vor dem Deploy-Test, alles andere davor erledigen.

### Claude's Discretion
- Exakte Icon-Geometrie, Splash-Layout, Toast-Komponente für das SW-Update, Aufteilung der ESLint-Overrides, Reihenfolge der Lösch-Commits, Namen der Skripte unter `scripts/`.

</decisions>

<specifics>
## Specific Ideas

- Akzeptanzkriterien pro WP stehen wörtlich in `.planning/MASTERPLAN-v2.md` Kap. 4 (Phase 20) — Pläne müssen sie als `<acceptance_criteria>` / `must_haves` übernehmen.
- Verifikationskommandos: `pnpm -r run typecheck`, `pnpm -r run lint`, `pnpm --filter app exec jest --ci`, `pnpm --filter @spatenstich/shared exec jest --ci`, `pnpm --filter app run build:web`, `bash scripts/check-claude-key-in-bundle.sh app/dist`. Jest-Flags nie mit `--` weiterreichen (pnpm verschluckt es).
- Bundle-Ziel nach dem Aufräumen: < 5,2 MB (heute 6,2 MB inkl. ~500 KB Color-Picker-PNGs, die erst in Phase 22 fallen).
- Fallstrick: `react-native-svg/web` entfernt `onClick`; in dieser Phase keine neuen SVG-Click-Handler.
- Migration 020 wird in dieser Phase geschrieben und committet, aber nur gepusht, wenn der User M5 (Backup) bestätigt hat.

</specifics>

<deferred>
## Deferred Ideas

- Vereinsregeln-ID-Reparatur → WP 21.6. Sync-Semantik → Phase 21. Editor → Phase 22. Tabs/„Heute"/Install-Banner auf Heute → Phase 23. Datenschutz/Impressum-Screen → Phase 24. SDK-Upgrade → Phase 29.

</deferred>

---

*Phase: 20-fundament-aufr-umen-pwa-deploy*
*Context gathered: 2026-09-09 aus MASTERPLAN-v2.md (User-Entscheidungen D-01..D-15 vom 2026-09-08/09)*
