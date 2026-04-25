// Plan 03-05 Task 02 — TDD: photoQueueRepo tests
// Tests enqueuePhoto, loadPendingPhotos, getPhoto, patchPhoto
import 'fake-indexeddb/auto';

// Set env before any Supabase imports
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

jest.mock('../exifStrip', () => ({
  stripExifAndExtractGps: jest.fn(),
}));

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ userId: 'user-a', activeGardenId: 'garden-a', mode: 'account' }),
  },
}));

jest.mock('../../sync/SyncTriggers', () => ({
  scheduleWriteDebounced: jest.fn(),
}));

import { stripExifAndExtractGps } from '../exifStrip';
import { enqueuePhoto, loadPendingPhotos, getPhoto, patchPhoto } from '../photoQueueRepo';
import { storage } from '../../../storage';

describe('photoQueueRepo.enqueuePhoto', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('optIn=true + GPS vorhanden → geoLat/geoLng gesetzt', async () => {
    (stripExifAndExtractGps as jest.Mock).mockResolvedValue({
      strippedUri: 'file:///stripped.jpg',
      gps: { lat: 52.52, lng: 13.405 },
    });
    const photoId = await enqueuePhoto('garden-a', 'file:///original.jpg', true);
    const row = await getPhoto(photoId);
    expect(row?.geoLat).toBe(52.52);
    expect(row?.geoLng).toBe(13.405);
  });

  it('optIn=false → geoLat/geoLng null, EXIF trotzdem gestripped', async () => {
    (stripExifAndExtractGps as jest.Mock).mockResolvedValue({
      strippedUri: 'file:///stripped.jpg',
      gps: null,
    });
    const photoId = await enqueuePhoto('garden-a', 'file:///original.jpg', false);
    const row = await getPhoto(photoId);
    expect(row?.geoLat).toBeNull();
    expect(row?.geoLng).toBeNull();
    // stripExifAndExtractGps was called with optIn=false
    expect(stripExifAndExtractGps).toHaveBeenCalledWith(
      'file:///original.jpg',
      { optIn: false },
    );
  });

  it('schreibt Outbox-Eintrag mit operation=insert', async () => {
    (stripExifAndExtractGps as jest.Mock).mockResolvedValue({
      strippedUri: 'file:///stripped.jpg',
      gps: null,
    });
    await enqueuePhoto('garden-a', 'file:///original.jpg', false);
    const outbox = await storage.listOutboxEntries();
    expect(outbox.some((e) => e.entity === 'photo_queue' && e.operation === 'insert')).toBe(true);
  });

  it('loadPendingPhotos filtert nach upload_status', async () => {
    (stripExifAndExtractGps as jest.Mock).mockResolvedValue({
      strippedUri: 'file:///a.jpg',
      gps: null,
    });
    const id = await enqueuePhoto('garden-a', 'file:///a.jpg', false);
    await patchPhoto(id, { uploadStatus: 'uploaded', storagePath: 'garden-a/x.jpg' });

    const pending = await loadPendingPhotos('garden-a');
    // Was patched to 'uploaded', should no longer be in pending list
    expect(pending.find((r) => r.id === id)).toBeUndefined();
  });

  it('enqueuePhoto wirft wenn nicht authentifiziert', async () => {
    // Temporarily override auth mock
    const authModule = require('../../../stores/authStore');
    const orig = authModule.useAuthStore.getState;
    authModule.useAuthStore.getState = () => ({ userId: null, activeGardenId: 'garden-a' });
    try {
      await expect(
        enqueuePhoto('garden-a', 'file:///x.jpg', false),
      ).rejects.toThrow('not_authenticated');
    } finally {
      authModule.useAuthStore.getState = orig;
    }
  });
});
