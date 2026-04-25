// Plan 03-05 Task 02 — TDD: PhotoUploader tests
import 'fake-indexeddb/auto';

// Set env before any Supabase imports
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

jest.mock('../../supabase', () => ({
  supabase: {
    storage: { from: jest.fn() },
    rpc: jest.fn(),
  },
}));

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ userId: 'user-a', activeGardenId: 'garden-a' }),
  },
}));

jest.mock('../../sync/SyncTriggers', () => ({
  scheduleWriteDebounced: jest.fn(),
}));

jest.mock('../exifStrip', () => ({
  stripExifAndExtractGps: jest.fn(),
}));

import { uploadPending, _resetPhotoUploader } from '../PhotoUploader';
import { storage } from '../../../storage';
import { supabase } from '../../supabase';
import type { PhotoQueueRow } from '@spatenstich/shared';

// jest.fn() fetch mock — replaces setup.ts custom fetch for PhotoUploader tests
// (PhotoUploader calls fetch(row.storagePath) to get ArrayBuffer — L-7 ArrayBuffer pattern)
const mockFetch = jest.fn();

// Counter for unique photo IDs — prevents state bleed between tests
// because fake-indexeddb/auto shares the same IDB instance across all tests in the file.
let photoCounter = 0;

describe('PhotoUploader.uploadPending', () => {
  beforeEach(async () => {
    _resetPhotoUploader();
    jest.clearAllMocks();
    // Install jest mock fetch for this test suite (override setup.ts fetch)
    (globalThis as any).fetch = mockFetch;
  });

  async function seedPendingPhoto(): Promise<string> {
    const id = `photo-uploader-${++photoCounter}`;
    const now = new Date().toISOString();
    const row: PhotoQueueRow = {
      id,
      createdAt: now,
      updatedAt: now,
      updatedByUserId: 'user-a',
      deletedAt: null,
      gardenId: 'garden-a',
      storagePath: `file:///local-${id}.jpg`,
      geoLat: null,
      geoLng: null,
      uploadStatus: 'pending',
      uploadError: null,
      jobId: null,
    };
    await storage.writeWithOutbox(
      'photo_queue',
      row,
      { entity: 'photo_queue', rowId: id, operation: 'insert', payload: row as unknown as Record<string, unknown> },
    );
    return id;
  }

  it('erfolgreicher Upload → status=uploaded + jobId gesetzt', async () => {
    const id = await seedPendingPhoto();
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
    });
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: 'job-123', error: null });

    await uploadPending();
    const row = await storage.getRow<PhotoQueueRow>('photo_queue', id);
    expect(row?.uploadStatus).toBe('uploaded');
    expect(row?.jobId).toBe('job-123');
    expect(row?.storagePath).toBe(`garden-a/${id}.jpg`);
  });

  it('Storage-Fehler → status=failed + upload_error gefüllt', async () => {
    await seedPendingPhoto();
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: { message: 'storage denied' } }),
    });

    await uploadPending();
    // All pending photos are processed; check the last one seeded
    const rows = await storage.getRowsByGarden<PhotoQueueRow>('photo_queue', 'garden-a');
    const failed = rows.find((r) => r.uploadError?.includes('storage denied'));
    expect(failed?.uploadStatus).toBe('failed');
    expect(failed?.uploadError).toContain('storage denied');
  });

  it('RPC-Fehler nach erfolgreichem Storage-Upload → failed', async () => {
    const id = await seedPendingPhoto();
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
    });
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: { message: 'rpc denied' } });

    await uploadPending();
    const row = await storage.getRow<PhotoQueueRow>('photo_queue', id);
    expect(row?.uploadStatus).toBe('failed');
    expect(row?.uploadError).toContain('rpc denied');
  });

  it('Leere Queue → No-Op (keine Storage-Calls)', async () => {
    // Ensure no pending photos exist for a fresh garden
    // Use a garden-id that has no photos seeded
    const freshStore = require('../../../stores/authStore');
    const orig = freshStore.useAuthStore.getState;
    freshStore.useAuthStore.getState = () => ({ userId: 'user-a', activeGardenId: 'empty-garden' });
    try {
      await uploadPending();
      expect(supabase.storage.from).not.toHaveBeenCalled();
    } finally {
      freshStore.useAuthStore.getState = orig;
    }
  });

  it('ArrayBuffer-Path: leerer Blob (0 bytes) → failed mit empty_blob', async () => {
    const id = await seedPendingPhoto();
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });

    await uploadPending();
    const row = await storage.getRow<PhotoQueueRow>('photo_queue', id);
    expect(row?.uploadStatus).toBe('failed');
    expect(row?.uploadError).toContain('empty_blob');
  });
});
