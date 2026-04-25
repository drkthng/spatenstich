// SyncWorker.retryOp / discardOp / pullAll — Class-API Consumer Tests
// Plan 03-06 Task 02 (TDD)
//
// Uses Constructor-Injection (new SyncWorker({ storage, supabase })) NOT getSyncWorker()
// so each test gets a fresh instance with isolated pushInFlight state.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import { SyncWorker, PULL_ENTITIES } from '../SyncWorker';
import { syncEvents, type SyncEvent } from '../events';
import { storage } from '../../../storage';
import type { GardenRow } from '@spatenstich/shared';

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
    fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  },
}));

// ── Supabase Shim ────────────────────────────────────────────────────────────

interface ShimOptions {
  enforceLww?: boolean;
  failNextN?: number;
  /** Return error for specific tables on select (null = success). */
  failOnSelect?: (table: string) => { message: string } | null;
}

function createSupabaseShim(opts: ShimOptions = {}) {
  const sharedState: Record<string, any[]> = {};
  let clock = 1_000_000;
  let failRemaining = opts.failNextN ?? 0;
  const { enforceLww = false, failOnSelect = () => null } = opts;

  const rpc = jest.fn((name: string) => {
    if (name === 'server_now') {
      clock += 100;
      return Promise.resolve({ data: new Date(clock).toISOString(), error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  function makeTableProxy(table: string) {
    return {
      select: jest.fn().mockReturnValue({
        gt: jest.fn().mockImplementation((_col: string, ts: string) => {
          const selectErr = failOnSelect(table);
          if (selectErr) return Promise.resolve({ data: null, error: selectErr });
          return Promise.resolve({
            data: sharedState[table]?.filter((r) => r.updated_at > ts) ?? [],
            error: null,
          });
        }),
        eq: jest.fn().mockReturnValue({
          gt: jest.fn().mockResolvedValue({ data: sharedState[table] ?? [], error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: sharedState[table]?.[0] ?? null, error: null }),
        }),
      }),
      upsert: jest.fn().mockImplementation((row: any) => {
        if (failRemaining > 0) {
          failRemaining--;
          return Promise.resolve({ data: null, error: { code: '500', message: 'simulated error' } });
        }
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
    };
  }

  const from = jest.fn((table: string) => makeTableProxy(table));

  return {
    client: { rpc, from } as any,
    seed(table: string, row: any) {
      if (!sharedState[table]) sharedState[table] = [];
      sharedState[table] = sharedState[table].filter((r) => r.id !== row.id).concat(row);
    },
    clearFailures() {
      failRemaining = 0;
    },
    _state: sharedState,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const sentryMock = {
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
};

const sampleGardenRow = (overrides?: Partial<GardenRow>): GardenRow => ({
  id: 'g-1',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
  updatedByUserId: 'user-a',
  deletedAt: null,
  name: 'Lokal',
  ownerUserId: 'user-a',
  ...overrides,
});

async function clearOutbox() {
  const entries = await storage.listOutboxEntries();
  for (const e of entries) await storage.deleteOutboxEntry(e.id);
}

async function seedFailedOutboxEntry(overrides?: Partial<GardenRow>): Promise<string> {
  const row = sampleGardenRow(overrides);
  await storage.writeWithOutbox(
    'gardens',
    row,
    { entity: 'gardens', rowId: row.id, operation: 'upsert' as any, payload: row as unknown as Record<string, unknown> },
  );
  const [entry] = await storage.listOutboxEntries();
  // Mark as permanently failed
  await storage.updateOutboxEntry(entry!.id, { attempts: 10, lastError: '500 Server Error' });
  return entry!.id;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SyncWorker.retryOp / discardOp / pullAll (Klassen-API)', () => {
  beforeEach(async () => {
    syncEvents._reset();
    jest.clearAllMocks();
    await clearOutbox();
  });

  afterEach(async () => {
    await clearOutbox();
  });

  test('Test 1: retryOp setzt attempts=0, clear lastError, status=pending, triggert syncAll', async () => {
    const supabase = createSupabaseShim();
    const worker = new SyncWorker({ storage, supabase: supabase.client, sentry: sentryMock as any });
    const opId = await seedFailedOutboxEntry();

    const events: SyncEvent[] = [];
    const unsub = syncEvents.on((e) => events.push(e));
    await worker.retryOp(opId);
    unsub();

    // Either entry was processed (removed) OR was reset to attempts=0
    const afterEntries = await storage.listOutboxEntries();
    const after = afterEntries.find((e) => e.id === opId);
    if (after) {
      // Entry still in outbox — must have reset attempts
      expect(after.attempts).toBe(0);
      expect(after.lastError).toBeNull();
    }
    // status_change:syncing was emitted
    expect(events.some((e) => e.type === 'status_change' && e.status === 'syncing')).toBe(true);
  });

  test('Test 2: retryOp mit nicht-existenter ID wirft "outbox_entry_not_found"', async () => {
    const supabase = createSupabaseShim();
    const worker = new SyncWorker({ storage, supabase: supabase.client, sentry: sentryMock as any });

    await expect(worker.retryOp('nonexistent-id')).rejects.toThrow('outbox_entry_not_found');
  });

  test('Test 3: discardOp löscht Outbox-Entry', async () => {
    const supabase = createSupabaseShim();
    const worker = new SyncWorker({ storage, supabase: supabase.client, sentry: sentryMock as any });
    const opId = await seedFailedOutboxEntry();

    await worker.discardOp(opId);

    const after = await storage.listOutboxEntries();
    expect(after.find((e) => e.id === opId)).toBeUndefined();
  });

  test('Test 4: discardOp triggert Delta-Pull für betroffenes Entity', async () => {
    const supabase = createSupabaseShim();
    const fromSpy = jest.spyOn(supabase.client, 'from');
    const worker = new SyncWorker({ storage, supabase: supabase.client, sentry: sentryMock as any });
    const opId = await seedFailedOutboxEntry();
    fromSpy.mockClear();

    await worker.discardOp(opId);

    // Expect at least one .from('gardens') call for the delta-pull
    expect(fromSpy).toHaveBeenCalledWith('gardens');
  });

  test('Test 5: discardOp mit nicht-existenter ID ist idempotent (kein throw)', async () => {
    const supabase = createSupabaseShim();
    const worker = new SyncWorker({ storage, supabase: supabase.client, sentry: sentryMock as any });

    await expect(worker.discardOp('nonexistent-id')).resolves.toBeUndefined();
  });

  test('Test 6: retryOp emittiert status_change:syncing VOR push_start', async () => {
    const supabase = createSupabaseShim();
    const worker = new SyncWorker({ storage, supabase: supabase.client, sentry: sentryMock as any });
    const opId = await seedFailedOutboxEntry();

    const events: SyncEvent[] = [];
    const unsub = syncEvents.on((e) => events.push(e));
    await worker.retryOp(opId);
    unsub();

    const statusChangeIdx = events.findIndex(
      (e) => e.type === 'status_change' && e.status === 'syncing',
    );
    const pushStartIdx = events.findIndex((e) => e.type === 'push_start');

    // status_change:syncing MUST be emitted
    expect(statusChangeIdx).toBeGreaterThanOrEqual(0);
    // If there was a push_start, status_change came first
    if (pushStartIdx >= 0) {
      expect(statusChangeIdx).toBeLessThan(pushStartIdx);
    }
  });

  test('Test 7: pullAll iteriert alle PULL_ENTITIES, per-entity-Fehler bricht nicht ab', async () => {
    // Shim that fails selectively — entity 'vereinsregeln' returns select error
    const failingEntities = new Set(['vereinsregeln']);
    const supabase = createSupabaseShim({
      failOnSelect: (table) =>
        failingEntities.has(table) ? { message: '500 Sim-Fehler' } : null,
    });
    const worker = new SyncWorker({ storage, supabase: supabase.client, sentry: sentryMock as any });
    const pullSpy = jest.spyOn(worker, 'pull');

    await worker.pullAll();

    // pull was called for every entity in PULL_ENTITIES
    for (const entity of PULL_ENTITIES) {
      expect(pullSpy).toHaveBeenCalledWith(entity);
    }
    // Loop completed all entities despite one failing
    expect(pullSpy).toHaveBeenCalledTimes(PULL_ENTITIES.length);
  });
});
