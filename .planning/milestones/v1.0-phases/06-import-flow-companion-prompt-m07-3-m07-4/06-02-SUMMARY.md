---
phase: 06-import-flow-companion-prompt-m07-3-m07-4
plan: 02
subsystem: import
tags: [ajv, json-schema, validation, zustand, sqlite, outbox, sync, typescript]

# Dependency graph
requires:
  - phase: 06-01
    provides: ImportPayload types in entities.ts, migration 016 for import_drafts tables

provides:
  - importValidator.ts with ajv draft-2020-12 schema validation + German bedRef cross-reference errors
  - importRepo.ts with writeWithOutbox draft persistence for beds/plants/observations
  - importStore.ts transient Zustand store for import session state
  - SyncWorker extended with 5 new entity cases + pushImportEntity
  - rowMappers extended with importEntityToDb/importEntityFromDb
  - 19 passing unit tests (10 validator + 9 repo)

affects: [06-03, 06-04, import-preview-screen, import-entry-screen]

# Tech tracking
tech-stack:
  added: [ajv/dist/2020 (draft-2020-12), ajv-formats (date-time validation)]
  patterns:
    - "ajv compile at module level (not inside function) for performance"
    - "cross-reference validation after schema validation (bedRef → beds[].localId)"
    - "writeWithOutbox pattern for all draft entity writes"
    - "transient Zustand store (no persist) for cross-screen payload transfer"

key-files:
  created:
    - app/src/lib/importValidator.ts
    - app/src/lib/__tests__/importValidator.test.ts
    - app/src/lib/importRepo.ts
    - app/src/lib/__tests__/importRepo.test.ts
    - app/src/stores/importStore.ts
  modified:
    - app/src/lib/sync/SyncWorker.ts
    - app/src/lib/mappers/rowMappers.ts
    - app/src/storage/SqliteAdapter.ts
    - app/src/storage/IndexedDbAdapter.ts
    - packages/shared/src/types/entities.ts
    - packages/shared/src/index.ts

key-decisions:
  - "ImportItemRow added updatedAt field (alias for createdAt) — required by StorageAdapter.writeWithOutbox generic constraint T extends AnyRow"
  - "ImportItemRow added to AnyRow union — needed for writeWithOutbox type safety"
  - "5 new import entities added to SqliteAdapter/IndexedDbAdapter GARDEN_ID maps — required for row storage to work correctly"
  - "Phase 6 types (ImportPayload, ImportRow etc.) exported from packages/shared/src/index.ts — were missing from Plan 06-01"
  - "pushImportEntity is generic (uses importEntityToDb mapper) — avoids per-entity push methods for write-once draft rows"

patterns-established:
  - "importEntityToDb: generic camelCase→snake_case via explicit map (not regex) for all 5 import entities"
  - "importRepo follows gardenPlanRepo assertAccount + writeWithOutbox + scheduleWriteDebounced pattern exactly"
  - "selectedLocalIds Set<string> filter in saveImport — allows Preview screen to pass user selection"

requirements-completed: [IMPORT-05, IMPORT-07, IMPORT-08]

# Metrics
duration: 45min
completed: 2026-05-09
---

# Phase 06 Plan 02: Import Logic Layer Summary

**ajv draft-2020-12 validator with German bedRef cross-reference errors, writeWithOutbox draft persistence for all 5 import entity types, transient Zustand import store, and SyncWorker extended for push-to-Supabase**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-05-09T00:00:00Z
- **Completed:** 2026-05-09T00:45:00Z
- **Tasks:** 2 (TDD + implementation)
- **Files modified:** 11

## Accomplishments

- `importValidator.ts`: validates spatenstich-import.v1 payloads using ajv compiled at module level; cross-reference check catches plants with unknown bedRef and returns German error messages; 10 test cases all pass
- `importRepo.ts`: `saveImport()` writes import header + draft rows for selected beds/plants/observations via writeWithOutbox pattern; `loadPendingDrafts()` returns status=pending + non-deleted rows; 9 test cases all pass
- `importStore.ts`: transient Zustand store following captureStore.ts pattern exactly — no persist middleware
- `SyncWorker.ts`: 5 new `dispatchPush` cases routing to generic `pushImportEntity` method that uses `importEntityToDb` mapper before Supabase upsert
- `rowMappers.ts`: `importEntityToDb` and `importEntityFromDb` with full camelCase↔snake_case mapping for all import fields

## Task Commits

1. **Task 1: importValidator (TDD)** — `4e7472e` (test + feat — new files committed together)
2. **Task 2: importRepo + importStore + SyncWorker + rowMappers** — `62137b7` (feat)

## Files Created/Modified

- `app/src/lib/importValidator.ts` — ajv draft-2020-12 validator + bedRef cross-reference check
- `app/src/lib/__tests__/importValidator.test.ts` — 10 test cases (valid/invalid payloads, German errors)
- `app/src/lib/importRepo.ts` — saveImport + loadPendingDrafts using writeWithOutbox
- `app/src/lib/__tests__/importRepo.test.ts` — 9 test cases (writes, filter, mode guard)
- `app/src/stores/importStore.ts` — transient Zustand store (payload/setPayload/reset)
- `app/src/lib/sync/SyncWorker.ts` — 5 new dispatchPush cases + pushImportEntity method
- `app/src/lib/mappers/rowMappers.ts` — importEntityToDb + importEntityFromDb
- `app/src/storage/SqliteAdapter.ts` — 5 new entities in ROW_ENTITIES + GARDEN_ID maps
- `app/src/storage/IndexedDbAdapter.ts` — 5 new entities in ROW_ENTITIES + GARDEN_ID_COLUMN map
- `packages/shared/src/types/entities.ts` — ImportItemRow added to AnyRow + updatedAt field
- `packages/shared/src/index.ts` — Phase 6 import types exported (ImportPayload, ImportRow, etc.)

## Decisions Made

- `ImportItemRow.updatedAt` added as alias for `createdAt` — StorageAdapter's `writeWithOutbox` generic constraint `T extends AnyRow` requires `updatedAt` on every row; `ImportItemRow` is write-once so it always equals `createdAt`
- `ImportItemRow` added to `AnyRow` union — without this, TypeScript rejected the `writeWithOutbox` call
- Phase 6 types were missing from `packages/shared/src/index.ts` (Plan 06-01 created entities.ts but didn't add exports to index.ts) — auto-fixed as Rule 3 blocker

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Phase 6 types not exported from shared package index**
- **Found during:** Task 1 (importValidator GREEN phase)
- **Issue:** `ImportPayload` and other Phase 6 types defined in `entities.ts` by Plan 06-01 but not re-exported from `packages/shared/src/index.ts` — caused TS2307 "Module has no exported member"
- **Fix:** Added `ImportRow`, `ImportItemRow`, `BedDraftRow`, `PlantDraftRow`, `ObservationDraftRow`, `ImportPayload`, `ImportPayloadBed`, `ImportPayloadPlant`, `ImportPayloadObservation`, `ImportPayloadComplianceFlag` to index.ts exports
- **Files modified:** `packages/shared/src/index.ts`
- **Committed in:** `4e7472e` (Task 1 commit)

**2. [Rule 1 - Bug] ImportItemRow missing from AnyRow union**
- **Found during:** Task 2 (importRepo implementation)
- **Issue:** `ImportItemRow` not in `AnyRow` type union — `writeWithOutbox` rejects `ImportItemRow` as argument
- **Fix:** Added `ImportItemRow` to `AnyRow` union in `entities.ts`
- **Files modified:** `packages/shared/src/types/entities.ts`
- **Committed in:** `62137b7` (Task 2 commit)

**3. [Rule 1 - Bug] ImportItemRow missing updatedAt field**
- **Found during:** Task 2 (typecheck after storage adapter update)
- **Issue:** `SqliteAdapter` accesses `row.updatedAt` on all `AnyRow` members; `ImportItemRow` lacked this field causing TS2339
- **Fix:** Added `updatedAt: string` to `ImportItemRow` with doc comment explaining it aliases `createdAt` for write-once rows
- **Files modified:** `packages/shared/src/types/entities.ts`, `app/src/lib/importRepo.ts` (set `updatedAt: now` on all three `ImportItemRow` constructions)
- **Committed in:** `62137b7` (Task 2 commit)

**4. [Rule 3 - Blocking] Storage adapters missing 5 new import entities in GARDEN_ID maps**
- **Found during:** Task 2 (typecheck)
- **Issue:** `SqliteAdapter` and `IndexedDbAdapter` use `Record<EntityName, string | null>` for GARDEN_ID maps — TypeScript error TS2739 missing all 5 import entity keys
- **Fix:** Added `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts` to both adapters' `ROW_ENTITIES` arrays and `GARDEN_ID_COLUMN`/`GARDEN_ID_FIELD` maps
- **Files modified:** `app/src/storage/SqliteAdapter.ts`, `app/src/storage/IndexedDbAdapter.ts`
- **Committed in:** `62137b7` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (1 missing export, 2 type bugs, 1 blocking type map gap)
**Impact on plan:** All fixes were necessary for type safety and correct storage adapter behavior. No scope creep. All changes directly caused by Plan 06-02's new files.

## Issues Encountered

- 3 pre-existing test failures in `auth.test.ts`, `migrateLocalToAccount.rowtables.test.ts`, and `useSyncStatus.test.ts` — confirmed pre-existing by running tests against commit before any Plan 06-02 changes. Not caused by our changes. Logged to deferred-items.

## Known Stubs

None — no stub patterns in created files. `saveImport` wires real storage writes; `validatePayload` validates against real schema.

## Threat Flags

None — all security surfaces covered by plan's threat model (T-06-04, T-06-05, T-06-07). No new unplanned network endpoints or auth paths introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `importValidator`, `importRepo`, `importStore` ready for consumption by Plan 06-03 UI screens
- `SyncWorker.pushImportEntity` ready to push drafts to Supabase after RLS migration (Plan 06-01 migration 016)
- All 19 import tests passing; typecheck clean

---
*Phase: 06-import-flow-companion-prompt-m07-3-m07-4*
*Completed: 2026-05-09*
