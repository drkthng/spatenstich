// Phase 33: the sync rules, exercised with two devices against a fake server that
// follows Migration 021 (see fakeServer.ts). Each device has its own local storage.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import type { GardenMemberRow, InviteCodeRow, OutboxEntry, PlanElementRow } from '@spatenstich/shared';
import { SyncWorker, PAGE_SIZE } from '../SyncWorker';
import { syncEvents, type SyncEvent } from '../events';
import { MAX_ATTEMPTS } from '../backoff';
import { IndexedDbAdapter } from '../../../storage/IndexedDbAdapter';
import { FakeServer } from './fakeServer';

const GARDEN = '11111111-1111-4111-8111-111111111111';
const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let mockAuth = { userId: USER_A, activeGardenId: GARDEN as string | null, mode: 'account' };
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: { getState: () => mockAuth },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: Record<string, unknown>) => obj['web'] ?? obj['default'] },
  AppState: { addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }) },
}));

jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: jest.fn().mockReturnValue(() => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

let dbCounter = 0;

interface Device {
  userId: string;
  storage: IndexedDbAdapter;
  worker: SyncWorker;
  /** The device's own clock, in ms. */
  clock: { now: number };
  /** Runs something as this device's user. */
  as<T>(fn: () => Promise<T>): Promise<T>;
  write(el: PlanElementRow): Promise<void>;
  element(id: string): Promise<PlanElementRow | null>;
  outbox(): Promise<OutboxEntry[]>;
}

function makeDevice(server: FakeServer, userId: string): Device {
  const storage = new IndexedDbAdapter(`phase33-${Date.now()}-${dbCounter++}`);
  const clock = { now: Math.floor(server.clock / 1000) };
  const worker = new SyncWorker({
    storage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: server.client(userId) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sentry: { addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn() } as any,
    now: () => clock.now,
  });
  const as = async <T,>(fn: () => Promise<T>): Promise<T> => {
    mockAuth = { userId, activeGardenId: GARDEN, mode: 'account' };
    return fn();
  };
  return {
    userId,
    storage,
    worker,
    clock,
    as,
    write: (el) =>
      storage.writeWithOutbox('plan_elements', el, {
        entity: 'plan_elements',
        rowId: el.id,
        operation: 'update',
        payload: el as unknown as Record<string, unknown>,
      }),
    element: (id) => storage.getRow<PlanElementRow>('plan_elements', id, { includeDeleted: true }),
    outbox: () => storage.listOutboxEntries(),
  };
}

function element(id: string, patch: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id,
    gardenId: GARDEN,
    elementType: 'Beet',
    label: 'Beet',
    xM: 1,
    yM: 1,
    widthM: 2,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    importedFrom: null,
    provenance: null,
    layer: 'infrastructure',
    createdAt: '2026-11-14T09:00:00.000Z',
    updatedAt: '2026-11-14T09:00:00.000Z',
    updatedByUserId: USER_A,
    deletedAt: null,
    ...patch,
  };
}

const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function setup(): { server: FakeServer; a: Device; b: Device; events: SyncEvent[] } {
  const server = new FakeServer();
  server.table('gardens').set(GARDEN, {
    id: GARDEN, name: 'Garten', created_at: server.nowIso(), updated_at: server.nowIso(),
    updated_by_user_id: USER_A, deleted_at: null, server_updated_at: server.stamp(),
  });
  server.addMember(GARDEN, USER_A, 'owner');
  server.addMember(GARDEN, USER_B, 'member');
  const events: SyncEvent[] = [];
  syncEvents.on((e) => events.push(e));
  return { server, a: makeDevice(server, USER_A), b: makeDevice(server, USER_B), events };
}

beforeEach(() => {
  syncEvents._reset();
});

describe('Pull follows server_updated_at', () => {
  it('fetches everything in pages, also across rows that share one stamp', async () => {
    const { server, a } = setup();
    const total = PAGE_SIZE + 37;
    const shared = server.stamp();
    for (let i = 0; i < total; i++) {
      const id = uuid(i);
      server.table('plan_elements').set(id, {
        id, garden_id: GARDEN, element_type: 'Beet', label: `B${i}`, x_m: 0, y_m: 0, width_m: 1, height_m: 1,
        confidence: null, is_accepted: true, created_at: shared, updated_at: shared, updated_by_user_id: USER_B,
        deleted_at: null, imported_from: null, provenance: null, layer: 'infrastructure',
        server_updated_at: shared, // all the same: the page boundary falls between equal stamps
      });
    }
    await a.as(() => a.worker.pull('plan_elements'));
    const rows = await a.storage.getRowsByGarden<PlanElementRow>('plan_elements', GARDEN);
    expect(rows).toHaveLength(total);
  });

  it('a second pull with nothing new changes nothing and reports no change', async () => {
    const { server, a, events } = setup();
    server.write('plan_elements', { id: uuid(1), garden_id: GARDEN, label: 'x', updated_at: server.nowIso() }, 'id', USER_B);
    await a.as(() => a.worker.pull('plan_elements'));
    const cursor = (await a.storage.getSyncState('plan_elements'))?.lastPullAt;
    events.length = 0;
    await a.as(() => a.worker.pull('plan_elements'));
    const success = events.find((e) => e.type === 'pull_success');
    expect(success).toMatchObject({ entity: 'plan_elements', changedIds: [] });
    expect((await a.storage.getSyncState('plan_elements'))?.lastPullAt).toBe(cursor);
  });

  it('SYNC3-02: an element made offline hours ago still reaches a device that pulled in between', async () => {
    const { server, a, b } = setup();
    // A makes an element at 09:00 without a connection.
    await a.write(element(uuid(1), { label: 'offline angelegt', updatedAt: '2026-11-14T09:00:00.000Z' }));
    // B is online at 10:00 and pulls. Nothing there yet.
    await b.as(() => b.worker.pullAll());
    expect(await b.element(uuid(1))).toBeNull();
    // A gets a connection at 12:00 and pushes the 09:00 edit.
    server.advance(2 * 3600_000);
    await a.as(() => a.worker.push());
    // B pulls again. Its cursor is from 10:00, the edit time is 09:00.
    await b.as(() => b.worker.pull('plan_elements'));
    const arrived = await b.element(uuid(1));
    expect(arrived?.label).toBe('offline angelegt');
    expect(arrived?.updatedAt).toContain('2026-11-14T09:00:00');
  });

  it('reports whose changes arrived', async () => {
    const { a, b, events } = setup();
    await b.write(element(uuid(1), { updatedByUserId: USER_B, updatedAt: '2026-11-14T10:00:00.000Z' }));
    await b.as(() => b.worker.push());
    events.length = 0;
    await a.as(() => a.worker.pull('plan_elements'));
    expect(events.find((e) => e.type === 'pull_success')).toMatchObject({
      changedIds: [uuid(1)],
      foreignUserIds: [USER_B],
    });
  });

  it('SYNC3-08: a deleted element disappears on the other device', async () => {
    const { a, b } = setup();
    await a.write(element(uuid(1), { updatedAt: '2026-11-14T10:00:00.000Z' }));
    await a.as(() => a.worker.push());
    await b.as(() => b.worker.pull('plan_elements'));
    expect(await b.storage.getRowsByGarden('plan_elements', GARDEN)).toHaveLength(1);
    await a.write(element(uuid(1), { deletedAt: '2026-11-14T10:05:00.000Z', updatedAt: '2026-11-14T10:05:00.000Z' }));
    await a.as(() => a.worker.push());
    await b.as(() => b.worker.pull('plan_elements'));
    expect(await b.storage.getRowsByGarden('plan_elements', GARDEN)).toHaveLength(0);
  });
});

describe('The later edit wins (SYNC3-03)', () => {
  it('whoever syncs first: both devices end with the later edit', async () => {
    for (const firstToSync of ['earlier', 'later'] as const) {
      syncEvents._reset();
      const { a, b, events } = setup();
      await a.write(element(uuid(1), { label: 'Start', updatedAt: '2026-11-14T10:00:00.000Z' }));
      await a.as(() => a.worker.push());
      await b.as(() => b.worker.pull('plan_elements'));
      // Both change it offline. B at 10:10, A at 10:20 (the later edit).
      await b.write(element(uuid(1), { label: 'von B', updatedAt: '2026-11-14T10:10:00.000Z', updatedByUserId: USER_B }));
      await a.write(element(uuid(1), { label: 'von A', updatedAt: '2026-11-14T10:20:00.000Z', updatedByUserId: USER_A }));

      const order = firstToSync === 'earlier' ? [b, a] : [a, b];
      for (const device of order) await device.as(() => device.worker.syncAll());
      for (const device of [a, b]) await device.as(() => device.worker.syncAll());

      expect((await a.element(uuid(1)))?.label).toBe('von A');
      expect((await b.element(uuid(1)))?.label).toBe('von A');
      expect(await a.outbox()).toHaveLength(0);
      expect(await b.outbox()).toHaveLength(0);
      if (firstToSync === 'later') {
        // B came second with the older edit: it is told whose change it now shows.
        expect(events.find((e) => e.type === 'conflict_resolved')).toMatchObject({
          entity: 'plan_elements', rowId: uuid(1), winnerUserId: USER_A,
        });
      }
    }
  });

  it('a pull never replaces a row whose local change is still waiting', async () => {
    const { a, b } = setup();
    await a.write(element(uuid(1), { label: 'Start', updatedAt: '2026-11-14T10:00:00.000Z' }));
    await a.as(() => a.worker.push());
    await b.as(() => b.worker.pull('plan_elements'));
    await a.write(element(uuid(1), { label: 'neuer von A', updatedAt: '2026-11-14T10:30:00.000Z' }));
    await a.as(() => a.worker.push());
    // B has an older edit waiting and pulls before it pushes.
    await b.write(element(uuid(1), { label: 'wartet bei B', updatedAt: '2026-11-14T10:10:00.000Z', updatedByUserId: USER_B }));
    await b.as(() => b.worker.pull('plan_elements'));
    expect((await b.element(uuid(1)))?.label).toBe('wartet bei B');
    // When it pushes, the server refuses the older edit and B takes A's.
    await b.as(() => b.worker.push());
    expect((await b.element(uuid(1)))?.label).toBe('neuer von A');
  });

  it('a pull does not replace a row that was edited later on this device', async () => {
    const { server, a, b } = setup();
    await b.write(element(uuid(1), { label: 'alt', updatedAt: '2026-11-14T10:00:00.000Z', updatedByUserId: USER_B }));
    await b.as(() => b.worker.push());
    // A holds a later edit that already left its outbox (push answered, echo not yet pulled).
    await a.storage.upsertRowFromServer('plan_elements', element(uuid(1), { label: 'später bei A', updatedAt: '2026-11-14T11:00:00.000Z' }));
    server.advance(1000);
    await a.as(() => a.worker.pull('plan_elements'));
    expect((await a.element(uuid(1)))?.label).toBe('später bei A');
  });
});

describe('The outbox (SYNC3-09)', () => {
  it('keeps one entry per row: the newest snapshot', async () => {
    const { a, server } = setup();
    for (const label of ['eins', 'zwei', 'drei']) {
      await a.write(element(uuid(1), { label, updatedAt: `2026-11-14T10:0${label.length}:00.000Z` }));
    }
    const outbox = await a.outbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]!.payload['label']).toBe('drei');
    const before = server.requests;
    await a.as(() => a.worker.push());
    expect(server.requests - before).toBe(1);
  });

  it('an entry that can never succeed is marked failed at once and does not hold up the rest', async () => {
    const { server, a, events } = setup();
    await a.write(element(uuid(1), { label: 'kaputt', updatedAt: '2026-11-14T10:00:00.000Z' }));
    await a.write(element(uuid(2), { label: 'gut', updatedAt: '2026-11-14T10:00:01.000Z' }));
    server.writeErrors.set('plan_elements', [{ code: '23514', message: 'violates check constraint' }]);
    await a.as(() => a.worker.push());
    const outbox = await a.outbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ rowId: uuid(1), attempts: MAX_ATTEMPTS });
    expect(outbox[0]!.lastError).toContain('23514');
    expect(server.table('plan_elements').has(uuid(2))).toBe(true);
    expect(events.some((e) => e.type === 'push_permanent_failure')).toBe(true);
    // It is not tried again by itself.
    const before = server.requests;
    await a.as(() => a.worker.push());
    expect(server.requests).toBe(before);
  });

  it('being offline does not count against an entry', async () => {
    const { server, a } = setup();
    await a.write(element(uuid(1), { updatedAt: '2026-11-14T10:00:00.000Z' }));
    await a.write(element(uuid(2), { updatedAt: '2026-11-14T10:00:01.000Z' }));
    server.offline = true;
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) await a.as(() => a.worker.push());
    const waiting = await a.outbox();
    expect(waiting).toHaveLength(2);
    expect(waiting.every((e) => e.attempts === 0)).toBe(true);
    server.offline = false;
    await a.as(() => a.worker.push());
    expect(await a.outbox()).toHaveLength(0);
  });

  it('a passing server error is retried, but not before its time', async () => {
    const { server, a } = setup();
    await a.write(element(uuid(1), { updatedAt: '2026-11-14T10:00:00.000Z' }));
    server.writeErrors.set('plan_elements', [{ code: '57014', message: 'statement timeout' }]);
    await a.as(() => a.worker.push());
    const [entry] = await a.outbox();
    expect(entry).toMatchObject({ attempts: 1 });
    expect(entry!.nextAttemptAt).toBeTruthy();
    // Too early: nothing is sent.
    const before = server.requests;
    a.clock.now = Date.parse(entry!.nextAttemptAt!) - 1;
    await a.as(() => a.worker.push());
    expect(server.requests).toBe(before);
    // Time has come.
    a.clock.now = Date.parse(entry!.nextAttemptAt!) + 1;
    await a.as(() => a.worker.push());
    expect(await a.outbox()).toHaveLength(0);
  });

  it('retryOp makes a failed entry due again', async () => {
    const { server, a } = setup();
    await a.write(element(uuid(1), { updatedAt: '2026-11-14T10:00:00.000Z' }));
    server.writeErrors.set('plan_elements', [{ code: '42501', message: 'row-level security' }]);
    await a.as(() => a.worker.push());
    const [failed] = await a.outbox();
    expect(failed!.attempts).toBe(MAX_ATTEMPTS);
    await a.as(() => a.worker.retryOp(failed!.id));
    expect(await a.outbox()).toHaveLength(0);
    expect(server.table('plan_elements').has(uuid(1))).toBe(true);
  });

  it('discardOp brings the server version back', async () => {
    const { server, a, b } = setup();
    await b.write(element(uuid(1), { label: 'Server-Stand', updatedAt: '2026-11-14T10:00:00.000Z', updatedByUserId: USER_B }));
    await b.as(() => b.worker.push());
    await a.as(() => a.worker.pull('plan_elements'));
    await a.write(element(uuid(1), { label: 'lokal, scheitert', updatedAt: '2026-11-14T11:00:00.000Z' }));
    server.writeErrors.set('plan_elements', [{ code: '23514', message: 'check' }]);
    await a.as(() => a.worker.push());
    const [failed] = await a.outbox();
    await a.as(() => a.worker.discardOp(failed!.id));
    expect(await a.outbox()).toHaveLength(0);
    // The local row had the later edit time; the server version still has to win here.
    expect((await a.element(uuid(1)))?.label).toBe('Server-Stand');
  });

  it('discardOp removes a row the server never had', async () => {
    const { server, a } = setup();
    await a.write(element(uuid(1), { label: 'nur lokal', updatedAt: '2026-11-14T10:00:00.000Z' }));
    server.writeErrors.set('plan_elements', [{ code: '23514', message: 'check' }]);
    await a.as(() => a.worker.push());
    const [failed] = await a.outbox();
    await a.as(() => a.worker.discardOp(failed!.id));
    expect(await a.storage.getRowsByGarden('plan_elements', GARDEN)).toHaveLength(0);
  });

  it('a write during a running push is sent by the same push', async () => {
    const { a, server } = setup();
    await a.write(element(uuid(1), { updatedAt: '2026-11-14T10:00:00.000Z' }));
    const running = a.as(() => a.worker.push());
    await a.write(element(uuid(2), { updatedAt: '2026-11-14T10:00:01.000Z' }));
    void a.worker.push(); // what the write trigger does; returns at once
    await running;
    expect(await a.outbox()).toHaveLength(0);
    expect(server.table('plan_elements').size).toBe(2);
  });
});

describe('Members and invite codes (SYNC3-08)', () => {
  it('a removed member disappears on the other device', async () => {
    const { server, a } = setup();
    await a.as(() => a.worker.pull('garden_members'));
    expect(await a.storage.getRowsByGarden<GardenMemberRow>('garden_members', GARDEN)).toHaveLength(2);
    server.removeMember(GARDEN, USER_B);
    await a.as(() => a.worker.pull('garden_members'));
    const members = await a.storage.getRowsByGarden<GardenMemberRow>('garden_members', GARDEN);
    expect(members.map((m) => m.userId)).toEqual([USER_A]);
  });

  it('the removed member is told, once the server confirms who is signed in', async () => {
    const { server, b, events } = setup();
    await b.as(() => b.worker.pull('garden_members'));
    server.removeMember(GARDEN, USER_B);
    await b.as(() => b.worker.pull('garden_members'));
    expect(events.find((e) => e.type === 'membership_lost')).toMatchObject({ gardenId: GARDEN });
  });

  it('an empty answer without a valid session is an error, not a removal', async () => {
    const { server, b, events } = setup();
    server.removeMember(GARDEN, USER_B); // same empty answer as an expired session would get
    server.sessions.set(USER_B, null);
    await expect(b.as(() => b.worker.pull('garden_members'))).rejects.toThrow('not_authenticated');
    expect(events.some((e) => e.type === 'membership_lost')).toBe(false);
  });

  it('a used invite code is replaced on the other device', async () => {
    const { server, a } = setup();
    const code = {
      id: uuid(900), garden_id: GARDEN, code: 'ABC123', created_by_user_id: USER_A, consumed_at: null,
      consumed_by_user_id: null, expires_at: '2026-11-15T10:00:00.000Z', created_at: server.nowIso(),
      server_updated_at: server.stamp(),
    };
    server.table('invite_codes').set(code.id, code);
    await a.as(() => a.worker.pull('invite_codes'));
    let stored = await a.storage.getRowsByGarden<InviteCodeRow>('invite_codes', GARDEN);
    expect(stored[0]?.usedAt).toBeNull();
    Object.assign(code, { consumed_at: server.nowIso(), consumed_by_user_id: USER_B });
    await a.as(() => a.worker.pull('invite_codes'));
    stored = await a.storage.getRowsByGarden<InviteCodeRow>('invite_codes', GARDEN);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.usedAt).not.toBeNull();
  });
});
