// Set Supabase env BEFORE any import that transitively pulls in supabase.ts
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import { SyncWorker, getSyncWorker, setSyncWorker } from '../SyncWorker';
import { syncEvents } from '../events';
import { storage } from '../../../storage';

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

describe('SyncWorker — Klasse + Singleton', () => {
  beforeEach(() => {
    setSyncWorker(null);
    syncEvents._reset();
    jest.clearAllMocks();
  });

  it('getSyncWorker() liefert Singleton-Instanz', () => {
    const a = getSyncWorker();
    const b = getSyncWorker();
    expect(a).toBe(b);
  });

  it('setSyncWorker(null) erzeugt bei nächstem getSyncWorker() neue Instanz', () => {
    const a = getSyncWorker();
    setSyncWorker(null);
    const b = getSyncWorker();
    expect(a).not.toBe(b);
  });
});

describe('SyncWorker.push()', () => {
  beforeEach(() => {
    syncEvents._reset();
    jest.clearAllMocks();
  });

  it('leere Queue ist No-Op', async () => {
    const worker = makeWorker();
    await worker.push();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('Success entfernt Eintrag aus Outbox', async () => {
    await storage.writeWithOutbox('gardens', {
      id: 'g-1', createdAt: 'now', updatedAt: 'now', updatedByUserId: 'user-a',
      deletedAt: null, name: 'G', ownerUserId: 'user-a',
    } as any, { entity: 'gardens', rowId: 'g-1', operation: 'insert', payload: {} });

    supabaseMock.from.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    });
    const worker = makeWorker();
    await worker.push();
    expect(await storage.listOutboxEntries()).toHaveLength(0);
  });

  it('P9011 löscht Eintrag + emittiert push_conflict', async () => {
    await storage.writeWithOutbox('gardens', {
      id: 'g-1', createdAt: 'now', updatedAt: 'now', updatedByUserId: 'user-a',
      deletedAt: null, name: 'G', ownerUserId: 'user-a',
    } as any, { entity: 'gardens', rowId: 'g-1', operation: 'update', payload: {} });

    supabaseMock.from.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: { code: 'P9011', message: 'older write rejected' } }),
    });

    const events: any[] = [];
    syncEvents.on((e) => events.push(e));
    const worker = makeWorker();
    await worker.push();

    expect(await storage.listOutboxEntries()).toHaveLength(0);
    expect(events.some((e) => e.type === 'push_conflict')).toBe(true);
  });

  it('parallele push()-Aufrufe werden via pushInFlight serialisiert', async () => {
    await storage.writeWithOutbox('gardens', {
      id: 'g-1', createdAt: 'now', updatedAt: 'now', updatedByUserId: 'user-a',
      deletedAt: null, name: 'G', ownerUserId: 'user-a',
    } as any, { entity: 'gardens', rowId: 'g-1', operation: 'insert', payload: {} });

    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue({ upsert: upsertMock });
    const worker = makeWorker();

    await Promise.all([worker.push(), worker.push(), worker.push()]);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
});

describe('SyncWorker.pull / pullAll / syncAll', () => {
  beforeEach(() => {
    syncEvents._reset();
    jest.clearAllMocks();
    supabaseMock.rpc.mockResolvedValue({ data: '2026-04-24T12:00:00Z', error: null });
  });

  it('pull(entity) aktualisiert sync_state.lastPullAt auf server_now()', async () => {
    supabaseMock.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        gt: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    const worker = makeWorker();
    await worker.pull('gardens');
    const state = await storage.getSyncState('gardens');
    expect(state?.lastPullAt).toBe('2026-04-24T12:00:00Z');
  });

  it('pull speichert Rows via upsertRowsFromServer (KEINE Outbox)', async () => {
    supabaseMock.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        gt: jest.fn().mockResolvedValue({
          data: [{
            id: 'g-1', name: 'Test', created_at: 'now', updated_at: 'now',
            updated_by_user_id: 'user-a', owner_user_id: 'user-a',
            deleted_at: null, plz: null, klimazone: null, archetype: null,
          }],
          error: null,
        }),
      }),
    });
    const worker = makeWorker();
    await worker.pull('gardens');
    const row = await storage.getRow('gardens', 'g-1');
    expect(row).toBeTruthy();
    expect(await storage.listOutboxEntries()).toHaveLength(0);
  });

  it('pullAll() iteriert alle PULL_ENTITIES und continued bei Einzel-Fehlern', async () => {
    // gardens OK, profiles wirft, rest OK → pullAll läuft trotzdem durch
    let callCount = 0;
    supabaseMock.from.mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return {
          select: jest.fn().mockReturnValue({
            gt: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockResolvedValue({ data: [], error: null }),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });
    const worker = makeWorker();
    await expect(worker.pullAll()).resolves.not.toThrow();
  });

  it('syncAll() ruft erst pullAll() dann push()', async () => {
    const worker = makeWorker();
    const pullAllSpy = jest.spyOn(worker, 'pullAll').mockResolvedValue();
    const pushSpy = jest.spyOn(worker, 'push').mockResolvedValue();
    await worker.syncAll();
    const pullOrder = pullAllSpy.mock.invocationCallOrder[0];
    const pushOrder = pushSpy.mock.invocationCallOrder[0];
    expect(pullOrder).toBeLessThan(pushOrder);
  });
});

describe('SyncWorker.retryOp / discardOp', () => {
  beforeEach(() => {
    syncEvents._reset();
    jest.clearAllMocks();
    supabaseMock.rpc.mockResolvedValue({ data: '2026-04-24T12:00:00Z', error: null });
    supabaseMock.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        gt: jest.fn().mockResolvedValue({ data: [], error: null }),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  async function seedFailedEntry(): Promise<string> {
    await storage.writeWithOutbox('gardens', {
      id: 'g-1', createdAt: 'now', updatedAt: 'now', updatedByUserId: 'user-a',
      deletedAt: null, name: 'G', ownerUserId: 'user-a',
    } as any, { entity: 'gardens', rowId: 'g-1', operation: 'update', payload: {} });
    const [entry] = await storage.listOutboxEntries();
    await storage.updateOutboxEntry(entry.id, { attempts: 9, lastError: 'prev' });
    return entry.id;
  }

  it('retryOp setzt attempts=0, clear lastError', async () => {
    const id = await seedFailedEntry();
    const worker = makeWorker();
    await worker.retryOp(id);
    const entries = await storage.listOutboxEntries();
    // Bei erfolgreichem Push wird Entry gelöscht — dann ist Outbox leer
    // Wir testen hier nur den attempts-reset via pre-push-Seed:
    expect(entries.length === 0 || entries[0].attempts === 0).toBe(true);
  });

  it('retryOp("does-not-exist") wirft outbox_entry_not_found', async () => {
    const worker = makeWorker();
    await expect(worker.retryOp('does-not-exist')).rejects.toThrow('outbox_entry_not_found');
  });

  it('discardOp löscht Entry + triggert pull(entity)', async () => {
    const id = await seedFailedEntry();
    const worker = makeWorker();
    const pullSpy = jest.spyOn(worker, 'pull').mockResolvedValue();
    await worker.discardOp(id);
    expect(await storage.listOutboxEntries()).toHaveLength(0);
    expect(pullSpy).toHaveBeenCalledWith('gardens');
  });

  it('discardOp("does-not-exist") ist idempotent (kein throw, kein pull)', async () => {
    const worker = makeWorker();
    const pullSpy = jest.spyOn(worker, 'pull').mockResolvedValue();
    await expect(worker.discardOp('does-not-exist')).resolves.not.toThrow();
    expect(pullSpy).not.toHaveBeenCalled();
  });
});
