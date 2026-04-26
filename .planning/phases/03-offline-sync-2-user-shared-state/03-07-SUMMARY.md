---
phase: 03-offline-sync-2-user-shared-state
plan: 07
status: complete
started: 2026-04-26T10:00:00Z
completed: 2026-04-26T10:15:00Z
duration_minutes: 15
gap_closure: true
tasks_completed: 1
tasks_total: 1
commits: 1
deviations: none
self_check: PASSED
---

# Plan 03-07 Summary: Wire uploadPending into SyncTriggers

## Objective
Close SC-2 / SYNC-02 gap — wire `PhotoUploader.uploadPending()` into `registerSyncTriggers()` reconnect handlers so photos captured offline auto-upload on reconnect.

## What Changed

### SyncTriggers.ts
- Added `import { uploadPending } from '../photos/PhotoUploader'`
- Added `uploadPending().catch(...)` in NetInfo `wasOffline && isConnected` handler (parallel with `syncAll()`)
- Added `uploadPending().catch(...)` in AppState `lastState !== 'active' && state === 'active'` handler (parallel with `syncAll()`)
- Both calls use independent `.catch()` — uploadPending failure does not block syncAll

### SyncTriggers.test.ts
- Added `jest.mock('../../photos/PhotoUploader')` with `uploadPending` mock
- Added `import { uploadPending }` from PhotoUploader
- Test A: `ruft uploadPending() bei offline→online (SC-2 gap closure)` — PASS
- Test B: `ruft uploadPending() bei background→active (SC-2 gap closure)` — PASS
- Test C: `uploadPending() rejection blockiert syncAll() nicht` — PASS (error isolation)
- All 6 original tests continue to pass (9/9 total)

## TDD Evidence
- **RED:** 2 new tests failed (uploadPending not called) — 7 passed, 2 failed
- **GREEN:** After wiring, all 9 tests pass

## Key Files

### Created
None

### Modified
- `app/src/lib/sync/SyncTriggers.ts` — uploadPending wiring in both reconnect handlers
- `app/src/lib/sync/__tests__/SyncTriggers.test.ts` — 3 new test cases for SC-2 gap closure

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `import.*uploadPending.*PhotoUploader` in SyncTriggers.ts | 1 match |
| `uploadPending().catch` in SyncTriggers.ts | 2 matches (NetInfo + AppState) |
| `uploadPending` references in test file | 8 matches |
| All 9 SyncTriggers tests pass | ✓ |
| TypeScript compiles (no new errors) | ✓ |
| No changes to PhotoUploader.ts | ✓ |

## Gap Closure Result
- **SC-2:** Photos captured offline will now auto-upload when network returns ✓
- **SYNC-02:** Requirement satisfied — uploadPending() triggers on both reconnect paths ✓
