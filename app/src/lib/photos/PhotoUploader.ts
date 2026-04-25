// PhotoUploader — Plan 03-05 Task 02.
// Iterates photo_queue rows with upload_status='pending' FIFO, uploads each via
// ArrayBuffer-fetch (L-7 iOS 0-byte-blob fix), then calls enqueue_photo_analysis RPC.
//
// Serialisation: uploadInFlight flag prevents parallel runs (same pattern as SyncWorker).
// Error handling: marks row as 'failed' with error message for UI display (Plan 03-06).

import * as Sentry from '@sentry/react-native';
import { supabase } from '../supabase';
import { storage } from '../../storage';
import { useAuthStore } from '../../stores/authStore';
import type { PhotoQueueRow } from '@spatenstich/shared';
import { patchPhoto } from './photoQueueRepo';
import { syncEvents } from '../sync/events';

// Serialisation lock — prevents parallel upload runs (like SyncWorker.pushInFlight)
let uploadInFlight = false;

const BUCKET = 'photos';

/**
 * Iterates all photo_queue rows with upload_status='pending' or 'failed'
 * and attempts to upload each to Supabase Storage + enqueue AI analysis.
 *
 * Called by SyncTriggers on NetInfo reconnect and AppState foreground.
 */
export async function uploadPending(): Promise<void> {
  if (uploadInFlight) return;
  uploadInFlight = true;
  syncEvents.emit({ type: 'status_change', status: 'syncing' });
  try {
    const activeGardenId = useAuthStore.getState().activeGardenId;
    if (!activeGardenId) return;

    const allRows = await storage.getRowsByGarden<PhotoQueueRow>('photo_queue', activeGardenId);
    const pending = allRows.filter(
      (r) => r.uploadStatus === 'pending' || r.uploadStatus === 'failed',
    );

    for (const row of pending) {
      await uploadOne(row);
    }
  } finally {
    uploadInFlight = false;
  }
}

async function uploadOne(row: PhotoQueueRow): Promise<void> {
  try {
    // 1. URI → ArrayBuffer (L-7: iOS 0-byte-Blob-Bug → fetch+arrayBuffer instead of FormData)
    const response = await fetch(row.storagePath);
    if (!response.ok) throw new Error(`fetch ${row.storagePath}: ${response.status}`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) throw new Error('empty_blob');

    // 2. Upload to Supabase Storage (Bucket 'photos', RLS in Plan 03-01)
    //    Path: <garden_id>/<photo_id>.jpg
    const remotePath = `${row.gardenId}/${row.id}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(remotePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
        cacheControl: '3600',
      });
    if (uploadErr) throw uploadErr;

    // 3. RPC enqueue_photo_analysis (Plan 03-01 Section 7)
    //    The photo_queue row is pushed to server by SyncWorker concurrently.
    //    RPC returns the ai_jobs row UUID as jobId.
    //    S-9: enqueue_photo_analysis is not in generated Database types yet
    //    (requires pnpm gen:types against live DB after migration 013 applied).
    //    eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: jobId, error: rpcErr } = await (supabase as any).rpc(
      'enqueue_photo_analysis',
      { p_photo_id: row.id },
    );
    if (rpcErr) throw rpcErr;

    // 4. Patch local row: status=uploaded, storagePath=remote key, jobId
    await patchPhoto(row.id, {
      storagePath: remotePath,
      uploadStatus: 'uploaded',
      uploadError: null,
      jobId: jobId as string,
    });

    if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'photo_upload',
        level: 'info',
        message: `photo uploaded ${row.id}`,
        data: { row_id: row.id, garden_id: row.gardenId, job_id: jobId },
      });
    }
  } catch (e) {
    await handleUploadError(row, e);
  }
}

async function handleUploadError(row: PhotoQueueRow, e: unknown): Promise<void> {
  const err = e as { code?: string; message?: string };
  const msg = err.message ?? String(e);

  await patchPhoto(row.id, {
    uploadStatus: 'failed',
    uploadError: msg,
  });

  if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(e, {
      tags: { sync_phase: 'photo_upload', row_id: row.id },
    });
  }
}

/** Reset serialisation lock for tests. */
export function _resetPhotoUploader(): void {
  uploadInFlight = false;
}
