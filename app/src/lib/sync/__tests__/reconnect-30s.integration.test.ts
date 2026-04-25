// SC-5: 2-User Reconnect 30s-Window Integration Tests — Plan 03-06 Task 05 (TDD)
// Tests 4 scenarios:
//  1. Happy Path: Gerät A write → Gerät B sieht via pullAll() nach A's Push
//  2. LWW-Konflikt: älterer Write rejected, Gerät A pullt Server-Stand
//  3. Permanent-Failure → manueller Retry via worker.retryOp erfolgreich
//  4. Verwerfen via worker.discardOp → Delta-Pull überschreibt lokale Row

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import { SyncWorker } from '../SyncWorker';
import { syncEvents, type SyncEvent } from '../events';
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

// ── Per-test InMemory storage ─────────────────────────────────────────────────
// Use IndexedDbAdapter with unique DB names per test for isolation.

import { IndexedDbAdapter } from '../../../storage/IndexedDbAdapter';
import type { StorageAdapter } from '@spatenstich/shared';

function createDeviceStorage(name: string): StorageAdapter {
  return new IndexedDbAdapter(name) as StorageAdapter;
}

// ── Supabase Shim (shared server state) ────────────────────────────────────────

interface ShimOpts {
  enforceLww?: boolean;
  failNextN?: number;
}

function createServerShim(opts: ShimOpts = {}) {
  const serverState: Record<string, any[]> = {};
  let clockMs = 1_000_000;
  let failRemaining = opts.failNextN ?? 0;
  const { enforceLww = false } = opts;

  function serverNow() {
    clockMs += 1000;
    return new Date(clockMs).toISOString();
  }

  // Build a select result object that is both thenable (no .gt) and has .gt
  function makeSelectResult(rows: any[]) {
    const result = Promise.resolve({ data: rows, error: null });
    return Object.assign(result, {
      gt(_col: string, ts: string) {
        return Promise.resolve({ data: rows.filter((r) => r.updated_at > ts), error: null });
      },
      eq(_col: string, _val: string) {
        return Object.assign(Promise.resolve({ data: rows, error: null }), {
          gt(_c: string, ts: string) {
            return Promise.resolve({ data: rows.filter((r) => r.updated_at > ts), error: null });
          },
        });
      },
    });
  }

  function makeTableProxy(table: string) {
    return {
      select: jest.fn().mockImplementation((_cols?: string) => {
        const rows = serverState[table] ?? [];
        return makeSelectResult(rows);
      }),
      upsert: jest.fn().mockImplementation((row: any) => {
        if (failRemaining > 0) {
          failRemaining--;
          return Promise.resolve({ data: null, error: { code: '500', message: 'simulated error' } });
        }
        if (enforceLww) {
          const existing = (serverState[table] ?? []).find((r) => r.id === row.id);
          if (existing && existing.updated_at >= row.updated_at) {
            return Promise.resolve({ data: null, error: { code: 'P9011', message: 'LWW reject' } });
          }
        }
        if (!serverState[table]) serverState[table] = [];
        serverState[table] = serverState[table].filter((r) => r.id !== row.id).concat(row);
        return Promise.resolve({ data: row, error: null });
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    };
  }

  const rpc = jest.fn((name: string) => {
    if (name === 'server_now') {
      return Promise.resolve({ data: serverNow(), error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const from = jest.fn((table: string) => makeTableProxy(table));

  return {
    client: { rpc, from } as any,
    seed(table: string, row: any) {
      if (!serverState[table]) serverState[table] = [];
      serverState[table] = serverState[table].filter((r) => r.id !== row.id).concat(row);
    },
    clearFailures() {
      failRemaining = 0;
    },
    getServerRow(table: string, id: string) {
      return (serverState[table] ?? []).find((r) => r.id === id) ?? null;
    },
  };
}

// ── Sentry stub ────────────────────────────────────────────────────────────────
const sentryStub = {
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function dbGardenRow(overrides?: Record<string, unknown>) {
  return {
    id: 'g-1',
    name: 'Original',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    updated_by_user_id: 'user-a',
    owner_user_id: 'user-a',
    deleted_at: null,
    plz: null, klimazone: null, archetype: null,
    ...overrides,
  };
}

function gardenRow(overrides?: Partial<GardenRow>): GardenRow {
  return {
    id: 'g-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedByUserId: 'user-a',
    deletedAt: null,
    name: 'Original',
    ownerUserId: 'user-a',
    ...overrides,
  };
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('SC-5: 2-User Reconnect 30s-Window (Class-API)', () => {
  afterEach(() => {
    syncEvents._reset();
    jest.clearAllMocks();
  });

  // SC-5: binnen 30s bedeutet: sobald Gerät B pullAll() aufruft, sieht es die Änderung.
  // Das Timing-Fenster wird durch die Polling-Frequenz des Workers kontrolliert (nicht hier getestet).
  // Dieser Test verifiziert, dass die Daten nach A's Push für B korrekt via pullAll() verfügbar sind.
  test('Test 1: Gerät A Write → Gerät B sieht Wert via pullAll() (SC-5 30s-Window)', async () => {
    const server = createServerShim();
    server.seed('gardens', dbGardenRow({ name: 'Alter Name' }));

    const storageA = createDeviceStorage('sc5-t1-a');
    const storageB = createDeviceStorage('sc5-t1-b');
    const workerA = new SyncWorker({ storage: storageA, supabase: server.client, sentry: sentryStub as any });
    const workerB = new SyncWorker({ storage: storageB, supabase: server.client, sentry: sentryStub as any });

    // Gerät B bootstrap
    await workerB.pullAll();
    expect((await storageB.getRow<GardenRow>('gardens', 'g-1'))?.name).toBe('Alter Name');

    // Gerät A offline-edit
    const newRow = gardenRow({ name: 'Neuer Name von A', updatedAt: '2026-01-01T00:05:00.000Z' });
    await storageA.writeWithOutbox('gardens', newRow, {
      entity: 'gardens', rowId: 'g-1', operation: 'upsert' as any,
      payload: newRow as unknown as Record<string, unknown>,
    });

    // Reconnect-Simulation: Gerät A syncAll (pull + push)
    const events: SyncEvent[] = [];
    const unsub = syncEvents.on((e) => events.push(e));
    await workerA.syncAll();
    unsub();
    expect(events.some((e) => e.type === 'push_success')).toBe(true);

    // SC-5: Gerät B ruft pullAll() (simuliert: binnen 30s-Fenster nach A's Push)
    // jest.advanceTimersByTime not needed — we test logical correctness, not wall-clock timing
    await workerB.pullAll();
    expect((await storageB.getRow<GardenRow>('gardens', 'g-1'))?.name).toBe('Neuer Name von A');
  }, 15000);

  test('Test 2: LWW-Konflikt — älterer Write rejected, Gerät A pullt Server-Stand', async () => {
    const server = createServerShim({ enforceLww: true });
    server.seed('gardens', dbGardenRow());

    const storageA = createDeviceStorage('sc5-t2-a');
    const storageB = createDeviceStorage('sc5-t2-b');
    const workerA = new SyncWorker({ storage: storageA, supabase: server.client, sentry: sentryStub as any });
    const workerB = new SyncWorker({ storage: storageB, supabase: server.client, sentry: sentryStub as any });

    await workerA.pullAll();
    await workerB.pullAll();

    // Beide offline-edit auf derselben Row
    const rowA = gardenRow({ name: 'Von A (älter)', updatedAt: '2026-01-01T00:01:00.000Z' });
    await storageA.writeWithOutbox('gardens', rowA, {
      entity: 'gardens', rowId: 'g-1', operation: 'upsert' as any,
      payload: rowA as unknown as Record<string, unknown>,
    });
    const rowB = gardenRow({ name: 'Von B (neuer)', updatedAt: '2026-01-01T00:02:00.000Z' });
    await storageB.writeWithOutbox('gardens', rowB, {
      entity: 'gardens', rowId: 'g-1', operation: 'upsert' as any,
      payload: rowB as unknown as Record<string, unknown>,
    });

    // B pusht zuerst — Server akzeptiert
    await workerB.syncAll();
    expect(server.getServerRow('gardens', 'g-1')?.name).toBe('Von B (neuer)');

    // A pusht — Server lehnt mit P9011 ab
    const events: SyncEvent[] = [];
    const unsub = syncEvents.on((e) => events.push(e));
    await workerA.syncAll();
    unsub();

    expect(events.some((e) => e.type === 'push_conflict')).toBe(true);

    // Outbox auf A leer (Conflict → discard, nicht failed)
    expect(await storageA.listOutboxEntries()).toHaveLength(0);

    // A's lokale Row zeigt nach Delta-Pull B's Wert
    const aAfter = await storageA.getRow<GardenRow>('gardens', 'g-1');
    expect(aAfter?.name).toBe('Von B (neuer)');
  }, 15000);

  test('Test 3: Permanent-Failure → manueller Retry via worker.retryOp erfolgreich', async () => {
    const server = createServerShim({ failNextN: 10 });
    server.seed('gardens', dbGardenRow());

    const stor = createDeviceStorage('sc5-t3');
    const worker = new SyncWorker({ storage: stor, supabase: server.client, sentry: sentryStub as any });

    // Schreibe lokalen Edit
    const editRow = gardenRow({ name: 'Edit', updatedAt: '2026-01-01T00:01:00.000Z' });
    await stor.writeWithOutbox('gardens', editRow, {
      entity: 'gardens', rowId: 'g-1', operation: 'upsert' as any,
      payload: editRow as unknown as Record<string, unknown>,
    });

    // 10 fail-Versuche → attempts >= MAX_ATTEMPTS
    for (let i = 0; i < 10; i++) {
      await worker.syncAll();
    }
    const failed = await stor.listOutboxEntries();
    expect(failed).toHaveLength(1);
    expect(failed[0]!.attempts).toBeGreaterThanOrEqual(10);

    // Server hört auf zu failen
    server.clearFailures();

    // User tapped Retry
    await worker.retryOp(failed[0]!.id);

    // Outbox leer nach erfolgreichem Retry
    expect(await stor.listOutboxEntries()).toHaveLength(0);
  }, 30000);

  test('Test 4: Verwerfen via worker.discardOp → Delta-Pull überschreibt lokale Row', async () => {
    const server = createServerShim({ failNextN: 10 });
    server.seed('gardens', dbGardenRow({ name: 'Server-Stand', updated_at: '2026-01-01T00:10:00.000Z' }));

    const stor = createDeviceStorage('sc5-t4');
    const worker = new SyncWorker({ storage: stor, supabase: server.client, sentry: sentryStub as any });

    // Gerät hat lokalen Failed-Edit
    const failedRow = gardenRow({ name: 'Lokaler Failed-Edit', updatedAt: '2026-01-01T00:05:00.000Z' });
    await stor.writeWithOutbox('gardens', failedRow, {
      entity: 'gardens', rowId: 'g-1', operation: 'upsert' as any,
      payload: failedRow as unknown as Record<string, unknown>,
    });

    // 10 fail-Versuche
    for (let i = 0; i < 10; i++) {
      await worker.syncAll();
    }
    const [failedEntry] = await stor.listOutboxEntries();
    expect(failedEntry!.attempts).toBeGreaterThanOrEqual(10);

    // Server hört auf zu failen
    server.clearFailures();

    // User tapped Verwerfen
    await worker.discardOp(failedEntry!.id);

    // Outbox leer
    expect(await stor.listOutboxEntries()).toHaveLength(0);

    // Lokale Row zeigt Server-Stand nach Delta-Pull
    const finalRow = await stor.getRow<GardenRow>('gardens', 'g-1');
    expect(finalRow?.name).toBe('Server-Stand');
  }, 30000);
});
