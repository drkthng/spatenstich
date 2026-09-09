---
phase: 03-offline-sync-2-user-shared-state
plan: "04"
subsystem: sync-engine
tags: [sync, offline-first, outbox, lww, sentry, netinfo, appstate, debounce]
dependency_graph:
  requires: ["03-01", "03-02", "03-03"]
  provides: ["SyncWorker-class-API", "SyncTriggers", "scheduleWriteDebounced"]
  affects: ["app/app/_layout.tsx", "app/src/lib/gardenRepo.ts", "app/src/lib/vereinsregelnRepo.ts", "app/src/lib/profileRepo.ts"]
tech_stack:
  added: ["@react-native-community/netinfo@^11"]
  patterns: ["Constructor-Injection", "Singleton-Accessor", "FIFO-Outbox-Iteration", "Full-Jitter-Backoff", "pushInFlight-Serialisation", "S-6-useRef-Guard", "LWW-P9011-Handling"]
key_files:
  created:
    - app/src/lib/sync/SyncWorker.ts
    - app/src/lib/sync/SyncTriggers.ts
    - app/src/lib/sync/backoff.ts
    - app/src/lib/sync/events.ts
    - app/src/lib/sync/__tests__/SyncWorker.test.ts
    - app/src/lib/sync/__tests__/SyncTriggers.test.ts
    - app/src/lib/sync/__tests__/backoff.test.ts
    - app/src/lib/sync/__tests__/reconnect-2user.integration.test.ts
    - app/src/__mocks__/sentry-react-native.ts
  modified:
    - app/app/_layout.tsx
    - app/src/stores/authStore.ts (no change needed — layout-effect handles mode-change)
    - app/src/lib/gardenRepo.ts
    - app/src/lib/vereinsregelnRepo.ts
    - app/src/lib/profileRepo.ts
    - app/jest.config.ts
    - app/package.json
decisions:
  - "SyncWorker as class (not module functions) — pushInFlight as instance state enables serialisation without globals"
  - "getSyncWorker()/setSyncWorker() singleton pattern — lazy-init with default adapters, injectable in tests"
  - "syncAll() = pullAll() + push() (pull-first order) — pulls before pushing prevents LWW false positives from stale local state"
  - "pullAll() continues on per-entity failures (partial-sync allowed) — prevents single bad entity from blocking all others"
  - "discardOp() triggers pull(entity) after deletion — ensures local state reflects server after user discards a conflict"
  - "WRITE_DEBOUNCE_MS=500 exported as constant — verified with fake-timers (499ms no push, 500ms exactly 1 push)"
  - "syncBooted useRef guard in _layout.tsx — prevents double trigger in React 18 StrictMode"
  - "@react-native-community/netinfo installed as real dep (types needed for ReturnType<typeof NetInfo.addEventListener>)"
  - "Sentry mock added to __mocks__ + moduleNameMapper — @sentry/react-native uses ESM, incompatible with ts-jest CJS transform"
metrics:
  duration_minutes: 13
  completed_date: "2026-04-25"
  tasks_completed: 3
  files_changed: 16
---

# Phase 03 Plan 04: SyncWorker + SyncTriggers + 2-User-Reconnect Summary

SyncWorker class with constructor injection `{ storage, supabase, sentry? }`, full Outbox push/pull cycle with LWW-P9011 handling, exponential backoff, and NetInfo/AppState/writeDebounce triggers wired into the root layout.

## Tasks Completed

| Task | Name | Commit | Tests |
|------|------|--------|-------|
| 03-04-01 | SyncWorker Class + backoff + events + Singleton | `7a66d1a` | 18 passed |
| 03-04-02 | SyncTriggers + layout bootstrap + repo patches | `82954d5` | 6 passed |
| 03-04-03 | 2-User-Reconnect Integration Test + Sentry | `2f44aae` | 2 passed |

**Total: 26 new tests, 213 total passing, 0 regressions**

## SyncWorker Class API

```typescript
export class SyncWorker {
  constructor(deps: { storage: StorageAdapter; supabase: SupabaseClient; sentry?: typeof Sentry });
  push(): Promise<void>;           // FIFO outbox push, pushInFlight guard
  pull(entity: EntityName): Promise<void>;    // delta-pull via updated_at > lastPullAt
  pullAll(): Promise<void>;        // iterates PULL_ENTITIES, continues on per-entity failures
  syncAll(): Promise<void>;        // pullAll() then push()
  retryOp(opId: string): Promise<void>;     // reset attempts=0, trigger syncAll
  discardOp(opId: string): Promise<void>;   // delete + pull(entity), idempotent
}
export function getSyncWorker(): SyncWorker;  // lazy singleton
export function setSyncWorker(w: SyncWorker | null): void;  // test injection
```

## Singleton-Accessor Pattern

`getSyncWorker()` lazy-initialises with `{ storage: defaultStorage, supabase: defaultSupabase }`. Tests call `setSyncWorker(null)` before each test to get a fresh instance or `setSyncWorker(customWorker)` to inject a mock.

## SyncTriggers Subscription Model

| Trigger | Condition | Action | Pattern |
|---------|-----------|--------|---------|
| NetInfo | `offline → online` | `worker.syncAll()` | wasOffline flag |
| AppState | `background → active` | `worker.syncAll()` | lastState tracking |
| writeDebounced | 500ms after write | `worker.push()` | clearTimeout+setTimeout |

D-16/D-26 **500ms debounce** verified with `jest.useFakeTimers()`: at 499ms no push call, at 500ms exactly 1 push call.

## Error Classification Table

| Error Code | Meaning | Handling |
|------------|---------|----------|
| `P9011` | LWW: incoming write older than server | Delete outbox entry, emit `push_conflict`, Sentry `lww_conflict` tag |
| `P9010` | LWW: missing `updated_at` in payload | Delete outbox entry (client bug), Sentry `missing_updated_at` tag |
| `42501` | RLS permission denied | attempts++, backoff, remains in queue |
| `23505` | Unique violation | attempts++, backoff |
| Network error | Any other error | attempts++, backoff |
| `attempts >= 10` | Max retries exceeded | emit `push_permanent_failure`, stays in queue for user action |

## Sentry Instrumentation

Every `pushOne()` call adds a breadcrumb `{ category: 'sync', message: 'push <entity>.<rowId> op=<op>' }`.

On error:
- P9011: `captureException(e, { level: 'warning', tags: { sync_phase: 'push', error_kind: 'lww_conflict' } })`
- P9010: `captureException(e, { tags: { sync_phase: 'push', error_kind: 'missing_updated_at' } })`
- max_attempts: `captureException(e, { tags: { sync_phase: 'push', error_kind: 'max_attempts' } })`
- pull errors: `captureException(e, { tags: { sync_phase: 'pull', entity } })`

## Repo Patches (scheduleWriteDebounced)

All three repos now call `scheduleWriteDebounced()` **after** a successful `writeWithOutbox()`:

| Repo | Function(s) patched |
|------|---------------------|
| `gardenRepo.ts` | `updateGarden()` |
| `vereinsregelnRepo.ts` | `saveVereinsregeln()`, `deleteVereinsregel()` |
| `profileRepo.ts` | `saveProfile()` (account-mode branch) |

The call is placed **inside the try block after `writeWithOutbox` succeeds**, before the catch, so debounce is only triggered on successful writes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @react-native-community/netinfo not installed**
- **Found during:** Task 02 — `NetInfoSubscription` type not available
- **Fix:** `pnpm --filter app add @react-native-community/netinfo` + used `ReturnType<typeof NetInfo.addEventListener>` instead of the internal `NetInfoSubscription` named export
- **Files modified:** `app/package.json`, `pnpm-lock.yaml`
- **Commit:** `82954d5`

**2. [Rule 3 - Blocking] @sentry/react-native uses ESM, incompatible with ts-jest CJS**
- **Found during:** Task 01 — SyncWorker.test.ts fails with "Unexpected token 'export'"
- **Fix:** Created `app/src/__mocks__/sentry-react-native.ts` + added `^@sentry/react-native$` to `moduleNameMapper` in jest.config.ts hooks project
- **Files modified:** `app/src/__mocks__/sentry-react-native.ts`, `app/jest.config.ts`
- **Commit:** `7a66d1a`

**3. [Rule 2 - Missing] fake-indexeddb/auto missing from SyncTriggers.test.ts**
- **Found during:** Task 02 — `indexedDB is not defined` because SyncTriggers imports SyncWorker → storage → IndexedDbAdapter
- **Fix:** Added `import 'fake-indexeddb/auto'` at top of SyncTriggers.test.ts
- **Commit:** `82954d5`

**4. [Rule 2 - Missing] authStore.ts setAccountMode — no direct worker call needed**
- **Plan said:** add signal to setAccountMode; layout-effect handles it via `[identity, mode, activeGardenId]` deps
- **Decision:** No change to authStore.ts needed — layout useEffect already has `mode` in deps and fires on any mode change
- **Impact:** None — plan's intent fully satisfied via layout-effect

## Known Stubs

None. All public API methods are fully implemented.

## Threat Surface Scan

All 7 STRIDE threats from the plan's threat model are mitigated as implemented:

| T-ID | Mitigation | Implemented |
|------|------------|-------------|
| T-3-04-01 | updated_by_user_id stamped from authStore.userId | Yes — pushGarden/pushProfile/pushVereinsregeln |
| T-3-04-02 | RLS 42501 on RPC error | Yes — handlePushError 42501 path |
| T-3-04-03 | RLS filters server-side | Yes — pull only returns member-accessible rows |
| T-3-04-04 | MAX_ATTEMPTS=10 + exponential backoff | Yes — nextBackoffMs + MAX_ATTEMPTS guard |
| T-3-04-05 | Breadcrumbs contain only IDs, no payloads | Yes — breadcrumb data: { entity, row_id, operation, attempts } |
| T-3-04-06 | pushInFlight instance flag | Yes — private pushInFlight = false |
| T-3-04-07 | Single-user rate limits sufficient | Yes — AppState trigger fires only on real background→active |

## Downstream Recommendations

**For Plan 03-05 (PhotoUploader):**
- `getSyncWorker()` is available for triggering `push()` after photo upload completes
- `photo_queue` entity is already handled in `dispatchPush()` via `pushPhotoQueue()` — no changes needed to SyncWorker

**For Plan 03-06 (SyncStatus UI):**
- `worker.retryOp(opId)` and `worker.discardOp(opId)` are already public — wire directly to UI buttons
- `worker.pullAll()` is public — call after user manually triggers refresh
- `syncEvents.on(listener)` returns unsubscribe function — use in `useEffect` for UI sync status updates
- `syncEvents` emits: `push_start`, `push_success`, `push_retry`, `push_conflict`, `push_permanent_failure`, `pull_start`, `pull_success`, `pull_failure`, `status_change`
- `getSyncWorker()` is accessible from any screen — no context needed

## Self-Check: PASSED

All created files verified present on disk. All task commits verified in git log.

| Check | Result |
|-------|--------|
| `app/src/lib/sync/SyncWorker.ts` | FOUND |
| `app/src/lib/sync/SyncTriggers.ts` | FOUND |
| `app/src/lib/sync/backoff.ts` | FOUND |
| `app/src/lib/sync/events.ts` | FOUND |
| `app/src/lib/sync/__tests__/SyncWorker.test.ts` | FOUND |
| `app/src/lib/sync/__tests__/SyncTriggers.test.ts` | FOUND |
| `app/src/lib/sync/__tests__/backoff.test.ts` | FOUND |
| `app/src/lib/sync/__tests__/reconnect-2user.integration.test.ts` | FOUND |
| `app/src/__mocks__/sentry-react-native.ts` | FOUND |
| Commit `7a66d1a` (Task 01) | FOUND |
| Commit `82954d5` (Task 02) | FOUND |
| Commit `2f44aae` (Task 03) | FOUND |
