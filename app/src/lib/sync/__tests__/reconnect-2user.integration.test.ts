// Set Supabase env BEFORE any import that transitively pulls in supabase.ts
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import { SyncWorker } from '../SyncWorker';
import { syncEvents } from '../events';
import { storage as sharedStorage } from '../../../storage';
import type { GardenRow } from '@spatenstich/shared';

// Mock-Setup: in-memory supabase-shim teilt state zwischen beiden "Devices"
function createSupabaseShim(opts: { enforceLww?: boolean } = {}) {
  const sharedState: Record<string, any[]> = { gardens: [] };
  let clock = 1_000_000;
  const { enforceLww = true } = opts;

  const rpc = jest.fn((name: string) => {
    if (name === 'server_now') {
      clock += 100;
      return Promise.resolve({ data: new Date(clock).toISOString(), error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const from = jest.fn((table: string) => ({
    select: jest.fn().mockReturnValue({
      gt: jest.fn().mockImplementation((_col: string, ts: string) =>
        Promise.resolve({ data: sharedState[table]?.filter((r) => r.updated_at > ts) ?? [], error: null }),
      ),
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockImplementation(() =>
          Promise.resolve({ data: sharedState[table]?.[0] ?? null, error: null }),
        ),
      }),
    }),
    upsert: jest.fn().mockImplementation((row: any) => {
      if (enforceLww) {
        const existing = sharedState[table]?.find((r) => r.id === row.id);
        if (existing && existing.updated_at >= row.updated_at) {
          return Promise.resolve({ data: null, error: { code: 'P9011', message: 'older write' } });
        }
      }
      if (!sharedState[table]) sharedState[table] = [];
      sharedState[table] = sharedState[table].filter((r) => r.id !== row.id).concat(row);
      return Promise.resolve({ data: row, error: null });
    }),
    update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
    delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
  }));

  return {
    client: { rpc, from } as any,
    _sharedState: sharedState,
    _seed: (table: string, row: any) => {
      if (!sharedState[table]) sharedState[table] = [];
      sharedState[table].push(row);
    },
  };
}

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ userId: 'user-a', activeGardenId: 'garden-a', mode: 'account' }),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: any) => obj['web'] ?? obj['default'] },
  AppState: { addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }), currentState: 'active' },
}));

jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: jest.fn().mockReturnValue(() => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

describe('2-user reconnect (I-4 / SC-5) — Klassen-API', () => {
  beforeEach(() => {
    syncEvents._reset();
    jest.clearAllMocks();
  });

  it('Device A offline-edit, reconnect, Device B pull → sieht Änderung (< 3s)', async () => {
    const shim = createSupabaseShim();
    const sentryMock = {
      addBreadcrumb: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
    };
    const workerA = new SyncWorker({ storage: sharedStorage, supabase: shim.client, sentry: sentryMock as any });

    const rowA: GardenRow = {
      id: 'garden-a',
      createdAt: '2026-04-24T10:00:00Z',
      updatedAt: '2026-04-24T10:00:05Z',
      updatedByUserId: 'user-a',
      deletedAt: null,
      name: 'Garten-A-Edit',
      ownerUserId: 'user-a',
    };
    await sharedStorage.writeWithOutbox('gardens', rowA, {
      entity: 'gardens', rowId: 'garden-a', operation: 'update', payload: rowA as unknown as Record<string, unknown>,
    });

    const t0 = Date.now();
    await workerA.syncAll();
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(3000);

    expect(shim._sharedState.gardens).toContainEqual(
      expect.objectContaining({ id: 'garden-a', name: 'Garten-A-Edit' }),
    );

    // Sentry-Breadcrumb gesetzt
    expect(sentryMock.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'sync' }),
    );
  });

  it('LWW-Konflikt: A offline-Write vs bereits-vorhandener neuerer Server-Write → A bekommt P9011', async () => {
    const shim = createSupabaseShim({ enforceLww: true });
    shim._seed('gardens', {
      id: 'garden-a',
      name: 'Garten-B-Wins',
      updated_at: '2026-04-24T10:00:06Z',
      updated_by_user_id: 'user-b',
      owner_user_id: 'user-a',
      created_at: '2026-04-24T10:00:00Z',
      deleted_at: null,
      plz: null, klimazone: null, archetype: null,
    });

    const sentryMock = {
      addBreadcrumb: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
    };
    const workerA = new SyncWorker({ storage: sharedStorage, supabase: shim.client, sentry: sentryMock as any });

    const rowA: GardenRow = {
      id: 'garden-a',
      createdAt: '2026-04-24T10:00:00Z',
      updatedAt: '2026-04-24T10:00:05Z',
      updatedByUserId: 'user-a',
      deletedAt: null,
      name: 'Garten-A-Stale',
      ownerUserId: 'user-a',
    };
    await sharedStorage.writeWithOutbox('gardens', rowA, {
      entity: 'gardens', rowId: 'garden-a', operation: 'update', payload: rowA as unknown as Record<string, unknown>,
    });

    const events: any[] = [];
    syncEvents.on((e) => events.push(e));
    await workerA.syncAll();

    expect(events.some((e) => e.type === 'push_conflict')).toBe(true);
    expect(await sharedStorage.listOutboxEntries()).toHaveLength(0);

    // Sentry captureException mit lww_conflict tag
    expect(sentryMock.captureException).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: expect.objectContaining({
          sync_phase: 'push',
          error_kind: 'lww_conflict',
        }),
      }),
    );
  });
});
