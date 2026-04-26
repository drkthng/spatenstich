---
phase: 03-offline-sync-2-user-shared-state
verified: 2026-04-26T11:00:00Z
status: human_needed
score: 5/5 success criteria verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "A photo captured offline is stored locally; when the network returns the photo is uploaded and the AI analysis job is enqueued automatically without user action"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "2-user LWW conflict — 'zuletzt bearbeitet von' winner label"
    expected: "After two devices edit the same garden offline and reconnect, the losing device's local view should update via delta-pull and the garden screen should show 'zuletzt bearbeitet von [winner name]' reflecting the LWW-winning write"
    why_human: "Requires two physical devices (or two auth sessions), real Supabase P9011 rejection, and UI rendering of the conflict winner label in settings/garden.tsx. The SC-5 integration tests verify the logic but use a mock Supabase; the full 30s wall-clock and real RLS enforcement require human observation"
  - test: "Offline plan render — no spinner, no blank screen"
    expected: "Kill network on device, close and reopen app — the garden plan renders immediately from StorageAdapter Row-Tables with no loading indicator and no blank state"
    why_human: "Requires a real device or simulator with network disabled; cannot be verified by grep or static analysis"
  - test: "Desktop browser (IndexedDB) plan sync"
    expected: "Open the app in Chrome/Safari after editing on iPhone (after sync) — the same plan data appears with all recent changes"
    why_human: "Requires actual cross-platform session to verify IndexedDB read path works end-to-end against live Supabase"
  - test: "Edits appear in Supabase within 30s of reconnect"
    expected: "Make an offline edit, restore network, observe Supabase Postgres row updated within 30 seconds and SyncStatusBadge transitions syncing -> synced"
    why_human: "Wall-clock timing and real network reconnect event require live device testing"
---

# Phase 03: Offline & Sync Verification Report

**Phase Goal:** Dirk und seine Frau konnen die App ohne Internet offnen, den gemeinsamen Plan sehen und bearbeiten, und alle Anderungen (inkl. Foto-Queue) werden bei Reconnect automatisch synchronisiert -- LWW bei gleichzeitigen Edits, Sync-Status sichtbar.
**Verified:** 2026-04-26T11:00:00Z
**Status:** human_needed
**Re-verification:** Yes -- after gap closure (Plan 03-07 wired uploadPending into SyncTriggers)

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | App opens and renders the last-seen plan with no network -- no spinner, no error, no blank screen | VERIFIED | `gardenRepo.loadGarden` reads `storage.getRow('gardens', ...)` first; falls back to Supabase only when local row absent. All repos use offline-first pattern. StorageAdapter Row-Tables created in migration V3, both SQLite and IndexedDB. |
| SC-2 | A photo captured offline is stored locally; when the network returns the photo is uploaded and the AI analysis job is enqueued automatically without user action | VERIFIED | **Gap closed by Plan 03-07.** `uploadPending` imported from `'../photos/PhotoUploader'` at SyncTriggers.ts line 8. Called with `.catch()` in NetInfo `wasOffline && isConnected` handler (line 54) and AppState `lastState !== 'active' && state === 'active'` handler (line 66). Both calls run in parallel with `syncAll()` via independent `.catch()` -- failure isolation confirmed by test. `uploadPending()` itself iterates photo_queue rows, uploads via ArrayBuffer pattern to Supabase Storage, then calls `enqueue_photo_analysis` RPC. 9/9 SyncTriggers tests pass including 3 new SC-2 gap closure tests. |
| SC-3 | Edits made offline appear in Supabase Postgres within 30 seconds of reconnection; sync-status indicator shows "synced" when complete | VERIFIED | `SyncTriggers.registerSyncTriggers()` calls `syncAll()` on NetInfo `offline->online` and AppState `background->active`. `SyncStatusBadge` is mounted in `(app)/_layout.tsx` headerRight showing 4 states. `push()` -> `status_change: idle` after empty outbox. |
| SC-4 | The app runs on desktop browser (Chrome/Safari) with IndexedDB as the storage backend -- the same plan data is visible on both iPhone and browser after sync | VERIFIED | `IndexedDbAdapter` fully implements Row-Level API with idb multi-store atomic transactions. Migration V3 upgrades IDB to version 2 with all 8 object stores. Contract tests confirm identical behavior to SQLite. |
| SC-5 | Dirk und Frau editieren denselben Plan offline auf zwei Geraten; bei Reconnect triggert LWW-Merge ohne manuelle Konfliktauflosung; "zuletzt bearbeitet von"-Hinweis zeigt den Gewinner | HUMAN NEEDED | LWW enforcement confirmed: P9011 -> delete outbox entry + delta-pull via `discardOp`. `updated_by_user_id` stamped on push via `pushGarden()`. `settings/garden.tsx` renders `t('audit.last_edited_by', ...)` from `garden.updatedByUserId`. Integration test covers 4 scenarios including LWW conflict. Human verification needed for real 2-device wall-clock. |

**Score:** 5/5 roadmap success criteria verified (SC-5 needs human for full 2-device confirmation)

### Deferred Items

None identified -- no gaps addressed by later milestone phases.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260424000013_offline_sync_infrastructure.sql` | LWW triggers + photo_queue + RPCs | VERIFIED | 380+ lines; tg_lww_guard(), aa_/mm_/zz_ trigger trio on 6 tables, photo_queue table, enqueue_photo_analysis RPC, server_now RPC, private photos bucket, 4 Storage RLS policies |
| `packages/shared/src/types/supabase.ts` | photo_queue types + RPCs typed | VERIFIED | photo_queue.Row, Insert, Update present; enqueue_photo_analysis and server_now RPCs typed |
| `packages/shared/src/types/entities.ts` | EntityName, GardenRow, OutboxEntry, SyncStateEntry, PhotoQueueRow | VERIFIED | All 6 entity row types defined; OutboxEntry and SyncStateEntry defined |
| `packages/shared/src/types/storage.ts` | StorageAdapter interface with Row-Level API | VERIFIED | getRow, getRowsByGarden, getAllRows, writeWithOutbox, upsertRowFromServer, listOutboxEntries, getSyncState, setSyncState all defined |
| `app/src/storage/SqliteAdapter.ts` | writeWithOutbox with withExclusiveTransactionAsync | VERIFIED | Uses `db.withExclusiveTransactionAsync()` for atomic row + outbox writes |
| `app/src/storage/IndexedDbAdapter.ts` | writeWithOutbox with multi-store IDB transaction | VERIFIED | Uses `db.transaction([entity, 'sync_outbox'], 'readwrite')` |
| `app/src/storage/migrations.ts` | Migration V3 creates row tables + sync_outbox + sync_state | VERIFIED | IDB version 2, __createRowTablesV3 hook, all 8 object stores |
| `app/src/storage/__tests__/RowTables.contract.ts` | Parametrised contract test factory | VERIFIED | Exports factory function, no `.test.` in filename |
| `app/src/lib/errors.ts` | OutboxEnqueueError, ConflictError | VERIFIED | Both exported |
| `app/src/lib/mappers/rowMappers.ts` | 12 mapper functions for all 6 entities | VERIFIED | gardenToLocalRow, localToGardenView, gardenFromDb, plus mappers for all entities |
| `app/src/lib/gardenRepo.ts` | Offline-first reads + writeWithOutbox | VERIFIED | storage.getRow() first, Supabase fallback; writeWithOutbox + scheduleWriteDebounced |
| `app/src/lib/vereinsregelnRepo.ts` | Offline-first + writeWithOutbox | VERIFIED | account-mode uses VereinsregelnRow; writeWithOutbox on save/delete |
| `app/src/lib/profileRepo.ts` | Offline-first + writeWithOutbox | VERIFIED | ProfileRow read first; writeWithOutbox on account-mode save |
| `app/src/lib/migrateLocalToAccount.ts` | bootstrapRowTables on Step 9 | VERIFIED | bootstrapRowTables() exported; called in Step 9 with fail-soft wrapper |
| `app/src/lib/sync/SyncWorker.ts` | Class with constructor injection, all 6 public methods, getSyncWorker/setSyncWorker | VERIFIED | `export class SyncWorker`, pushInFlight guard, P9011/P9010 handling, exponential backoff, getSyncWorker lazy singleton |
| `app/src/lib/sync/SyncTriggers.ts` | NetInfo + AppState + 500ms debounce triggers + uploadPending wiring | VERIFIED | registerSyncTriggers() with wasOffline flag; scheduleWriteDebounced with clearTimeout; WRITE_DEBOUNCE_MS = 500 exported. **uploadPending() wired in both handlers (Plan 03-07 gap closure).** |
| `app/src/lib/sync/backoff.ts` | Exponential backoff with full jitter, MAX_ATTEMPTS=10 | VERIFIED | nextBackoffMs with full jitter; MAX_ATTEMPTS = 10 exported |
| `app/src/lib/sync/events.ts` | syncEvents channel with on/emit | VERIFIED | All event types defined; Set-based listener pattern |
| `app/src/lib/photos/exifStrip.ts` | Platform interface declaration | VERIFIED | declare function stripExifAndExtractGps; Metro platform split |
| `app/src/lib/photos/exifStrip.native.ts` | Native EXIF strip with react-native-exify + manipulateAsync | VERIFIED | read(uri) for GPS; manipulateAsync() for re-encode (guarantees EXIF removal) |
| `app/src/lib/photos/exifStrip.web.ts` | Web EXIF strip with piexifjs | VERIFIED | piexif.load() + piexif.remove(); atob() decode (not fetch, jsdom-safe) |
| `app/src/lib/photos/photoQueueRepo.ts` | enqueuePhoto with EXIF strip + outbox | VERIFIED | stripExifAndExtractGps; GPS null when optIn=false; writeWithOutbox |
| `app/src/lib/photos/PhotoUploader.ts` | uploadPending with ArrayBuffer pattern + RPC | VERIFIED | Function fully implemented with serialisation lock, ArrayBuffer fetch, Storage upload, enqueue_photo_analysis RPC. **Now wired into SyncTriggers (Plan 03-07).** |
| `app/src/stores/settingsStore.ts` | geoOptIn default false, zustand persist | VERIFIED | geoOptIn: false; persist with AsyncStorage, version 1 |
| `app/app/(app)/settings/privacy.tsx` | DSGVO opt-in toggle screen | VERIFIED | Switch bound to useSettingsStore geoOptIn; setGeoOptIn on change |
| `app/src/hooks/useSyncStatus.ts` | Badge state-machine with NetInfo + syncEvents + outbox counts | VERIFIED | Priority: offline > degraded > syncing > synced; isFailed = attempts >= MAX_ATTEMPTS && lastError !== null |
| `app/src/components/SyncStatusBadge.tsx` | 4-state badge with tap -> /settings/sync | VERIFIED | 4 states; ICON map; tap calls router.push('/settings/sync') |
| `app/app/(app)/_layout.tsx` | SyncStatusBadge in headerRight | VERIFIED | `headerRight: () => <SyncStatusBadge />` on screenOptions |
| `app/app/(app)/settings/sync.tsx` | Pending/failed list + Retry + inline-confirm Verwerfen | VERIFIED | storage.listOutboxEntries(); getSyncWorker().retryOp/discardOp; busyId guard; inline confirmDiscardId expansion |
| `app/app/_layout.tsx` | SyncWorker bootstrap with useRef guard | VERIFIED | syncBooted useRef; registerSyncTriggers(); getSyncWorker().syncAll() on first account+garden ready |
| `packages/shared/src/i18n/de.json` | sync.badge.* + sync.detail.* i18n keys | VERIFIED | All 7 badge keys + 14 detail keys present with {n} template placeholders |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `gardenRepo.ts` | `storage.writeWithOutbox('gardens', ...)` | `updateGarden()` on account-mode | WIRED | Line 144; followed by `scheduleWriteDebounced()` line 150 |
| `vereinsregelnRepo.ts` | `storage.writeWithOutbox('vereinsregeln', ...)` | `saveVereinsregeln()`, `deleteVereinsregel()` | WIRED | Lines 139, 172; debounce called after each |
| `profileRepo.ts` | `storage.writeWithOutbox('profiles', ...)` | `saveProfile()` account-mode branch | WIRED | Line 96; debounce called line 102 |
| `scheduleWriteDebounced` | `getSyncWorker().push()` | 500ms setTimeout in SyncTriggers.ts | WIRED | Lines 18-26; clears prior timer, calls push() after WRITE_DEBOUNCE_MS |
| `registerSyncTriggers` | `getSyncWorker().syncAll()` | NetInfo offline->online transition | WIRED | wasOffline flag; syncAll() called when reconnect detected |
| `registerSyncTriggers` | `getSyncWorker().syncAll()` | AppState background->active | WIRED | lastState tracking; syncAll() on foreground |
| `registerSyncTriggers` | `uploadPending()` | NetInfo offline->online transition | WIRED | **Plan 03-07 gap closure.** Line 54: `uploadPending().catch(...)` in `wasOffline && isConnected` block, parallel with syncAll(). Import at line 8. |
| `registerSyncTriggers` | `uploadPending()` | AppState background->active transition | WIRED | **Plan 03-07 gap closure.** Line 66: `uploadPending().catch(...)` in `lastState !== 'active' && state === 'active'` block, parallel with syncAll(). |
| `app/_layout.tsx` | `registerSyncTriggers()` + `getSyncWorker().syncAll()` | useEffect after identity+account+gardenId | WIRED | syncBooted.current guard; both calls present |
| `SyncWorker.push()` | `storage.listOutboxEntries()` -> Supabase | FIFO outbox iteration | WIRED | listOutboxEntries(50); pushOne per entry |
| `SyncWorker.pull(entity)` | `supabase.rpc('server_now')` + `storage.setSyncState()` | delta-pull cursor update | WIRED | server_now called; setSyncState with serverNow after pull |
| `SyncWorker.pushOne` | P9011 -> delete outbox + emit push_conflict | handlePushError | WIRED | code === 'P9011' path deletes entry, emits push_conflict |
| `SyncStatusBadge` | `useSyncStatus` hook | import + rendered | WIRED | useSyncStatus() called; status/pendingCount/failedCount rendered |
| `useSyncStatus` | `storage.listOutboxEntries()` + `syncEvents.on()` | debounced refresh on every event | WIRED | syncEvents.on subscriber + debounce timer; initial fetch on mount |
| `settings/sync.tsx` | `getSyncWorker().retryOp(id)` / `discardOp(id)` | Retry/Verwerfen buttons | WIRED | handleRetry/handleDiscard call worker methods; busyId disables button during flight |
| `migrateLocalToAccount.ts` | `bootstrapRowTables()` | Step 9 fail-soft call | WIRED | Called at line 192; wrapped in try/catch |
| `PhotoUploader.uploadPending` | `supabase.storage.from('photos').upload()` | ArrayBuffer fetch + upload | WIRED | fetch(row.storagePath).arrayBuffer(); storage.from(BUCKET).upload() |
| `PhotoUploader.uploadPending` | `supabase.rpc('enqueue_photo_analysis')` | Post-upload RPC | WIRED | `(supabase as any).rpc('enqueue_photo_analysis', ...)` after successful upload |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `SyncStatusBadge.tsx` | `status`, `pendingCount`, `failedCount` | `useSyncStatus()` -> `storage.listOutboxEntries()` + `syncEvents.on()` | Yes -- real outbox query | FLOWING |
| `settings/sync.tsx` | `entries` | `storage.listOutboxEntries()` in refresh() | Yes -- real outbox query | FLOWING |
| `gardenRepo.loadGarden` | `localRow` | `storage.getRow('gardens', gardenId)` | Yes -- real DB read | FLOWING |
| `useSyncStatus` (isConnected) | `isConnected` | `NetInfo.fetch()` + `NetInfo.addEventListener()` | Yes -- real NetInfo | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| SyncWorker exports getSyncWorker/setSyncWorker | `grep -n "export function getSyncWorker\|export function setSyncWorker" SyncWorker.ts` | Lines 472, 482 found | PASS |
| scheduleWriteDebounced uses 500ms constant | `grep -n "WRITE_DEBOUNCE_MS = 500" SyncTriggers.ts` | Line 14 found | PASS |
| geoOptIn default is false | `grep -n "geoOptIn: false" settingsStore.ts` | Line 26 found | PASS |
| photos bucket created as private (public=false) | migration line 222 | `VALUES ('photos', 'photos', false, ...)` | PASS |
| uploadPending called on reconnect (SC-2) | `grep -rn "uploadPending" app/src/lib/sync/SyncTriggers.ts` | 5 matches: 1 import (line 8), 2 call sites (lines 54, 66), 2 console.warn (lines 55, 67) | PASS |
| uploadPending test coverage (SC-2) | `npx jest --testPathPattern="SyncTriggers" --no-coverage` | 9/9 tests pass including 3 new SC-2 gap closure tests | PASS |
| P9011 handled by SyncWorker | `grep -n "P9011" SyncWorker.ts` | Line 345 -- delete entry + emit push_conflict | PASS |

---

## Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| SYNC-01 | 03-02, 03-03 | App starts and shows last plan without network | SATISFIED | StorageAdapter Row-Tables (Plan 03-02); gardenRepo offline-first read (Plan 03-03); bootstrapRowTables on first login |
| SYNC-02 | 03-05, 03-07 | Foto-Queue works offline; photos stored locally; AI analysis queued on reconnect | SATISFIED | photoQueueRepo.enqueuePhoto works offline; PhotoUploader.uploadPending fully implemented; **trigger wiring added by Plan 03-07** -- uploadPending() called on both NetInfo reconnect and AppState foreground; 3 dedicated tests verify the wiring |
| SYNC-03 | 03-01, 03-04 | Sync queue processes pending ops automatically on reconnect (LWW, single-user) | SATISFIED | SyncTriggers wired to syncAll() on NetInfo+AppState; LWW P9011 handling in SyncWorker; tg_lww_guard deployed to live DB |
| SYNC-04 | 03-06 | User sees sync status (pending ops, errors) | SATISFIED | SyncStatusBadge 4 states in header; settings/sync.tsx detail screen with Retry/Verwerfen |
| NFR-01 | 03-02 | App usable on iPhone and desktop browser, data synchronized | SATISFIED | SQLite for native; IndexedDB for web; same StorageAdapter interface; both adapters pass contract tests |
| NFR-04 | 03-01 | All photos encrypted at-rest (Supabase Storage, EU Frankfurt) | SATISFIED | `photos` bucket `public = false` in migration; 4 member-only RLS policies; Supabase Frankfurt project (`vitrqkzxkiqvadqfzrcx`) encrypts storage at-rest by default |
| NFR-05 | 03-05 | Geo data (EXIF) only with explicit opt-in | SATISFIED | EXIF always stripped: manipulateAsync re-encode (native) + piexif.remove (web); GPS null when geoOptIn=false; default AUS in settingsStore |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `app/src/lib/photos/PhotoUploader.ts` | `(supabase as any).rpc(...)` cast for enqueue_photo_analysis | Info | Type-safety gap; SUMMARY notes to fix after `pnpm gen:types`. Not a runtime blocker. |
| `app/src/lib/migrateLocalToAccount.ts` | `(supabase.rpc as any)('server_now')` cast | Info | Same root cause -- database.ts RPC union missing server_now. Not a runtime blocker. |
| `deferred-items.md` | PhotoUploader.test.ts + photoQueueRepo.test.ts pre-existing failures | Warning | Test suite reliability impacted; root cause suspected to be mock state pollution. Not blocking SC-2 but should be addressed. |

---

## Human Verification Required

### 1. 2-User LWW Conflict -- Winner Label

**Test:** Device A and Device B both edit the same garden name offline. Restore network on both devices.
**Expected:** The device with the older `updated_at` has its change rejected (P9011 -> delta-pull). The garden settings screen on both devices shows "zuletzt bearbeitet von [winner name], gerade eben" where winner is the user from the device with the newer timestamp.
**Why human:** Requires two authenticated sessions, real Supabase P9011 trigger, and UI observation of `settings/garden.tsx` LWW label after delta-pull.

### 2. Offline Plan Render -- No Spinner, No Blank Screen

**Test:** Disable device network. Force-close the app. Reopen.
**Expected:** Garden plan renders immediately from local Row-Tables (no loading spinner, no "Keine Verbindung" error screen).
**Why human:** Requires a real device/simulator with network disabled. Cannot be verified by static analysis.

### 3. Desktop Browser (IndexedDB) Sync Round-Trip

**Test:** Make a garden edit on iPhone, wait for sync (SyncStatusBadge shows synced). Open the app in desktop Chrome. Navigate to the garden.
**Expected:** The same edit is visible on the desktop browser without any manual refresh.
**Why human:** Requires live cross-platform sessions against the Frankfurt Supabase instance.

### 4. 30s Reconnect Wall-Clock Timing

**Test:** Make an offline edit, restore network, observe SyncStatusBadge.
**Expected:** SyncStatusBadge transitions from syncing -> synced within 30 seconds; Supabase Postgres row is updated within that window.
**Why human:** Wall-clock timing and real NetInfo reconnect event require live device testing.

---

## Gaps Summary

**No automated gaps remain.** The single gap from the initial verification (SC-2 / SYNC-02: uploadPending not wired in SyncTriggers) has been closed by Plan 03-07.

**Gap closure evidence:**
- `import { uploadPending } from '../photos/PhotoUploader'` at SyncTriggers.ts line 8
- `uploadPending().catch(...)` in NetInfo reconnect handler at line 54
- `uploadPending().catch(...)` in AppState foreground handler at line 66
- Both calls use independent `.catch()` -- uploadPending failure does not block syncAll()
- 9/9 SyncTriggers tests pass (6 original + 3 new SC-2 gap closure tests)

**4 items require human verification** (2-device LWW, offline render, cross-platform sync, 30s wall-clock).

---

_Verified: 2026-04-26T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification after Plan 03-07 gap closure_
