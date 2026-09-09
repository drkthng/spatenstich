---
phase: 03-offline-sync-2-user-shared-state
plan: 02
subsystem: storage
tags: [storage-adapter, sqlite, indexeddb, outbox, sync, row-tables, tdd]
dependency_graph:
  requires: ["03-01"]
  provides: ["03-03", "03-04"]
  affects: ["app/src/storage/", "packages/shared/src/types/"]
tech_stack:
  added: []
  patterns:
    - "TDD Red/Green per task (contract test factory + adapter-specific suites)"
    - "withExclusiveTransactionAsync for atomic SQLite row+outbox writes (L-6)"
    - "idb multi-store transaction for atomic IndexedDB row+outbox writes (L-6)"
    - "JSON-blob storage: camelCase rows serialized via JSON.stringify/parse"
    - "Monotonic counter appended to ISO timestamps for FIFO tie-breaking"
    - "__createRowTablesV3 hook pattern: migrations delegate DDL to concrete adapter"
    - "In-memory expo-sqlite mock with WHERE param pre-binding (pIdx per-condition, not per-row)"
key_files:
  created:
    - packages/shared/src/types/entities.ts
    - app/src/storage/__tests__/RowTables.contract.ts
    - app/src/storage/__tests__/SqliteAdapter.rows.test.ts
    - app/src/storage/__tests__/IndexedDbAdapter.rows.test.ts
    - app/src/__mocks__/expo-sqlite.ts
  modified:
    - packages/shared/src/types/storage.ts
    - packages/shared/src/index.ts
    - app/src/storage/SqliteAdapter.ts
    - app/src/storage/IndexedDbAdapter.ts
    - app/src/storage/migrations.ts
    - app/jest.config.ts
decisions:
  - "Contract test factory exported from RowTables.contract.ts (not .test.ts) — Jest requires at least one test per .test.ts file; pure-factory files must not match testMatch glob"
  - "In-memory expo-sqlite mock uses per-call fresh DB (not shared by name) — prevents test bleed-through when Date.now() collides across rapid beforeEach calls"
  - "WHERE param binding fixed to pre-bind before filter iteration — shared pIdx across filter callbacks would consume params for rows that fail earlier conditions"
  - "GardenRow.id serves as garden_id for gardens entity (GARDEN_ID_COLUMN: gardens → 'id') — garden table has no separate garden_id column, self-references via primary key"
  - "GARDEN_ID_FIELD map (camelCase) parallel to GARDEN_ID_COLUMN (snake_case) — needed because JS row objects use camelCase fields but SQL tables use snake_case column names"
metrics:
  duration: "17 min"
  completed: "2026-04-25"
  tasks: 3
  files: 11
---

# Phase 03 Plan 02: Storage-Adapter Row-Tables Summary

**One-liner:** Extended StorageAdapter with atomic Row+Outbox writes via SQLite `withExclusiveTransactionAsync` and idb multi-store transactions; parametrised contract tests confirm both adapters satisfy the same behavioral contract.

## What Was Built

### New API Methods Added to StorageAdapter

All methods are backwards-compatible (KV interface unchanged):

| Method | Signature | Purpose |
|--------|-----------|---------|
| `getRow` | `(entity, id, opts?) → T\|null` | Load single row; hides soft-deleted by default |
| `getRowsByGarden` | `(entity, gardenId, opts?) → T[]` | Garden-scoped query with garden_id index |
| `getAllRows` | `(entity, opts?) → T[]` | Full-table scan for cross-garden entities (profiles) |
| `writeWithOutbox` | `(entity, row, outboxOpts) → void` | Atomic row + outbox write (L-6) |
| `upsertRowFromServer` | `(entity, row) → void` | Pull-side write, NO outbox entry (prevents ping-pong) |
| `upsertRowsFromServer` | `(entity, rows) → void` | Batch pull-side upsert |
| `listOutboxEntries` | `(limit?) → OutboxEntry[]` | FIFO (ASC created_at) |
| `deleteOutboxEntry` | `(id) → void` | Post-ACK removal |
| `updateOutboxEntry` | `(id, patch) → void` | Backoff counter + error text |
| `getSyncState` | `(entity) → SyncStateEntry\|null` | last_pull_at / last_push_at per entity |
| `setSyncState` | `(state) → void` | Update sync cursor |

### Migration Version 3

Creates via `__createRowTablesV3` hook:

**SQLite tables (6 Row-Tables):**
- `gardens (id PK, data JSON, id TEXT, deleted_at, updated_at)` + index `idx_gardens_id`
- `garden_members (id PK, data JSON, garden_id TEXT, deleted_at, updated_at)` + index `idx_garden_members_garden_id`
- `profiles (id PK, data JSON, deleted_at, updated_at)` — no garden_id (cross-garden)
- `vereinsregeln (id PK, data JSON, garden_id TEXT, deleted_at, updated_at)` + index
- `invite_codes (id PK, data JSON, garden_id TEXT, deleted_at, updated_at)` + index
- `photo_queue (id PK, data JSON, garden_id TEXT, deleted_at, updated_at)` + index
- `sync_outbox (id PK, entity, row_id, operation, payload JSON, created_at, attempts, last_error)` + index `idx_sync_outbox_fifo ON created_at`
- `sync_state (entity PK, last_pull_at, last_push_at)`

**IndexedDB Object Stores (version 2 upgrade):**
- `gardens` (keyPath: id) — no by_gardenId (self-referential)
- `garden_members` (keyPath: id) + `by_gardenId` index on `gardenId` field
- `profiles` (keyPath: id) — no by_gardenId
- `vereinsregeln` (keyPath: id) + `by_gardenId` index
- `invite_codes` (keyPath: id) + `by_gardenId` index
- `photo_queue` (keyPath: id) + `by_gardenId` index
- `sync_outbox` (keyPath: id) + `by_createdAt` index (FIFO)
- `sync_state` (keyPath: entity)

### Indexes Created

| Adapter | Index | Purpose |
|---------|-------|---------|
| SQLite | `idx_gardens_id ON gardens(id) WHERE deleted_at IS NULL` | self-ref garden_id |
| SQLite | `idx_garden_members_garden_id ON garden_members(garden_id) WHERE deleted_at IS NULL` | member lookup |
| SQLite | `idx_vereinsregeln_garden_id`, `idx_invite_codes_garden_id`, `idx_photo_queue_garden_id` | garden-scoped queries |
| SQLite | `idx_sync_outbox_fifo ON sync_outbox(created_at)` | FIFO guarantee |
| IndexedDB | `by_gardenId` on all garden-scoped entities | `getAllFromIndex` efficiency |
| IndexedDB | `by_createdAt` on sync_outbox | `getAll()` from index returns FIFO order |

## Test Coverage

| Test Suite | Tests | Result |
|------------|-------|--------|
| `SqliteAdapter.rows.test.ts` (contract + SQLite-specific) | 11 | PASS |
| `IndexedDbAdapter.rows.test.ts` (contract + web-specific) | 12 | PASS |
| `StorageAdapter.test.ts` (pre-existing KV contract) | 10 | PASS |
| `migration.test.ts` (pre-existing migration stub) | 1 | PASS |
| **Total** | **34** | **ALL PASS** |

Contract cases covered per adapter: KV backwards compat, writeWithOutbox atomicity, soft-delete filter, getRowsByGarden, upsertRowFromServer (no outbox), FIFO outbox order, deleteOutboxEntry, updateOutboxEntry backoff, getSyncState null, setSyncState roundtrip.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WHERE param pre-binding in expo-sqlite mock**
- **Found during:** Task 03-02-02 (SqliteAdapter KV backwards compat test failing)
- **Issue:** `_select` filter callback incremented `pIdx` per-row, consuming params for rows that failed earlier conditions — subsequent rows used wrong param values
- **Fix:** Pre-bind each WHERE condition to its param value before the filter loop (one pass to build `boundConditions` array, then filter reads from it)
- **Files modified:** `app/src/__mocks__/expo-sqlite.ts`
- **Commit:** 027b04f

**2. [Rule 1 - Bug] expo-sqlite mock shared DB by name caused test bleed-through**
- **Found during:** Task 03-02-02 (KV test returning null after set)
- **Issue:** `openDatabaseAsync` returned shared `InMemoryDb` by name; Date.now() collisions in rapid `beforeEach` calls meant multiple test instances shared dirty state
- **Fix:** Each `openDatabaseAsync` call creates a fresh independent `InMemoryDb` (`createFreshDb()`), not keyed by name
- **Files modified:** `app/src/__mocks__/expo-sqlite.ts`
- **Commit:** 027b04f

**3. [Rule 1 - Bug] `@ts-expect-error` unused in IndexedDbAdapter test**
- **Found during:** Task 03-02-03 test run
- **Issue:** `__createRowTablesV3` is a public method, not private; strict TS 5.x rejects unused `@ts-expect-error`
- **Fix:** Remove the directive
- **Files modified:** `app/src/storage/__tests__/IndexedDbAdapter.rows.test.ts`
- **Commit:** 42768c0

**4. [Rule 1 - Bug] RowTables.contract.test.ts caused empty-suite Jest error**
- **Found during:** Full storage test run after Task 03-02-03
- **Issue:** Jest requires at least one test per `*.test.ts` file; contract file only exports factory
- **Fix:** Rename to `RowTables.contract.ts` (no `.test.` in name), update imports
- **Files modified:** renamed + `SqliteAdapter.rows.test.ts`, `IndexedDbAdapter.rows.test.ts`
- **Commit:** 01babab

**5. [Rule 2 - Missing] expo-sqlite Node/Jest mock**
- **Found during:** Task 03-02-02 setup
- **Issue:** No expo-sqlite mock for node test environment; native module not available in Jest
- **Fix:** Created in-memory `expo-sqlite.ts` mock implementing `openDatabaseAsync`, `execAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`, `withExclusiveTransactionAsync` using Map-based in-memory SQL interpreter
- **Files created:** `app/src/__mocks__/expo-sqlite.ts`; `app/jest.config.ts` updated with moduleNameMapper
- **Commits:** 30e7d40, 027b04f

**6. [Rule 1 - Bug] GardenRow payload type incompatible with `Record<string, unknown>`**
- **Found during:** Task 03-02-02 TypeScript compilation
- **Issue:** Strict TS 5.x: typed interfaces like `GardenRow` not assignable to `Record<string, unknown>` (missing index signature); contract test `payload: row` failed type check
- **Fix:** Added `as unknown as Record<string, unknown>` casts in contract test payload fields
- **Files modified:** `app/src/storage/__tests__/RowTables.contract.ts`
- **Commit:** 027b04f

**7. [Rule 1 - Bug] GARDEN_ID_FIELD map missing in SqliteAdapter**
- **Found during:** Task 03-02-02 implementation
- **Issue:** Plan code used `(row as any).gardenId` unsafely; needed explicit camelCase→snake_case mapping
- **Fix:** Added `GARDEN_ID_FIELD` record mapping EntityName to camelCase field name; used in `writeWithOutbox` and `upsertRowFromServer`
- **Files modified:** `app/src/storage/SqliteAdapter.ts`
- **Commit:** 027b04f

## Known Landmines

**L-6: Transaction semantics differ between SQLite and IndexedDB**
- SQLite: `withExclusiveTransactionAsync` blocks the entire DB connection; all concurrent writes queue behind it. True serialization at OS level.
- IndexedDB: `db.transaction([entity, sync_outbox], 'readwrite')` is serialized per overlapping store set. Two concurrent transactions on different entity pairs (e.g., `gardens + outbox` vs `vereinsregeln + outbox`) may interleave at the outbox level. In practice, the SyncWorker (Plan 03-04) must drain the outbox serially — concurrent writes from UI components in the same browser tab should be rare.
- **Mitigation documented:** Contract test for parallel writes (10 concurrent `writeWithOutbox`) covers the EXCLUSIVE-lock path for SQLite; IndexedDB test passes because idb transactions are serialized for overlapping store sets.

## Downstream Recommendations for Plan 03-03 (Repo-Umbau)

1. **Import from `@spatenstich/shared`:** Use `EntityName`, `GardenRow`, `GardenMemberRow`, `ProfileRow`, `VereinsregelnRow`, `PhotoQueueRow`, `OutboxEntry`, `SyncStateEntry`, `QueryOptions` directly.
2. **`writeWithOutbox` payload type:** The `payload` parameter requires `Record<string, unknown>`. When passing typed row objects, cast: `row as unknown as Record<string, unknown>`. Consider creating a helper: `toPayload<T>(row: T): Record<string, unknown>` using `JSON.parse(JSON.stringify(row))`.
3. **`getRowsByGarden` on `profiles`:** Will throw — profiles has no garden_id. Use `getAllRows('profiles')` and filter by `userId` in the repo layer.
4. **Migration v3 must run before any Row API call.** Repos should not access Row-Level methods unless `runMigrations(adapter)` has completed. The app bootstrap in `_layout.tsx` already calls `runMigrations` on startup.
5. **`upsertRowFromServer` is pull-only:** Adding a JSDoc `@internal` and a grep-based CI check (plan 03-06) will catch misuse. Pattern: `grep -r "upsertRowFromServer" app/src/ | grep -v "storage/\|__tests__/\|SyncWorker"` must be empty.

## Threat Flags

No new network endpoints, auth paths, or schema changes at trust boundaries introduced by this plan (storage is local-only). Threat model fully covered by STRIDE register in PLAN.md (7 items, all mitigated or accepted).

## Self-Check: PASSED

Files exist:
- `packages/shared/src/types/entities.ts` — FOUND
- `packages/shared/src/types/storage.ts` — FOUND (modified)
- `packages/shared/src/index.ts` — FOUND (modified)
- `app/src/storage/SqliteAdapter.ts` — FOUND (modified)
- `app/src/storage/IndexedDbAdapter.ts` — FOUND (modified)
- `app/src/storage/migrations.ts` — FOUND (modified)
- `app/src/storage/__tests__/RowTables.contract.ts` — FOUND
- `app/src/storage/__tests__/SqliteAdapter.rows.test.ts` — FOUND
- `app/src/storage/__tests__/IndexedDbAdapter.rows.test.ts` — FOUND
- `app/src/__mocks__/expo-sqlite.ts` — FOUND

Commits exist: a3f05c2, 17b1ced, 30e7d40, 027b04f, 662e164, 42768c0, 01babab — all in git log.

Tests: 34 passing, 0 failing.
