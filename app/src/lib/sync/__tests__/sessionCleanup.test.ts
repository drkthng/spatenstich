// Phase 33 (SYNC3-07): nothing of one account stays on the device for the next one,
// and signing out knows what would be lost.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: { getState: () => ({ userId: 'user-a', activeGardenId: 'g-1', mode: 'account' }) },
}));
jest.mock('../../supabase', () => ({ supabase: {} }));
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: Record<string, unknown>) => obj['web'] ?? obj['default'] },
  AppState: { addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }), currentState: 'active' },
}));
jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: jest.fn().mockReturnValue(() => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

import type { GardenRow } from '@spatenstich/shared';
import { IndexedDbAdapter } from '../../../storage/IndexedDbAdapter';
import {
  ensureSyncScope,
  clearLocalAccountData,
  countUnsyncedChanges,
  SYNC_SCOPE_KEY,
} from '../sessionCleanup';
import { useProfileStore } from '../../../stores/profileStore';

let n = 0;
const newStorage = () => new IndexedDbAdapter(`cleanup-${Date.now()}-${n++}`);

const garden = (id: string): GardenRow => ({
  id,
  createdAt: '2026-11-14T10:00:00.000Z',
  updatedAt: '2026-11-14T10:00:00.000Z',
  updatedByUserId: 'user-a',
  deletedAt: null,
  name: 'Garten',
  ownerUserId: 'user-a',
});

async function seed(storage: IndexedDbAdapter): Promise<void> {
  const row = garden('g-1');
  await storage.writeWithOutbox('gardens', row, {
    entity: 'gardens', rowId: row.id, operation: 'update', payload: row as unknown as Record<string, unknown>,
  });
  await storage.setSyncState({ entity: 'gardens', lastPullAt: 'x', lastPushAt: null });
}

describe('ensureSyncScope', () => {
  it('a device without a stored scope keeps its data (update from before Phase 33)', async () => {
    const storage = newStorage();
    await seed(storage);
    expect(await ensureSyncScope('user-a', 'g-1', storage)).toBe('first');
    expect(await storage.getRow('gardens', 'g-1')).toBeTruthy();
    expect(await storage.listOutboxEntries()).toHaveLength(1);
  });

  it('the same user in the same garden changes nothing', async () => {
    const storage = newStorage();
    await ensureSyncScope('user-a', 'g-1', storage);
    await seed(storage);
    expect(await ensureSyncScope('user-a', 'g-1', storage)).toBe('same');
    expect(await storage.getRow('gardens', 'g-1')).toBeTruthy();
  });

  it('another user finds nothing of the previous one', async () => {
    const storage = newStorage();
    await ensureSyncScope('user-a', 'g-1', storage);
    await seed(storage);
    expect(await ensureSyncScope('user-b', 'g-2', storage)).toBe('new_user');
    expect(await storage.getAllRows('gardens', { includeDeleted: true })).toHaveLength(0);
    expect(await storage.listOutboxEntries()).toHaveLength(0);
    expect(await storage.getSyncState('gardens')).toBeNull();
    expect(JSON.parse((await storage.get(SYNC_SCOPE_KEY))!)).toEqual({ userId: 'user-b', gardenId: 'g-2' });
  });

  it('the same user in another garden starts clean too', async () => {
    const storage = newStorage();
    await ensureSyncScope('user-a', 'g-1', storage);
    await seed(storage);
    expect(await ensureSyncScope('user-a', 'g-9', storage)).toBe('new_garden');
    expect(await storage.getAllRows('gardens', { includeDeleted: true })).toHaveLength(0);
  });
});

describe('signing out', () => {
  it('counts what the server does not have yet', async () => {
    const storage = newStorage();
    expect(await countUnsyncedChanges(storage)).toBe(0);
    await seed(storage);
    expect(await countUnsyncedChanges(storage)).toBe(1);
  });

  it('clears rows, outbox, cursors, scope and what the screens hold in memory', async () => {
    const storage = newStorage();
    await ensureSyncScope('user-a', 'g-1', storage);
    await seed(storage);
    useProfileStore.setState({ plz: '10115', klimazone: 7 as never });
    await clearLocalAccountData(storage);
    expect(await storage.getAllRows('gardens', { includeDeleted: true })).toHaveLength(0);
    expect(await storage.listOutboxEntries()).toHaveLength(0);
    expect(await storage.get(SYNC_SCOPE_KEY)).toBeNull();
    expect(useProfileStore.getState().plz).toBeNull();
  });
});
