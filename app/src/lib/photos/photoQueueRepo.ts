// Photo-Queue Repository — Plan 03-05 Task 02.
// Facade for photo_queue Row-Table + Outbox writes.
// Pattern: S-1 (toRow/fromRow camelCase↔snake_case) + S-6 (writeWithOutbox atomic).
//
// FLOW:
//   enqueuePhoto → stripExifAndExtractGps (NFR-05) → writeWithOutbox → scheduleWriteDebounced
//   patchPhoto   → getRow merge             → writeWithOutbox → scheduleWriteDebounced

import { storage } from '../../storage';
import { useAuthStore } from '../../stores/authStore';
import type { PhotoQueueRow } from '@spatenstich/shared';
import { stripExifAndExtractGps } from './exifStrip';
import { OutboxEnqueueError } from '../errors';
import { scheduleWriteDebounced } from '../sync/SyncTriggers';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Adds a photo to the local upload queue.
 *
 * 1. Strips EXIF (NFR-05 — always, regardless of optIn)
 * 2. Extracts GPS only if optIn=true (D-24)
 * 3. Atomic writeWithOutbox(photo_queue, row, outbox)
 *
 * storagePath initially holds the local URI (before upload).
 * After PhotoUploader succeeds, patchPhoto updates it to the remote key.
 *
 * @returns The generated photo UUID
 */
export async function enqueuePhoto(
  gardenId: string,
  localUri: string,
  optIn: boolean,
): Promise<string> {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  // Step 1+2: Strip EXIF + extract GPS (Task 03-05-01)
  const { strippedUri, gps } = await stripExifAndExtractGps(localUri, { optIn });

  const photoId = randomId();
  const now = new Date().toISOString();
  const row: PhotoQueueRow = {
    id: photoId,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: userId,
    deletedAt: null,
    gardenId,
    storagePath: strippedUri, // local URI; replaced by remote key after upload
    geoLat: gps?.lat ?? null,
    geoLng: gps?.lng ?? null,
    uploadStatus: 'pending',
    uploadError: null,
    jobId: null,
  };

  try {
    await storage.writeWithOutbox('photo_queue', row, {
      entity: 'photo_queue',
      rowId: photoId,
      operation: 'insert',
      payload: row as unknown as Record<string, unknown>,
    });
    scheduleWriteDebounced();
  } catch (cause) {
    throw new OutboxEnqueueError('photo_queue', photoId, cause);
  }

  return photoId;
}

/**
 * Returns all pending or failed photos for a garden (for PhotoUploader iteration).
 */
export async function loadPendingPhotos(gardenId: string): Promise<PhotoQueueRow[]> {
  const rows = await storage.getRowsByGarden<PhotoQueueRow>('photo_queue', gardenId);
  return rows.filter(
    (r) => r.uploadStatus === 'pending' || r.uploadStatus === 'failed',
  );
}

/**
 * Returns a single photo_queue row by ID, or null if not found.
 */
export async function getPhoto(photoId: string): Promise<PhotoQueueRow | null> {
  return storage.getRow<PhotoQueueRow>('photo_queue', photoId);
}

/**
 * Patches a photo_queue row (e.g. upload status update by PhotoUploader).
 * Creates an Outbox entry — SyncWorker will push the patch to the server.
 */
export async function patchPhoto(
  photoId: string,
  patch: Partial<Pick<PhotoQueueRow, 'storagePath' | 'uploadStatus' | 'uploadError' | 'jobId'>>,
): Promise<void> {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  const existing = await storage.getRow<PhotoQueueRow>('photo_queue', photoId);
  if (!existing) throw new Error(`photo not found: ${photoId}`);

  const now = new Date().toISOString();
  const updated: PhotoQueueRow = {
    ...existing,
    ...patch,
    updatedAt: now,
    updatedByUserId: userId,
  };

  try {
    await storage.writeWithOutbox('photo_queue', updated, {
      entity: 'photo_queue',
      rowId: photoId,
      operation: 'update',
      payload: updated as unknown as Record<string, unknown>,
    });
    scheduleWriteDebounced();
  } catch (cause) {
    throw new OutboxEnqueueError('photo_queue', photoId, cause);
  }
}
