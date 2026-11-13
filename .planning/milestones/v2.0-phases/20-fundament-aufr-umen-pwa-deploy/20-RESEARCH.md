# Phase 20: Fundament, Aufräumen, PWA-Deploy - Research

**Researched:** 2026-09-09
**Domain:** Expo SDK 53 web export (PWA), hand-written Workbox service worker, Web Share Target, Cloudflare Pages CI/CD, Supabase migration cleanup, ESLint 9 flat config, Jest cleanup
**Confidence:** MEDIUM-HIGH (core Expo/Supabase claims verified against installed source; Workbox/Web-Share-Target/Cloudflare-Action claims are CITED against official docs found this session, not independently executed)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Distribution und Betrieb**
- D-01: Distribution = PWA in Chrome auf beiden Android-Handys + Desktop-Browser. Kein nativer Build in v2.0.
- D-02: Hosting = Cloudflare Pages (Free, Direct Upload via `wrangler pages deploy` aus GitHub Actions) + Supabase Free mit Keep-alive-Cron (alle 3 Tage) und Task-Scheduler-Ping vom 24/7-PC.
- D-15: Ziel-Browser Chrome/Android. Keine iOS/Safari-spezifischen Metas oder Workarounds.
- D-13: SDK-Mix (expo 53.0.27 / RN 0.76.7 / React 18.3.1 / expo-router 4 / zwei SDK-55-Module) bleibt unangetastet; Web-Export funktioniert damit. Keine Dependency-Upgrades in dieser Phase außer den in Masterplan Anhang A genannten Entfernungen/Ergänzungen.

**Aufräumen (WP 20.2)**
- D-06: Foto-Pipeline (`app/src/lib/photos/**`, Jest-Projekt `photos` in `app/jest.config.ts`), `captureStore`, `settingsStore` + GPS-Opt-in-Screen `settings/privacy.tsx` (Link entfernen; Neubau in Phase 24), `useFlag` + Supabase-Anbindung in `packages/shared/src/constants/flags.ts`, `expo-share-intent` (+ Provider in `(app)/_layout.tsx`, Plugin in `app.config.ts`) werden gelöscht. Dependencies raus: `@lodev09/react-native-exify`, `expo-image-manipulator`, `expo-image-picker`, `piexifjs`, `@types/piexifjs`, `expo-share-intent`, `jest-expo` (ungenutzt).
- D-04 (User-Entscheidung 2026-09-09): Lokal-Modus bleibt vollständig im Code (`migrateLocalToAccount.ts`, `auth.ts`-Local-UUID, KV-Zweige, `mode === 'local'`-Verzweigungen). Einzige Änderung: Home-Buttons, die im Lokal-Modus eine Exception auslösen ("Plan öffnen", "Importieren", "Kalender" in `(app)/index.tsx:183-224`), zeigen stattdessen den Hinweis `common.accountRequired` ("Dafür brauchst du ein Konto").
- D-05 (User-Entscheidung 2026-09-09): Vereinsregeln bleiben (Screens, Store, Repo, Hook, Tests). Nur Aufräumen: `profile/vereinsregeln/upload.tsx` (Stub mit ASCII-Umlauten) und die PDF-Karte in `profile/vereinsregeln/index.tsx:56-62` samt `rules.upload.*`-Keys und `VereinsregelSource 'pdf_extraction'` entfernen; `packages/shared/src/constants/flags.ts` wird zur Compile-Time-Konstante `FEATURES = { vereinsregeln: false }`; Banner in `profile/index.tsx`, Routen unter `profile/vereinsregeln/` und der Sync-Push für `vereinsregeln` werden hinter `FEATURES.vereinsregeln` gelegt (keine `22P02`-Outbox-Einträge mehr). Tests laufen mit Flag `true` im Test-Setup. Reparatur der IDs erst in WP 21.6.
- Migration 020 (`supabase/migrations/20260910000020_cleanup_legacy.sql`, Skizze Masterplan Anhang C.1): drop `photo_queue`, `enqueue_photo_analysis()`, `feature_flags`; Buckets `photos`/`vereinsregeln` + Policies nur wenn `storage.objects` für sie leer ist; `profiles.plz/klimazone/archetype` droppen (vorher Migrationen auf Referenzen greppen, abhängige Funktionen neu definieren); `transfer_ownership` ohne die `created_by_user_id`-Überschreibung (Regression aus Migration 013:316-320) neu anlegen. Stale SQL-Tests unter `supabase/tests/` löschen/anpassen. Push nur nach 3-Gate-Protokoll (Masterplan Kap. 0.5) und erst nach bestätigtem Backup (manueller Schritt M5) — bis dahin Migration committen, nicht pushen; das ist ein `checkpoint:human-action`.

**CI und Repo-Hygiene (WP 20.1)**
- `master` ist Basis; Arbeit auf Branch `gsd/phase-20-fundament-aufr-umen-pwa-deploy`, PR nur als Draft (`gh pr create --draft`).
- Lint grün durch ESLint-Overrides für `**/__tests__/**` und `**/__mocks__/**` (`react/display-name`, `import/first`, `@typescript-eslint/no-require-imports` off) plus echte Fixes im Quellcode: `import/no-duplicates` in `app/app/(app)/settings.tsx:14-15`; ungenutzte Importe in `SyncWorker.ts:14-24`, `plan/index.tsx:25`, `import/preview.tsx:17`, `SyncStatusBadge.tsx:7`, `WebPaletteBar.tsx:11`, `WebPlanEditor.tsx:12`, `IndexedDbAdapter.ts:16`; `react-hooks/exhaustive-deps` in `(app)/_layout.tsx:21`, `import/index.tsx:46`, `EditorCanvas.tsx:52` fachlich beheben (kein eslint-disable).
- Test-Rauschen: `create-garden-entrypoints.test.tsx:61-64` `useAuthStore`-Mock um `getState` ergänzen (Object.assign-Muster wie in `useKalenderData.test.ts`); Worker-Leak in `reconnect-*.integration.test.ts` mit `--detectOpenHandles` lokalisieren und Timer schließen.
- `ci.yml`: `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` aus GitHub-Vars (`vars.*`) als `env:` setzen. `eas-build.yml` auf `workflow_dispatch` umstellen.
- Doku: `CLAUDE.md`-Stack-Tabelle, `pnpm-workspace.yaml`-Kommentar und `README.md` auf Ist-Stack + "Web-first PWA, nativer Build deaktiviert bis Phase 29" korrigieren; README-Abschnitte "Installation auf dem Android-Handy (Chrome)", "Import aus der Claude-App per Teilen", "Claude-Projekt einrichten".

**PWA-Shell (WP 20.3)**
- `app/public/manifest.json` mit `id`/`start_url`/`scope` = `/`, `display: standalone`, `lang: de`, `background_color #F6F1E7`, `theme_color #4A7C59`, Icons 192/512 `any`, 192/512 `maskable`, 512 `monochrome`, und `share_target` (`POST /share-target`, `multipart/form-data`, params `title`/`text`/`url`, `files: [{ name: "file", accept: ["application/json", ".json", "text/plain", ".txt"] }]`).
- Icons aus `app/assets/icon.svg` (Line-Art Spaten + Keimblatt, `erde #5B4636` auf `paper #F6F1E7`) per `scripts/gen-icons.mjs` mit `sharp` (devDependency) → `app/public/icons/*`; `app.config.ts`: `icon`, `web.favicon`, `splash.backgroundColor "#F6F1E7"`, `orientation "default"`, `userInterfaceStyle "light"`, `web.headers` entfernen, `expo-share-intent`-Plugin raus, `typedRoutes` behalten.
- HTML-Template `app/public/index.html` (`lang="de"`, viewport `viewport-fit=cover`, manifest-Link, theme-color, favicon, Basis-Style `overscroll-behavior: none; touch-action: manipulation`). **Verifikation nach `expo export`**: `dist/index.html` enthält die Tags; sonst Fallback `scripts/inject-html-head.mjs` im Build-Script — SUMMARY dokumentiert, welcher Weg griff.
- Service Worker handgeschrieben: `app/sw-src.js` (Workbox `precacheAndRoute(self.__WB_MANIFEST)`, `NavigationRoute` auf `/index.html` mit denylist `/_expo/` und `/share-target`, kein automatisches `skipWaiting`, Teilen-Handler für `POST /share-target` → Text/Datei in IndexedDB `spatenstich-share` / Store `inbox` / Key `latest` → `Response.redirect("/import?from=share", 303)`); `workbox-config.js` mit `injectManifest`; Script `build:web` = `expo export --platform web && node ../scripts/inject-html-head.mjs && workbox injectManifest workbox-config.js`. Registrierung in `app/app/_layout.tsx` nur bei `Platform.OS === "web" && "serviceWorker" in navigator && location.protocol === "https:"`; Update-Toast "Neue Version verfügbar · Neu laden" (postMessage `SKIP_WAITING` + reload), nie automatisch während `hasPendingSaves()`.
- App-Seite: `app/src/lib/shareInbox.ts` liest/leert die Inbox; `app/app/(app)/import/index.tsx` verarbeitet `?from=share` (Textfeld füllen, validieren, bei Erfolg direkt zur Vorschau); nicht angemeldet → Ziel-Route in `authStore.pendingRoute` merken, nach Login dorthin.
- `beforeinstallprompt` in `_layout.tsx` abfangen, Event im Store; Banner "Spatenstich als App installieren" (vorerst unter Settings; "Heute" kommt in Phase 23); ausblenden bei `display-mode: standalone`.
- Nach Login `navigator.storage.persist()`; `navigator.storage.estimate()` beim Start, Warn-Banner ab 80 %.
- `app/public/_headers`: `/index.html`, `/sw.js` → `Cache-Control: no-cache`; `/_expo/static/*` → immutable 1 Jahr; `/*` → `X-Content-Type-Options: nosniff`. Keine `404.html`.
- `app/src/lib/supabase.ts`: Web `detectSessionInUrl: true`.

**Deploy und Keep-alive (WP 20.4)**
- `.github/workflows/deploy-web.yml`: push auf master + `workflow_dispatch`; pnpm install --frozen-lockfile → `pnpm --filter app run build:web` (env aus Vars/Secrets) → `bash scripts/check-claude-key-in-bundle.sh app/dist` → `cloudflare/wrangler-action@v3` `pages deploy app/dist --project-name spatenstich --branch main` (Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
- `.github/workflows/supabase-keepalive.yml`: cron `0 6 */3 * *` + `workflow_dispatch`, `curl -sf "$URL/rest/v1/plants?select=slug&limit=1"` mit apikey/Bearer = Anon-Key.
- `scripts/keepalive.ps1` (Task Scheduler) und `scripts/backup-supabase.ps1` (`pg_dump` mit 30-Tage-Rotation, Passwort aus Windows Credential Manager) — Masterplan Kap. 7.3/7.4.
- Manuelle Schritte M1–M3 (Cloudflare-Konto/Token, GitHub-Vars/Secrets, Supabase Site-URL) sind Voraussetzung für den ersten echten Deploy → `checkpoint:human-action` vor dem Deploy-Test, alles andere davor erledigen.

### Claude's Discretion
- Exakte Icon-Geometrie, Splash-Layout, Toast-Komponente für das SW-Update, Aufteilung der ESLint-Overrides, Reihenfolge der Lösch-Commits, Namen der Skripte unter `scripts/`.

### Deferred Ideas (OUT OF SCOPE)
- Vereinsregeln-ID-Reparatur → WP 21.6. Sync-Semantik → Phase 21. Editor → Phase 22. Tabs/„Heute"/Install-Banner auf Heute → Phase 23. Datenschutz/Impressum-Screen → Phase 24. SDK-Upgrade → Phase 29.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | `pnpm -r run lint` exit 0; CI setzt EXPO_PUBLIC_* vars, grün auf PRs; Test-Rauschen weg; CLAUDE.md/README korrigiert | ESLint 9 flat-config override pattern (Code Examples); Jest `--detectOpenHandles` procedure (Pitfalls); verified `ci.yml`/`eslint.config.js` current state below |
| DEPLOY-02 | Foto-Pipeline + captureStore + GPS-Opt-in + useFlag + expo-share-intent + 5 deps entfernt; Vereinsregeln hinter FEATURES.vereinsregeln; Lokal-Modus crashfrei; Migration 020 live | Verified: no client code reads `profiles.plz/klimazone/archetype` (Runtime State Inventory); exact regression lines in migration 013; Anhang A delete inventory cross-checked against installed package.json |
| DEPLOY-03 | manifest.json installable, HTML-Template lang=de, Workbox SW mit Update-Toast, `_headers`, Lighthouse installable grün | Verified: `app/public/index.html` **is** honored as the export HTML template by @expo/cli 0.24.24 (Code Examples §1) — no fallback script needed in practice, though CONTEXT still requires writing one |
| DEPLOY-04 | Web Share Target: Teilen öffnet Import-Vorschau; Install-Prompt-Banner; storage.persist() nach Login | CITED: web.dev/Chrome docs on Web Share Target + Workbox share-target pattern; verified `import/index.tsx` already has the `useLocalSearchParams` + validate pattern to extend |
| DEPLOY-05 | `deploy-web.yml` deployt master nach Cloudflare Pages < 10 min inkl. Secret-Scan; `eas-build.yml` nur `workflow_dispatch` | CITED: cloudflare/wrangler-action usage pattern (Code Examples §6); verified current `ci.yml`/`eas-build.yml` content |
| DEPLOY-06 | Supabase-Keep-alive Cron + Task-Scheduler-Skript; Backup-Skript | ASSUMED (pg_dump/Task Scheduler patterns, not independently executed this session) |
| DEPLOY-07 | Zweiter Start im Flugmodus zeigt App-Shell mit letztem Plan | Depends on DEPLOY-03 SW precaching + existing IndexedDB-based local persistence (`IndexedDbAdapter.ts`, verified present) |
</phase_requirements>

## Summary

Phase 20 is a repo-hygiene + PWA-shell + deploy phase with no new business logic. The three riskiest unknowns going in — (1) whether `app/public/index.html` is actually honored by the SDK 53 web export, (2) whether dropping `profiles.plz/klimazone/archetype` breaks any live code path, and (3) exactly where the `transfer_ownership` regression lives — are now resolved with direct source verification.

**(1) is confirmed positive**: `node_modules/@expo/cli` (0.24.24, the version this project's `expo ~53.0.0`/`expo-router ~4.0.0` combination resolves) reads `app/public/index.html` via `getTemplateIndexHtmlAsync` before falling back to its bundled template, and substitutes `%LANG_ISO_CODE%`/`%WEB_TITLE%` placeholders plus injects `theme-color`/`description` `<meta>` tags from `exp.web.themeColor`/`exp.web.description` — no post-export patch script is structurally required. The CONTEXT.md decision to also write a fallback (`inject-html-head.mjs`) and verify which path "won" should still be honored (it is a locked decision and costs little), but the planner can treat the primary template path as low-risk, not speculative.

**(2) is confirmed safe**: every client read/write of `plz`/`klimazone`/`archetype` in `app/src` targets the `gardens` table (`GardenRow`/`DbGardenRow` in `rowMappers.ts`, `SyncWorker.ts:pushGarden`), never `profiles`. The only references to `profiles.plz/klimazone/archetype` anywhere in the repo are inside three migration files, and two of those are historical comments/a one-time backfill `INSERT ... SELECT p.plz FROM profiles p` (already executed against the live DB when that migration was applied). Migration 020 can drop the three `profiles` columns without touching any function used at runtime.

**(3) is confirmed with exact line numbers**: `supabase/migrations/20260424000013_offline_sync_infrastructure.sql:317-319` re-introduces `SET created_by_user_id = p_to_user_id` inside `transfer_ownership`, which is exactly the regression `20260423000009_transfer_ownership_audit_invariant.sql` had already removed once at migration 009. Migration 020 must reproduce the migration-009 body (no `created_by_user_id` write) while keeping the migration-013 `updated_at = now()` LWW-guard fix.

The PWA/Workbox/Web-Share-Target/Cloudflare pieces (WP 20.3/20.4) rest on well-documented, stable public APIs; this session's WebSearch calls against `developer.chrome.com`, `web.dev`, and the `cloudflare/wrangler-action` GitHub repo confirm the shapes sketched in the masterplan are current and correct, tagged CITED below. `sharp`, `workbox-cli` are new devDependencies not yet installed — registry existence was confirmed via `npm view` this session, but per the package-name provenance rule they remain `[ASSUMED]` (names came from the masterplan/training, not from an official doc fetched this session) — flag with a `checkpoint:human-verify` before `pnpm add -D` per protocol.

**Primary recommendation:** Sequence WP 20.1 → 20.2 → 20.3 → 20.4 exactly as the masterplan orders them (each WP's acceptance criteria assume the previous WP's state). Treat Migration 020 as commit-only (never push) until the user confirms M5 backup — this is the single hard `checkpoint:human-action` in the phase. Do not attempt to make the Workbox/`build:web` pipeline "self-healing" beyond the documented `inject-html-head.mjs` fallback; keep the SW hand-written per the locked decision (Workbox's `generateSW` mode cannot express the custom `/share-target` fetch handler).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Lint/type/test gate | CI (GitHub Actions) | — | `ci.yml` runs on PR; no runtime tier involved |
| Dead code removal | Browser/Client (app source) | Database/Storage (migration 020) | Client code deleted; server-side legacy objects dropped via SQL |
| PWA manifest + icons | CDN/Static (`app/public/*`) | Browser/Client (registration) | Static files served by Cloudflare Pages; browser reads manifest to decide installability |
| Service worker (precache + share-target) | Browser/Client (SW runs in browser, off main thread) | CDN/Static (SW file itself is a static asset) | SW intercepts fetches client-side; its source is a build artifact deployed statically |
| Web Share Target inbox | Browser/Client (SW writes IndexedDB) | — | No server round-trip; entirely client-local until the app reads the inbox |
| Install prompt / storage persistence | Browser/Client | — | `beforeinstallprompt`, `navigator.storage.persist()` are browser APIs only |
| Deploy pipeline | CDN/Static (Cloudflare Pages) | CI (GitHub Actions triggers it) | Actions builds and uploads; Cloudflare serves |
| Supabase keep-alive | API/Backend (Supabase REST) | CI (GitHub Actions cron) + OS (Task Scheduler) | Two independent triggers hit the same backend endpoint |
| Migration 020 cleanup | Database/Storage (Postgres + Storage buckets) | — | Pure schema/data operation, no app-tier code |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | ~53.0.0 (installed 53.0.27) | Web export toolchain (`expo export --platform web`) | Already pinned; D-13 forbids upgrading. `[VERIFIED: app/package.json]` |
| `expo-router` | ~4.0.0 | File-based routing incl. web SSG scaffolding, `useLocalSearchParams` | Already in use for the `?fileUri=` share-intent path that `?from=share` extends. `[VERIFIED: app/app/(app)/import/index.tsx:9-24]` |
| `workbox-cli` | 7.4.1 | `workbox injectManifest workbox-config.js` — bundles the hand-written `sw-src.js` with a generated precache manifest | Standard Workbox toolchain for "I need a custom fetch handler" cases (`generateSW` can't do it). `[ASSUMED — name from masterplan/training; registry existence checked via npm view this session, version 7.4.1 confirmed `npm view workbox-cli version`]` |
| `sharp` | 0.35.4 | Node-side SVG → PNG icon generation script (`scripts/gen-icons.mjs`) | De-facto standard for programmatic raster generation from SVG in Node; avoids hand-exporting icons in a GUI. `[ASSUMED — name from masterplan/training; version 0.35.4 confirmed via npm view this session]` |
| `cloudflare/wrangler-action` | v3 pinned per CONTEXT.md (v4 is current upstream) | GitHub Action step wrapping `wrangler pages deploy` | Official Cloudflare-maintained action; `command:` input accepts arbitrary wrangler subcommands. `[CITED: github.com/cloudflare/wrangler-action — README example uses `command: pages deploy <dir> --project-name=x` with `apiToken`/`accountId` inputs]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `workbox-precaching`, `workbox-routing` | bundled transitively by `workbox-cli`'s `injectManifest` (resolves `self.__WB_MANIFEST` at build time; the runtime imports in `sw-src.js` are resolved by Workbox's own bundler, not by the project's Metro/webpack) | `precacheAndRoute(self.__WB_MANIFEST)`, `registerRoute(new NavigationRoute(...))` in `sw-src.js` | Only inside the SW source file — never imported into app/client bundle |
| ESLint 9 flat config `eslint-config-expo/flat` | ~9.2.0 (installed) | Base ruleset; per-glob `files:` block objects add overrides | Already the project's linter — no new dependency needed for WP 20.1 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written `sw-src.js` + `workbox injectManifest` | Workbox `generateSW` (zero-config, no custom source file) | `generateSW` cannot express the custom `/share-target` POST fetch handler the phase requires — locked decision correctly picks `injectManifest`. |
| `sharp` for icon generation | `expo-updates`/EAS-hosted asset generation, or manual export from a design tool | `sharp` is scriptable/reproducible in CI-less local dev; manual export is fine for a one-person project but not repeatable if the SVG changes. |
| `cloudflare/wrangler-action` | Cloudflare's own `pages-action` (deprecated per its README: "please use wrangler-action") | `pages-action` is explicitly deprecated upstream; do not use it. `[CITED: github.com/cloudflare/pages-action README]` |

**Installation:**
```bash
pnpm --filter app add -D sharp workbox-cli
```
No other new runtime dependencies. Removed dependencies (D-06): `@lodev09/react-native-exify`, `expo-image-manipulator`, `expo-image-picker`, `piexifjs`, `@types/piexifjs`, `expo-share-intent`, `jest-expo`, plus (per Anhang A, scoped to WP 22.4 not WP 20.2) `@shopify/react-native-skia`, `reanimated-color-picker`, `@react-native-community/datetimepicker` — **do not remove these three in Phase 20**, they belong to Phase 22 per Anhang A's own annotation.

**Version verification:** `npm view sharp version` → `0.35.4`; `npm view workbox-cli version` → `7.4.1`; `npm view wrangler version` → `4.130.0` (confirms the `wrangler` CLI the action wraps is current; the action itself is versioned separately as `cloudflare/wrangler-action@v3`/`@v4` on GitHub, not npm). All three checked live against the registry this session (2026-09-09).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `sharp` | npm | 10+ yrs (well-established), `0.35.4` current | very high (tens of millions/wk) | github.com/lovell/sharp | Not run through automated `package-legitimacy check` seam this session (tool budget) — treated as `[ASSUMED]` per provenance rule despite registry confirmation | Keep — planner adds `checkpoint:human-verify` before `pnpm add -D sharp` per protocol default for unverified packages |
| `workbox-cli` | npm | 7+ yrs, `7.4.1` current, part of GoogleChrome/workbox monorepo | high (widely used PWA tooling) | github.com/GoogleChrome/workbox | Same as above — `[ASSUMED]`, not run through the automated seam | Keep — planner adds `checkpoint:human-verify` before `pnpm add -D workbox-cli` |

**Packages removed due to [SLOP] verdict:** none (no seam run; no evidence of slopsquatting risk — both are long-established, high-download, well-known packages with obvious canonical GitHub repos matching their npm names).
**Packages flagged as suspicious [SUS]:** none identified, but both new devDependencies are unverified by the automated seam this session and should get a lightweight `checkpoint:human-verify` (e.g., "confirm `sharp`/`workbox-cli` on npmjs.com match `lovell/sharp` and `GoogleChrome/workbox`") before install, per the package-name-provenance rule — this is a process gate, not a red flag on the packages themselves.

*No other new external packages are introduced in Phase 20. All work packages remove dependencies (Anhang A) rather than add them, except the two devDependencies above.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ GitHub (repo)                                                           │
│                                                                          │
│  PR → ci.yml ──► typecheck/lint/test/export/secret-scan (gate)         │
│                                                                          │
│  push master → deploy-web.yml                                          │
│    1. pnpm install --frozen-lockfile                                   │
│    2. pnpm --filter app run build:web                                  │
│         expo export --platform web        (Metro bundles + templates   │
│                                              app/public/index.html)     │
│      → node inject-html-head.mjs           (fallback only, verified    │
│                                              usually a no-op)           │
│      → workbox injectManifest              (writes dist/sw.js,         │
│                                              precache manifest from     │
│                                              sw-src.js + dist/**)       │
│    3. check-claude-key-in-bundle.sh app/dist   (secret-scan gate)      │
│    4. cloudflare/wrangler-action@v3 → wrangler pages deploy app/dist   │
│                                                                          │
│  cron (*/3 days) → supabase-keepalive.yml → curl REST /plants          │
└──────────────────────┬───────────────────────────────────────────────┘
                        │ deployed static assets
                        ▼
        ┌───────────────────────────────┐
        │ Cloudflare Pages               │   _headers: no-cache HTML/SW,
        │ spatenstich.pages.dev          │   immutable _expo/static, SPA
        │  index.html · manifest.json    │   fallback (no 404.html)
        │  icons/* · sw.js · _expo/**    │
        └───────────────┬────────────────┘
                         │ HTTPS GET (browser)
                         ▼
        ┌────────────────────────────────────────────────────────┐
        │ Android Chrome / Desktop Chrome (installed PWA)         │
        │                                                          │
        │  Service Worker (sw.js)                                 │
        │   - precacheAndRoute(WB_MANIFEST)                       │
        │   - NavigationRoute → /index.html (denylist _expo, share-target) │
        │   - fetch POST /share-target → formData → IndexedDB     │
        │     'spatenstich-share'.inbox.latest → redirect 303     │
        │     to /import?from=share                                │
        │                                                          │
        │  App shell (Expo Router)                                 │
        │   _layout.tsx: SW registration, update-toast,           │
        │     beforeinstallprompt capture, storage.persist()      │
        │   (app)/import/index.tsx: reads ?from=share via          │
        │     shareInbox.ts → validates → preview                 │
        └───────────────────────┬──────────────────────────────────┘
                                 │ REST/Realtime (existing, unchanged)
                                 ▼
                    Supabase (Frankfurt) — kept warm by cron + Task Scheduler
```

**Share flow (WP 20.3/20.4 focal path):** Claude-App "Teilen" → Android share sheet lists "Spatenstich" (from `manifest.json` `share_target`) → OS POSTs to `https://spatenstich.pages.dev/share-target` as `multipart/form-data` → **this request is intercepted by the already-installed service worker** (no network round-trip needed since `/share-target` is same-origin and the SW's fetch handler answers directly) → SW writes the shared text/file into IndexedDB → 303 redirect to `/import?from=share` → app boots (or is already running), `import/index.tsx` reads and clears the inbox, validates, jumps to preview.

### Recommended Project Structure
```
app/
├── public/
│   ├── index.html          # HTML template — HONORED by @expo/cli export (see Code Examples §1)
│   ├── manifest.json        # share_target, icons, standalone
│   ├── icons/                # generated by scripts/gen-icons.mjs
│   └── _headers              # Cloudflare Pages cache-control rules
├── sw-src.js                # hand-written Workbox source (precache + share-target fetch handler)
├── workbox-config.js         # injectManifest config (globDirectory: 'dist', swSrc, swDest)
├── src/lib/shareInbox.ts     # reads/clears the IndexedDB 'spatenstich-share' inbox from the app side
└── app/(app)/import/index.tsx  # extended to also read ?from=share
scripts/
├── gen-icons.mjs             # sharp-based SVG → PNG icon set
├── inject-html-head.mjs      # fallback post-export HTML patch (verified likely unused, kept per CONTEXT)
├── keepalive.ps1             # Task Scheduler REST ping
└── backup-supabase.ps1        # pg_dump + rotation
.github/workflows/
├── ci.yml                    # unchanged trigger, env vars added
├── deploy-web.yml            # new
├── supabase-keepalive.yml    # new
└── eas-build.yml              # trigger changed to workflow_dispatch only
```

### Pattern 1: HTML template injection via `app/public/index.html`
**What:** Placing an `index.html` in the Expo `public/` folder causes the web export to use it as the base template instead of the bundled default.
**When to use:** Whenever you need custom `<head>` tags (manifest link, theme-color, viewport, base styles) in the exported SPA shell.
**Example:**
```js
// Source: node_modules/@expo/cli/build/src/start/server/webTemplate.js (verified this session,
// @expo/cli 0.24.24, resolved by expo ~53.0.0 / expo-router ~4.0.0)
async function getTemplateIndexHtmlAsync(projectRoot) {
  let filePath = getFileFromLocalPublicFolder(projectRoot, {
    publicFolder: env.EXPO_PUBLIC_FOLDER,   // defaults to 'public'
    filePath: 'index.html',
  });
  if (!filePath) {
    filePath = TEMPLATES.find((value) => value.id === 'index.html').file(projectRoot);
  }
  return fs.promises.readFile(filePath, 'utf8');
}
// createTemplateHtmlAsync then does:
//   contents.replace('%LANG_ISO_CODE%', langIsoCode)   // langIsoCode = exp.web?.lang ?? 'en'
//   contents.replace('%WEB_TITLE%', title)
//   addMeta(contents, `name="theme-color" content="${themeColor}"`)  // if exp.web.themeColor set
//   addMeta(contents, `name="description" content="${description}"`) // if exp.web.description set
// (addMeta does contents.replace('</head>', `<meta ${meta}>\n</head>`))
```
**Implication for the plan:** `app/public/index.html` MUST contain the literal strings `%LANG_ISO_CODE%` and `%WEB_TITLE%` if the placeholder-substitution behavior is wanted (or hardcode `lang="de"` directly and skip the placeholder — CONTEXT.md's requirement is `lang="de"` literally, so hardcoding is safe and simpler than relying on `exp.web.lang`). The manifest `<link>`, extra favicon `<link>`, and base `<style>` block should be written directly into the template since there's no config-driven injection point for those. Setting `web.themeColor` and `web.description` in `app.config.ts` is optional (redundant with a hand-written `<meta theme-color>` in the template) but harmless. **`app/public/index.html` does not currently exist** (`[VERIFIED: ls app/public — directory absent entirely; only app/dist/index.html from a prior export exists today]`) — the template file has to be created from scratch, not edited from a prior version. Favicon injection is separately handled by `getVirtualFaviconAssetsAsync` keyed off `app.config.ts` `icon`/`web.favicon` — confirm this doesn't double-inject if the template also has a manual favicon `<link>` (harmless duplicate at worst; not independently verified this session — `[ASSUMED]`, low risk).

### Pattern 2: Workbox `injectManifest` for a custom-fetch-handler service worker
**What:** `workbox-build`'s `injectManifest` mode takes a hand-written SW source file, replaces `self.__WB_MANIFEST` with a generated precache list, and writes the result to `swDest`.
**When to use:** Whenever the SW needs custom logic beyond precaching+routing (here: the `/share-target` POST handler) — `generateSW` mode cannot express this.
**Example:**
```js
// Source: developer.chrome.com/docs/workbox/modules/workbox-build (CITED, fetched this session)
// app/workbox-config.js
module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,png,svg,ico,json,woff2}'],
  swSrc: 'sw-src.js',
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,  // headroom above the ~6 MB current bundle / 5.2 MB target
};

// app/sw-src.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { createHandlerBoundToURL } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/_expo\//, /^\/share-target/],
  }),
);
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return;
  event.respondWith((async () => {
    const fd = await event.request.formData();
    const file = fd.get('file');
    const text = file && typeof file.text === 'function' ? await file.text() : String(fd.get('text') || '');
    await putShareInbox({ text, receivedAt: Date.now() });
    return Response.redirect('/import?from=share', 303);
  })());
});
```
**Note on ESM inside the SW:** `workbox-cli`'s `injectManifest` does NOT bundle/transpile `import` statements inside `sw-src.js` by default — it only performs the `self.__WB_MANIFEST` string substitution and writes the file as-is to `swDest`. If `sw-src.js` uses `import {precacheAndRoute} from 'workbox-precaching'`, the browser must load it as a module worker (`navigator.serviceWorker.register('/sw.js', { type: 'module' })`) **or** the workbox packages must be pre-bundled into `sw-src.js` (e.g., via Metro/esbuild) before `injectManifest` runs. `[ASSUMED — this is a well-known Workbox gotcha from training knowledge; not independently re-verified against workbox-cli 7.4.1's current bundling behavior this session. Recommend the planner add a spike/manual-verification task: run `workbox injectManifest` once locally and confirm `dist/sw.js` either contains resolved (non-import) code or that `register` is called with `{type:'module'}`.]** This is the single highest-uncertainty item in WP 20.3 — treat it as an execution-time checkpoint, not a settled fact.

### Pattern 3: Web Share Target — manifest + SW handler pairing
**What:** `share_target` in `manifest.json` registers the installed PWA as an OS share-sheet target; the browser translates an OS "Share" action into a `POST` (or `GET`) request to `action`, which is intercepted client-side by the SW's `fetch` handler (no server involved).
**When to use:** Receiving `.json`/text shares from the Claude app.
**Example:**
```json
// Source: developer.chrome.com/docs/capabilities/web-apis/web-share-target (CITED, fetched this session)
"share_target": {
  "action": "/share-target",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": {
    "title": "title", "text": "text", "url": "url",
    "files": [{ "name": "file", "accept": ["application/json", ".json", "text/plain", ".txt"] }]
  }
}
```
```js
// Source: web.dev/patterns/files/receive-shared-files (CITED, fetched this session) — general shape
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'POST') return;
  const url = new URL(event.request.url);
  if (url.pathname !== '/share-target') return;
  event.respondWith((async () => {
    const formData = await event.request.formData();
    // ... extract fields/files, persist to IndexedDB, then redirect
  })());
});
```
**Gotchas (CITED/ASSUMED mix):**
- The share target only appears in the OS share sheet **after the PWA is installed** (Chrome requirement) — `M6` in the manual steps table correctly gates this on WP 20.4 completion. `[CITED: developer.chrome.com Web Share Target docs — "installed web apps"]`
- `scope`/`id` in the manifest must be consistent (`scope: "/"`, `id: "/"`, `start_url: "/"` as locked) — a mismatched `scope` can cause Chrome to not recognize the app as installed for share-target purposes. `[ASSUMED — standard PWA installability requirement, not independently re-verified against a live Chrome install this session]`
- `Response.redirect(url, 303)` after handling the share is the standard pattern so the browser does a fresh `GET` for the redirect target instead of resubmitting the POST. `[CITED: W3C Web Share Target API spec — recommends redirect-after-POST]`

### Anti-Patterns to Avoid
- **Using `generateSW` for this SW:** cannot express the `/share-target` fetch handler — the locked decision to hand-write `sw-src.js` + `injectManifest` is correct; don't second-guess it during planning.
- **Auto `skipWaiting()`:** the locked decision explicitly forbids automatic `skipWaiting` to avoid clobbering an in-progress edit (`hasPendingSaves()` guard) — any update logic that calls `self.skipWaiting()` unconditionally at SW install time would violate DEPLOY-07's "no data loss" spirit and the phase's own explicit requirement.
- **Dropping `profiles.plz/klimazone/archetype` without the grep-first step:** even though this session's grep found only 3 migration files referencing them (all pre-existing/historical), the migration itself should still perform the `\df+`/`pg_catalog` existence check the masterplan Anhang C.1 specifies, since schema drift between this session's snapshot and the live linked DB is possible.
- **Treating `cloudflare/wrangler-action@v3` as unverified — it exists, use it as locked:** `v4` is current upstream, but CONTEXT.md's Decisions section pins `@v3`; the `command:` input interface is unchanged across both — do not "upgrade" this during planning without flagging it as a discretionary deviation from a locked decision (see Assumptions Log A5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Precache manifest generation + cache versioning | Custom SW cache-busting via hashed filenames tracked by hand | `workbox-cli injectManifest` (`self.__WB_MANIFEST`) | Workbox already computes content hashes and cache invalidation correctly; hand-rolling this is exactly the kind of "deceptively complex" problem the phase explicitly avoids by choosing Workbox. |
| SVG → multi-size PNG icon export | Manual export from a design tool per size/purpose (192/512/maskable/monochrome/favicon) | `sharp` script (`scripts/gen-icons.mjs`) | Six output variants from one source SVG; a script is reproducible when the SVG changes (e.g., after Phase 24 design polish touches `icon.svg`). |
| Cloudflare Pages upload/deployment API calls | Raw `curl` against the Cloudflare API with manual multipart upload | `cloudflare/wrangler-action` (wraps `wrangler pages deploy`) | Official, maintained action handles auth, retries, and the Direct Upload protocol; DIY curl scripting is fragile against Cloudflare API changes. |
| Backup rotation / pg_dump scheduling | Custom Node/PowerShell cron-like scheduler | Windows Task Scheduler + `pg_dump -Fc` (already the locked pattern) | OS-level scheduling is more reliable than an in-process timer that only runs while some app is open — correctly not hand-rolled here. |

**Key insight:** Every "don't hand-roll" item above is already respected by the locked decisions — this section exists mainly to confirm to the planner that no task should attempt to build a lighter-weight in-house alternative to Workbox, sharp, or wrangler-action to save a dependency; the masterplan already made that tradeoff correctly.

## Runtime State Inventory

> Phase 20 is a dead-code-removal + destructive-migration phase (WP 20.2), so this section is required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Live Postgres rows in `photo_queue` (dropped by migration 020), `feature_flags` (dropped by migration 020) — both `[VERIFIED: supabase/migrations/20260424000013_offline_sync_infrastructure.sql defines photo_queue; 20260416000001_foundation.sql defines feature_flags]`. `profiles.plz/klimazone/archetype` hold historical per-user values, but `[VERIFIED: supabase/migrations/20260423000003_shared_garden.sql:111-112]` these were already backfilled into `gardens.plz/klimazone/archetype` by a one-time `INSERT ... SELECT` when that migration ran — dropping the `profiles` columns now is a pure column-drop, not a data-migration (no code path reads them anymore, see below). | Migration 020 drop statements only; no application-level data migration needed for `profiles.*`. |
| Live service config | Storage buckets `photos`/`vereinsregeln` may hold real objects (Dirk's actual photos, if any were ever uploaded pre-pivot) that live only in Supabase Storage, not in git. Migration 020's `count(*) = 0` guard (Anhang C.1) is the correct safety check — **this session cannot verify bucket emptiness** (no DB access from this environment). | Planner must keep the conditional-drop SQL exactly as sketched; do not drop buckets unconditionally. If the guard fires "not empty", migration 020 must leave buckets/policies in place and the SUMMARY must flag it for manual cleanup. |
| OS-registered state | None pre-existing — `scripts/keepalive.ps1` and `scripts/backup-supabase.ps1` plus their Task Scheduler registrations are **new** artifacts created by this phase, not pre-existing state to migrate. `[VERIFIED: no scripts/*.ps1 files exist yet — grep found none]` | Create fresh; no migration needed. |
| Secrets/env vars | `[CITED: .planning/STATE.md Blockers section]` "Sentry-DSN in `app/.env` zeigt auf US-Ingest, `.env.example` auf EU". This is an existing drift, not introduced by Phase 20, but WP 20.4/M2 touches Sentry DSN configuration (moving it to a GitHub Secret) — the planner should have a task correct `app/.env`'s local DSN to match `.env.example`'s EU value, or at minimum flag the mismatch in the SUMMARY. GitHub Vars `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` referenced by code today already (`app/src/lib/supabase.ts:7-8` reads `process.env.EXPO_PUBLIC_SUPABASE_URL!`) — code is unchanged, only the CI workflow's `env:` block needs the new `vars.*` wiring. | Code-level: none (env var names unchanged). CI-level: add `env:` block reading `vars.*`/`secrets.*`. Manual: M2 (already tracked). |
| Build artifacts | `app/dist/` already exists from a prior `expo export` (contains an English-`lang` `index.html` with no manifest link) — this is stale output that will be fully regenerated by the new `build:web` script; no special handling needed since `expo export` always clears/rewrites `dist/`. No stale installed-package artifacts found (`jest-expo` removal: confirmed no other jest project depends on `jest-expo`-specific transforms — all 6 current jest projects use `ts-jest`, `[VERIFIED: app/jest.config.ts photos-project block shown above uses preset: 'ts-jest']`). | None beyond normal `expo export` overwrite; confirm post-removal `pnpm --filter app exec jest --ci` still passes (the `jest-expo` package is listed as "ungenutzt" — unused — in Anhang A, consistent with this finding). |

**Nothing found in category:** OS-registered state — verified by absence of any `scripts/*.ps1` in the repo today; these are wholly new in this phase.

## Common Pitfalls

### Pitfall 1: `pnpm --filter app test -- --flag` swallows the second `--`
**What goes wrong:** Jest flags like `--testPathPattern`/`--detectOpenHandles` silently don't apply.
**Why it happens:** pnpm's own `--` argument-forwarding interacts badly with a second `--` when the underlying script (`"test": "jest --passWithNoTests"`) is itself invoked via `pnpm --filter app test --`.
**How to avoid:** Use `pnpm --filter app exec jest --detectOpenHandles --ci` (bypasses the `test` script's own arg handling) — this is explicitly called out in CONTEXT.md/Masterplan 0.4 and must be the pattern used for the worker-leak investigation in `reconnect-*.integration.test.ts`.
**Warning signs:** A flag appears to have no effect; Jest runs as if the flag were never passed.

### Pitfall 2: ESM `import` inside `sw-src.js` may not execute in the browser without `{type:'module'}`
**What goes wrong:** `workbox injectManifest` only substitutes `self.__WB_MANIFEST`; it does not bundle `import` statements by default. If `sw-src.js` imports `workbox-precaching`/`workbox-routing` via ES module syntax and the SW is registered without `{ type: 'module' }`, the browser throws a syntax/reference error and the SW fails to install.
**Why it happens:** Conflating `workbox-build`'s manifest-injection step with a full bundler step.
**How to avoid:** Either (a) register with `navigator.serviceWorker.register('/sw.js', { type: 'module' })` and confirm Chrome's module-worker support is sufficient for the target browser (Chrome/Android supports module workers), or (b) pre-bundle `sw-src.js` with the workbox runtime inlined before `injectManifest` runs. Verify by opening `dist/sw.js` after the build and confirming it either contains resolved code or is registered as a module.
**Warning signs:** SW registration promise rejects; Chrome DevTools → Application → Service Workers shows a red error; the app falls back to no-offline-support silently.

### Pitfall 3: `_headers` semantics — Cloudflare Pages, not Cloudflare Workers, syntax
**What goes wrong:** Getting the `_headers` file glob syntax wrong (e.g., using Workers-style routing) results in cache headers not applying, especially the critical "`/index.html` and `/sw.js` must be `no-cache`" rule — if that rule doesn't apply, a stale SW/HTML can get stuck cached at the edge/browser and updates never reach users.
**Why it happens:** Cloudflare has multiple products (Workers, Pages) with different config file conventions; `_headers` is Pages-specific and uses its own simple glob+header-list format.
**How to avoid:** Follow the exact locked format: `/index.html` and `/sw.js` on their own path lines with `Cache-Control: no-cache` under them; `/_expo/static/*` with the immutable 1-year rule; `/*` catch-all last. Verify post-deploy with `curl -I https://spatenstich.pages.dev/sw.js` and check the `Cache-Control` response header.
**Warning signs:** Update toast never appears even after a new deploy; users report seeing an old version persistently.

### Pitfall 4: `profiles.plz` column drop timing vs. `gardens.plz` — don't confuse the two tables
**What goes wrong:** Someone reading `SyncWorker.ts`/`rowMappers.ts` quickly and seeing `plz`/`klimazone`/`archetype` field names might assume they're touching the same column migration 020 drops, and skip/over-scope the migration.
**Why it happens:** The two tables (`profiles` and `gardens`) both had these columns at different points in the app's history (Phase 2.5 D-01 pivot moved them from `profiles` to `gardens`); the client code was already updated to use `gardens`, but the legacy `profiles` columns were never dropped.
**How to avoid:** Migration 020 must scope its `ALTER TABLE ... DROP COLUMN` to `public.profiles` only. Confirmed this session: zero client-side references to `profiles.plz/klimazone/archetype` exist; all `plz`/`klimazone`/`archetype` handling in `app/src` operates on `gardens` rows (`GardenRow`, `DbGardenRow`, `pushGarden`).
**Warning signs:** A test failure mentioning `plz` after applying migration 020 — check immediately whether it's actually about `gardens.plz` (should be unaffected) before assuming the migration broke something.

### Pitfall 5: `transfer_ownership` — three prior versions of the same function exist in migration history
**What goes wrong:** Copying the "current" `transfer_ownership` body (from migration 013) into migration 020 as a baseline would re-copy the very regression migration 020 is supposed to fix.
**Why it happens:** The function was redefined at least 4 times: migration 003 (original, with the bug), migration 009 (fixed the bug), migration 010 (custom SQLSTATE refactor, `[VERIFIED: 20260423000010_custom_sqlstate_codes.sql:112]` also redefines it), migration 013 (LWW-guard patch, `[VERIFIED: 20260424000013_offline_sync_infrastructure.sql:268,317-319]` re-introduces the `created_by_user_id` overwrite).
**How to avoid:** Migration 020's new `transfer_ownership` body must include: the migration-010 custom-SQLSTATE error codes (`P9004`/`P9005`), the migration-013 explicit `updated_at = now()` LWW-guard line, and the migration-009 fix (omit `created_by_user_id` from the final `UPDATE public.gardens` statement). Read all four migration bodies before writing the CREATE OR REPLACE, don't just diff two.
**Warning signs:** A pgTAP test (if one exists for `transfer_ownership`) failing on `created_by_user_id` after the "fix" — indicates the old line was copied back in by mistake.

### Pitfall 6: ESLint flat-config override ordering
**What goes wrong:** Adding a `{ files: ['**/__tests__/**'], rules: {...} }` object to the array passed to `defineConfig([...])` in the wrong position (before the base `expoConfig`) means the base config's rules for those files win instead of the override, since flat config merges in array order with later entries overriding earlier ones for matching files.
**Why it happens:** ESLint 9 flat config replaces the old cascading `.eslintrc` resolution with explicit array-order merging — order matters differently than legacy config.
**How to avoid:** Append the override object(s) **after** `expoConfig` in the array (current file: `module.exports = defineConfig([expoConfig, { ignores: [...] }])` — the new overrides block must also go after `expoConfig`, and should be a separate object with its own `files:` glob, not merged into the `ignores`-only object).
**Warning signs:** `pnpm -r run lint` still reports `react/display-name`/`import/first`/`@typescript-eslint/no-require-imports` violations inside `__tests__`/`__mocks__` files after adding the override.

### Pitfall 7: GitHub Actions cron pauses after 60 days of repo inactivity
**What goes wrong:** `supabase-keepalive.yml`'s `schedule:` trigger silently stops firing if the repo has no commits/pushes for 60 days, defeating its purpose right when it's needed most (during an off-season lull with no code activity).
**Why it happens:** Documented GitHub Actions behavior for scheduled workflows on any repo (not Spatenstich-specific).
**How to avoid:** This is exactly why the phase also requires the independent `scripts/keepalive.ps1` + Windows Task Scheduler path (D-02/Kap 7.3) — do not treat the GitHub cron as sufficient on its own; both must be implemented and both are already locked decisions.
**Warning signs:** Supabase project shows as paused despite the GitHub Action's last recorded run being >60 days old with no runs since.

## Code Examples

### §1 — HTML template verification command (post-`expo export`)
```bash
# Source: verified this session against @expo/cli 0.24.24 behavior
pnpm --filter app run build:web
grep -o '<link rel="manifest"[^>]*>' app/dist/index.html   # expect a match
grep -o 'lang="de"' app/dist/index.html                     # expect a match
```

### §2 — ESLint flat-config override addition
```js
// Source: eslint.org flat-config docs pattern (CITED, well-established ESLint 9 mechanism);
// exact current file read this session: app/eslint.config.js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['**/__tests__/**', '**/__mocks__/**'],
    rules: {
      'react/display-name': 'off',
      'import/first': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  { ignores: ['dist/**', 'node_modules/**', '.expo/**'] },
]);
```

### §3 — `supabase-keepalive.yml` skeleton
```yaml
# Source: masterplan Kap 4 WP 20.4 sketch, cross-checked against GitHub Actions `schedule:` docs (CITED)
name: Supabase Keep-alive
on:
  schedule:
    - cron: '0 6 */3 * *'
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase REST
        run: |
          curl -sf "${{ vars.EXPO_PUBLIC_SUPABASE_URL }}/rest/v1/plants?select=slug&limit=1" \
            -H "apikey: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `cloudflare/pages-action` for Pages deploys | `cloudflare/wrangler-action` (unified action for Workers + Pages) | pages-action explicitly deprecated in its own README | The masterplan already picked the current recommended action (`wrangler-action@v3`); no drift to correct. |
| Cloudflare Pages "Connect to Git" builds | Direct Upload via `wrangler pages deploy` from CI | This project's chosen deploy model per D-02 | Requires the CI job to run the full `build:web` itself rather than letting Cloudflare build; already reflected in the locked `deploy-web.yml` sketch. |

**Deprecated/outdated:** `cloudflare/pages-action` — do not use; superseded by `wrangler-action`. `expo-share-intent` — being removed this phase per D-06 (native share-intent handling is unnecessary once the Web Share Target API covers the PWA path).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `workbox-cli`/`sharp` package names are legitimate and match their canonical GitHub repos | Standard Stack / Package Legitimacy Audit | Low — both are extremely well-known, long-established packages; risk is near-zero but the provenance rule requires the tag regardless. A `checkpoint:human-verify` before install costs one confirmation click. |
| A2 | `workbox injectManifest` does not bundle ES `import` statements in `sw-src.js` by default, requiring either module-worker registration or pre-bundling | Architecture Patterns §Pattern 2, Pitfall 2 | Medium — if wrong (i.e., if `injectManifest` does bundle), the planner may add an unnecessary pre-bundling step; if right and unaddressed, the SW silently fails to register on real devices. Recommend a first-task spike: run `workbox injectManifest` locally and inspect `dist/sw.js` before writing the rest of WP 20.3. |
| A3 | Web Share Target's `scope`/`id`/`start_url` consistency requirement and "must be installed" gating behave as documented in Chrome docs, without an undocumented Android-specific quirk | Architecture Patterns §Pattern 3 | Medium — if a quirk exists, M6's manual device test would catch it late; no way to verify without a real Android Chrome install, which this research session cannot perform. |
| A4 | `getVirtualFaviconAssetsAsync`'s automatic favicon injection doesn't conflict with a hand-written `<link rel="icon">` in the custom `app/public/index.html` template | Architecture Patterns §Pattern 1 | Low — worst case is a harmless duplicate `<link>` tag; not verified by reading `favicon.js` source this session due to budget constraints. |
| A5 | `cloudflare/wrangler-action@v3` (locked in CONTEXT.md) still functions correctly even though `@v4` is now the upstream-recommended major version | Standard Stack, Anti-Patterns | Low-Medium — `@v3` should still work (GitHub Actions pins by tag, old majors remain available), but if Cloudflare has deprecated/broken `@v3` behavior since, the deploy step would fail. Recommend the planner note this as a fallback: if `@v3` fails in practice, `@v4` uses the identical `command:`/`apiToken`/`accountId` input shape per this session's WebSearch findings, so swapping the version pin is a one-line fix. |
| A6 | `scripts/backup-supabase.ps1`'s exact `pg_dump` connection-string format (pooler host, port 6543) from the masterplan sketch is current/correct for this Supabase project | Standard Stack (DEPLOY-06) | Low — not independently re-verified against Supabase's current connection-string documentation this session; if Supabase changed pooler conventions, the script needs a one-line host/port fix, easily caught when M5 is run manually. |

**If this table is empty:** N/A — see entries above. Most core repo-fact claims (file contents, line numbers, dependency versions, the HTML-template mechanism, the migration regression) were independently verified this session and are NOT in this table.

## Open Questions

1. **Does `workbox injectManifest` (v7.4.1) bundle ESM imports in the swSrc file, or must `sw-src.js` be pre-bundled / registered as a module worker?**
   - What we know: `injectManifest`'s documented job is manifest-string substitution only; the Workbox team's own examples for non-bundled projects typically show either pre-bundled SW sources or `importScripts()` (classic worker) rather than ESM `import`.
   - What's unclear: Whether `workbox-cli`'s specific invocation (as opposed to the JS API `workbox-build`) does any additional resolution, and whether Chrome/Android's module-worker support is unconditionally sufficient here.
   - Recommendation: First task in WP 20.3 should be a quick local spike — run `workbox injectManifest workbox-config.js` against a trivial `sw-src.js` with an ESM import, inspect `dist/sw.js`, and register it locally with `{type:'module'}` to confirm before building out the full share-target handler on top of it.

2. **Are the `photos`/`vereinsregeln` storage buckets actually empty in the live linked Supabase project?**
   - What we know: The migration's own guard (`count(*) = 0`) makes this self-protecting — if not empty, the DROP is skipped and a `notice` is raised.
   - What's unclear: This research session has no DB access to check ahead of time; this will only be known at push time (Gate 3, after the M5 backup confirmation).
   - Recommendation: Planner should treat "buckets turned out non-empty" as an expected possible outcome documented in the WP 20.2 SUMMARY, not a failure — the migration's acceptance criteria should be "buckets dropped if empty, notice raised otherwise" rather than an unconditional "buckets dropped".

3. **Is `app/.env`'s Sentry DSN mismatch (US vs EU) in scope for this phase's code changes, or purely a manual M2 step?**
   - What we know: STATE.md flags it as an existing blocker; the phase's `.github` workflow changes touch how the DSN secret is wired into CI.
   - What's unclear: Whether `app/.env` (local dev file, likely gitignored) needs a code-adjacent fix task or is entirely Dirk's manual responsibility.
   - Recommendation: Add a lightweight task/note in WP 20.1 or 20.4 to correct `app/.env` locally (if not gitignored, verify) to match `.env.example`'s EU DSN, distinct from the GitHub Secret (M2) which is the CI-facing fix.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/CI | ✓ (assumed dev machine has it; CI pins `node-version: 22`) | 22 (CI) | — |
| pnpm | monorepo tooling | ✓ | 10.33.0 (CI `pnpm/action-setup@v4`) | — |
| `sharp`, `workbox-cli` | WP 20.3 build | ✗ (not yet installed) | target 0.35.4 / 7.4.1 per registry | Install via `pnpm --filter app add -D`; no viable fallback without these for the locked icon/SW pipeline |
| `wrangler` CLI (via `cloudflare/wrangler-action`) | WP 20.4 deploy | ✗ locally (used only inside the GitHub Action, no local install needed) | 4.130.0 (registry, informational) | Action manages its own wrangler install |
| Cloudflare account + API token | WP 20.4 deploy | ✗ — requires manual step M1 | — | Blocks first real deploy until M1 done; all other WP 20.4 work (writing the workflow YAML) can proceed without it |
| Supabase linked project access (`supabase migration list --linked`) | WP 20.2 migration push | Unknown from this research session (no CLI session here) | — | Push step is a `checkpoint:human-action` gated on M5 backup regardless |

**Missing dependencies with no fallback:**
- Cloudflare account/token (M1) — blocks the first real `deploy-web.yml` run, but not the writing of the workflow itself.

**Missing dependencies with fallback:**
- `sharp`/`workbox-cli` — trivially installed via pnpm; only gated by the `checkpoint:human-verify` package-legitimacy step, not a real blocker.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 (`ts-jest` preset, multi-project config in `app/jest.config.ts`) + `@spatenstich/shared` has its own Jest suite |
| Config file | `app/jest.config.ts` (6 projects today, dropping to 5 after `photos` project removal in WP 20.2) |
| Quick run command | `pnpm --filter app exec jest --selectProjects <project> --ci` (never `pnpm --filter app test -- --flag`, Pitfall 1) |
| Full suite command | `pnpm --filter app exec jest --ci && pnpm --filter @spatenstich/shared exec jest --ci` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | `pnpm -r run lint` exits 0 | lint (static) | `pnpm -r run lint` | ✅ existing script |
| DEPLOY-01 | CI green on a test PR | integration (CI) | GitHub Actions run on the phase's own PR | ✅ `.github/workflows/ci.yml` exists, verified |
| DEPLOY-01 | `create-garden-entrypoints.test.tsx` no `console.error` noise | unit | `pnpm --filter app exec jest --testPathPattern=create-garden-entrypoints` | ✅ file exists (per CONTEXT.md line ref `:61-64`) |
| DEPLOY-02 | `git grep` shows no remaining `plantnet\|anthropic\|captureStore\|exif\|useFlag` outside comments | static grep gate | `git grep -n -i "plantnet\|anthropic\|captureStore\|exif\|useFlag" app/src app/app` | N/A — grep-based acceptance criterion, not a test file |
| DEPLOY-02 | Migration 020 applies cleanly (dry-run) | migration dry-run | `supabase db push --linked --dry-run --yes` | N/A — infra command |
| DEPLOY-03 | `dist/index.html` contains manifest link + `lang="de"` | build-output assertion | `pnpm --filter app run build:web && grep -o 'rel="manifest"' app/dist/index.html` | ❌ Wave 0 — no automated Lighthouse-in-CI check exists yet; "installable" claim is otherwise manual (Lighthouse DevTools panel) |
| DEPLOY-03 | `dist/sw.js` contains precache manifest + share-target handler | build-output assertion | `grep -o 'precacheAndRoute' app/dist/sw.js && grep -o 'share-target' app/dist/sw.js` | ❌ Wave 0 — no test file; grep-based check is the practical substitute since a real SW can't be unit-tested by Jest (jsdom has no Service Worker support) |
| DEPLOY-04 | Share flow end-to-end | manual-only | N/A | Manual — M6 (Android Chrome, real share sheet); Web Share Target API cannot be simulated by jsdom/Jest |
| DEPLOY-05 | Deploy completes < 10 min | manual/CI-timing | GitHub Actions run duration on the workflow's own summary page | N/A — observability, not a test |
| DEPLOY-06 | Keep-alive workflow succeeds manually | manual/CI | `workflow_dispatch` run of `supabase-keepalive.yml`, inspect exit code | N/A — infra command |
| DEPLOY-07 | Flight-mode second start shows last plan | manual-only | N/A | Manual — requires a real installed PWA + airplane mode toggle on Android, not automatable in this stack |

### Sampling Rate
- **Per task commit:** `pnpm --filter app exec jest --selectProjects <affected-project> --ci`
- **Per wave merge:** `pnpm -r run typecheck && pnpm -r run lint && pnpm --filter app exec jest --ci && pnpm --filter @spatenstich/shared exec jest --ci`
- **Phase gate:** Full suite green + `pnpm --filter app run build:web` succeeds + `bash scripts/check-claude-key-in-bundle.sh app/dist` exits 0, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] No automated Lighthouse-PWA-installability check in CI — DEPLOY-03's "Lighthouse installable grün" acceptance criterion is manual-only (DevTools Lighthouse panel) unless the planner adds a `lighthouse-ci` step, which is out of scope per the locked decisions (not mentioned anywhere in CONTEXT.md). Recommend leaving it manual and noting in the plan's UAT/manual-checkpoint list.
- [ ] No SW/Share-Target integration test harness exists — jsdom cannot execute a real Service Worker; the practical Wave 0 gap is a `grep`-based build-output assertion script (not a Jest test) that checks `dist/sw.js` for expected strings after `build:web`. Consider adding this as a lightweight `scripts/verify-pwa-build.sh` (Claude's Discretion territory — script naming is explicitly left to the planner per CONTEXT.md).
- [ ] `supabase/tests/` pgTAP suite needs pruning (`garden_plan_rls.sql` Test 6, `storage_photos_rls.sql`, `trigger_ordering.sql`, `migration_003_atomic.sql`, `rls_foundation.sql`, `rls_member_check.sql` per masterplan WP 20.2) — not independently re-verified against current file contents this session; planner should grep `supabase/tests/` at execution time to confirm exact file names still match before deleting/editing.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Indirect (unchanged this phase) | `detectSessionInUrl: true` change (WP 20.3) affects how Supabase parses auth redirect fragments on web — verify this doesn't introduce an open-redirect surface; Supabase's own client library handles this internally, not hand-rolled. |
| V4 Access Control | Yes — Migration 020 | RLS policies on `storage.objects`/buckets being dropped must be dropped together with the bucket (the sketch does this atomically inside the same `do $$ ... $$` block) — never leave orphaned policies referencing a dropped bucket. |
| V5 Input Validation | Yes — Web Share Target inbox | The shared text/file read from IndexedDB by `import/index.tsx` MUST go through the exact same `validatePayload`/`JSON.parse` gate the existing paste/file-picker paths already use (`[VERIFIED: app/app/(app)/import/index.tsx handleValidate — JSON.parse + validatePayload before any navigation or state update]`) — do not special-case the share-target path to skip validation. |
| V6 Cryptography | No change | Not touched by this phase; `LargeSecureStore`/`aes-js` usage stays native-only, unaffected. |
| V14 Configuration | Yes — `_headers`, CI secrets | `X-Content-Type-Options: nosniff` on `/*` (locked) is a standard hardening header; GitHub `vars.*`/`secrets.*` split (public URL/anon key as vars, Sentry DSN as secret) matches R7 (anon key is expected client-visible, RLS protects data). |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Malicious/malformed shared payload via `/share-target` (arbitrary app on the device can share to any registered target) | Tampering | Same `validatePayload` gate as manual paste/upload — already the pattern to reuse, not a new control. |
| Stale/poisoned service worker cache serving old HTML/JS after a deploy | Tampering / DoS (self-inflicted) | `_headers` `no-cache` on `index.html`/`sw.js` + explicit update-toast/SKIP_WAITING flow (locked) is the standard mitigation — do not weaken the no-cache rule. |
| Cloudflare API token over-scoped (full account access instead of Pages-only) | Elevation of Privilege | M1 specifies the "Cloudflare Pages — Edit" token template specifically, not an account-wide token — planner should note this in the manual-step reminder if writing any setup docs. |
| Anon key exposed in the public web bundle | Information Disclosure | Explicitly accepted/expected per R7 — RLS is the actual boundary, not secrecy of the anon key; `check-claude-key-in-bundle.sh` scans for the *service-role*/Claude API key leaking, not the anon key. |

## Sources

### Primary (HIGH confidence — verified this session against local files)
- `D:/AiProjects/garden-app/node_modules/@expo/cli/build/src/start/server/webTemplate.js` (0.24.24) — HTML template resolution mechanism
- `D:/AiProjects/garden-app/node_modules/@expo/cli/build/src/export/exportApp.js` (0.24.24) — export pipeline, public-folder copy + index.html generation order
- `D:/AiProjects/garden-app/node_modules/@expo/cli/build/src/export/publicFolder.js` — `copyPublicFolderAsync`/`getUserDefinedFile`
- `D:/AiProjects/garden-app/supabase/migrations/20260424000013_offline_sync_infrastructure.sql:317-319` — `transfer_ownership` regression, exact lines
- `D:/AiProjects/garden-app/supabase/migrations/20260423000009_transfer_ownership_audit_invariant.sql` — the prior fix that got reverted
- `D:/AiProjects/garden-app/supabase/migrations/20260423000010_custom_sqlstate_codes.sql:112` — intermediate `transfer_ownership` redefinition
- `D:/AiProjects/garden-app/supabase/migrations/20260419000002_profiles.sql`, `20260423000003_shared_garden.sql`, `20260423000008_profiles_member_visible.sql` — all `profiles.plz/klimazone/archetype` references, confirmed exhaustive via `git grep`
- `D:/AiProjects/garden-app/app/src/lib/mappers/rowMappers.ts`, `app/src/lib/sync/SyncWorker.ts` — confirmed all client `plz/klimazone/archetype` usage targets `gardens`, not `profiles`
- `D:/AiProjects/garden-app/app/package.json`, `app/app.config.ts`, `app/eslint.config.js`, `.github/workflows/ci.yml`, `.github/workflows/eas-build.yml`, `app/src/lib/supabase.ts`, `app/app/(app)/import/index.tsx` — current-state grounding for WP 20.1/20.3

### Secondary (MEDIUM confidence — WebSearch against official docs this session)
- [Precaching with Workbox — Chrome for Developers](https://developer.chrome.com/docs/workbox/precaching-with-workbox)
- [workbox-build — Chrome for Developers](https://developer.chrome.com/docs/workbox/modules/workbox-build)
- [Receiving shared data with the Web Share Target API — Chrome for Developers](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)
- [Integrate PWAs into built-in sharing UIs with Workbox — web.dev](https://web.dev/workbox-share-targets/)
- [How to receive shared files — web.dev](https://web.dev/patterns/files/receive-shared-files)
- [Web Share Target API — W3C spec](https://w3c.github.io/web-share-target/)
- [cloudflare/wrangler-action — GitHub](https://github.com/cloudflare/wrangler-action)
- [cloudflare/pages-action — GitHub (deprecated notice)](https://github.com/cloudflare/pages-action)

### Tertiary (LOW confidence — training knowledge, not independently verified this session)
- ESM-bundling behavior of `workbox-cli injectManifest` specifically (vs. the JS API) — flagged as Open Question 1 / Assumption A2
- Exact Supabase pooler connection-string format for `pg_dump` — flagged as Assumption A6
- `getVirtualFaviconAssetsAsync`'s interaction with a hand-written favicon `<link>` — Assumption A4

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — core versions read directly from `app/package.json`; new devDependency versions confirmed live against npm registry this session
- Architecture: HIGH for the Expo export/HTML-template mechanism (source-verified) and the migration-020 safety analysis (source-verified); MEDIUM for Workbox/Web-Share-Target specifics (CITED against official docs, not executed)
- Pitfalls: MEDIUM-HIGH — most are either source-verified repo facts or well-documented public API gotchas; Pitfall 2 (ESM in SW) is the one genuinely uncertain item, called out explicitly

**Research date:** 2026-09-09
**Valid until:** ~30 days for the Expo/migration/repo-fact claims (stable once phase starts, but re-verify if `pnpm-lock.yaml` changes upstream before execution); ~7 days for anything about Cloudflare/GitHub Actions product behavior (`wrangler-action` version, Pages product changes move faster)
