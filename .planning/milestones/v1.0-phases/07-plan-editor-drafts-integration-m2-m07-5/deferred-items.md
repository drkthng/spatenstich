# Phase 7 — Deferred Items (out-of-scope discoveries)

## Discovered during Plan 02 (Wave 1)

### DEFERRED-P7-1: Three pre-existing jest suites fail (unrelated to Phase 7)

Three test suites fail at baseline (commit `6dc7737`, BEFORE any Phase 7 Plan 02 GREEN edits). Confirmed by stashing Plan 02 edits and re-running the same suites — failures persist. Therefore unrelated to Migration 018 / PlanElementRow.layer changes.

- **`app/src/lib/__tests__/auth.test.ts`** — 2 failures
  - "two consecutive calls return the same UUID (persistence)"
  - "persisted UUID stored under the canonical key name"
  - Failure shape: expo-secure-store mock persistence behavior

- **`app/src/lib/__tests__/migrateLocalToAccount.rowtables.test.ts`** — 1 failure
  - "bootstrapRowTables › sets lastPullAt=server_now for all 6 entities"
  - Failure shape: bootstrap mock or server_now stub

- **`app/src/lib/sync/__tests__/useSyncStatus.test.ts`** — 2 failures (Test 5 + Test 7)
  - "TypeError: Cannot read properties of undefined (reading 'calls')"
  - "TypeError: listSpy.mockClear is not a function"
  - Failure shape: jest-spy lifecycle (likely a beforeEach/afterEach ordering issue or a stale mock reference)

**Scope:** Pre-existing failures from Phases 02-01 / 03-03 / 03-06 — pre-date Phase 7 entirely. Out of scope per GSD deviation Rule "SCOPE BOUNDARY" (only fix issues DIRECTLY caused by current task's changes).

**Recommended owner:** Future maintenance plan (likely Phase 8 or a dedicated `quick/` task).

**Confidence: pre-existing baseline failure** — proven by stash-pop methodology.
  status: acknowledged
