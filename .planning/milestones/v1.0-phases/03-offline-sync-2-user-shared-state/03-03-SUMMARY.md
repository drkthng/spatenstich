---
phase: 03-offline-sync-2-user-shared-state
plan: "03"
subsystem: offline-sync
tags: [offline-first, row-tables, outbox, mappers, migration]
dependency_graph:
  requires: ["03-01", "03-02"]
  provides: ["03-04", "03-05"]
  affects: ["gardenRepo", "vereinsregelnRepo", "profileRepo", "inviteCodeRepo", "migrateLocalToAccount"]
tech_stack:
  added: ["@react-native-community/netinfo (type stub + jest mock)"]
  patterns: ["offline-first read (getRow → Supabase fallback)", "writeWithOutbox atomic local+outbox", "TDD RED/GREEN per task", "fail-soft Step 9 bootstrap"]
key_files:
  created:
    - app/src/lib/errors.ts
    - app/src/lib/mappers/rowMappers.ts
    - app/src/lib/__tests__/rowMappers.test.ts
    - app/src/lib/__tests__/gardenRepo.offline.test.ts
    - app/src/lib/__tests__/vereinsregelnRepo.offline.test.ts
    - app/src/lib/__tests__/profileRepo.offline.test.ts
    - app/src/lib/__tests__/migrateLocalToAccount.rowtables.test.ts
    - app/src/__mocks__/react-native-community-netinfo.ts
    - app/src/types/netinfo.d.ts
  modified:
    - app/src/lib/gardenRepo.ts
    - app/src/lib/vereinsregelnRepo.ts
    - app/src/lib/profileRepo.ts
    - app/src/lib/inviteCodeRepo.ts
    - app/src/lib/migrateLocalToAccount.ts
    - app/jest.config.ts
    - app/src/lib/__tests__/gardenRepo.test.ts
    - app/src/lib/__tests__/vereinsregelnRepo.test.ts
decisions:
  - "VereinsregelnRow uses 1-row-per-garden (Option A) with rules:{list:[...]} JSON payload — simpler for <50 rules, BKleingG consistency easier"
  - "toRow import in migrateLocalToAccount replaced by vereinsregelnToDbRows from rowMappers.ts"
  - "bootstrapRowTables Step 9 is fail-soft — migration success must not depend on initial pull working"
  - "NetInfo not installed as npm package — type stub (netinfo.d.ts) + jest mock sufficient for Phase 3"
  - "inviteCodeRepo online guards added to createInviteForGarden + consumeInviteCode only; ensureDefaultGardenForUser kept online-only but no assertOnline (called during migration when online)"
metrics:
  duration: "~3 hours"
  completed: "2026-04-25"
  tasks_completed: 3
  tasks_total: 3
  files_created: 9
  files_modified: 8
---

# Phase 03 Plan 03: Offline-First Repo Refactor + Row-Table Bootstrap Summary

Refactored all 4 data repositories to read from StorageAdapter Row-Tables first and write optimistically via `writeWithOutbox`, enabling SYNC-01 (offline start shows last plan) and SYNC-02 (writes persist offline).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 01 | rowMappers.ts + errors.ts centralisation | cee3c4d | rowMappers.ts, errors.ts, rowMappers.test.ts (20 tests) |
| 02 | Repo offline-first refactor | c47d5e8 | gardenRepo, vereinsregelnRepo, profileRepo, inviteCodeRepo, 3 offline test suites |
| 03 | migrateLocalToAccount Step 9 | b6aae27 | migrateLocalToAccount.ts, rowtables.test.ts |

## What Was Built

**Task 01 — Centralised Mappers + Errors:**
- `app/src/lib/mappers/rowMappers.ts`: 12 mapper functions covering all 6 entities (gardenToLocalRow, localToGardenView, gardenFromDb, vereinsregelnToLocalRow, localToVereinsregeln, vereinsregelnToDbRows, vereinsregelnFromDbRows, profileToLocalRow, profileFromDb, gardenMemberFromDb, inviteCodeFromDb, photoQueueFromDb)
- `app/src/lib/errors.ts`: Centralised NotOwnerError, GardenHasMembersError, CannotTransferToSelfError, TargetNotMemberError (moved from gardenRepo) + new OutboxEnqueueError + ConflictError

**Task 02 — Repo Refactor:**
- `gardenRepo`: loadGarden reads StorageAdapter first, Supabase fallback; updateGarden uses writeWithOutbox; deleteGarden/transferOwnership/removeMember remain online-only (RPC + NetInfo guard)
- `vereinsregelnRepo`: account-mode uses VereinsregelnRow (1-per-garden) with rules:{list:[...]} payload; saveVereinsregeln/deleteVereinsregel go through writeWithOutbox
- `profileRepo`: account-mode reads ProfileRow first, Supabase fallback; saveProfile uses writeWithOutbox
- `inviteCodeRepo`: added assertOnline() guard to createInviteForGarden + consumeInviteCode
- NetInfo type stub (`app/src/types/netinfo.d.ts`) + jest mock (`app/src/__mocks__/react-native-community-netinfo.ts`) since package not yet installed

**Task 03 — Step 9 Bootstrap:**
- `bootstrapRowTables(userId, gardenId)` exported from migrateLocalToAccount.ts
- Pulls all 6 entities from Supabase using upsertRowFromServer (no Outbox)
- Sets sync_state.lastPullAt = server_now() for all 6 entities
- Wrapped in try/catch in migrateLocalToAccount — fail-soft, logs warning, does not re-throw

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| rowMappers.test.ts | 20 | PASS |
| gardenRepo.offline.test.ts | 8 | PASS |
| vereinsregelnRepo.offline.test.ts | 8 | PASS |
| profileRepo.offline.test.ts | 7 | PASS |
| migrateLocalToAccount.rowtables.test.ts | 6 | PASS |
| gardenRepo.test.ts (updated) | 17 | PASS |
| vereinsregelnRepo.test.ts (updated) | 11 | PASS |
| migrateLocalToAccount.test.ts (regression) | 13 | PASS |
| **Total lib tests** | **128** | **PASS** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test file location wrong for rowMappers.test.ts**
- **Found during:** Task 01 (RED phase)
- **Issue:** Initially placed test at `src/lib/mappers/__tests__/rowMappers.test.ts` but jest config `testMatch` only covers `**/src/lib/__tests__/**`
- **Fix:** Moved to `src/lib/__tests__/rowMappers.test.ts`
- **Commit:** cee3c4d

**2. [Rule 1 - Bug] database.ts vs supabase.ts type mismatch**
- **Found during:** Task 01 (implementation)
- **Issue:** `packages/shared/src/types/database.ts` missing `photo_queue` table, `deleted_at` on gardens/profiles, `updated_by_user_id` on profiles
- **Fix:** Type intersection casts (`row as DbGardenRow & { deleted_at?: string|null }`) and loose `DbPhotoQueueRowLoose` type
- **Commit:** cee3c4d

**3. [Rule 1 - Bug] invite_codes field names wrong in plan**
- **Found during:** Task 01 (implementation)
- **Issue:** Plan referenced `used_at`/`used_by_user_id` but DB schema uses `consumed_at`/`consumed_by_user_id`
- **Fix:** Updated `inviteCodeFromDb` to use correct column names
- **Commit:** cee3c4d

**4. [Rule 2 - Missing] gardenRepo.test.ts + vereinsregelnRepo.test.ts regression after refactor**
- **Found during:** Task 02 (GREEN verification)
- **Issue:** gardenRepo.ts now imports `storage` which instantiates IndexedDbAdapter at module load → `ReferenceError: indexedDB is not defined`. Also vereinsregelnRepo account-mode tests verified old direct-Supabase behavior.
- **Fix:** Added storage mock + NetInfo mock to gardenRepo.test.ts; updated account-mode tests in both files to verify storage-first behavior
- **Files:** gardenRepo.test.ts, vereinsregelnRepo.test.ts
- **Commit:** c47d5e8

**5. [Rule 1 - Bug] VereinsregelnRow.rules typed as Record<string,unknown>**
- **Found during:** Task 02 (GREEN verification - TS error in vereinsregelnRepo.test.ts)
- **Issue:** `row.rules.list` typed as `unknown` because `VereinsregelnRow.rules` is `Record<string, unknown>`
- **Fix:** Added `VereinsregelnRowTyped` local type alias in test file casting `rules` to `{ list: VereinsRegel[] }`
- **Commit:** c47d5e8

**6. [Rule 1 - Bug] server_now not in Supabase RPC type union**
- **Found during:** Task 03 (GREEN implementation)
- **Issue:** `supabase.rpc('server_now')` TS2345 because database.ts RPC list doesn't include server_now
- **Fix:** Cast `supabase.rpc as any` with eslint-disable comment
- **Commit:** b6aae27

**7. [Rule 1 - Bug] Profile select with new columns (updated_by_user_id, deleted_at) fails TS**
- **Found during:** Task 03 (GREEN implementation)
- **Issue:** `profiles` partial select with columns not in database.ts causes SelectQueryError type
- **Fix:** Changed to `select('*')` + cast `data as any` before `profileFromDb`
- **Commit:** b6aae27

## Known Stubs

None — all implemented functionality has live data paths. NetInfo package is a type stub only (no runtime use during tests), which is intentional until Plan 03-04 installs the actual package.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced beyond what the plan's threat model covers.

## Self-Check: PASSED

Files exist:
- app/src/lib/errors.ts ✓
- app/src/lib/mappers/rowMappers.ts ✓
- app/src/lib/__tests__/gardenRepo.offline.test.ts ✓
- app/src/lib/__tests__/vereinsregelnRepo.offline.test.ts ✓
- app/src/lib/__tests__/profileRepo.offline.test.ts ✓
- app/src/lib/__tests__/migrateLocalToAccount.rowtables.test.ts ✓
- app/src/types/netinfo.d.ts ✓
- app/src/__mocks__/react-native-community-netinfo.ts ✓

Commits exist:
- cee3c4d (Task 01 — rowMappers + errors) ✓
- c47d5e8 (Task 02 — repo refactor) ✓
- e9e8f08 (Task 03 RED — rowtables test) ✓
- b6aae27 (Task 03 GREEN — bootstrapRowTables) ✓
