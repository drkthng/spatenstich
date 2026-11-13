---
phase: 20-fundament-aufr-umen-pwa-deploy
plan: 03
subsystem: pwa
tags: [expo-web-export, workbox, service-worker, web-share-target, indexeddb, zustand, cloudflare-pages]

requires:
  - phase: 20-fundament-aufr-umen-pwa-deploy (Plan 20-02)
    provides: lint-clean/test-green repo, FEATURES compile-time flag, Migration 020 live
provides:
  - Installable PWA shell (manifest.json, icons, HTML template, injectManifest Service Worker)
  - Web Share Target end-to-end (manifest share_target, SW fetch handler, IndexedDB inbox, import wiring)
  - Install-prompt banner, SW update toast, persistent-storage request + quota warning
  - Cloudflare Pages _headers cache-control rules
affects: [20-fundament-aufr-umen-pwa-deploy (Plan 20-04 deploy), phase-21, phase-23]

actuals:
  tokens: 15200
  tasks: 4
  commits: 7

tech-stack:
  added:
    - "sharp@0.35.4 (devDependency) — SVG→PNG icon generation"
    - "workbox-cli@7.4.1 (devDependency) — injectManifest precache-manifest build step"
  patterns:
    - "Classic (non-module) Service Worker + importScripts() against a locally-hosted workbox-sw runtime (no CDN) — injectManifest does not bundle ES module imports"
    - "Small standalone controller components (React, no route-file entanglement) for browser-lifecycle side effects that must be unit-testable"
    - "IndexedDB DB/store/key string-literal contract shared between a hand-written Service Worker (raw API) and the app (idb package)"

key-files:
  created:
    - app/assets/icon.svg
    - app/public/manifest.json
    - app/public/index.html
    - app/public/_headers
    - app/public/icons/*.png, app/public/icons/favicon.ico (7 files)
    - app/public/workbox-v7.4.1/*.js (5 files — locally-hosted Workbox runtime)
    - app/sw-src.js
    - app/workbox-config.js
    - scripts/gen-icons.mjs
    - scripts/inject-html-head.mjs
    - scripts/copy-workbox-runtime.mjs
    - app/src/lib/shareInbox.ts
    - app/src/components/pwa/PwaControllers.tsx
  modified:
    - app/app.config.ts
    - app/app/_layout.tsx
    - app/app/(app)/import/index.tsx
    - app/app/(app)/settings.tsx
    - app/src/stores/authStore.ts
    - app/src/lib/supabase.ts
    - app/package.json
    - packages/shared/src/i18n/de.json

key-decisions:
  - "RESEARCH Open Question 1 resolved empirically (not by assumption): workbox-build's injectManifest performs pure string substitution and never bundles/transpiles the swSrc file (confirmed by reading node_modules/workbox-build/build/inject-manifest.js — the function's own docstring states this). A module-worker registration was rejected as unsafe: it would need the browser to resolve bare specifiers like 'workbox-precaching', which no browser can do without a bundler or import map. Chose a classic worker + importScripts() against a locally-hosted copy of the workbox-sw runtime (scripts/copy-workbox-runtime.mjs copies workbox-sw.js + core/strategies/routing/precaching.prod.js from node_modules into app/public/workbox-v7.4.1/, which expo export then copies into dist/) instead of Google's CDN — keeps the PWA fully self-hosted (EU hosting, DEPLOY-07 offline-first) with zero external runtime network dependency."
  - "Verified the module-resolution fix works at runtime (not just 'no syntax error') by writing a throwaway Node vm.createContext harness that stubs self/importScripts/addEventListener and loads the real dist/sw.js — confirmed workbox.precaching and workbox.routing resolve and all four expected listeners (install/activate/fetch/message) register without throwing. This harness lived in the scratchpad only, not committed."
  - "Extracted ServiceWorkerController/InstallPromptController/StorageController into a new file app/src/components/pwa/PwaControllers.tsx instead of keeping them inline in app/app/_layout.tsx (deviation from the plan's file list — see Deviations). _layout.tsx imports '../global.css' plus Sentry/TanStack-Query/sync/invite-code modules that can't be unit-tested under jsdom without excessive mocking; Task 4 is tdd=\"true\" with an explicit mandate to test exactly these three behaviors."
  - "app.config.ts: did NOT set web.themeColor/web.description even though @expo/cli would auto-inject a <meta theme-color> from them — app/public/index.html already hand-writes that meta tag; setting both would risk a harmless-but-confusing duplicate. Single source of truth for theme-color stays the hand-written HTML template."

requirements-completed: [DEPLOY-03, DEPLOY-04, DEPLOY-07]

coverage:
  - id: D1
    description: "Installable PWA shell — manifest.json (id/start_url/scope/display/lang/colors/icons any+maskable+monochrome), app/public/index.html (lang=de, manifest link, theme-color, favicon), injectManifest Service Worker with a working precache manifest"
    requirement: "DEPLOY-03"
    verification:
      - kind: unit
        ref: "acceptance criteria script: node scripts/gen-icons.mjs + 7-file existence check"
        status: pass
      - kind: integration
        ref: "pnpm --filter app run build:web && grep manifest link/lang=de in dist/index.html, precacheAndRoute in dist/sw.js"
        status: pass
    human_judgment: false
  - id: D2
    description: "Service Worker never activates automatically and never reloads during unsaved changes — only via explicit SKIP_WAITING message after user action"
    requirement: "DEPLOY-03"
    verification:
      - kind: unit
        ref: "src/components/__tests__/pwa-controllers.test.tsx#die Update-Aktion sendet SKIP_WAITING NUR ohne ungesicherte Aenderungen"
        status: pass
    human_judgment: true
    rationale: "The controller-side gate (hasPendingSaves()) is unit-tested, but the full real-browser install→waiting→SKIP_WAITING→controllerchange→reload lifecycle across an actual Chrome tab is not exercised by jsdom; RESEARCH's own Wave-0-Gaps note flags real Service Worker behavior as impossible to unit-test. Deferred to Plan 20-04 device pass."
  - id: D3
    description: "Web Share Target end-to-end: manifest share_target, SW fetch handler writes the IndexedDB inbox and redirects, shareInbox.ts reads/clears it, import screen validates the shared payload through the identical handleValidate() path as paste/file (ASVS V5, T-20-03-02)"
    requirement: "DEPLOY-04"
    verification:
      - kind: unit
        ref: "src/lib/__tests__/shareInbox.test.ts (3 tests)"
        status: pass
      - kind: unit
        ref: "src/components/__tests__/import-share.test.tsx (3 tests)"
        status: pass
      - kind: integration
        ref: "pnpm --filter app run build:web && grep share-target + spatenstich-share in dist/sw.js and shareInbox.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Not-logged-in share-target arrival remembers the target route in authStore.pendingRoute and restores it after login"
    requirement: "DEPLOY-04"
    verification:
      - kind: unit
        ref: "src/stores/__tests__/authStore.test.ts#pendingRoute: initial state is null; setPendingRoute/clearPendingRoute round-trip"
        status: pass
    human_judgment: true
    rationale: "Only the store round-trip is unit-tested. The full GuardedStack auth-redirect save/restore flow needs a live router + auth-state transition that a unit test cannot faithfully simulate; this is a genuinely rare edge case (share arriving while logged out) best confirmed manually."
  - id: D5
    description: "Install-prompt banner (captured beforeinstallprompt, hidden in standalone display-mode), SW update toast, navigator.storage.persist() after login, quota warning banner at >=80%"
    requirement: "DEPLOY-04"
    verification:
      - kind: unit
        ref: "src/components/__tests__/pwa-controllers.test.tsx#registriert /sw.js und zeigt den Update-Hinweis"
        status: pass
      - kind: unit
        ref: "src/components/__tests__/settings-install-banner.test.tsx (3 tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Cloudflare Pages _headers: no-cache for index.html/sw.js, 1-year immutable for _expo/static/*, nosniff catch-all; no 404.html (SPA fallback preserved)"
    requirement: "DEPLOY-03"
    verification:
      - kind: unit
        ref: "acceptance criteria script: grep block+directive presence in app/public/_headers"
        status: pass
      - kind: integration
        ref: "pnpm --filter app run build:web && test -f app/dist/_headers && test ! -f app/dist/404.html"
        status: pass
    human_judgment: false
  - id: D7
    description: "Real-device acceptance: Lighthouse installable, Chrome-on-both-Android-phones install with correctly-masked icon and moss status bar, second start in flight mode shows the last plan, Teilen from the Claude app on both a .json file and copied text"
    requirement: "DEPLOY-07"
    verification: []
    human_judgment: true
    rationale: "Explicitly deferred per this plan's own must_haves (verification: backstop) and 20-VALIDATION.md — these require a real Cloudflare Pages deploy (Plan 20-04) and physical Android devices; not automatable from this environment."

duration: ~55min
completed: 2026-09-13
status: complete
---

# Phase 20 Plan 3: PWA-Shell, Web Share Target & Install/Update Lifecycle Summary

**Installable PWA (manifest + injectManifest Service Worker via a locally-hosted Workbox runtime, no CDN), Web Share Target from the Claude app into the identical import-validation path, and install/update/storage lifecycle wired into Settings + a new PwaControllers module.**

## Performance

- **Duration:** ~55 min (continuation agent, resumed after Task 1 package-legitimacy checkpoint)
- **Started:** 2026-09-13T17:4x (approx. — continuation agent had no recorded PLAN_START_TIME)
- **Completed:** 2026-09-13T18:25:43+02:00
- **Tasks:** 4 (Task 1 checkpoint answered "ja" by prior agent; Tasks 2-4 executed this session)
- **Files modified:** 37 (per `git diff --stat`)

## R10 Evidence — Package Legitimacy (Task 1, answered by user)

Orchestrator-verified against the live npm registry before the user answered "ja":

| Package | Version in plan | `latest`? | repository.url | maintainer | license | weekly downloads |
|---|---|---|---|---|---|---|
| `sharp` | 0.35.4 | yes | `git+https://github.com/lovell/sharp.git` | `lovell` | Apache-2.0 | 74,615,188 |
| `workbox-cli` | 7.4.1 | yes | `git+https://github.com/googlechrome/workbox.git` | `gauntface` | MIT | 53,944 |

Both repositories match the expected upstreams exactly; both target versions are the current `latest` dist-tag. Installed exactly at these pinned versions as devDependencies.

## Accomplishments

- **PWA shell installable end-to-end:** `app/assets/icon.svg` (Spaten + Keimblatt line art) → `scripts/gen-icons.mjs` (sharp) → 7 committed PNG/ICO files → `manifest.json` (id/start_url/scope `/`, standalone, `lang: de`, Papier/Moos colors, any+maskable+monochrome icons) → `app/public/index.html` (hand-written template) → `pnpm --filter app run build:web` produces a `dist/` Chrome accepts as installable.
- **RESEARCH Open Question 1 answered empirically, not assumed:** `workbox injectManifest` does NOT bundle ES module imports (source-verified in `workbox-build`). Switched the Service Worker from `import` syntax to a classic worker + `importScripts()` against a locally-hosted copy of the `workbox-sw` runtime (new `scripts/copy-workbox-runtime.mjs`, committed output under `app/public/workbox-v7.4.1/`) — avoids both a broken module-worker (bare specifiers can't resolve without a bundler) and an external CDN dependency.
- **Web Share Target, same validation as paste/file:** manifest `share_target` → SW `fetch` handler writes `{text, receivedAt}` into IndexedDB (`spatenstich-share`/`inbox`/`latest`, raw API) and 303-redirects to `/import?from=share` → `app/src/lib/shareInbox.ts` (idb) reads+clears it → the import screen's new effect calls the SAME `handleValidate()` as paste/file (ASVS V5, T-20-03-02) — verified by dedicated tests, not by inspection.
- **Not-logged-in share arrival is not lost:** `authStore.pendingRoute` (persist v1→v2) remembers `/import?from=share` before the auth-guard redirect and restores it after login.
- **Install/update/storage lifecycle:** new `app/src/components/pwa/PwaControllers.tsx` — `ServiceWorkerController` (registration + update detection + toast, `hasPendingSaves()`-gated SKIP_WAITING, never automatic), `InstallPromptController` (captures `beforeinstallprompt` into `authStore.installPromptEvent`, persist v2→v3, excluded from persistence via `partialize`), `StorageController` (`navigator.storage.persist()` after login, ≥80% quota warning at start). Install banner rendered in Settings, hidden via `matchMedia('(display-mode: standalone)')`.
- **Cache headers for the deploy artifact:** `app/public/_headers` — `no-cache` on `index.html`/`sw.js`, 1-year immutable on `_expo/static/*`, `nosniff` catch-all, no `404.html` (Cloudflare Pages SPA fallback preserved).

## Task Commits

Each task was committed atomically (Tasks 3 and 4 are `tdd="true"` — RED then GREEN):

1. **Task 1: CHECKPOINT — Paket-Legitimität** — answered "ja" by a previous agent; no commit (checkpoint task).
2. **Task 2: PWA-Shell end-to-end** — `6311d52` (feat)
3. **Task 3: Web Share Target**
   - `61ff08a` (test — shareInbox RED)
   - `8cbf701` (feat — shareInbox GREEN)
   - `f4690e5` (test — import-share + authStore pendingRoute RED)
   - `20d7bcf` (feat — manifest/SW/import wiring GREEN)
4. **Task 4: Install banner, update toast, storage, cache headers**
   - `d927abe` (test — pwa-controllers + settings-install-banner RED)
   - `04dbe1e` (feat — PwaControllers, settings, authStore, supabase, _headers GREEN)

**Plan metadata:** commit follows this SUMMARY.

## Files Created/Modified

See `key-files` frontmatter above for the full list. Notable:
- `app/src/components/pwa/PwaControllers.tsx` — new file, not in the plan's `files_modified` (see Deviations).
- `app/public/workbox-v7.4.1/*.js` (5 files) + `scripts/copy-workbox-runtime.mjs` — new, not in the plan's `files_modified` (see Deviations).
- `app/public/icons/*` (7 files, generated + committed so the deploy pipeline doesn't strictly need `sharp` at runtime).

## Decisions Made

See `key-decisions` frontmatter above. Summary:
1. Classic worker + locally-hosted `workbox-sw` runtime (not a module worker, not a CDN) to resolve RESEARCH Open Question 1.
2. Verified the fix with a throwaway Node harness (not committed) before trusting it, rather than assuming syntax-validity implied runtime-validity.
3. Extracted the three PWA lifecycle controllers into their own testable module rather than inlining them in `_layout.tsx`.
4. Left `app.config.ts`'s `web.themeColor`/`web.description` unset to avoid a duplicate `<meta theme-color>` alongside the hand-written one in `index.html`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `sw-src.js` comment collision with workbox-build's single-injection-point assertion**
- **Found during:** Task 2, first `build:web` run
- **Issue:** My own explanatory comment above the `precacheAndRoute(self.__WB_MANIFEST)` line contained the literal string `self.__WB_MANIFEST` a second time, so `workbox-build`'s regex-count assertion ("swSrc file contains only one match") failed the build.
- **Fix:** Reworded the comment to describe the placeholder without repeating the literal token.
- **Files modified:** app/sw-src.js
- **Verification:** `pnpm --filter app run build:web` succeeds.
- **Committed in:** 6311d52

**2. [Rule 1 - Bug] `sw-src.js` comment collision with the plan's own module-worker verify grep**
- **Found during:** Task 2, running the plan's `<verify>` block for module-worker consistency
- **Issue:** A different explanatory comment contained the literal substring `from 'workbox-` (inside a description of the risk of ESM imports), which false-positived the verify's `grep -qE "from ['\"]workbox-"` check, forcing the (unmet) module-worker-registration fallback branch.
- **Fix:** Reworded the comment to avoid the literal matched pattern.
- **Files modified:** app/sw-src.js
- **Verification:** Re-ran the verify command; exits 0.
- **Committed in:** 6311d52

**3. [Rule 2 - Missing Critical] Resolved RESEARCH Open Question 1 with a real fix, not a documentation note**
- **Found during:** Task 2, action item 12 (explicitly required by the plan)
- **Issue:** `workbox injectManifest` does not bundle ES module imports (confirmed by reading `workbox-build`'s own source, which states this in its docstring). Registering the worker as `{type:'module'}` would not actually work in a real browser since the bare specifiers `'workbox-precaching'`/`'workbox-routing'` cannot resolve without a bundler or import map.
- **Fix:** Rewrote `sw-src.js` to use `importScripts()` against a locally-hosted copy of the `workbox-sw` runtime loader. Added `scripts/copy-workbox-runtime.mjs` to copy `workbox-sw.js` + `workbox-{core,strategies,routing,precaching}.prod.js` from `node_modules` into `app/public/workbox-v7.4.1/` (committed, wired into `build:web`).
- **Files modified:** app/sw-src.js, scripts/copy-workbox-runtime.mjs (new), app/public/workbox-v7.4.1/*.js (new, 5 files), app/package.json (build:web script)
- **Verification:** `pnpm --filter app run build:web` produces a `dist/sw.js` with zero `import` statements; a throwaway Node `vm` harness (not committed) loaded the real `dist/sw.js` and confirmed `workbox.precaching`/`workbox.routing` resolve and all four listeners (install/activate/fetch/message) register without throwing.
- **Committed in:** 6311d52

**4. [Rule 1 - Bug] Test-mock router instability caused an infinite render loop (own bug, not production code)**
- **Found during:** Task 3, writing `import-share.test.tsx`
- **Issue:** The test's `useRouter` mock returned a freshly-constructed object on every call; `ImportEntryScreen`'s `handleValidate` `useCallback` depends on `router`, so a fresh router object every render kept recreating `handleValidate`, re-firing the `?from=share` effect in an infinite loop (146 calls before the assertion timed out). Real `expo-router`'s `useRouter()` returns a stable object, so this only broke under the poorly-written test double.
- **Fix:** Made the mock router a stable module-level object.
- **Files modified:** app/src/components/__tests__/import-share.test.tsx
- **Verification:** Test passes deterministically on repeated runs.
- **Committed in:** f4690e5 (RED) — the fix landed before the GREEN commit made the underlying test pass.

**5. [Rule 3 - Blocking] Native-module mocks needed for route-file component tests (test-infra gap, established pattern)**
- **Found during:** Task 3 (`import-share.test.tsx`) and Task 4 (`settings-install-banner.test.tsx`, `pwa-controllers.test.tsx`)
- **Issue:** Real ESM builds of `expo-file-system`, `expo-document-picker`, `expo-clipboard`, and `expo-router`'s `Stack` (via `StackClient.tsx`) aren't transformed under the "components" jest project's `transformIgnorePatterns`, and `SettingsScreen`/`PwaControllers` import `@/src/lib/supabase` (throws without real env vars) and `@/src/lib/auth`/`@/src/lib/migrateLocalToAccount` (heavy modules).
- **Fix:** Mocked each at the test-file level (matching the established `create-garden-entrypoints.test.tsx` pattern) rather than modifying `jest.config.ts` (out of this plan's scope).
- **Files modified:** app/src/components/__tests__/import-share.test.tsx, settings-install-banner.test.tsx, pwa-controllers.test.tsx
- **Verification:** All three suites pass; `pnpm --filter app exec jest --ci` full suite stays green.
- **Committed in:** f4690e5, d927abe

**6. [Rule 2 - Missing Critical] Extracted PWA lifecycle controllers into a new testable module**
- **Found during:** Task 4, writing the RED tests the task itself mandates ("Browser-Schnittstellen dabei mocken")
- **Issue:** `app/app/_layout.tsx` (the plan's designated file for these controllers) imports `'../global.css'` and pulls in Sentry, TanStack Query, and several sync/invite-code repo modules — none of which resolve cleanly under jsdom without an unreasonable amount of mocking, and CSS imports have no jest transformer configured. Task 4 is `tdd="true"` with an explicit, named test mandate (update toast appears, pending-saves guard, install banner hidden in standalone) that could not be satisfied by testing `_layout.tsx` directly.
- **Fix:** Created `app/src/components/pwa/PwaControllers.tsx` (new file, not in the plan's `files_modified`) housing `ServiceWorkerController`, `InstallPromptController`, and `StorageController`. `_layout.tsx` imports and renders all three — functionally identical outcome, genuinely testable seam.
- **Files modified:** app/src/components/pwa/PwaControllers.tsx (new), app/app/_layout.tsx (imports + renders the three controllers instead of defining one inline)
- **Verification:** `src/components/__tests__/pwa-controllers.test.tsx` (2 tests) passes; full app jest suite (781/781) stays green.
- **Committed in:** d927abe (RED), 04dbe1e (GREEN)

**7. [Rule 1 - Bug] Cleaned up `act()` warnings in the pwa-controllers test**
- **Found during:** Task 4, after the GREEN implementation made the tests pass
- **Issue:** Manually dispatching `EventTarget` events outside React Testing Library's `act()` produced console warnings (tests still passed, but noisy).
- **Fix:** Wrapped the `dispatchEvent` calls in `act(() => {...})`.
- **Files modified:** app/src/components/__tests__/pwa-controllers.test.tsx
- **Verification:** Re-ran the suite; zero console warnings, both tests still pass.
- **Committed in:** 04dbe1e

---

**Total deviations:** 7 auto-fixed (3 Rule 1 self-caught bugs in newly-written code, 1 Rule 2 correctness fix from the empirically-resolved research question, 1 Rule 2 testability extraction, 2 Rule 3 test-infrastructure mocking gaps).
**Impact on plan:** All deviations were necessary for correctness (the module-bundling fix — without it the Service Worker would throw a SyntaxError in every real browser) or to satisfy the plan's own explicit test mandates. No scope creep beyond Tasks 2-4's stated requirements; the two new files (`PwaControllers.tsx`, `copy-workbox-runtime.mjs` + its output) exist solely to make already-mandated behavior correct and testable.

## Known Stubs

None. `shareInbox.readAndClear()` returning `null` for an empty inbox is documented intended behavior (per the plan's own `<behavior>` block), not a stub.

## Issues Encountered

None beyond the deviations documented above (all were caught and resolved within the same task, before committing).

## User Setup Required

None — no external service configuration required for this plan. (Cloudflare/GitHub/Supabase manual steps M1-M3 remain scoped to Plan 20-04 per STATE.md.)

## Next Phase Readiness

- `pnpm --filter app run build:web` produces a `dist/` directory Chrome accepts as an installable PWA with a working Service Worker, Web Share Target, and cache headers — ready for Plan 20-04's Cloudflare Pages deploy workflow.
- The four still-open device-level checks (Lighthouse installable, Chrome-on-both-Android-phones install with correct masked icon + moss status bar, second start in flight mode, Teilen from the Claude app on a `.json` file AND copied text) are explicitly deferred to Plan 20-04 per this plan's own `must_haves` (`verification: backstop`) and `20-VALIDATION.md` — they require a real Cloudflare Pages deploy and physical devices, consistent with the Masterplan's phase sequencing.
- `app/public/workbox-v7.4.1/*.js` and `app/public/icons/*` are committed generated artifacts tied to the pinned `workbox-cli@7.4.1`/`sharp@0.35.4` versions; if either devDependency is ever upgraded, re-run `node scripts/copy-workbox-runtime.mjs` and `node scripts/gen-icons.mjs` and re-commit the output.
- No blockers for Plan 20-04.

## Self-Check: PASSED

- All 13 key files verified present on disk (`[ -f ]`).
- All 7 commit hashes verified present in `git log --oneline --all`.
- All task-level `<acceptance_criteria>` re-run and passing: icon generation (7 files), manifest fields (incl. `share_target` shape), `build:web` dist assertions (manifest link, `lang="de"`, `sw.js` precache + share-target), `_headers` block/directive presence, no `404.html`.
- Plan-level `<verification>` block re-run and passing: `pnpm -r run typecheck`, `pnpm -r run lint`, `pnpm --filter app run build:web`, `bash scripts/check-claude-key-in-bundle.sh app/dist`.
- All new/changed test suites green: `shareInbox.test.ts`, `import-share.test.tsx`, `pwa-controllers.test.tsx`, `settings-install-banner.test.tsx`, `authStore.test.ts` (17/17).
- Full suites green: app 781/781 (101 suites), `@spatenstich/shared` 86/86 (7 suites) — no regression from the 769/769 baseline recorded at the start of this plan.

---
*Phase: 20-fundament-aufr-umen-pwa-deploy*
*Completed: 2026-09-13*
