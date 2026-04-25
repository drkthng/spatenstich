// profileRepo offline tests — Plan 03-03 Task 02.
// TDD RED: written BEFORE repo refactor exists.
// Tests cover account-mode offline reads + writes via ProfileRow + Outbox.

// Set Supabase env BEFORE any import that transitively pulls in ./supabase.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import type { ProfileRow } from '@spatenstich/shared';

// ── Mocks ────────────────────────────────────────────────────────────────

const mockStorageGetRow = jest.fn();
const mockStorageWriteWithOutbox = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageGet = jest.fn();
const mockStorageUpsertRowFromServer = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    getRow: (...a: unknown[]) => mockStorageGetRow(...a),
    writeWithOutbox: (...a: unknown[]) => mockStorageWriteWithOutbox(...a),
    set: (...a: unknown[]) => mockStorageSet(...a),
    get: (...a: unknown[]) => mockStorageGet(...a),
    upsertRowFromServer: (...a: unknown[]) => mockStorageUpsertRowFromServer(...a),
  },
}));

jest.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockGetState = jest.fn();
jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}));

const USER_ID = 'u-1';

const PROFILE_ROW: ProfileRow = {
  id: USER_ID,
  userId: USER_ID,
  displayName: 'Dirk',
  locale: 'de',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-04-24T10:00:00Z',
  updatedByUserId: USER_ID,
  deletedAt: null,
};

// Lazy import AFTER mocks
import * as repo from '../profileRepo';
import { OutboxEnqueueError } from '../errors';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetState.mockReturnValue({
    mode: 'account',
    userId: USER_ID,
  });
});

// ── Test 7: loadProfile in account-mode reads local ProfileRow ────────────
describe('profileRepo.loadProfile (account-mode, offline-first)', () => {
  it('returns profile from local ProfileRow (no Supabase call)', async () => {
    mockStorageGetRow.mockResolvedValue(PROFILE_ROW);

    const profile = await repo.loadProfile();

    expect(profile).not.toBeNull();
    expect(profile?.userId).toBe(USER_ID);
    expect(profile?.displayName).toBe('Dirk');
    expect(profile?.mode).toBe('account');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('falls back to Supabase when local row missing', async () => {
    mockStorageGetRow.mockResolvedValue(null);
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: USER_ID,
        display_name: 'Remote Dirk',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-04-24T10:00:00Z',
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const profile = await repo.loadProfile();

    expect(profile?.displayName).toBe('Remote Dirk');
    expect(mockStorageUpsertRowFromServer).toHaveBeenCalledTimes(1);
  });

  it('returns null in account-mode when no userId in store', async () => {
    mockGetState.mockReturnValue({ mode: null, userId: null });

    const result = await repo.loadProfile();
    expect(result).toBeNull();
  });

  it('reads KV blob in local mode (unverändert)', async () => {
    mockGetState.mockReturnValue({ mode: 'local', userId: USER_ID });
    mockStorageGet.mockResolvedValue(
      JSON.stringify({ userId: USER_ID, displayName: 'Local Dirk', mode: 'local' }),
    );

    const profile = await repo.loadProfile();

    expect(profile?.displayName).toBe('Local Dirk');
    expect(mockStorageGetRow).not.toHaveBeenCalled();
  });
});

// ── Test 8: saveProfile creates Outbox entry ─────────────────────────────
describe('profileRepo.saveProfile (account-mode, offline write)', () => {
  it('writes ProfileRow to local storage + creates Outbox entry for profiles entity', async () => {
    mockStorageGetRow.mockResolvedValue(PROFILE_ROW);
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await repo.saveProfile({ displayName: 'Neuer Name' });

    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);
    const [entity, row, outbox] = mockStorageWriteWithOutbox.mock.calls[0] as [
      string,
      ProfileRow,
      { entity: string; rowId: string; operation: string },
    ];
    expect(entity).toBe('profiles');
    expect(row.userId).toBe(USER_ID);
    expect(row.displayName).toBe('Neuer Name');
    expect(outbox.entity).toBe('profiles');
    expect(outbox.rowId).toBe(USER_ID);
    // No direct Supabase call
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws OutboxEnqueueError when writeWithOutbox fails', async () => {
    mockStorageGetRow.mockResolvedValue(PROFILE_ROW);
    mockStorageWriteWithOutbox.mockRejectedValue(new Error('tx failed'));

    await expect(repo.saveProfile({ displayName: 'X' })).rejects.toBeInstanceOf(
      OutboxEnqueueError,
    );
  });

  it('saves KV blob in local mode (unverändert)', async () => {
    mockGetState.mockReturnValue({ mode: 'local', userId: USER_ID });
    mockStorageGet.mockResolvedValue(null);

    await repo.saveProfile({ displayName: 'Local' });

    expect(mockStorageSet).toHaveBeenCalled();
    expect(mockStorageWriteWithOutbox).not.toHaveBeenCalled();
  });
});
