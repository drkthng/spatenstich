---
status: resolved
trigger: "Drei Phase-3 Infrastruktur-Blocker: 1) photos-Bucket Upload 400 (RLS/Bucket-Config), 2) CORS Edge Function Deploy unwirksam, 3) photo_queue SyncWorker Schema-Mismatch Spam"
created: 2026-05-05
updated: 2026-05-05
---

## Symptoms

- **Expected:** 1) Fotos werden in photos-Bucket hochgeladen. 2) Edge Functions antworten mit korrekten CORS-Headern. 3) SyncWorker synchronisiert photo_queue ohne Fehler-Spam.
- **Actual:** 1) Upload gibt 400 zurueck. 2) CORS-Header fehlen trotz Deploy. 3) SyncWorker spammt Fehler wegen Schema-Mismatch.
- **Error messages:** HTTP 400 bei Storage Upload; CORS-Fehler in Browser-Konsole; Schema-Mismatch-Fehler im SyncWorker-Log
- **Platform:** Expo Web + Supabase (project-ref: vitrqkzxkiqvadqfzrcx, Frankfurt)
- **Timeline:** Seit Phase 3 Implementierung, hat nie korrekt funktioniert

## Current Focus

- hypothesis: Three independent root causes confirmed and fixed
- test: TypeScript compilation + manual upload test
- expecting: All three issues resolved
- next_action: none (resolved)
- reasoning_checkpoint: null

## Evidence

- timestamp: 2026-05-05 investigation
  - Bug 1: PhotoUploader.uploadOne() passes raw ArrayBuffer to supabase.storage.upload() -- some SDK versions require Blob on web, causing HTTP 400. Also enqueue_photo_analysis RPC called with wrong params (p_photo_id instead of p_garden_id, p_storage_path, p_kind).
  - Bug 2: config.toml has no [functions.*] sections, so verify_jwt defaults to true. Supabase gateway rejects OPTIONS preflight (no Authorization header) before it reaches the function's CORS handler.
  - Bug 3: SyncWorker.pushPhotoQueue() maps client PhotoQueueRow fields (uploadStatus, uploadError, jobId) to non-existent DB columns. DB schema (migration 013) uses: local_uri, kind, storage_path, uploaded_at, retry_count, last_error, last_attempted_at.

## Eliminated

## Resolution

- root_cause: |
    1) PhotoUploader passed raw ArrayBuffer (not Blob) to storage upload causing 400 on web, and called enqueue_photo_analysis RPC with wrong parameter names.
    2) Missing [functions.*] sections in config.toml meant verify_jwt=true by default, gateway rejected CORS preflight OPTIONS requests lacking Authorization header.
    3) SyncWorker.pushPhotoQueue mapped client-side field names (uploadStatus/uploadError/jobId) that don't exist in the DB schema (local_uri/kind/uploaded_at/retry_count/last_error).
- fix: |
    1) PhotoUploader.ts: Wrap ArrayBuffer in Blob before upload; fix RPC params to (p_garden_id, p_storage_path, p_kind).
    2) config.toml: Add [functions.extract-vereinsregeln] and [functions.ai-job-consumer] with verify_jwt=false.
    3) SyncWorker.ts: Rewrite pushPhotoQueue to map PhotoQueueRow fields to actual DB column names from migration 013.
- files_changed:
    - supabase/config.toml
    - app/src/lib/photos/PhotoUploader.ts
    - app/src/lib/sync/SyncWorker.ts
