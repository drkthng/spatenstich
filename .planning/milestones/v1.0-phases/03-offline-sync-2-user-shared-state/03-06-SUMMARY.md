---
phase: 03-offline-sync-2-user-shared-state
plan: "06"
subsystem: sync-ui
tags: [sync, badge, status-ui, i18n, integration-test, sc-5]
dependency_graph:
  requires:
    - 03-01  # LWW triggers, photo_queue, RPCs
    - 03-02  # StorageAdapter Row-Level methods
    - 03-03  # Repos offline-first + RowMappers
    - 03-04  # SyncWorker class, events, backoff, SyncTriggers
    - 03-05  # Foto-Queue + EXIF-Strip + DSGVO Opt-in
  provides:
    - SyncStatusBadge component (global header)
    - useSyncStatus hook (badge state-machine)
    - Settings/Sync detail screen (Retry/Verwerfen UI)
    - SC-5 integration tests (2-user reconnect)
  affects:
    - app/app/(app)/_layout.tsx (headerRight badge)
    - app/app/(app)/settings.tsx (sync link added)
    - packages/shared/src/i18n/de.json (sync.badge.* + sync.detail.*)
tech_stack:
  added: []
  patterns:
    - "useSyncStatus: syncEvents.on() subscriber + debounced listOutboxEntries re-count"
    - "isFailed: attempts >= MAX_ATTEMPTS && lastError !== null (no status field in OutboxEntry)"
    - "inline-confirm-expansion pattern for Verwerfen (no Modal, UI-SPEC line 234)"
    - "getSyncWorker() singleton in UI; new SyncWorker() constructor-injection in tests"
key_files:
  created:
    - app/src/hooks/useSyncStatus.ts
    - app/src/components/SyncStatusBadge.tsx
    - app/src/components/SyncStatusBadge.styles.ts
    - app/app/(app)/settings/sync.tsx
    - app/src/lib/sync/__tests__/useSyncStatus.test.ts
    - app/src/lib/sync/__tests__/syncStatus.retry-discard.test.ts
    - app/src/lib/sync/__tests__/SyncStatusBadge.test.tsx
    - app/src/lib/sync/__tests__/reconnect-30s.integration.test.ts
  modified:
    - app/app/(app)/_layout.tsx  (headerRight = SyncStatusBadge)
    - app/app/(app)/settings.tsx (Sync-Status link after Datenschutz)
    - packages/shared/src/i18n/de.json  (sync.badge.* + sync.detail.* keys)
    - app/jest.config.ts  (@/* + @spatenstich/shared/i18n/de mappers for hooks project)
    - app/src/__mocks__/react-native.ts  (added StyleSheet, Pressable, Text, View stubs)
decisions:
  - "isFailed detection: attempts >= MAX_ATTEMPTS (10) && lastError !== null — OutboxEntry has no status field (Plan 03-02 contract); plan interfaces section described a richer shape that doesn't match the actual codebase"
  - "jest.useFakeTimers() removed from SC-5 integration tests — fake timers block IndexedDB Promises; SC-5 30s-window verified logically (B pulls after A pushes), not by wall-clock time"
  - "react-native mock extended with StyleSheet.flatten, Pressable, Text, View stubs — needed by @testing-library/react-native v13 for component tests in node env"
  - "i18n pendingCount/failedCount stored as template strings with {n} (JSON-compatible) instead of functions (plan proposed functions but JSON doesn't support them)"
metrics:
  duration: "24 minutes"
  completed: "2026-04-25T18:00:47Z"
  tasks: 5
  files: 14
---

# Phase 03 Plan 06: Sync-Status-UI Summary

**One-liner:** Global header badge (4 states) + settings detail screen with inline Retry/Verwerfen, backed by useSyncStatus hook subscribed to syncEvents + outbox counts, with SC-5 2-user reconnect integration tests.

## Components + Hooks + Screens Created

| Artifact | Path | Description |
|----------|------|-------------|
| `useSyncStatus` | `app/src/hooks/useSyncStatus.ts` | Hook: syncEvents subscriber + debounced outbox re-count. Priority: offline > degraded > syncing > synced |
| `SyncStatusBadge` | `app/src/components/SyncStatusBadge.tsx` | Header badge: 4 states, accessibilityLabel, testID, tap → /settings/sync |
| `SyncStatusBadge.styles` | `app/src/components/SyncStatusBadge.styles.ts` | NativeWind color classes per state |
| `SyncDetailScreen` | `app/app/(app)/settings/sync.tsx` | Pending/Failed outbox list, Retry + inline-confirm Verwerfen via getSyncWorker() |

## Integrations

| Change | File | Details |
|--------|------|---------|
| headerRight | `app/app/(app)/_layout.tsx` | SyncStatusBadge on all authenticated routes |
| Settings link | `app/app/(app)/settings.tsx` | Sync-Status entry after Datenschutz link |
| i18n | `packages/shared/src/i18n/de.json` | sync.badge.{synced,syncing,degraded,offline,pendingCount,failedCount} + sync.detail.{title,pendingHeader,failedHeader,empty,entryLabel,retryButton,discardButton,discardConfirm,discardConfirmYes,discardConfirmNo,lastError,attemptsLabel,conflictLabel} |

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| `useSyncStatus.test.ts` | 7/7 | GREEN |
| `syncStatus.retry-discard.test.ts` | 7/7 | GREEN |
| `SyncStatusBadge.test.tsx` | 7/7 | GREEN |
| `reconnect-30s.integration.test.ts` | 4/4 | GREEN |
| **Total** | **25/25** | **GREEN** |

### SC-5 Scenarios Covered

1. **Happy Path**: A writes offline → syncAll() → B pullAll() sees new value (30s-window logic verified)
2. **LWW Conflict**: B pushes first (newer), A pushes older → P9011 → push_conflict event, outbox cleared, delta-pull corrects A's row
3. **Permanent Failure → Retry**: 10 failed attempts → retryOp() resets + succeeds → outbox empty
4. **Verwerfen → Delta-Pull**: discardOp() deletes entry + pulls server row, local row shows server state

## TypeScript

`pnpm --filter app typecheck` — clean (0 errors).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] OutboxEntry has no `status` field**
- **Found during:** Task 01 (useSyncStatus implementation)
- **Issue:** Plan `<interfaces>` section described `OutboxEntry` with `status: 'pending' | 'in_flight' | 'failed'`, `nextAttemptAt`, `lastAttemptedAt` fields — but the actual `packages/shared/src/types/entities.ts` only has `attempts` and `lastError`.
- **Fix:** `isFailed(e) = e.attempts >= MAX_ATTEMPTS && e.lastError !== null`. Pending = all entries where isFailed is false.
- **Files:** `app/src/hooks/useSyncStatus.ts`, `app/app/(app)/settings/sync.tsx`

**2. [Rule 1 - Bug] jest.useFakeTimers() at top-level blocks async IndexedDB Promises in integration tests**
- **Found during:** Task 05 (reconnect-30s.integration.test.ts)
- **Issue:** Global `jest.useFakeTimers()` caused all async operations (IndexedDB, Promise resolution) to hang indefinitely.
- **Fix:** Removed global fake timers. SC-5 30s-window is verified logically (B can pull A's data after A pushes) without wall-clock simulation.
- **Commit:** a3c2039

**3. [Rule 1 - Bug] i18n template functions (pendingCount: (n) => string) not serializable in JSON**
- **Found during:** Task 01/03 (de.json extension)
- **Issue:** Plan proposed JavaScript function values; JSON doesn't support functions.
- **Fix:** Stored as template strings with `{n}` placeholder (e.g., `"{n} ausstehend"`). Components substitute with `.replace('{n}', String(n))`.
- **Files:** `packages/shared/src/i18n/de.json`, `SyncStatusBadge.tsx`, `settings/sync.tsx`

**4. [Rule 2 - Missing] react-native mock missing StyleSheet + component stubs**
- **Found during:** Task 03 (SyncStatusBadge component tests)
- **Issue:** `@testing-library/react-native` v13 requires `StyleSheet.flatten` to render; existing mock was minimal.
- **Fix:** Extended `app/src/__mocks__/react-native.ts` with `StyleSheet`, `Pressable`, `Text`, `View`, `ScrollView`, `ActivityIndicator`, `Switch`, `Dimensions`, `Alert`, `Keyboard` stubs.
- **Commit:** 81608c9

**5. [Rule 2 - Missing] jest.config.ts missing `@/*` and `@spatenstich/shared/i18n/de` mappers**
- **Found during:** Task 01 (useSyncStatus tests in hooks project)
- **Issue:** hooks jest project had no path mapper for `@/*` aliases or the i18n sub-path export.
- **Fix:** Added `'^@spatenstich/shared/i18n/de$'` and `'^@/src/(.*)$'` / `'^@/(.*)$'` mappers to hooks project.
- **Commit:** 9a7836e

## Consumer-API Contract

All UI runtime paths use `getSyncWorker()` exclusively (singleton accessor from Plan 03-04).
All tests use `new SyncWorker({ storage, supabase, sentry? })` (constructor-injection) for fresh isolated instances.
No private SyncWorker symbols were promoted or exposed in this plan.

## Pre-existing Failures (Out of Scope)

The following test suites were already failing on the base commit (262e765) before any Plan 03-06 changes:
- `src/lib/__tests__/auth.test.ts` — SecureStore mock issue (unrelated to sync UI)
- `src/lib/photos/__tests__/PhotoUploader.test.ts` — pre-existing failure
- `src/lib/photos/__tests__/photoQueueRepo.test.ts` — pre-existing failure

These are logged to `deferred-items.md` and are not caused by Plan 03-06.

## Known Stubs

None. All UI data is wired to live `storage.listOutboxEntries()` and `getSyncWorker()` calls.

## Threat Flags

No new network endpoints, auth paths, or trust boundaries introduced. All security mitigations from the threat model were applied:
- T-3-06-01: Inline-confirm-expansion (2-tap discard) implemented in `settings/sync.tsx`
- T-3-06-03: `busyId` state disables Retry/Verwerfen buttons during in-flight operations

## Self-Check: PASSED

Files verified:
- app/src/hooks/useSyncStatus.ts — FOUND
- app/src/components/SyncStatusBadge.tsx — FOUND
- app/app/(app)/settings/sync.tsx — FOUND
- app/src/lib/sync/__tests__/useSyncStatus.test.ts — FOUND
- app/src/lib/sync/__tests__/syncStatus.retry-discard.test.ts — FOUND
- app/src/lib/sync/__tests__/SyncStatusBadge.test.tsx — FOUND
- app/src/lib/sync/__tests__/reconnect-30s.integration.test.ts — FOUND

Commits verified:
- 9a7836e feat(03-06): useSyncStatus hook + badge state-machine + i18n sync keys
- f793ad1 test(03-06): SyncWorker retryOp/discardOp/pullAll class-API consumer tests
- 81608c9 feat(03-06): SyncStatusBadge component + header integration + react-native mock
- 7201011 feat(03-06): Settings/Sync detail screen + settings link
- a3c2039 test(03-06): SC-5 2-user reconnect integration tests (4 scenarios)
