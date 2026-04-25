// gardenRepo offline tests — Plan 03-03 Task 02.
// TDD RED: written BEFORE repo refactor exists.
// Tests cover SYNC-01 (offline read from local Row-Table) and
// SYNC-02 (offline write → local + Outbox).

// Set Supabase env BEFORE any import that transitively pulls in ./supabase.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import type { GardenRow, Garden } from '@spatenstich/shared';

// ── Mocks ────────────────────────────────────────────────────────────────

const mockStorageGetRow = jest.fn();
const mockStorageWriteWithOutbox = jest.fn();
const mockStorageUpsertRowFromServer = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    getRow: (...a: unknown[]) => mockStorageGetRow(...a),
    writeWithOutbox: (...a: unknown[]) => mockStorageWriteWithOutbox(...a),
    upsertRowFromServer: (...a: unknown[]) => mockStorageUpsertRowFromServer(...a),
    getRowsByGarden: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock NetInfo — offline by default
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({ isConnected: false, isInternetReachable: false }),
  },
}));

const GARDEN_ROW: GardenRow = {
  id: 'g-1',
  name: 'Dirks Garten',
  ownerUserId: 'u-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-04-24T10:00:00Z',
  updatedByUserId: 'u-1',
  deletedAt: null,
};

// Lazy import AFTER mocks
import * as repo from '../gardenRepo';
import { OutboxEnqueueError } from '../errors';

beforeEach(() => {
  jest.clearAllMocks();
  // Default: offline — reset via module registry (avoids direct import of uninstalled pkg)
  const mockNetInfo = jest.requireMock('@react-native-community/netinfo') as {
    default: { fetch: jest.Mock };
  };
  mockNetInfo.default.fetch.mockResolvedValue({
    isConnected: false,
    isInternetReachable: false,
  });
});

// ── Test 1: loadGarden reads from local Row-Table ─────────────────────────
describe('gardenRepo.loadGarden (offline-first)', () => {
  it('returns local Row when available (NO Supabase call)', async () => {
    mockStorageGetRow.mockResolvedValue(GARDEN_ROW);

    const garden = await repo.loadGarden('account', 'g-1');

    expect(garden).not.toBeNull();
    expect(garden?.name).toBe('Dirks Garten');
    expect(garden?.id).toBe('g-1');
    // Supabase should NOT be called when local row exists
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('falls back to Supabase when local row is missing', async () => {
    mockStorageGetRow.mockResolvedValue(null);
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'g-1',
        name: 'Remote Garten',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-04-24T10:00:00Z',
        updated_by_user_id: 'u-1',
        created_by_user_id: 'u-1',
        plz: null,
        klimazone: null,
        archetype: null,
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const garden = await repo.loadGarden('account', 'g-1');

    expect(garden?.name).toBe('Remote Garten');
    expect(mockFrom).toHaveBeenCalledWith('gardens');
    expect(mockStorageUpsertRowFromServer).toHaveBeenCalledTimes(1);
  });

  it('returns null when no local row and Supabase returns null', async () => {
    mockStorageGetRow.mockResolvedValue(null);
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const result = await repo.loadGarden('account', 'g-1');
    expect(result).toBeNull();
  });
});

// ── Test 2: updateGarden writes locally + Outbox ──────────────────────────
describe('gardenRepo.updateGarden (offline-first write)', () => {
  it('writes to local Row-Table + creates Outbox entry (offline scenario)', async () => {
    mockStorageGetRow.mockResolvedValue(GARDEN_ROW);
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await repo.updateGarden('account', 'g-1', 'u-1', { name: 'Neuer Name' });

    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);
    const [entity, row, outbox] = mockStorageWriteWithOutbox.mock.calls[0] as [
      string,
      GardenRow,
      { entity: string; rowId: string; operation: string; payload: unknown },
    ];
    expect(entity).toBe('gardens');
    expect(row.name).toBe('Neuer Name');
    expect(row.updatedByUserId).toBe('u-1');
    expect(outbox.entity).toBe('gardens');
    expect(outbox.rowId).toBe('g-1');
    expect(outbox.operation).toBe('update');
    // Supabase must NOT be called directly for the update
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('creates insert Outbox entry when no existing row found', async () => {
    mockStorageGetRow.mockResolvedValue(null);
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await repo.updateGarden('account', 'g-new', 'u-1', { name: 'Neuer Garten' });

    const [, , outbox] = mockStorageWriteWithOutbox.mock.calls[0] as [
      string,
      GardenRow,
      { operation: string },
    ];
    expect(outbox.operation).toBe('insert');
  });
});

// ── Test 3: writeWithOutbox failure → OutboxEnqueueError ─────────────────
describe('gardenRepo.updateGarden (atomic failure)', () => {
  it('throws OutboxEnqueueError when writeWithOutbox fails', async () => {
    mockStorageGetRow.mockResolvedValue(GARDEN_ROW);
    mockStorageWriteWithOutbox.mockRejectedValue(new Error('tx failed'));

    await expect(
      repo.updateGarden('account', 'g-1', 'u-1', { name: 'X' }),
    ).rejects.toBeInstanceOf(OutboxEnqueueError);
  });
});

// ── Test 10: Typed Domain Errors re-exported ─────────────────────────────
describe('gardenRepo typed domain errors (re-export compat)', () => {
  it('exports NotOwnerError from gardenRepo (backward compat)', () => {
    const { NotOwnerError: NOE } = require('../gardenRepo');
    expect(NOE).toBeDefined();
    const err = new NOE();
    expect(err.code).toBe('NOT_OWNER');
  });

  it('exports GardenHasMembersError from gardenRepo', () => {
    const { GardenHasMembersError: GHME } = require('../gardenRepo');
    expect(GHME).toBeDefined();
  });
});
