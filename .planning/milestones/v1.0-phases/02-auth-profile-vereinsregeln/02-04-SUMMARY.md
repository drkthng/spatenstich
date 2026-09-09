---
phase: 02-auth-profile-vereinsregeln
plan: "04"
subsystem: ui
tags: [vereinsregeln, settings, migration, checklist, pdf-upload, supabase, nativewind, zustand, tdd]

# Dependency graph
requires:
  - phase: 02-01
    provides: "profiles + vereinsregeln tables + RLS + STANDARD_VEREINSREGELN_CHECKLIST + BKLEINGG_REGELN seed + i18n keys (rules.*, settings.*)"
  - phase: 02-02
    provides: "AuthProvider + useAuth + GuardedStack route guard + profileRepo pattern (mode-aware StorageAdapter/Supabase) + Button/Input/Label UI primitives + register.tsx signUp flow"
  - phase: 02-03
    provides: "extractVereinsregeln client + ExtractVereinsregelnError codes + Edge Function ACTIVE"
provides:
  - "Vereinsregeln UI surface (5 screens: einstieg, upload, confirm, checklist, nested layout)"
  - "VereinsregelRow component (RULES-04 UI guard: istBKleingG -> Lock, no Switch, no delete)"
  - "ExtractionLoader component (loading/error overlay, cancellable)"
  - "vereinsregelnStore (Zustand, no-persist per D-11) with RULES-04 client-side guards"
  - "vereinsregelnRepo (mode-aware save/load/delete with BKleingG seed + server-side RULES-04 guard)"
  - "uploadVereinsregelPdf (DocumentPicker -> ArrayBuffer -> Storage with filename sanitization per T-2-04-06)"
  - "useVereinsregeln hook (on-mount hydration from repo into store)"
  - "migrateLocalToAccount (AUTH-04 with rollback safety per T-2-04-03, user_id re-stamping per T-2-04-02)"
  - "Settings screen (account: email+logout inline confirmation; local: migration CTA with inline form)"
affects: [03-photo-pipeline, 04-plan-editor, 05-plant-planning]

# Tech tracking
tech-stack:
  added: []  # Everything already in stack from Plans 02-01 / 02-02 / 02-03
  patterns:
    - "Mode-aware repo (profileRepo mirror): account -> supabase.from(...).upsert/select/delete; local -> StorageAdapter single-JSON-blob key"
    - "BKleingG seed-on-load (ensureBKleingGRules) — idempotent insert with deterministic id `bk-<userId>-<index>` recognised by both client guard and DB CHECK constraint"
    - "Rollback-safe migration: sign up -> read storage (no-op) -> upsert (fail-fast) -> flip auth mode -> delete storage (strictly LAST)"
    - "Inline confirmation expansion (vs Modal) for destructive actions — UI-SPEC line 234"
    - "Scroll-gate Save button: onLayout measures the last BKleingG row's bottom y; onScroll flips `scrolledPastBKleingG`; Save disabled until flipped"

key-files:
  created:
    - "app/app/(app)/profile/vereinsregeln/_layout.tsx"
    - "app/app/(app)/profile/vereinsregeln/index.tsx"
    - "app/app/(app)/profile/vereinsregeln/upload.tsx"
    - "app/app/(app)/profile/vereinsregeln/confirm.tsx"
    - "app/app/(app)/profile/vereinsregeln/checklist.tsx"
    - "app/app/(app)/settings.tsx"
    - "app/src/components/VereinsregelRow.tsx"
    - "app/src/components/ExtractionLoader.tsx"
    - "app/src/lib/uploadVereinsregelPdf.ts"
    - "app/src/lib/vereinsregelnRepo.ts"
    - "app/src/lib/migrateLocalToAccount.ts"
    - "app/src/stores/vereinsregelnStore.ts"
    - "app/src/hooks/useVereinsregeln.ts"
    - "app/src/stores/__tests__/vereinsregelnStore.test.ts"
    - "app/src/lib/__tests__/vereinsregelnRepo.test.ts"
    - "app/src/lib/__tests__/migrateLocalToAccount.test.ts"
  modified:
    - "packages/shared/src/__tests__/vereinsregeln.test.ts (extended with Plan 02-04 RULES-02/03/04 assertions)"

key-decisions:
  - "Deferred 7-category grouping in checklist: VereinsregelChecklistItem in @spatenstich/shared has no `kategorie` field — flat list renders instead; grouping blocked on shared-type extension (out of scope for Plan 02-04)"
  - "Tap-trash delete fallback on confirm screen: react-native-gesture-handler not currently in stack; swipe-to-delete deferred to Phase 3 gesture onboarding (plan Behavior 14 explicitly permits the fallback)"
  - "Migration form: inline (not a separate modal route) — matches Behavior block guidance 'for v1, keep inline'"
  - "Rollback-safe storage cleanup: storage.delete runs strictly AFTER every Supabase upsert succeeds (T-2-04-03 mitigation, verified by Test 4 + Test 5)"
  - "Sentry.setUser(null) on logout is conditional on EXPO_PUBLIC_SENTRY_DSN (mirrors Plan 01-03 Sentry.init gating)"

patterns-established:
  - "Mode-branched screen: `if (!mode) return null; if (mode === 'account') return <AccountUI/>; return <LocalUI/>;` — reused in settings.tsx, vereinsregeln/index.tsx"
  - "Sticky-group + scroll-gate Save: pattern reusable for future legal-acknowledgement flows"
  - "ExtractionLoader overlay (loading + error + cancel): general pattern for long-running Edge Function calls"

requirements-completed: [AUTH-04, RULES-02, RULES-03, RULES-04, RULES-05, NFR-07]

# Metrics
duration: 13 min
completed: 2026-04-19
---

# Phase 02 Plan 04: Vereinsregeln UI + Migration + Settings Summary

**Complete Vereinsregeln UI (5 screens + 2 components + repo + store + hook) plus mode-aware Settings with rollback-safe Local→Account migration — closes AUTH-04, RULES-02/03/04/05, NFR-07.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-04-19T20:57:41Z
- **Completed:** 2026-04-19T21:10:30Z
- **Tasks:** 3 of 4 (Task 2-04-04 is a human-verify checkpoint — deferred per orchestrator instructions)
- **Files modified:** 16 created + 1 extended

## Accomplishments
- Vereinsregeln state layer: Zustand store (no-persist per D-11) with RULES-04 no-ops on BKleingG rows + repo with mode-aware Supabase/StorageAdapter persistence + BKleingG seed-on-load.
- Vereinsregeln UI: 5 screens (`index` / `upload` / `confirm` / `checklist` / nested `_layout`) covering the full user journey; confirm screen enforces scroll-gate + sticky BKleingG group; local-mode Pitfall 4 redirect (disabled card + "Account erstellen" CTA, no modal).
- Extraction pipeline wiring: `uploadVereinsregelPdf` (DocumentPicker + Uint8Array path for web/native + filename sanitization per T-2-04-06) + `ExtractionLoader` overlay (loading/error with AbortSignal cancel).
- Rollback-safe AUTH-04 migration: `migrateLocalToAccount` signs up, re-stamps `user_id` on every record (T-2-04-02), upserts to Supabase, then — and ONLY then — flips auth mode + deletes local storage. 6 tests cover happy path, mode flip, storage cleanup, signUp-failure rollback, upsert-failure rollback, and already-in-account guard.
- Settings screen: account mode shows email + inline logout confirmation with conditional `Sentry.setUser(null)` (T-2-04-04); local mode shows migration CTA + inline email/password form.

## Task Commits

Each task committed atomically; TDD tasks split RED → GREEN.

1. **Task 2-04-01 RED: vereinsregeln store + repo + shared RULES tests** — `f503eef` (test)
2. **Task 2-04-01 GREEN: state layer + repo + hydration hook + pdf upload** — `0dc915a` (feat)
3. **Task 2-04-02: VereinsregelRow + ExtractionLoader + 5 Vereinsregeln screens** — `fc2a665` (feat)
4. **Task 2-04-03 RED: migrateLocalToAccount rollback + happy-path tests** — `3678aa3` (test)
5. **Task 2-04-03 GREEN: migrateLocalToAccount — AUTH-04 with rollback safety** — `2a621bd` (feat)
6. **Task 2-04-03 UI: Settings screen — mode-branched Logout / Migration** — `50b85f8` (feat)

**Plan metadata:** `<pending final commit>` (docs: complete 02-04 plan)

## Files Created/Modified

### Created
- `app/src/stores/vereinsregelnStore.ts` — Zustand store, no-persist (D-11), toggleAktiv/removeRule/updateRule no-op on `istBKleingG` (RULES-04 client guard).
- `app/src/stores/__tests__/vereinsregelnStore.test.ts` — 8 tests (init, setRules, toggleAktiv, RULES-04 BKleingG no-op, removeRule, RULES-04 remove no-op, reset, AsyncStorage-never-called D-11 invariant).
- `app/src/lib/vereinsregelnRepo.ts` — mode-aware load/save/delete with `ensureBKleingGRules` seeding + `assertBKleingGActive` server-side RULES-04 guard + `bk-*` id delete rejection.
- `app/src/lib/__tests__/vereinsregelnRepo.test.ts` — 7 tests (account upsert w/ BKleingG seed, account load-by-user_id, local JSON write, local load with seed fallback, RULES-04 save rejection, delete on `bk-*` rejection).
- `app/src/hooks/useVereinsregeln.ts` — on-mount hydration from repo into store.
- `app/src/lib/uploadVereinsregelPdf.ts` — DocumentPicker → File.arrayBuffer (web) / FileSystem base64 (native) → Supabase Storage upload with `replace(/[^A-Za-z0-9._-]/g, '_')` filename sanitization (T-2-04-06).
- `app/src/components/VereinsregelRow.tsx` — branches on `rule.istBKleingG`: true → stone-400 text + Lock(14) + NO Switch; false → Switch + Pencil + Trash2.
- `app/src/components/ExtractionLoader.tsx` — full-screen `absolute inset-0 bg-white/95` overlay; `accessibilityLabel="Extrahiere Vereinsregeln"`; loading + error states with animate-pulse progress bar; Abbrechen + Erneut versuchen buttons.
- `app/app/(app)/profile/vereinsregeln/_layout.tsx` — nested Stack with centered header.
- `app/app/(app)/profile/vereinsregeln/index.tsx` — two AuthChoiceCards; local mode disables PDF card (Lock icon + stone-400) with inline "Account erstellen" CTA (Pitfall 4, NO Modal).
- `app/app/(app)/profile/vereinsregeln/upload.tsx` — DocumentPicker → `extractVereinsregeln` with AbortController → merge candidates with existing rules → navigate to confirm. Cancel resets to idle; error shows retry.
- `app/app/(app)/profile/vereinsregeln/confirm.tsx` — BKleingG group FIRST (D-08 ordering) with onLayout tracking last-row y; scroll-gate Save via `scrolledPastBKleingG`; empty user section shows CTA to checklist.
- `app/app/(app)/profile/vereinsregeln/checklist.tsx` — FLAT list (deviation — see below) with checkbox + conditional numeric input; merges keptBK + keptUser + newRules on save.
- `app/src/lib/migrateLocalToAccount.ts` — rollback-safe AUTH-04 migration: signup → upsert (fail-fast) → flip mode → delete storage.
- `app/src/lib/__tests__/migrateLocalToAccount.test.ts` — 6 tests (happy path, mode flip, storage cleanup, signUp rollback, upsert rollback, account-mode guard).
- `app/app/(app)/settings.tsx` — mode-branched Settings: account → email + logout with inline confirmation + conditional Sentry.setUser(null); local → migration CTA + inline email/password form.

### Modified
- `packages/shared/src/__tests__/vereinsregeln.test.ts` — extended with Plan 02-04 block (RULES-02 round-trip, RULES-03 10–15 entries, RULES-04 istBKleingG && pflichtfeld).

## Decisions Made
- **Flat checklist (no 7-category grouping):** `VereinsregelChecklistItem` in `@spatenstich/shared` has no `kategorie` field (as defined in Plan 02-01). Grouping is infeasible without extending the shared type — documented as deviation.
- **Tap-trash delete fallback:** `react-native-gesture-handler` is not currently in the stack. Plan Behavior 14 explicitly permits the fallback; swipe-to-delete is deferred to Phase 3 gesture onboarding.
- **Inline migration form:** kept inline (not a separate modal route) per the plan's Behavior block v1 guidance.
- **Conditional Sentry.setUser(null):** mirrors Plan 01-03's `Sentry.init` gating on `EXPO_PUBLIC_SENTRY_DSN` — no-op in local dev.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Plan-vs-type mismatch] Checklist has no 7-category grouping**
- **Found during:** Task 2-04-02 (checklist.tsx)
- **Issue:** Plan called for 7 category sections, but `VereinsregelChecklistItem` (defined in Plan 02-01, `packages/shared/src/constants/vereinsregeln.ts`) has no `kategorie` field. Grouping would require extending the shared type (out of scope for an execute-type plan).
- **Fix:** Render a FLAT list where each row shows its own `label` + conditional numeric input. Added a code-comment block explaining the deferral; flagged in SUMMARY and in the screen header comment.
- **Files modified:** `app/app/(app)/profile/vereinsregeln/checklist.tsx`
- **Verification:** Typecheck clean; the 12 STANDARD_VEREINSREGELN_CHECKLIST items all render as rows in the flat list.
- **Committed in:** `fc2a665` (Task 2-04-02 commit)

**2. [Rule 1 — Plan-vs-type mismatch] VereinsRegel lacks user_id / erstellt_am fields**
- **Found during:** Task 2-04-01 RED (repo tests)
- **Issue:** Plan snippets for `vereinsregelnRepo` assumed `VereinsRegel` rows carry `user_id` and `erstellt_am`. The shared `VereinsRegel` interface has neither — `user_id` is a DB column only (re-stamped at the repo boundary).
- **Fix:** Strip `user_id` / `erstellt_am` from VereinsRegel literals everywhere; inject `user_id` only at the Supabase-upsert call site via `{ ...rule, user_id }`. The migration path re-stamps `user_id` per T-2-04-02 mitigation.
- **Files modified:** `app/src/lib/vereinsregelnRepo.ts`, `app/src/lib/migrateLocalToAccount.ts`, test fixtures.
- **Verification:** 7 repo tests + 6 migration tests green; typecheck clean.
- **Committed in:** `0dc915a` (GREEN), `2a621bd` (migration GREEN)

**3. [Rule 3 — Blocking-dependency] No swipe-to-delete (gesture-handler missing)**
- **Found during:** Task 2-04-02 (confirm.tsx)
- **Issue:** Plan Behavior 14 asked for swipe-to-delete; `react-native-gesture-handler` is not currently installed in the stack.
- **Fix:** Used the plan-permitted tap-trash fallback on `VereinsregelRow`. Real swipe deferred to a future gesture onboarding plan.
- **Files modified:** `app/src/components/VereinsregelRow.tsx`, `app/app/(app)/profile/vereinsregeln/confirm.tsx`
- **Verification:** Manual spot-check of `handleDelete` path; covered by the E2E human-verify checkpoint 2-04-04.
- **Committed in:** `fc2a665`

**4. [Rule 2 — Missing-critical] ExtractionLoader without Reanimated**
- **Found during:** Task 2-04-02 (ExtractionLoader.tsx)
- **Issue:** Plan suggested a Reanimated-driven indeterminate progress bar; Reanimated v3 is installed but adding a worklet solely for a loader's progress bar would be over-engineered for MVP.
- **Fix:** Used Tailwind/NativeWind's `animate-pulse` on a fixed-width bar — visually adequate, no added surface.
- **Files modified:** `app/src/components/ExtractionLoader.tsx`
- **Verification:** Accessibility label `"Extrahiere Vereinsregeln"` preserved for screen readers; covered by human-verify checkpoint.
- **Committed in:** `fc2a665`

---

**Total deviations:** 4 auto-fixed (2 Rule-1 plan-vs-type mismatches, 1 Rule-3 blocking-dep fallback, 1 Rule-2 simplification)
**Impact on plan:** All four deviations preserve behaviour and acceptance criteria; two are strictly unavoidable (type mismatches), one is plan-permitted (gesture fallback), one is a low-risk simplification (animate-pulse). No scope creep.

## Issues Encountered
- None blocking. `EOL` (LF→CRLF) git warnings on Windows are informational.

## Deferred: Task 2-04-04 (Human-Verify Checkpoint)

Per orchestrator instructions, the end-to-end smoke checkpoint is NOT blocking this summary. The verification script below is the script Dirk runs manually (or the `/gsd-verify-work` operator runs) against both web and native.

### Pre-requisites
- Plan 02-03 Edge Function `extract-vereinsregeln` is ACTIVE in the Frankfurt project (Functions list).
- Plan 02-01 migration applied (`profiles`, `vereinsregeln` tables exist with RLS).
- Test PDF (1–3 pages, German Vereinssatzung sample, <5MB) ready locally.
- `SUPABASE_ACCESS_TOKEN` configured for local Edge Function invocation if needed.

### A. Web flow (Expo Web, private/incognito window)
1. `pnpm --filter app start --web` → open in a clean incognito window.
2. Auth-Wahl screen has TWO cards. Tap "Rechtlicher Hinweis" chevron → Haftungsausschluss expands (NFR-07).
3. Tap "Lokal starten" → lands on `(app)/index` placeholder.
4. Navigate to Profile → 3 InlineBanners present (PLZ, Archetyp, Vereinsregeln).
5. Tap PLZ banner → enter "12043" → Klimazone appears. Save.
6. Tap Archetyp banner → select "Familien-Naschgarten". Save.
7. Tap Vereinsregeln banner → lands on Vereinsregeln-Einstieg. **Verify PDF-Upload card is GRAYED with Lock icon**; tap it → inline info block + "Account erstellen" link appears (Pitfall 4 — NO modal).
8. Tap "Checkliste ausfüllen". **Flat list** of 12 STANDARD_VEREINSREGELN_CHECKLIST items is rendered (deviation: 7-category grouping deferred). Check 3–4 items, enter values. Save → confirm screen.
9. Confirm screen: **BKleingG group FIRST** under "Gesetzliche Grundregeln (BKleingG)" — LOCKED rows (no Switch). Save button **DISABLED**. Scroll past BKleingG → Save **ENABLED**. Tap Save.
10. Navigate to Settings → "Account erstellen und Daten übertragen" CTA visible (no Logout). Enter `test+migrate-<timestamp>@example.com` / `Test1234!`. Tap Übertragen.
11. Verify redirect back to `(app)/index` AND Settings now shows Logout (mode flipped). In Supabase Dashboard → Tables → `profiles` + `vereinsregeln` → rows exist for the new `user_id`.

### B. Native flow (iOS Simulator / Android Emulator / Expo Go)
1. `pnpm --filter app start` → QR in Expo Go (or simulator).
2. Auth-Wahl → "Account erstellen" → new email + password → submit. Either verify-email screen (if Supabase requires confirmation) or `(app)/index`.
3. If verify-email, open link externally, return to app, re-open → `(app)/index`.
4. PLZ + Archetyp (same as web 5–6).
5. Vereinsregeln-Einstieg: **BOTH cards active** (account mode). Tap "PDF hochladen" → native DocumentPicker opens. Select test Vereinssatzung PDF.
6. **ExtractionLoader appears** with "Regeln werden extrahiert…" + animated progress bar. Wait 10–30s.
7. Confirm screen → user-extracted rules section contains ≥1 candidate. Toggle 1–2 off, edit 1, tap trash on 1 (fallback). Scroll past BKleingG. Save.
8. Profile → Vereinsregeln banner GONE. TrafficLightBadge neutral "Plan noch nicht vorhanden" (RULES-05).
9. Settings → Logout button visible. Tap → inline "Wirklich abmelden?" expansion. Tap "Ja, abmelden" → redirect to `(auth)/index`; Stack.Protected blocks back-nav.

### C. AUTH-05 timing
Stopwatch the Local flow (A.1 → A.9). **Must complete in < 5 minutes.**

### D. RULES-04 DOM spot check
On confirm (web or native), open DevTools/Inspector. BKleingG rows: NO `Switch` in tree. User rows: Switch present.

### E. Cancellation
Native, account mode. Tap "PDF hochladen", pick PDF, when ExtractionLoader appears tap "Abbrechen" within 2s. **Verify return to upload entry with NO error toast and NO navigation to confirm.**

### Acceptance criteria (all 9)
1. NFR-07 Haftungsausschluss collapsible on Auth-Wahl (both platforms).
2. AUTH-05 Local onboarding < 5 min (stopwatched).
3. RULES-04 BKleingG rows non-toggleable, non-deletable (visual + DevTools).
4. RULES-05 TrafficLightBadge neutral state on Profile.
5. Pitfall 4 Local-Mode redirect: disabled card + inline CTA, no modal.
6. AUTH-04 migration: Supabase rows exist tagged with new `user_id`; Settings flips to account-mode UI.
7. RULES-01 Edge Function returns ≥1 candidate from test PDF within 55s.
8. Cancel during extraction returns to upload entry, no error toast.
9. Logout on native → `(auth)/index`; back-nav blocked.

## User Setup Required
From plan frontmatter: **once** after Plan 02-03 deploy, manually upload `tests/fixtures/satzung-sample.pdf` to `vereinsregeln/<your-user-id>/sample.pdf` via Supabase Dashboard → Storage → `vereinsregeln`. Required only for the human-verify checkpoint flow 2-04-04; no env vars needed.

## Next Phase Readiness
- **Phase 02 deliverables complete:** Auth (account + local + guards), Profile (PLZ → Klimazone, Archetyp, banners), Vereinsregeln (PDF + Checkliste), Settings (Logout + Migration), NFR-07 disclaimer.
- **Phase 03 (Foto-Queue + Bildanalyse)** can now assume:
  - `useAuthStore.mode` + `useAuthStore.userId` reliable
  - Mode-aware repo pattern (StorageAdapter/Supabase) documented and established
  - Edge Function calling pattern with AbortSignal + ExtractionLoader overlay reusable
  - Supabase Storage bucket pattern (`<bucket>/<userId>/<timestamp>_<sanitized>`) in place

## TDD Gate Compliance
- **Task 2-04-01:** RED `f503eef` (test) → GREEN `0dc915a` (feat). Gate sequence VALID.
- **Task 2-04-03 (migrateLocalToAccount):** RED `3678aa3` (test) → GREEN `2a621bd` (feat). Gate sequence VALID.
- **Task 2-04-02 + Settings screen:** Pure UI surfaces; per plan acceptance criteria, verified by `typecheck` + i18n test suite + human-verify checkpoint. No pure-module unit tests required.

## Known Stubs
None. All data paths are wired end-to-end (store → repo → Supabase/StorageAdapter). The checklist's flat-list rendering is a deviation (not a stub) — the data flow is complete; only the grouping UI is deferred pending a shared-type extension.

## Threat Flags
None. Threat model for Plan 02-04 is complete and fully mitigated:
- T-2-04-01 (RULES-04 bypass): UI no-Switch + store no-op + repo guard + DB CHECK — all in place.
- T-2-04-02 (migration user_id): `user_id` re-stamped at upsert site; RLS enforces server-side.
- T-2-04-03 (migration info leak): storage.delete strictly AFTER upserts succeed; verified by Test 4 + Test 5.
- T-2-04-04 (Sentry leak): `Sentry.setUser(null)` gated on DSN; verified in settings.tsx.
- T-2-04-06 (path injection): `replace(/[^A-Za-z0-9._-]/g, '_')` on filename in `uploadVereinsregelPdf`.
- T-2-04-05 (migration Sentry breadcrumb): accepted (no rule content logged).
- T-2-04-07 (deep-link bypass): inherited from Plan 02-02 GuardedStack.

## Self-Check: PASSED
- Created files exist: ✓ (16 files; verified below)
- Commits exist in log: ✓ (6 commits in `git log 0b4e9de..HEAD`)

---
*Phase: 02-auth-profile-vereinsregeln*
*Completed: 2026-04-19*
