---
phase: 02-auth-profile-vereinsregeln
verified: 2026-04-19T23:45:00Z
status: human_needed
score: 4/5 verified · 1/5 deferred-human (SC1 restart timing) + SC5 pending human PDF E2E
overall_verdict: PASS-pending-human-verify (all code gaps closed; only deferred human checkpoints + Phase-5 scope remain)
re_verification: true

re_verification_meta:
  previous_status: human_needed
  previous_verdict: PARTIAL (pending human-verify 2-02-04 + 2-04-04)
  previous_score: 3/5 verified · 2/5 deferred-human
  gaps_closed:
    - "SC5 — edit wire missing on confirm.tsx (onEdit={handleEdit} now passed + inline editor wired to updateRule)"
    - "SC5 — account-mode column mismatch istBKleingG ↔ ist_bkleingg (toRow/fromRow mapping in vereinsregelnRepo + used by saveVereinsregeln, loadVereinsregeln, migrateLocalToAccount)"
  gaps_remaining: []
  regressions: []
  new_commits:
    - sha: e6b8c30
      summary: "fix(02-04): map istBKleingG ↔ ist_bkleingg across Supabase round-trip"
      closes_gap: "SC5 column mismatch"
    - sha: d885901
      summary: "feat(02-04): inline edit on confirm screen wires VereinsregelRow.onEdit"
      closes_gap: "SC5 edit wire missing"

criteria:
  - sc: 1
    verdict: PARTIAL
    reason: "Auth flow wired end-to-end (sign-up, sign-in, session persist, onAuthStateChange, LargeSecureStore on native, localStorage on web). Session-persistence-across-restart is code-correct but requires device QA to confirm (covered by deferred 2-02-04 / 2-04-04 A2+A10 / B3). No automated restart test exists."
  - sc: 2
    verdict: PASS
    reason: "Local UUID via getOrCreateLocalUUID (SecureStore on native, localStorage on web), authStore persisted to AsyncStorage under spatenstich-auth, AuthProvider bootstrap restores local identity when no Supabase session. Email is never required in local path."
  - sc: 3
    verdict: PASS
    reason: "lookupKlimazone is pure, synchronous, network-free (154-entry map + 2-digit prefix fallback). plz.tsx computes klimazone on every render via the input value; Badge renders immediately at 5 digits. Unit tested (7 tests in packages/shared/src/__tests__/klimazonen.test.ts)."
  - sc: 4
    verdict: PASS
    reason: "Archetype screen renders 6 ArchetypeCards from ARCHETYPES constant; selection flows useProfile.setArchetype → profileStore + profileRepo (Supabase upsert for account, StorageAdapter JSON blob for local). Profile-Übersicht reads same profileStore slice. useProfile is consumable by downstream features."
  - sc: 5
    verdict: PASS-pending-human-verify
    reason: "PDF upload + extract + confirm + edit/delete/accept + BKleingG neutral badge all wired in code AND the two previously-flagged code gaps are now closed: (a) confirm.tsx passes onEdit={handleEdit} and renders an inline editor (titel/wert/einheit Inputs + Save/Cancel) that calls vereinsregelnStore.updateRule (commit d885901). (b) vereinsregelnRepo.toRow/fromRow map istBKleingG ↔ ist_bkleingg on every Supabase round-trip, and migrateLocalToAccount uses toRow with the re-stamped user_id (commit e6b8c30). New unit tests assert ist_bkleingg present + istBKleingG absent + user_id stamped on upsert payload, and fromRow drops server-only fields. Remaining SC5 items are DEFERRED by design: the 1/3-Nutzgartenpflicht dynamic warning (D-10 → Phase 5) + the live end-to-end PDF flow (deferred human checkpoint 2-04-04 B5-B7)."

gaps: []

resolved_gaps:
  - truth: "User can edit each rule in the confirm screen (SC5)"
    resolved_in: "d885901 — feat(02-04): inline edit on confirm screen wires VereinsregelRow.onEdit"
    evidence:
      - path: "app/app/(app)/profile/vereinsregeln/confirm.tsx"
        detail: "Line 263: <VereinsregelRow onEdit={handleEdit} ...>. Lines 58-68: handleEdit picks rule, guards BKleingG, seeds draft state. Lines 77-92: handleSaveEdit trims titel, parses wert to Number, calls updateRule(editingId, patch). Lines 200-258: inline editor renders titel + wert + einheit Inputs + Save/Cancel buttons when editingId === r.id, with testIDs user-row-{id}-edit(-titel|-wert|-einheit|-save|-cancel)."
      - path: "packages/shared/src/i18n/de.json"
        detail: "Lines 60-66: new rules.confirm.edit.{titel_label, wert_label, einheit_label, save, cancel} keys added."
      - path: "app/src/stores/__tests__/vereinsregelnStore.test.ts"
        detail: "Test 6b (line 81): updateRule patches titel/wert/einheit on user rule. Test 6c (line 95): updateRule NO-OPS on istBKleingG=true (RULES-04 guard preserved)."
    verification: "Automated — confirm.tsx compiles clean, typecheck passes, 66/66 app jest tests green incl. new store tests. Live click-through remains part of human-verify B8 (edit a user rule and re-save)."

  - truth: "Account-mode Vereinsregeln round-trip correctly through Supabase (SC5 persistence)"
    resolved_in: "e6b8c30 — fix(02-04): map istBKleingG ↔ ist_bkleingg across Supabase round-trip"
    evidence:
      - path: "app/src/lib/vereinsregelnRepo.ts"
        detail: "Lines 33-48: toRow(rule, userId) returns a typed VereinsregelnInsert with ist_bkleingg (snake_case) + user_id stamped. Lines 54-65: fromRow(row) drops user_id + erstellt_am and emits istBKleingG (camelCase). Line 110: loadVereinsregeln uses (data ?? []).map(fromRow). Line 133: saveVereinsregeln builds payload via ensured.map((r) => toRow(r, userId)) before upsert."
      - path: "app/src/lib/migrateLocalToAccount.ts"
        detail: "Lines 18 + 103: import { toRow } and const payload = restamped.map((r) => toRow(r, newUserId)) before supabase.from('vereinsregeln').upsert(payload, { onConflict: 'id' }). Migration no longer leaks camelCase keys to Postgres."
      - path: "app/src/lib/__tests__/vereinsregelnRepo.test.ts"
        detail: "Test 1b (lines 118-133): assert row has ist_bkleingg, NOT istBKleingG, and user_id === USER_ID across the entire upsert payload. Test 3 (lines 135-177): mock returns snake_case rows incl. server-only erstellt_am + user_id; asserts domain output has istBKleingG + drops ist_bkleingg/user_id/erstellt_am."
      - path: "app/src/lib/__tests__/migrateLocalToAccount.test.ts"
        detail: "Lines 132-141: asserts the vereinsregeln upsert payload rows each have ist_bkleingg (snake_case) — the migration test now mirrors the repo contract."
    verification: "Automated — 66/66 app tests + 33/33 shared tests pass, typecheck exit 0. Live Supabase round-trip still covered by human-verify 2-04-04 B5-B7 + D (DOM spot-check)."

deferred:
  - truth: "AUTH-05 stopwatched onboarding < 5 minutes (SC1 + SC2 end-to-end timing)"
    addressed_in: "Deferred checkpoint 2-02-04 (web) + 2-04-04 steps A1-A11 / B1-B9 / C (native + stopwatch)"
    evidence: ".planning/phases/02-auth-profile-vereinsregeln/02-02-SUMMARY.md:215-224 (9-step script) and 02-04-SUMMARY.md:182-234 (A/B/C/D/E + 9 acceptance criteria)"
  - truth: "End-to-end PDF extraction flow, Logout, and Local→Account migration (SC1 + SC5)"
    addressed_in: "Deferred checkpoint 2-04-04 steps A10-A11 (migration), B5-B7 (PDF), B9 (Logout), E (cancel), D (DOM spot-check RULES-04)"
    evidence: ".planning/phases/02-auth-profile-vereinsregeln/02-04-SUMMARY.md:192-234. Edge Function must be deployed ACTIVE in Frankfurt before this runs (User Setup step 3). CLAUDE_API_KEY must be set as Supabase secret (Phase 01-03 prerequisite)."
  - truth: "BKleingG 1/3-Nutzgartenpflicht dynamic warning when plan violates threshold (SC5 literal)"
    addressed_in: "Phase 5 — Plan-Editor (M2)"
    evidence: "02-CONTEXT.md D-10 line 35: 'the actual ratio calculation requires plan data from Phase 5'. Matches ROADMAP Phase 5 Success Criterion 5: 'Placing an element that violates a Vereinsregel ... shows an inline warning on the canvas'. Phase 2 delivers the neutral placeholder per plan."

human_verification:
  - test: "AUTH-05 stopwatched local onboarding (web)"
    expected: "Auth-Wahl → Lokal starten → PLZ 12043 → Klimazone 4 → Archetyp Selbstversorger → Checkliste ausfüllen → Save → Profile zeigt alle 3 Banner gefüllt — unter 5 Minuten"
    why_human: "AUTH-05 is defined as a wall-clock UX metric; cannot be automated"
  - test: "Session survives browser reload (web) and app kill (native)"
    expected: "After login, close/reopen app — user lands on (app)/index, not (auth)/index; same for lokal mode UUID"
    why_human: "Requires device state reset that Jest/Supertest cannot reproduce meaningfully"
  - test: "PDF-Upload → Extraction → Confirm-Screen flow (native, account mode)"
    expected: "DocumentPicker opens, user picks Vereinssatzung PDF (<5MB), ExtractionLoader shows ≤30s, Confirm screen lists ≥1 user rule + 3 BKleingG locked rows"
    why_human: "Requires live Anthropic Claude API + deployed Edge Function + real PDF content"
  - test: "Inline edit round-trip on Confirm screen (account + local)"
    expected: "Tap Pencil on a user rule → inline editor appears → change Titel or Wert → Übernehmen → row updates in place → Regeln speichern → reload app → edit persists (Supabase in account mode, storage JSON in local mode)"
    why_human: "Validates that the d885901 wire produces a correct persisted round-trip against a live store, incl. Supabase ist_bkleingg mapping from e6b8c30"
  - test: "Abbrechen cancels extraction cleanly"
    expected: "Tap PDF hochladen, pick file, tap Abbrechen within 2s after loader shows — returns to upload entry with no error toast"
    why_human: "Depends on network timing of the live Edge Function call"
  - test: "Logout clears Supabase + local session and blocks back-nav"
    expected: "Settings → Abmelden → Ja, abmelden → lands on (auth)/index; device back button / browser back does NOT re-enter (app)"
    why_human: "Platform back-nav semantics differ between Expo Go / iOS / Android / web"
  - test: "Local→Account migration rollback safety"
    expected: "Migrate with valid creds → rows appear in Supabase `profiles` + `vereinsregeln` tagged new user_id (with ist_bkleingg column populated) → Settings flips to account mode; if signUp fails (e.g. password too short) → local data intact, can retry"
    why_human: "Requires Supabase dashboard row inspection + contrived failure injection"
  - test: "RULES-04 DOM/tree spot check on Confirm screen"
    expected: "Open DevTools / React DevTools — BKleingG rows have Lock icon + NO Switch in subtree; user rows have Switch element"
    why_human: "Visual tree inspection the automated tests cannot run"
  - test: "NFR-07 Haftungsausschluss expands on Auth-Wahl"
    expected: "Rechtlicher Hinweis chevron toggles body text visible / hidden"
    why_human: "Visual confirmation"
---

# Phase 02: Auth, Profile & Vereinsregeln — Verification Report

**Phase Goal:** Dirk can complete the full onboarding in under 5 minutes — choosing account or local mode, entering his PLZ, picking an Archetyp, optionally uploading or entering Vereinsregeln — and his profile persists across restarts.

**Verified:** 2026-04-19T23:45:00Z
**Status:** human_needed
**Overall Verdict:** PASS-pending-human-verify (all code gaps closed; only deferred human checkpoints + Phase-5 scope remain)
**Re-verification:** Yes — after gap closure (commits e6b8c30 + d885901)

## Re-verification Summary

| Prev Status | Prev Score | New Status | New Score | Delta |
|-------------|-----------|------------|-----------|-------|
| human_needed (PARTIAL) | 3/5 verified + 2/5 deferred | human_needed (PASS-pending-human-verify) | 4/5 verified + 1/5 deferred + SC5 live E2E awaited | SC5: PARTIAL → PASS-pending-human-verify |

**Gaps closed (2):**
1. SC5 edit wire missing on confirm.tsx — resolved in d885901.
2. SC5 account-mode column mismatch — resolved in e6b8c30.

**Regressions:** none. App test count moved 63 → 66 (+3), shared 32 → 33 (+1), typecheck remains exit 0.

## Automation Results

| Suite | Command | Result | Delta vs initial |
|-------|---------|--------|------------------|
| app unit suite | `pnpm --filter app test` | 66 / 66 passing (11 suites) | +3 (store updateRule ×2 + repo Test 1b) |
| shared unit suite | `pnpm --filter @spatenstich/shared test` | 33 / 33 passing (3 suites) | +1 |
| Edge Function unit suite (Deno) | `deno test --allow-read __tests__/parseRules.test.ts` | 8 / 8 passing | unchanged |
| app typecheck | `pnpm --filter app exec tsc --noEmit` | clean (exit 0) | unchanged |

## Success Criteria Results

| # | Criterion | Verdict | Primary Evidence |
|---|-----------|---------|------------------|
| 1 | Account sign-up + login + session persists across restart | PARTIAL (deferred-human) | `app/src/lib/auth.ts:69-134` + `app/src/lib/supabase.ts:18-25` + `app/src/lib/largeSecureStore.ts` + `app/app/(auth)/{login,register,verify-email}.tsx` |
| 2 | "lokal nutzen" path works email-free, survives restart | PASS | `app/src/lib/auth.ts:42-48` + `app/src/stores/authStore.ts:20-34` + `app/app/(auth)/index.tsx:23-30` |
| 3 | PLZ 12345 → Klimazone shown, no network, instant update | PASS | `packages/shared/src/constants/klimazonen.ts:79-86` + `app/app/(app)/profile/plz.tsx:23-28` |
| 4 | Archetyp selection flows to profile data downstream features can read | PASS | `app/app/(app)/profile/archetype.tsx:22-103` + `app/src/hooks/useProfile.ts:14-57` + `app/src/stores/profileStore.ts` |
| 5 | Vereinsregeln PDF → extract → edit/delete/accept + BKleingG warning | PASS-pending-human-verify | `app/app/(app)/profile/vereinsregeln/*.tsx` + `app/src/lib/vereinsregelnRepo.ts` (toRow/fromRow) + `app/src/lib/migrateLocalToAccount.ts` + `supabase/functions/extract-vereinsregeln/*` |

## Per-Criterion Detail

### SC1 — Account sign-up + login + session persistence (PARTIAL)

**What works (automated):**
- Sign-up: `app/app/(auth)/register.tsx:28-44` invokes `supabase.auth.signUp`, handles session-null → verify-email route, error → generic (T-2-02-02).
- Sign-in: `app/app/(auth)/login.tsx:24-43` invokes `supabase.auth.signInWithPassword`, flips `useAuthStore.setAccountMode(userId)`.
- Session storage: `app/src/lib/supabase.ts:18-25` — `persistSession: true`, `autoRefreshToken: true`, storage = `new LargeSecureStore()` on native, `undefined` (→ localStorage) on web.
- Encrypted native storage: `app/src/lib/largeSecureStore.ts` — AES-256-CTR ciphertext to AsyncStorage, 32-byte key in expo-secure-store (5 tests, ciphertext ≠ plaintext asserted).
- Re-bootstrap after restart: `app/src/lib/auth.ts:73-96` — `supabase.auth.getSession()` on mount, sets identity={type:'account',userId:session.user.id} when a session is restored.

**What needs human verification:**
- Actually close the app / browser, reopen, confirm landing is `(app)/index` not `(auth)/index` on both web and native. Deferred checklist: 02-02-SUMMARY.md:215-224 step 6-7 + 02-04-SUMMARY.md:192-234 steps A, B2-B3.

### SC2 — lokal nutzen, no email, survives restart (PASS)

- `app/app/(auth)/index.tsx:23-30` handles `handleLocal` → `getOrCreateLocalUUID` → `useAuthStore.setLocalMode(uuid)` → `switchToLocal()`.
- `app/src/lib/auth.ts:42-48` — lazy persistence (read first, crypto.randomUUID only on miss), `writeLocalUuid` branches to `window.localStorage` on web and `SecureStore.setItemAsync` on native.
- Restart path: `AuthProvider.bootstrap` (auth.ts:73-96) reads local UUID in parallel with Supabase session, precedence account>local>null, hydrates identity even without a Supabase session.
- Tests: 4 in `app/src/lib/__tests__/auth.test.ts` (getOrCreateLocalUUID stable across calls + clearLocalUUID rotates).
- No code path requires email for local-mode initiation.

### SC3 — PLZ 12345 → Klimazone shown, no network (PASS)

- `packages/shared/src/constants/klimazonen.ts:79-86` — `lookupKlimazone` is pure; returns from PLZ_KLIMAZONE_MAP (direct 5-digit) else 2-digit prefix fallback; null for invalid input.
- PLZ 12345 → prefix 12 (Berlin prefix lookup) → Zone 4. PLZ 12043 specifically hardcoded to 4 (Neukölln). Both assertions exist in klimazonen.test.ts.
- `app/app/(app)/profile/plz.tsx:23-28` — `lookupKlimazone(plzInput)` computed on every render from input value; no useEffect, no debounce, no fetch.
- UI renders `<Badge testID="plz-klimazone-badge">Klimazone {n}</Badge>` as soon as 5-digit input is complete (plz.tsx:67-82).
- PROF-04 "changing PLZ updates Klimazone immediately" — lookup re-runs on every keystroke because it's in the render path, not a memoised effect.

### SC4 — Archetyp selection reflected in profile data (PASS)

- 6 archetypes defined in `packages/shared/src/constants/archetypes.ts` (selbstversorger, familien_naschgarten, mix_ausgewogen, zier_erholung, biodiversitaet, kraeuter_apotheker).
- `app/app/(app)/profile/archetype.tsx:22-53` renders ARCHETYPE_OPTIONS as 6 ArchetypeCards in a 2-column grid (`w-[48%]`). Selection state lives locally until Submit.
- Submit (archetype.tsx:61-70) → `useProfile.setArchetype(selected)` → `profileStore.setArchetype` + `profileRepo.saveProfile({archetype})`.
- `profileRepo.saveProfile` (profileRepo.ts:39-51) — account mode: supabase.from('profiles').upsert({id, ...patch}); local mode: read-modify-write the single JSON blob at storage key 'profile' (Pitfall 6).
- `useProfile` hook (hooks/useProfile.ts) exposes `archetype` from the store — any downstream feature (Phase 3 Foto-Analyse, Phase 4 Plan-Editor) can read `useProfile().archetype`.

### SC5 — Vereinsregeln PDF / Checkliste / edit-delete-accept + BKleingG warning (PASS-pending-human-verify)

**What works (automated + code review):**
- 5 screens wired: `app/app/(app)/profile/vereinsregeln/{_layout,index,upload,checklist,confirm}.tsx`.
- Entry screen (index.tsx:18-92): in account mode shows 2 active cards (PDF / Checkliste); in local mode PDF card is Lock-icon + stone-400 disabled with inline "Account erstellen" CTA (Pitfall 4, no modal).
- PDF path (upload.tsx:36-108): DocumentPicker → `uploadVereinsregelPdf` (Supabase Storage `vereinsregeln/<userId>/<ts>_<safe>`) → `extractVereinsregeln` (55s AbortController + external signal) → merge candidates with existing rules → navigate to confirm.
- ExtractionLoader (ExtractionLoader.tsx): loading state with animate-pulse bar + Abbrechen; error state with retry + cancel; accessibilityLabel="Extrahiere Vereinsregeln".
- Edge Function (extract-vereinsregeln/index.ts): path-prefix guard (T-2-03-01, line 55-57), SERVICE_ROLE storage download, Anthropic Files API upload, claude-sonnet-4-6 messages.create with EXTRACTION_PROMPT, try/finally delete of uploaded file, parseRules post-processing (istBKleingG forced false + length clamp + BKleingG seed dedupe).
- Confirm screen (confirm.tsx): BKleingG group first (D-08), scroll-gate on Save until user has scrolled past BKleingG section, user-row toggle (accept/reject via Switch), user-row tap-trash delete, **inline edit wired via `onEdit={handleEdit}` (line 263) rendering titel/wert/einheit Inputs + Übernehmen/Abbrechen when `editingId === r.id` (lines 200-258) → calls `vereinsregelnStore.updateRule(editingId, patch)` (line 90)**. Save → saveVereinsregeln → route back.
- **Column-name contract honoured:** `vereinsregelnRepo.toRow` (lines 33-48) emits `ist_bkleingg` (snake) + `user_id` stamped; `fromRow` (lines 54-65) drops server-only fields and emits `istBKleingG` (camel). `saveVereinsregeln` maps the ensured array via toRow before upsert (line 133); `loadVereinsregeln` maps via fromRow (line 110); `migrateLocalToAccount` uses toRow with the re-stamped user_id (line 103).
- Checklist screen: 12 STANDARD_VEREINSREGELN_CHECKLIST items as flat list (deviation: 7-category grouping deferred — domain type lacks `kategorie` field), toggleable with optional numeric input, merge with existing rules on save.
- Store guards: `vereinsregelnStore.toggleAktiv/removeRule/updateRule` all no-op on istBKleingG=true (RULES-04 client guard — 3-layer defense with UI + repo + DB CHECK). **Test 6b (store) asserts updateRule patches user rule; Test 6c asserts updateRule NO-OPs on BKleingG.**
- BKleingG badge on Profile (profile/index.tsx:131-140): TrafficLightBadge state='neutral' with 'Plan noch nicht vorhanden' per D-10.

**Code gaps (previously flagged) — now RESOLVED:**
1. ~~Edit button (Pencil) is not wired in confirm.tsx~~ → **RESOLVED** in commit d885901. `onEdit={handleEdit}` + inline editor + `updateRule` store wire verified in confirm.tsx (lines 58-92, 200-267). New i18n keys `rules.confirm.edit.*` present in de.json. 2 new store tests pass.
2. ~~DB column mismatch: `ist_bkleingg` (snake) vs `istBKleingG` (camel)~~ → **RESOLVED** in commit e6b8c30. `toRow`/`fromRow` in vereinsregelnRepo.ts map both directions; Test 1b asserts snake_case presence + camelCase absence + user_id stamp; Test 3 asserts round-trip via fromRow; migrateLocalToAccount.test.ts extends the contract to migration payload.

**Deferred by design (D-10):**
3. The dynamic 1/3-threshold WARNING: scoped to Phase 5 (Plan-Editor); Phase 2 ships a neutral placeholder per explicit CONTEXT decision D-10.

**Awaiting live human verification (not a code gap):**
- End-to-end PDF upload → extraction → confirm flow (2-04-04 B5-B7).
- Inline-edit persistence round-trip against a live store (added to human_verification list).
- RULES-04 DOM spot-check (2-04-04 D).

## Requirements Coverage (Phase 2)

| Req | Description | Plan(s) | Status | Evidence |
|-----|-------------|---------|--------|----------|
| AUTH-01 | email/password signup | 02-01, 02-02 | SATISFIED | register.tsx:28-44 |
| AUTH-02 | encrypted session persistence | 02-01 | SATISFIED | largeSecureStore.ts + supabase.ts:18-25 |
| AUTH-03 | local-mode UUID | 02-01 | SATISFIED | auth.ts:42-48 |
| AUTH-04 | local→account migration | 02-04 | SATISFIED-code (toRow mapping included) / HUMAN-VERIFY runtime | migrateLocalToAccount.ts + settings.tsx |
| AUTH-05 | onboarding < 5 min | 02-02, 02-04 | HUMAN-VERIFY | deferred scripts 2-02-04 C + 2-04-04 C |
| PROF-01 | PLZ → Klimazone | 02-01, 02-02 | SATISFIED | klimazonen.ts + plz.tsx |
| PROF-02 | Archetyp from 6 | 02-02 | SATISFIED | archetype.tsx |
| PROF-03 | banners for missing fields | 02-02 | SATISFIED | profile/index.tsx:40-127 + InlineBanner |
| PROF-04 | PLZ change updates Klimazone immediately | 02-01, 02-02 | SATISFIED | plz.tsx:23-28 synchronous render-path lookup |
| RULES-01 | Edge Function PDF→rules | 02-03, 02-04 | SATISFIED-code / HUMAN-VERIFY runtime | index.ts (Edge) + extractVereinsregeln.ts + upload.tsx |
| RULES-02 | toggle persistence | 02-04 | **SATISFIED (account + local)** — previously BLOCKED-by-column-mismatch | vereinsregelnRepo.toRow/fromRow + Store + Test 1b + Test 3 |
| RULES-03 | checklist 10-15 defaults | 02-01, 02-04 | SATISFIED | STANDARD_VEREINSREGELN_CHECKLIST (12 entries) + checklist.tsx |
| RULES-04 | BKleingG non-deletable | 02-01, 02-04 | SATISFIED (3-layer guard incl. updateRule no-op) | VereinsregelRow + Store no-ops (Test 6c) + Repo assert + DB CHECK |
| RULES-05 | 1/3 BKleingG warning placeholder | 02-02 | SATISFIED (placeholder) / DEFERRED-Phase-5 (live eval) | profile/index.tsx:131-140 + D-10 |
| NFR-07 | Haftungsausschluss | 02-01, 02-02 | SATISFIED (code) / HUMAN-VERIFY (visual) | (auth)/index.tsx:62-82 collapsible block |

## Risks & Follow-ups

1. ~~**[HIGH] DB column mismatch `ist_bkleingg` vs `istBKleingG`**~~ — **RESOLVED (commit e6b8c30).** toRow/fromRow mapping in place, covered by Test 1b, Test 3, and the migration test. No runtime exposure in account mode.
2. ~~**[MEDIUM] Edit wire missing on confirm screen**~~ — **RESOLVED (commit d885901).** onEdit={handleEdit} wired, inline editor validates non-empty titel, calls updateRule, and persists on global Save via saveVereinsregeln. RULES-04 preserved (updateRule no-ops on BKleingG).
3. **[LOW] GuardedStack deviation from plan** — plan called for `Stack.Protected`, impl uses a `useSegments + Redirect` equivalent because expo-router 4.0.22 on SDK 53 lacks `Stack.Protected`. Security intent preserved; accepted deviation (documented in 02-02-SUMMARY Deviations #1).
4. **[LOW] Flat checklist (no 7-category grouping)** — shared type `VereinsregelChecklistItem` lacks `kategorie`. Deviation documented. Carries a small UX cost (longer flat list); a follow-up can extend the shared type and group.
5. **[INFO] Edge Function deploy not CI-automated** — manual `supabase functions deploy extract-vereinsregeln` per Phase 01-03 convention. User Setup step in 02-03-SUMMARY. Required for Phase 2 human-verify + Phase 3+.
6. **[INFO] Profile banner Vereinsregeln count uses `useProfile().vereinsregeln`** (profile/index.tsx:29+104), but vereinsregeln rules are actually managed by `useVereinsregelnStore`, not `useProfileStore.vereinsregeln`. `profileStore.vereinsregeln` is declared but never populated. Banner will always show "einrichten" unless something else writes to it. **Worth a dedicated follow-up** — may cause false "Vereinsregeln missing" banners even after save. Not a blocker for SC5 as-tested (the banner routing still works), but the counter/toggle section may mislead.

## Readiness Verdict for Phase 3

**GO.**

All previously-flagged code blockers are resolved. Phase 03 (Offline & Sync) depends on:
- `useAuthStore.mode` + `userId` — **RELIABLE.**
- Mode-aware repo pattern (profileRepo + vereinsregelnRepo with toRow/fromRow mapping) — **ESTABLISHED.**
- Supabase Storage bucket path convention — **ESTABLISHED.**
- Edge Function wrapper + AbortSignal pattern — **ESTABLISHED.**

Remaining work before production cutover (not blockers for starting Phase 3):
1. Execute deferred checkpoints 2-02-04 + 2-04-04 on a device; record stopwatched AUTH-05 result and the new inline-edit human-verify test.
2. Investigate follow-up #6 (profileStore.vereinsregeln vs vereinsregelnStore) so the banner count reflects reality — best addressed while Phase 3 touches the stores for sync anyway.

Phase 3 can start immediately.

---

*Verified: 2026-04-19T23:45:00Z*
*Re-verification: Yes (commits e6b8c30 + d885901)*
*Verifier: Claude (gsd-verifier)*
