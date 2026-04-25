// gardenRepo unit tests — Plan 02.5-03 Task 02 (converts Wave-0 it.todo stubs).
// Pattern: vereinsregelnRepo.test.ts — jest.mock('../supabase') with chained-call spies.
// D-16 Owner-Rights coverage: deleteGarden (4 cases) + transferOwnership (5 cases).
// Phase 3 Plan 03-03: updated to match offline-first refactor — storage-first reads + writeWithOutbox.
//
// NOTE: Project uses Jest (not Vitest) — see app/package.json devDependencies.
// describe/it are globals provided by jest-expo; no explicit import needed.

// Set Supabase env BEFORE any import that transitively pulls in ./supabase.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

// ── Mocks ───────────────────────────────────────────────────────────────
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const mockStorageGetRow = jest.fn();
const mockStorageGetRowsByGarden = jest.fn();
const mockStorageWriteWithOutbox = jest.fn();
const mockStorageUpsertRowFromServer = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    getRow: (...a: unknown[]) => mockStorageGetRow(...a),
    getRowsByGarden: (...a: unknown[]) => mockStorageGetRowsByGarden(...a),
    writeWithOutbox: (...a: unknown[]) => mockStorageWriteWithOutbox(...a),
    upsertRowFromServer: (...a: unknown[]) => mockStorageUpsertRowFromServer(...a),
  },
}));

// Mock NetInfo — online by default (removeMember, deleteGarden, transferOwnership are online-only)
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    }),
  },
}));

// Lazy import AFTER mocks.
import * as repo from '../gardenRepo';
import {
  NotOwnerError,
  GardenHasMembersError,
  CannotTransferToSelfError,
  TargetNotMemberError,
} from '../gardenRepo';
import type { GardenRow } from '@spatenstich/shared';

const GARDEN_ROW: GardenRow = {
  id: 'g-1',
  name: 'Dirk Garten',
  ownerUserId: 'u-1',
  createdAt: '2026-04-23T10:00:00Z',
  updatedAt: '2026-04-23T10:00:00Z',
  updatedByUserId: 'u-1',
  deletedAt: null,
};

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
  mockStorageGetRow.mockReset();
  mockStorageGetRowsByGarden.mockReset();
  mockStorageWriteWithOutbox.mockReset();
  mockStorageUpsertRowFromServer.mockReset();
  // Default: online
  const netinfo = jest.requireMock('@react-native-community/netinfo') as {
    default: { fetch: jest.Mock };
  };
  netinfo.default.fetch.mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  });
});

// Helper: install a `from(...).select(...).eq(...).maybeSingle()` chain that
// resolves with the given row/error.
function mockSingleSelect(row: unknown, error: unknown = null): void {
  const maybeSingle = jest.fn().mockResolvedValue({ data: row, error });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  mockFrom.mockReturnValue({ select });
}

describe('gardenRepo.loadGarden', () => {
  it('throws when mode !== account', async () => {
    await expect(repo.loadGarden('local', 'g-1')).rejects.toThrow(
      'gardens are account-only',
    );
  });

  it('throws when mode is null (Not authenticated semantics)', async () => {
    await expect(repo.loadGarden(null, 'g-1')).rejects.toThrow(
      'gardens are account-only',
    );
  });

  it('returns Garden on success (local Row read, no Supabase call)', async () => {
    // Offline-first: local Row present — no Supabase call
    mockStorageGetRow.mockResolvedValue({
      ...GARDEN_ROW,
      plz: '12043',
      klimazone: 4,
      archetype: 'selbstversorger',
    });

    const g = await repo.loadGarden('account', 'g-1');
    expect(g).not.toBeNull();
    expect(g?.name).toBe('Dirk Garten');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('falls back to Supabase when local row is missing (maps snake→camel)', async () => {
    mockStorageGetRow.mockResolvedValue(null);
    mockStorageUpsertRowFromServer.mockResolvedValue(undefined);
    mockSingleSelect({
      id: 'g-1',
      name: 'Dirk Garten',
      plz: '12043',
      klimazone: 4,
      archetype: 'selbstversorger',
      created_by_user_id: 'u-1',
      updated_by_user_id: 'u-1',
      created_at: '2026-04-23T10:00:00Z',
      updated_at: '2026-04-23T10:00:00Z',
    });

    const g = await repo.loadGarden('account', 'g-1');
    expect(g).not.toBeNull();
    expect(g?.name).toBe('Dirk Garten');
    expect(g?.createdByUserId).toBe('u-1');
    expect(mockFrom).toHaveBeenCalledWith('gardens');
    expect(mockStorageUpsertRowFromServer).toHaveBeenCalledTimes(1);
  });

  it('returns null when row not found (RLS rejected / maybeSingle)', async () => {
    mockStorageGetRow.mockResolvedValue(null);
    mockSingleSelect(null);
    const g = await repo.loadGarden('account', 'g-missing');
    expect(g).toBeNull();
  });

  it('throws on unexpected supabase error', async () => {
    mockStorageGetRow.mockResolvedValue(null);
    mockSingleSelect(null, { code: '500', message: 'boom' });
    await expect(repo.loadGarden('account', 'g-1')).rejects.toMatchObject({
      code: '500',
    });
  });
});

describe('gardenRepo.loadMembers', () => {
  it('throws when mode !== account', async () => {
    await expect(repo.loadMembers('local', 'g-1')).rejects.toThrow(
      'gardens are account-only',
    );
  });

  it('returns flat member list with display names from profiles embed (Supabase fallback when local empty)', async () => {
    // No local members — falls back to Supabase
    mockStorageGetRowsByGarden.mockResolvedValue([]);

    const eq = jest.fn().mockResolvedValue({
      data: [
        {
          garden_id: 'g-1',
          user_id: 'u-1',
          role: 'owner',
          joined_at: '2026-04-23T10:00:00Z',
          profile: { display_name: 'Dirk' },
        },
        {
          garden_id: 'g-1',
          user_id: 'u-2',
          role: 'member',
          joined_at: '2026-04-23T11:00:00Z',
          profile: { display_name: 'Petra' },
        },
      ],
      error: null,
    });
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const members = await repo.loadMembers('account', 'g-1');
    expect(members).toHaveLength(2);
    expect(members[0]!.displayName).toBe('Dirk');
    expect(members[0]!.role).toBe('owner');
    expect(members[1]!.role).toBe('member');
    expect(members[1]!.displayName).toBe('Petra');
  });

  it('returns empty array when no members', async () => {
    mockStorageGetRowsByGarden.mockResolvedValue([]);
    const eq = jest.fn().mockResolvedValue({ data: [], error: null });
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const members = await repo.loadMembers('account', 'g-1');
    expect(members).toEqual([]);
  });
});

describe('gardenRepo.updateGarden', () => {
  it('throws when mode !== account', async () => {
    await expect(
      repo.updateGarden('local', 'g-1', 'u-1', { name: 'X' }),
    ).rejects.toThrow('gardens are account-only');
  });

  it('writes via writeWithOutbox with updated fields stamped (Pattern 6)', async () => {
    // Existing row present → operation='update'
    mockStorageGetRow.mockResolvedValue(GARDEN_ROW);
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await repo.updateGarden('account', 'g-1', 'u-1', {
      name: 'Dirks neuer Garten',
      plz: '99999',
    });

    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);
    const [entity, row, outbox] = mockStorageWriteWithOutbox.mock.calls[0] as [
      string,
      GardenRow & { plz?: string },
      { entity: string; rowId: string; operation: string; payload: unknown },
    ];
    expect(entity).toBe('gardens');
    expect(row.name).toBe('Dirks neuer Garten');
    expect(row.plz).toBe('99999');
    expect(row.updatedByUserId).toBe('u-1');
    expect(outbox.entity).toBe('gardens');
    expect(outbox.rowId).toBe('g-1');
    expect(outbox.operation).toBe('update');
    // Supabase must NOT be called for updateGarden
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('gardenRepo.removeMember', () => {
  it('throws when mode !== account', async () => {
    await expect(repo.removeMember('local', 'g-1', 'u-2')).rejects.toThrow(
      'gardens are account-only',
    );
  });

  it('issues double-equality delete (garden_id + user_id)', async () => {
    const eq2 = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq1 = jest.fn(() => ({ eq: eq2 }));
    const del = jest.fn(() => ({ eq: eq1 }));
    mockFrom.mockReturnValue({ delete: del });

    await repo.removeMember('account', 'g-1', 'u-2');

    expect(eq1).toHaveBeenCalledWith('garden_id', 'g-1');
    expect(eq2).toHaveBeenCalledWith('user_id', 'u-2');
  });
});

describe('gardenRepo.leaveGarden', () => {
  it('delegates to removeMember (same delete path)', async () => {
    const eq2 = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq1 = jest.fn(() => ({ eq: eq2 }));
    const del = jest.fn(() => ({ eq: eq1 }));
    mockFrom.mockReturnValue({ delete: del });

    await repo.leaveGarden('account', 'g-1', 'u-self');

    expect(eq1).toHaveBeenCalledWith('garden_id', 'g-1');
    expect(eq2).toHaveBeenCalledWith('user_id', 'u-self');
  });
});

// ── D-16: deleteGarden ────────────────────────────────────────────────────
describe('gardenRepo.deleteGarden [D-16]', () => {
  it('throws when mode !== account', async () => {
    await expect(repo.deleteGarden('local', 'g-1')).rejects.toThrow(
      'gardens are account-only',
    );
  });

  it('calls delete_garden RPC with p_garden_id on success', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await repo.deleteGarden('account', 'g-1');
    expect(mockRpc).toHaveBeenCalledWith('delete_garden', {
      p_garden_id: 'g-1',
    });
  });

  it('throws GardenHasMembersError when RPC returns SQLSTATE P9003 (WR-04 custom code)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P9003', message: 'garden_has_members' },
    });
    await expect(repo.deleteGarden('account', 'g-1')).rejects.toBeInstanceOf(
      GardenHasMembersError,
    );
  });

  it('throws GardenHasMembersError when RPC returns legacy P0003 (pre-migration-010)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P0003', message: 'garden_has_members' },
    });
    await expect(repo.deleteGarden('account', 'g-1')).rejects.toBeInstanceOf(
      GardenHasMembersError,
    );
  });

  it('throws NotOwnerError when RPC returns SQLSTATE 42501', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'not_owner' },
    });
    await expect(repo.deleteGarden('account', 'g-1')).rejects.toBeInstanceOf(
      NotOwnerError,
    );
  });
});

// ── D-16: transferOwnership ────────────────────────────────────────────────
describe('gardenRepo.transferOwnership [D-16]', () => {
  it('throws when mode !== account', async () => {
    await expect(
      repo.transferOwnership('local', 'g-1', 'u-2'),
    ).rejects.toThrow('gardens are account-only');
  });

  it('calls transfer_ownership RPC with p_garden_id + p_to_user_id on success', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await repo.transferOwnership('account', 'g-1', 'u-2');
    expect(mockRpc).toHaveBeenCalledWith('transfer_ownership', {
      p_garden_id: 'g-1',
      p_to_user_id: 'u-2',
    });
  });

  it('throws NotOwnerError for SQLSTATE 42501', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'not_owner' },
    });
    await expect(
      repo.transferOwnership('account', 'g-1', 'u-2'),
    ).rejects.toBeInstanceOf(NotOwnerError);
  });

  it('throws CannotTransferToSelfError for SQLSTATE P9004 (WR-04 custom code)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P9004', message: 'cannot_transfer_to_self' },
    });
    await expect(
      repo.transferOwnership('account', 'g-1', 'u-1'),
    ).rejects.toBeInstanceOf(CannotTransferToSelfError);
  });

  it('throws CannotTransferToSelfError for legacy P0004 (pre-migration-010)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P0004', message: 'cannot_transfer_to_self' },
    });
    await expect(
      repo.transferOwnership('account', 'g-1', 'u-1'),
    ).rejects.toBeInstanceOf(CannotTransferToSelfError);
  });

  it('throws TargetNotMemberError for SQLSTATE P9005 (WR-04 custom code)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P9005', message: 'target_not_member' },
    });
    await expect(
      repo.transferOwnership('account', 'g-1', 'u-99'),
    ).rejects.toBeInstanceOf(TargetNotMemberError);
  });

  it('throws TargetNotMemberError for legacy P0005 (pre-migration-010)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P0005', message: 'target_not_member' },
    });
    await expect(
      repo.transferOwnership('account', 'g-1', 'u-99'),
    ).rejects.toBeInstanceOf(TargetNotMemberError);
  });
});
