---
phase: 2
slug: auth-profile-vereinsregeln
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-19
updated: 2026-04-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Updated after Plans 02-01..02-04 created — all `TBD` and `2-??-XX` placeholders replaced with real IDs.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + jest-expo ~53.0.0 (multi-project from Plan 02-01: app, stores, hooks, shared, node) |
| **Config file** | `app/jest.config.ts` (multi-project) + `packages/shared/jest.config.js` |
| **Quick run command** | `pnpm --filter app test -- --passWithNoTests` |
| **Full suite command** | `pnpm test` (runs app + shared) |
| **Edge Function tests** | `cd supabase/functions/extract-vereinsregeln && deno test --allow-read __tests__/parseRules.test.ts` |
| **Estimated runtime** | ~30 seconds (app) + ~5 seconds (shared) + ~5 seconds (deno) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter app test -- --passWithNoTests`
- **After every plan wave:** Run `pnpm test`
- **After Plan 02-03 commit:** Additionally run `deno test` for parseRules
- **Before `/gsd-verify-work`:** Full suite (app + shared + deno) must be green
- **Max feedback latency:** ~30 seconds per project

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 02-01 | 1 | AUTH-01, PROF-01, RULES-03, RULES-04, NFR-07 | T-2-01-02 | Domain types + i18n bundle + BKleingG seed exist | Unit (jest shared) | `pnpm --filter @spatenstich/shared test -- klimazonen.test vereinsregeln.test i18n.test` | ✅ created | ⬜ pending |
| 2-01-02 | 02-01 | 1 | AUTH-02, AUTH-03 | T-2-01-01 | LargeSecureStore wraps AES-256 + AsyncStorage; getOrCreateLocalUUID stable | Unit (mock SecureStore + AsyncStorage) | `pnpm --filter app test -- largeSecureStore.test auth.test authStore.test` | ✅ created | ⬜ pending |
| 2-01-03 | 02-01 | 1 | AUTH-01..05, PROF-01..04, RULES-01..05 | T-2-01-08 | profiles + vereinsregeln tables + storage bucket + RLS | Migration | `supabase db lint --project-ref $REF` | ✅ created | ⬜ pending |
| 2-01-04 | 02-01 | 1 | AUTH-01..05, PROF-01..04, RULES-01..05 | T-2-01-09 | Schema applied + RLS isolation tested with SET LOCAL ROLE | Integration (db push + rls test) | `supabase db push --linked && psql -f supabase/tests/rls_phase2.sql` | ✅ created (BLOCKING) | ⬜ pending |
| 2-02-01 | 02-02 | 2 | PROF-02, PROF-04 | T-2-02-03 | profileRepo branches account/local; profileStore no persist | Unit (mock supabase + storage) | `pnpm --filter app test -- profileStore.test` | ✅ created | ⬜ pending |
| 2-02-02 | 02-02 | 2 | AUTH-01, AUTH-02, AUTH-03, AUTH-05, NFR-07 | T-2-02-01 | Stack.Protected guards (auth)/(app); Auth-Wahl + signUp + signIn + verify-email + Garten-Plan-Placeholder | Typecheck + manual (covered by 2-04-04) | `pnpm --filter app typecheck` | ✅ created | ⬜ pending |
| 2-02-03 | 02-02 | 2 | PROF-01, PROF-02, PROF-03, PROF-04 | T-2-02-04 | Profile-Übersicht + PLZ + Archetype screens with InlineBanner + TrafficLightBadge neutral | Typecheck + manual (covered by 2-04-04) | `pnpm --filter app typecheck` | ✅ created | ⬜ pending |
| 2-02-04 | 02-02 | 2 | AUTH-05 | — | Onboarding completes in &lt; 5 min | Manual checkpoint | — (human-verify) | Manual only | ⬜ pending |
| 2-03-01 | 02-03 | 2 | RULES-01 | T-2-03-02, T-2-03-10 | parseRules pure deterministic + EXTRACTION_PROMPT German | Unit (deno test) | `cd supabase/functions/extract-vereinsregeln && deno test --allow-read __tests__/parseRules.test.ts` | ✅ created | ⬜ pending |
| 2-03-02 | 02-03 | 2 | RULES-01 | T-2-03-01, T-2-03-04, T-2-03-09 | Edge Function compiles, deploys, OPTIONS works, path-prefix guard | Deno check + CI deploy + Dashboard invoke | `deno check supabase/functions/extract-vereinsregeln/index.ts` | ✅ created | ⬜ pending |
| 2-03-03 | 02-03 | 2 | RULES-01 | T-2-03-04 | Client wrapper 55s timeout + AbortSignal + typed errors | Unit (mock supabase.functions.invoke) | `pnpm --filter app test -- extractVereinsregeln.test` | ✅ created | ⬜ pending |
| 2-04-01 | 02-04 | 3 | RULES-02, RULES-03, RULES-04 | T-2-04-01 | Store + Repo enforce RULES-04 at 3 layers; mode-aware persistence | Unit (mock supabase + storage) | `pnpm --filter app test -- vereinsregelnStore.test vereinsregelnRepo.test && pnpm --filter @spatenstich/shared test -- vereinsregeln.test` | ✅ created | ⬜ pending |
| 2-04-02 | 02-04 | 3 | RULES-01, RULES-02, RULES-03, RULES-04, RULES-05 | T-2-04-06 | 5 Vereinsregeln screens + VereinsregelRow lock-icon-no-switch for BKleingG; ExtractionLoader cancel | Typecheck + manual (covered by 2-04-04) | `pnpm --filter app typecheck && pnpm --filter @spatenstich/shared test -- i18n.test` | ✅ created | ⬜ pending |
| 2-04-03 | 02-04 | 3 | AUTH-04 | T-2-04-02, T-2-04-03 | Settings + migrateLocalToAccount with rollback safety + Sentry user reset | Unit (mock supabase + storage + authStore) | `pnpm --filter app test -- migrateLocalToAccount.test && pnpm --filter app typecheck` | ✅ created | ⬜ pending |
| 2-04-04 | 02-04 | 3 | AUTH-04, AUTH-05, RULES-01, RULES-04, RULES-05, NFR-07 | — | End-to-end smoke on web + native; AUTH-05 stopwatched &lt; 5 min | Manual checkpoint | — (human-verify) | Manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Status

All Wave 0 test stubs were CREATED in Plan 02-01 (Task 2-01-01 + 2-01-02), so Wave 0 is **complete before Wave 1 executes**. The stubs establish file-existence + import-resolution; concrete assertions are layered in by Plans 02-04 (vereinsregeln.test extension) and 02-03 (parseRules.test as a fresh deno test, not extending a stub).

- [x] `app/src/lib/__tests__/largeSecureStore.test.ts` — created in 2-01-02 (AUTH-02)
- [x] `app/src/lib/__tests__/auth.test.ts` — created in 2-01-02 (AUTH-01, AUTH-03)
- [x] `app/src/stores/__tests__/profileStore.test.ts` — stub in 2-01-02, asserts in 2-02-01 (PROF-02, PROF-04)
- [x] `app/src/stores/__tests__/authStore.test.ts` — created in 2-01-02 (AUTH-03)
- [x] `packages/shared/src/__tests__/klimazonen.test.ts` — created in 2-01-01 (PROF-01)
- [x] `packages/shared/src/__tests__/vereinsregeln.test.ts` — stub in 2-01-01, extended in 2-04-01 (RULES-02, RULES-03, RULES-04)
- [x] `packages/shared/src/__tests__/i18n.test.ts` — created in 2-01-01 (NFR-07 Haftungsausschluss key + others)
- [x] `app/src/storage/__tests__/migration.test.ts` — created in 2-01-02 (storage v2 migration; AUTH-04 functional test in 2-04-03 covers migrateLocalToAccount separately)

---

## Manual-Only Verifications

| Behavior | Requirement | Where Verified | Test Instructions |
|----------|-------------|----------------|-------------------|
| Onboarding completes in &lt; 5 minutes | AUTH-05 | Task 2-04-04 step C | Stopwatch the local-mode happy path: Lokal starten → PLZ → Archetyp → Checklist → Profil mit allen 3 Bannern erfüllt |
| PDF/image upload → rule extraction | RULES-01 | Task 2-04-04 step B6-B7 (or Plan 02-03 user_setup dashboard invoke) | Native: tap PDF hochladen → wait 10-30s → confirm rules appear. Dashboard: invoke `extract-vereinsregeln` with sample PDF storagePath |
| BKleingG 1/3 placeholder shown | RULES-05 | Task 2-04-04 step B8 | Profile screen shows TrafficLightBadge in stone/neutral with "Plan noch nicht vorhanden" |
| Local→Account migration end-to-end | AUTH-04 | Task 2-04-04 step A10-A11 | Migrate local data → verify Supabase rows + Settings flips to account UI |
| RULES-04 enforcement (BKleingG non-deletable) | RULES-04 | Task 2-04-04 step D | Inspect confirm screen DOM/components: BKleingG rows have NO Switch element |
| NFR-07 Haftungsausschluss visible | NFR-07 | Task 2-04-04 step A2 | Auth-Wahl screen → tap "Rechtlicher Hinweis" chevron → text expands |

---

## Source Audit (Phase 2 Coverage)

All 15 Phase 2 requirements are addressed across the 4 plans:

| Source ID | Type | Covered by | Status |
|-----------|------|------------|--------|
| AUTH-01 (signup with email/password) | REQ | 2-01-02, 2-02-02 | ✅ planned |
| AUTH-02 (session persists in encrypted storage) | REQ | 2-01-02 (LargeSecureStore) | ✅ planned |
| AUTH-03 (local-mode UUID via expo-secure-store) | REQ | 2-01-02 (getOrCreateLocalUUID) | ✅ planned |
| AUTH-04 (local→account migration) | REQ | 2-04-03 (migrateLocalToAccount) | ✅ planned |
| AUTH-05 (onboarding < 5 min) | REQ | 2-02-04 + 2-04-04 (manual checkpoint) | ✅ planned |
| PROF-01 (PLZ → Klimazone) | REQ | 2-01-01 (PLZ_KLIMAZONE_MAP), 2-02-03 (PLZ screen) | ✅ planned |
| PROF-02 (Archetyp selection from 6) | REQ | 2-02-01 (profileStore), 2-02-03 (archetype screen) | ✅ planned |
| PROF-03 (banners on missing fields) | REQ | 2-02-03 (Profile-Übersicht InlineBanners) | ✅ planned |
| PROF-04 (PLZ change updates Klimazone immediately) | REQ | 2-01-01 (lookupKlimazone), 2-02-03 (instant render) | ✅ planned |
| RULES-01 (Edge Function PDF→rules) | REQ | 2-03-01..03 (parseRules, EF, client wrapper), 2-04-02 (UI hook-up) | ✅ planned |
| RULES-02 (toggle persistence) | REQ | 2-04-01 (vereinsregelnStore + repo round-trip tests) | ✅ planned |
| RULES-03 (~10-15 manual checklist defaults) | REQ | 2-01-01 (STANDARD_VEREINSREGELN_CHECKLIST), 2-04-02 (checklist screen) | ✅ planned |
| RULES-04 (BKleingG rules non-deletable) | REQ | 2-01-01 (seed istBKleingG=true), 2-04-01 (3-layer guard), 2-04-02 (lock icon UI) | ✅ planned |
| RULES-05 (BKleingG 1/3 placeholder) | REQ | 2-02-03 (TrafficLightBadge neutral state), 2-04-04 step B8 verify | ✅ planned |
| NFR-07 (Haftungsausschluss) | REQ | 2-01-01 (i18n key common.disclaimer_body), 2-02-02 ((auth)/index collapsible block), 2-04-04 step A2 verify | ✅ planned |
| D-01..D-13 (CONTEXT decisions) | CONTEXT | All 4 plans reference D-IDs in task actions | ✅ planned |

No unplanned items. No source audit gaps.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (manual checkpoints 2-02-04 and 2-04-04 are unavoidable per AUTH-05/RULES-01/NFR-07 nature)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every plan has unit tests except checkpoint tasks)
- [x] Wave 0 covers all MISSING references (all 8 stubs created in 02-01 before 02-02..04 consume them)
- [x] No watch-mode flags
- [x] Feedback latency &lt; 30s per project
- [x] `nyquist_compliant: true` set in frontmatter
- [x] `wave_0_complete: true` set in frontmatter

**Approval:** ready for execution
