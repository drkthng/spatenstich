---
phase: 03-offline-sync-2-user-shared-state
plan: 05
subsystem: storage
tags: [expo, react-native, piexifjs, exif, photo-queue, supabase-storage, zustand, dsgvo, gdpr, offline]

# Dependency graph
requires:
  - phase: 03-01
    provides: photo_queue table, enqueue_photo_analysis RPC, Storage RLS on photos bucket
  - phase: 03-02
    provides: StorageAdapter.writeWithOutbox, getRowsByGarden, PhotoQueueRow type
  - phase: 03-03
    provides: OutboxEnqueueError class in errors.ts

provides:
  - exifStrip platform-split pipeline (native: @lodev09/react-native-exify + expo-image-manipulator; web: piexifjs)
  - photoQueueRepo: enqueuePhoto (EXIF-strip + outbox), patchPhoto, loadPendingPhotos
  - PhotoUploader: uploadPending (ArrayBuffer L-7-safe + Storage upload + enqueue_photo_analysis RPC)
  - SyncTriggers stubs: scheduleWriteDebounced (500ms debounce), registerSyncTriggers
  - settingsStore: geoOptIn (default false, persisted via AsyncStorage)
  - Privacy Settings screen: DSGVO-compliant opt-in toggle + explanation text

affects:
  - 03-04 (SyncWorker — will register upload triggers via registerSyncTriggers)
  - 03-06 (Sync-Status-UI — uses photo_queue.upload_status for progress display)
  - future-photo-capture (caller passes geoOptIn from settingsStore to enqueuePhoto)

# Tech tracking
tech-stack:
  added:
    - expo-image-manipulator ^55.0.15 (JPEG re-encode, guaranteed EXIF-strip)
    - "@lodev09/react-native-exify" ^1.0.3 (native GPS-read from EXIF)
    - piexifjs ^1.0.6 (web EXIF load/strip, dev dependency)
    - "@types/piexifjs" ^1.0.0 (TypeScript types for piexifjs)
  patterns:
    - Metro platform-extension split (.native.ts / .web.ts) for EXIF implementation
    - ArrayBuffer-fetch pattern for iOS Storage upload (L-7 0-byte blob workaround)
    - Serialisation lock (uploadInFlight) preventing parallel upload runs
    - jsdom test environment with setupFilesAfterEnv for Blob/URL.createObjectURL mocks
    - Unique counter IDs per test to prevent fake-indexeddb state bleed

key-files:
  created:
    - app/src/lib/photos/exifStrip.ts (shared interface, declare function)
    - app/src/lib/photos/exifStrip.native.ts (read() + manipulateAsync)
    - app/src/lib/photos/exifStrip.web.ts (piexif.load/remove + parseGpsRational)
    - app/src/lib/photos/photoQueueRepo.ts (enqueuePhoto, patchPhoto, loadPendingPhotos, getPhoto)
    - app/src/lib/photos/PhotoUploader.ts (uploadPending, _resetPhotoUploader)
    - app/src/lib/sync/SyncTriggers.ts (registerSyncTriggers, scheduleWriteDebounced, _resetSyncTriggers)
    - app/src/lib/sync/backoff.ts (nextBackoffMs, MAX_ATTEMPTS)
    - app/src/lib/sync/events.ts (syncEvents SyncEventChannel singleton)
    - app/src/stores/settingsStore.ts (useSettingsStore, geoOptIn)
    - app/app/(app)/settings/privacy.tsx (DSGVO opt-in toggle screen)
    - app/src/lib/photos/__tests__/exifStrip.test.ts
    - app/src/lib/photos/__tests__/photoQueueRepo.test.ts
    - app/src/lib/photos/__tests__/PhotoUploader.test.ts
    - app/src/lib/photos/__tests__/setup.ts (jsdom URL.createObjectURL + fetch polyfill)
    - app/src/lib/photos/__tests__/__fixtures__/exif-test.jpg (Berlin GPS fixture)
    - app/src/stores/__tests__/settingsStore.test.ts
    - app/src/__mocks__/sentry.ts
  modified:
    - app/app/(app)/settings.tsx (added Datenschutz nav link)
    - app/jest.config.ts (added photos project: jsdom + setupFilesAfterEnv)
    - app/package.json (added expo-image-manipulator, @lodev09/react-native-exify, piexifjs)

key-decisions:
  - "exifStrip uses Metro platform-extension split (.native.ts/.web.ts) rather than Platform.select at runtime, enabling tree-shaking and avoiding bundling both libs on each platform"
  - "dataUrlToBlob in exifStrip.web.ts uses atob() decode instead of fetch(dataUrl) — avoids fetch-unavailable in jsdom 20 test env"
  - "PhotoUploader uses (supabase as any).rpc for enqueue_photo_analysis — RPC not yet in generated Database types (requires gen:types after migration 013)"
  - "SyncTriggers.ts created as standalone file (not waiting for Plan 03-04 merge) to unblock photoQueueRepo + PhotoUploader imports in wave 4"
  - "backoff.ts + events.ts created as minimal stubs — Plan 03-04 will extend with full SyncWorker integration"
  - "PhotoUploader test uses unique counter IDs (photo-uploader-N) to prevent fake-indexeddb state bleed across tests in same file"
  - "jest.config.ts photos project uses jsdom environment (not node) because exifStrip.web tests require Blob, FileReader, URL.createObjectURL"

patterns-established:
  - "Platform-extension split: exifStrip.native.ts / exifStrip.web.ts — Metro resolves automatically"
  - "ArrayBuffer-fetch for Storage upload: fetch(uri).then(r => r.arrayBuffer()) — avoids iOS 0-byte FormData bug"
  - "Serialisation lock pattern: let uploadInFlight = false + _resetXxx() for tests"
  - "jsdom test setup: setupFilesAfterEnv with custom URL.createObjectURL + fetch mock for blob: URIs"

requirements-completed: [SYNC-02, NFR-04, NFR-05]

# Metrics
duration: 15min
completed: 2026-04-25
---

# Phase 03 Plan 05: Photo-Queue + EXIF-Strip + DSGVO Opt-in Summary

**Offline photo queue with platform-split EXIF stripping (piexifjs/react-native-exify), ArrayBuffer Storage upload, enqueue_photo_analysis RPC, and DSGVO-compliant GPS opt-in toggle — 18 tests GREEN**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-25T17:13:29Z
- **Completed:** 2026-04-25T17:29:24Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments
- EXIF-strip pipeline with platform split: native (re-encode via expo-image-manipulator guarantees EXIF removal) + web (piexifjs.remove)
- Photo queue repo with atomic writeWithOutbox (EXIF-strip + GPS extraction + outbox insert in one operation)
- PhotoUploader with ArrayBuffer-fetch pattern (L-7 iOS 0-byte workaround), Storage upload, and enqueue_photo_analysis RPC
- SyncTriggers stub with scheduleWriteDebounced (500ms debounce on outbox insert) and registerSyncTriggers
- settingsStore with geoOptIn (default false, persisted via AsyncStorage) — DSGVO D-24 compliant
- Privacy settings screen with DSGVO-compliant opt-in toggle and explanation text
- 18 unit tests covering all STRIDE threat mitigations (T-3-05-01 through T-3-05-05)

## Upload Flow

```
User takes photo
  → enqueuePhoto(gardenId, localUri, geoOptIn)
      → stripExifAndExtractGps(uri, {optIn}) [NFR-05: ALWAYS strip]
          native: read() GPS + manipulateAsync re-encode
          web:    piexif.load() GPS + piexif.remove()
      → PhotoQueueRow { uploadStatus: 'pending', geoLat/geoLng if optIn }
      → writeWithOutbox (atomic) + scheduleWriteDebounced
  ← photoId returned

NetInfo reconnect / AppState foreground
  → uploadPending() [serialisation lock]
      → fetch(storagePath).arrayBuffer() [L-7 safe]
      → supabase.storage.from('photos').upload(gardenId/photoId.jpg)
      → supabase.rpc('enqueue_photo_analysis', {p_photo_id})
      → patchPhoto (status=uploaded, storagePath=remote, jobId)
```

## DSGVO Compliance Evidence

| Requirement | Implementation | Test |
|-------------|---------------|------|
| NFR-05: EXIF always stripped | manipulateAsync re-encode (native) + piexif.remove (web) | exifStrip.test.ts test 3 |
| D-24: GPS only with opt-in | geoLat/geoLng null when optIn=false | photoQueueRepo test 2 |
| D-24: Default AUS | geoOptIn: false in settingsStore | settingsStore test 1 |
| T-3-05-02: Storage RLS | upload path gardenId/photoId.jpg matches is_garden_member policy | PhotoUploader.test.ts test 1 |

## Task Commits

1. **Task 01: EXIF-Strip-Pipeline (Platform-Split)** — `1d5f548` (test + feat combined: RED → GREEN)
2. **Task 02: photoQueueRepo + PhotoUploader + SyncTriggers** — `f029e5b` (feat)
3. **Task 03: settingsStore + Privacy Screen + Opt-in UI** — `dbb8043` (feat)

## Files Created/Modified

**Core implementation:**
- `app/src/lib/photos/exifStrip.ts` — Shared interface (declare function, Metro resolves platform variant)
- `app/src/lib/photos/exifStrip.native.ts` — read() + manipulateAsync re-encode (EXIF-free guaranteed)
- `app/src/lib/photos/exifStrip.web.ts` — piexif.load/remove + parseGpsRational decimal conversion
- `app/src/lib/photos/photoQueueRepo.ts` — enqueuePhoto, patchPhoto, loadPendingPhotos, getPhoto
- `app/src/lib/photos/PhotoUploader.ts` — uploadPending (ArrayBuffer pattern, Storage, RPC)
- `app/src/lib/sync/SyncTriggers.ts` — registerSyncTriggers + scheduleWriteDebounced (500ms)
- `app/src/lib/sync/backoff.ts` — nextBackoffMs + MAX_ATTEMPTS (full-jitter exponential)
- `app/src/lib/sync/events.ts` — syncEvents SyncEventChannel (status_change + conflict)
- `app/src/stores/settingsStore.ts` — geoOptIn (default false, zustand persist + AsyncStorage)
- `app/app/(app)/settings/privacy.tsx` — DSGVO opt-in toggle + EXIF explanation + DSGVO notice

**Tests & fixtures:**
- `app/src/lib/photos/__tests__/exifStrip.test.ts` — 4 web tests (optIn on/off, strip verify, no-GPS)
- `app/src/lib/photos/__tests__/photoQueueRepo.test.ts` — 5 tests (GPS, no-GPS, outbox, filter, auth guard)
- `app/src/lib/photos/__tests__/PhotoUploader.test.ts` — 5 tests (success, storage-fail, rpc-fail, empty-queue, empty-blob)
- `app/src/lib/photos/__tests__/setup.ts` — jsdom URL.createObjectURL + blob:mock fetch polyfill
- `app/src/lib/photos/__tests__/__fixtures__/exif-test.jpg` — Berlin GPS fixture (52.52N, 13.405E)
- `app/src/stores/__tests__/settingsStore.test.ts` — 4 tests (default, mutation, persist)

**Modified:**
- `app/app/(app)/settings.tsx` — Added Datenschutz nav link → /settings/privacy
- `app/jest.config.ts` — Added photos project (jsdom, setupFilesAfterEnv)
- `app/package.json` + `pnpm-lock.yaml` — expo-image-manipulator, @lodev09/react-native-exify, piexifjs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed @lodev09/react-native-exify API name**
- **Found during:** Task 03 (TypeScript typecheck)
- **Issue:** Plan used `readAsync()` but library exports `read()` (no Async suffix)
- **Fix:** Updated exifStrip.native.ts to use `read(uri)` instead of `readAsync(uri)`
- **Files modified:** `app/src/lib/photos/exifStrip.native.ts`
- **Verification:** `pnpm typecheck` passes cleanly
- **Committed in:** dbb8043 (Task 03 commit)

**2. [Rule 1 - Bug] Fixed `dataUrlToBlob` using `fetch` in jsdom 20**
- **Found during:** Task 01 (GREEN phase test run)
- **Issue:** `dataUrlToBlob` called `fetch(dataUrl)` but jsdom 20 has no `fetch`/`Response`
- **Fix:** Replaced `fetch`-based decode with direct `atob()` decode → `Uint8Array` → `Blob`
- **Files modified:** `app/src/lib/photos/exifStrip.web.ts`
- **Verification:** exifStrip tests pass (4/4 GREEN)
- **Committed in:** 1d5f548 (Task 01 commit)

**3. [Rule 1 - Bug] Fixed PhotoUploader test: `global.fetch` not a jest.Mock**
- **Found during:** Task 02 (GREEN phase test run)
- **Issue:** Test called `(global.fetch as jest.Mock).mockResolvedValue(...)` but `global.fetch` was the custom setup.ts function (not a jest mock)
- **Fix:** Declared `const mockFetch = jest.fn()` and installed it in `beforeEach` via `(globalThis as any).fetch = mockFetch`
- **Files modified:** `app/src/lib/photos/__tests__/PhotoUploader.test.ts`
- **Verification:** PhotoUploader tests pass (5/5 GREEN)
- **Committed in:** f029e5b (Task 02 commit)

**4. [Rule 1 - Bug] Fixed fake-indexeddb state bleed in PhotoUploader tests**
- **Found during:** Task 02 ("Leere Queue → No-Op" test failure)
- **Issue:** Tests sharing the same IDB instance with fixed photo IDs; leftover `failed` rows from earlier tests appeared in the "empty queue" test
- **Fix:** Used unique counter-based IDs (`photo-uploader-N`) and isolated the "empty queue" test to a fresh garden-id
- **Files modified:** `app/src/lib/photos/__tests__/PhotoUploader.test.ts`
- **Verification:** All 5 PhotoUploader tests GREEN
- **Committed in:** f029e5b (Task 02 commit)

**5. [Rule 2 - Missing Critical] Created sync/SyncTriggers.ts + backoff.ts + events.ts as stubs**
- **Found during:** Task 02 (photoQueueRepo and PhotoUploader import these from Plan 03-04)
- **Issue:** Plan 03-04 (parallel wave 4) would normally provide these files, but they don't exist yet in this worktree
- **Fix:** Created minimal but complete implementations of SyncTriggers.ts, backoff.ts, and events.ts to unblock this plan's imports
- **Files modified:** `app/src/lib/sync/SyncTriggers.ts`, `app/src/lib/sync/backoff.ts`, `app/src/lib/sync/events.ts`
- **Verification:** All imports resolve, typecheck passes, tests pass
- **Committed in:** f029e5b (Task 02 commit)
- **Note:** Plan 03-04 will extend SyncTriggers.ts with full SyncWorker integration (registerSyncTriggers already has the correct signature)

---

**Total deviations:** 5 auto-fixed (3 Rule 1 bugs, 1 Rule 1 API-name bug, 1 Rule 2 missing deps)
**Impact on plan:** All fixes necessary for test correctness and module resolution. No scope creep — stubs created match the contract Plan 03-04 expects.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `expo-file-system` cleanup after upload | `PhotoUploader.ts` | Not implemented — local file cleanup after successful upload is deferred to Plan 04 (photo capture flow). Row's `storagePath` is updated to remote key but local file is not deleted. |
| SyncTriggers.ts incomplete | `sync/SyncTriggers.ts` | Created as stub matching Plan 03-04 contract. `registerSyncTriggers` exists but `getSyncWorker()` integration is Plan 03-04's responsibility. |

## Issues Encountered
- jsdom 20 (used by jest-expo ~53.0.0) does not include `fetch` or `Response` globals — required custom polyfill in `setupFilesAfterEnv`
- `setupFilesAfterEnv` key was misspelled as `setupFilesAfterFramework` initially — TypeScript caught it
- `URL.createObjectURL` not available in jsdom — polyfilled with a Map-based blob store

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- **Plan 03-06 (Sync-Status-UI):** Can read `photo_queue.upload_status` from storage to show upload progress. `syncEvents` channel emits `status_change: 'syncing'` during uploads.
- **Plan 03-04 (SyncWorker):** SyncTriggers.ts is ready for `registerSyncTriggers(syncAll, uploadPending)` call from root layout. `scheduleWriteDebounced` already wired in photoQueueRepo.
- **Phase 04 (Photo-Capture):** `enqueuePhoto(gardenId, uri, geoOptIn)` API is ready. Caller reads `geoOptIn` from `useSettingsStore((s) => s.geoOptIn)`.
- **Follow-up:** After `pnpm gen:types` against live Supabase (with migration 013 applied), remove `(supabase as any).rpc` cast in PhotoUploader.ts and use typed `supabase.rpc('enqueue_photo_analysis', ...)`.

---
*Phase: 03-offline-sync-2-user-shared-state*
*Completed: 2026-04-25*

## Self-Check: PASSED
