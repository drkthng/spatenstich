// SyncWorker bug-fix tests (cross-device UAT follow-up 2026-06-14).
// Bug B: garden_dimensions push must use onConflict:'garden_id' (not 'id').
// Outbox hardening: push() skips entries that have reached MAX_ATTEMPTS.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import { SyncWorker } from '../SyncWorker';
import { syncEvents } from '../events';
import { storage } from '../../../storage';
import { MAX_ATTEMPTS } from '../backoff';

const supabaseMock = {
  from: jest.fn(),
  rpc: jest.fn(),
} as any;

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ userId: 'user-a', activeGardenId: 'garden-a', mode: 'account' }),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: any) => obj['web'] ?? obj['default'] },
  AppState: { addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }) },
}));

jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: jest.fn().mockReturnValue(() => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

function makeWorker(overrides: any = {}) {
  return new SyncWorker({
    storage,
    supabase: overrides.supabase ?? supabaseMock,
    sentry: { addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn() } as any,
  });
}

/** Clear all outbox entries before each test to prevent cross-test contamination. */
async function clearOutbox(): Promise<void> {
  const entries = await storage.listOutboxEntries(1000);
  for (const e of entries) {
    await storage.deleteOutboxEntry(e.id);
  }
}

const gardenDimensionsPayload = {
  id: 'dim-1',
  gardenId: 'garden-a',
  shape: 'rectangle',
  widthM: 10,
  heightM: 8,
  extraDims: null,
  createdAt: '2026-06-14T00:00:00.000Z',
  updatedAt: '2026-06-14T00:00:00.000Z',
  updatedByUserId: 'user-a',
  deletedAt: null,
};

describe('Bug B — garden_dimensions push uses onConflict:garden_id', () => {
  beforeEach(async () => {
    syncEvents._reset();
    jest.clearAllMocks();
    await clearOutbox();
  });

  it('calls supabase upsert with onConflict:garden_id, not id', async () => {
    await storage.writeWithOutbox(
      'garden_dimensions',
      gardenDimensionsPayload as any,
      {
        entity: 'garden_dimensions',
        rowId: 'dim-1',
        operation: 'insert',
        payload: gardenDimensionsPayload as any,
      },
    );

    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue({ upsert: upsertMock });

    const worker = makeWorker();
    await worker.push();

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [, options] = upsertMock.mock.calls[0];
    expect(options).toMatchObject({ onConflict: 'garden_id' });
    expect(options.onConflict).not.toBe('id');
  });
});

describe('Outbox hardening — skip entries at MAX_ATTEMPTS', () => {
  beforeEach(async () => {
    syncEvents._reset();
    jest.clearAllMocks();
    await clearOutbox();
  });

  it('does not call supabase for an entry at MAX_ATTEMPTS', async () => {
    // Seed a garden entry and bump its attempts to MAX_ATTEMPTS
    await storage.writeWithOutbox(
      'gardens',
      {
        id: 'g-stuck',
        createdAt: 'now',
        updatedAt: 'now',
        updatedByUserId: 'user-a',
        deletedAt: null,
        name: 'Stuck Garden',
        ownerUserId: 'user-a',
      } as any,
      { entity: 'gardens', rowId: 'g-stuck', operation: 'insert', payload: {} },
    );
    const [entry] = await storage.listOutboxEntries();
    await storage.updateOutboxEntry(entry.id, { attempts: MAX_ATTEMPTS, lastError: '22P02' });

    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue({ upsert: upsertMock });

    const worker = makeWorker();
    await worker.push();

    // The stuck entry should NOT have been retried
    expect(upsertMock).not.toHaveBeenCalled();
    // The entry remains in the outbox (still visible in UI for manual discard/retry)
    const remaining = await storage.listOutboxEntries();
    expect(remaining.some((e) => e.rowId === 'g-stuck')).toBe(true);
  });

  it('processes a normal entry (attempts < MAX_ATTEMPTS) while skipping the stuck one', async () => {
    // Seed a stuck entry
    await storage.writeWithOutbox(
      'gardens',
      {
        id: 'g-stuck',
        createdAt: 'now',
        updatedAt: 'now',
        updatedByUserId: 'user-a',
        deletedAt: null,
        name: 'Stuck',
        ownerUserId: 'user-a',
      } as any,
      { entity: 'gardens', rowId: 'g-stuck', operation: 'insert', payload: {} },
    );
    const [stuckEntry] = await storage.listOutboxEntries();
    await storage.updateOutboxEntry(stuckEntry.id, { attempts: MAX_ATTEMPTS, lastError: '22P02' });

    // Seed a normal entry (attempts = 0)
    await storage.writeWithOutbox(
      'gardens',
      {
        id: 'g-normal',
        createdAt: 'now',
        updatedAt: 'now',
        updatedByUserId: 'user-a',
        deletedAt: null,
        name: 'Normal',
        ownerUserId: 'user-a',
      } as any,
      { entity: 'gardens', rowId: 'g-normal', operation: 'insert', payload: {} },
    );

    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue({ upsert: upsertMock });

    const worker = makeWorker();
    await worker.push();

    // Only the normal entry was pushed
    expect(upsertMock).toHaveBeenCalledTimes(1);
    // Normal entry removed from outbox; stuck entry stays
    const remaining = await storage.listOutboxEntries();
    expect(remaining.some((e) => e.rowId === 'g-stuck')).toBe(true);
    expect(remaining.some((e) => e.rowId === 'g-normal')).toBe(false);
  });

  it('retryOp resets attempts to 0 so the entry is eligible for push again', async () => {
    await storage.writeWithOutbox(
      'gardens',
      {
        id: 'g-retry',
        createdAt: 'now',
        updatedAt: 'now',
        updatedByUserId: 'user-a',
        deletedAt: null,
        name: 'Retry',
        ownerUserId: 'user-a',
      } as any,
      { entity: 'gardens', rowId: 'g-retry', operation: 'insert', payload: {} },
    );
    const [entry] = await storage.listOutboxEntries();
    await storage.updateOutboxEntry(entry.id, { attempts: MAX_ATTEMPTS, lastError: '22P02' });

    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue({
      upsert: upsertMock,
      select: jest.fn().mockReturnValue({
        gt: jest.fn().mockResolvedValue({ data: [], error: null }),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    supabaseMock.rpc.mockResolvedValue({ data: '2026-06-14T12:00:00Z', error: null });

    const worker = makeWorker();
    await worker.retryOp(entry.id);

    // After retryOp the entry was pushed (upsert called) and removed from outbox
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const remaining = await storage.listOutboxEntries();
    expect(remaining.some((e) => e.rowId === 'g-retry')).toBe(false);
  });
});
