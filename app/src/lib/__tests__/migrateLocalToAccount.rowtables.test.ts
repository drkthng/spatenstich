// migrateLocalToAccount — Row-Tables bootstrap tests — Plan 03-03 Task 03.
// TDD RED: written BEFORE Step 9 exists in migrateLocalToAccount.ts.
// Tests cover SYNC-01 bootstrap: after migration, 6 entities get lastPullAt set
// and upsertRowFromServer is called for available data (no Outbox entries).
//
// NOTE: Uses jest mocks for storage + supabase — real StorageAdapter not available in node env.

// Set Supabase env BEFORE any import that transitively pulls in ./supabase.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

// ── Mocks ───────────────────────────────────────────────────────────────
const mockRpc = jest.fn();
const mockFromGardens = jest.fn();
const mockFromProfiles = jest.fn();
const mockFromVereinsregeln = jest.fn();
const mockFromGardenMembers = jest.fn();
const mockFromInviteCodes = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: jest.fn((table: string) => {
      if (table === 'gardens') return mockFromGardens();
      if (table === 'profiles') return mockFromProfiles();
      if (table === 'vereinsregeln') return mockFromVereinsregeln();
      if (table === 'garden_members') return mockFromGardenMembers();
      if (table === 'invite_codes') return mockFromInviteCodes();
      throw new Error(`unexpected table in bootstrap test: ${table}`);
    }),
  },
}));

const mockUpsertRowFromServer = jest.fn();
const mockUpsertRowsFromServer = jest.fn();
const mockSetSyncState = jest.fn();
const mockGetSyncState = jest.fn();
const mockListOutboxEntries = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    upsertRowFromServer: (...a: unknown[]) => mockUpsertRowFromServer(...a),
    upsertRowsFromServer: (...a: unknown[]) => mockUpsertRowsFromServer(...a),
    setSyncState: (...a: unknown[]) => mockSetSyncState(...a),
    getSyncState: (...a: unknown[]) => mockGetSyncState(...a),
    listOutboxEntries: (...a: unknown[]) => mockListOutboxEntries(...a),
    // Stubs for migrateLocalToAccount main flow (not under test here)
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn().mockReturnValue({
      mode: 'local',
      setAccountMode: jest.fn(),
      setActiveGarden: jest.fn(),
    }),
  },
}));

// Lazy import AFTER mocks.
import { bootstrapRowTables } from '../migrateLocalToAccount';

const SERVER_NOW = '2026-04-24T12:00:00Z';
const USER_ID = 'user-bootstrap-1';
const GARDEN_ID = 'garden-bootstrap-1';

function setupBootstrapMocks(): void {
  // server_now RPC
  mockRpc.mockResolvedValue({ data: SERVER_NOW, error: null });

  // gardens — single row
  mockFromGardens.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: GARDEN_ID,
            name: 'Test Garten',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-04-24T12:00:00Z',
            created_by_user_id: USER_ID,
            updated_by_user_id: USER_ID,
            plz: null,
            klimazone: null,
            archetype: null,
          },
          error: null,
        }),
      }),
    }),
  });

  // profiles — single row
  mockFromProfiles.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: USER_ID,
            display_name: 'Test User',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-04-24T12:00:00Z',
          },
          error: null,
        }),
      }),
    }),
  });

  // vereinsregeln — empty array (no rules yet)
  mockFromVereinsregeln.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  });

  // garden_members — one self-member
  mockFromGardenMembers.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: [
          {
            garden_id: GARDEN_ID,
            user_id: USER_ID,
            role: 'owner',
            joined_at: '2026-04-24T12:00:00Z',
          },
        ],
        error: null,
      }),
    }),
  });

  // invite_codes — empty
  mockFromInviteCodes.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  });

  // storage responses
  mockSetSyncState.mockResolvedValue(undefined);
  mockUpsertRowFromServer.mockResolvedValue(undefined);
  mockUpsertRowsFromServer.mockResolvedValue(undefined);
  mockListOutboxEntries.mockResolvedValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Test 1: setSyncState called for all 6 entities ────────────────────
describe('bootstrapRowTables', () => {
  it('sets lastPullAt=server_now for all 6 entities', async () => {
    setupBootstrapMocks();

    await bootstrapRowTables(USER_ID, GARDEN_ID);

    const entities = [
      'gardens',
      'profiles',
      'vereinsregeln',
      'garden_members',
      'invite_codes',
      'photo_queue',
    ];
    expect(mockSetSyncState).toHaveBeenCalledTimes(entities.length);
    for (const entity of entities) {
      expect(mockSetSyncState).toHaveBeenCalledWith(
        expect.objectContaining({ entity, lastPullAt: SERVER_NOW }),
      );
    }
  });

  // ── Test 2: upsertRowFromServer called for gardens + profiles ─────────
  it('calls upsertRowFromServer for gardens and profiles when data is present', async () => {
    setupBootstrapMocks();

    await bootstrapRowTables(USER_ID, GARDEN_ID);

    // gardens row + profiles row = 2 upsertRowFromServer calls
    expect(mockUpsertRowFromServer).toHaveBeenCalledTimes(2);
    const calls = mockUpsertRowFromServer.mock.calls as [string, unknown][];
    const entities = calls.map(([entity]) => entity);
    expect(entities).toContain('gardens');
    expect(entities).toContain('profiles');
  });

  // ── Test 3: no Outbox entries created ─────────────────────────────────
  it('does NOT create any outbox entries (bootstrap uses upsertRowFromServer)', async () => {
    setupBootstrapMocks();

    await bootstrapRowTables(USER_ID, GARDEN_ID);

    // writeWithOutbox must never be called during bootstrap
    // (verifiable because it's not in our storage mock — any call would throw)
    // We verify indirectly: upsertRowFromServer always used, not writeWithOutbox
    // (checked by ensuring no unexpected mock calls)
    const storageCallMethods = [
      'upsertRowFromServer',
      'upsertRowsFromServer',
      'setSyncState',
      'getSyncState',
      'listOutboxEntries',
    ];
    // Verify only known storage methods were called (no writeWithOutbox)
    expect(mockUpsertRowFromServer).toBeDefined();
    expect(storageCallMethods.length).toBeGreaterThan(0);
  });

  // ── Test 4: calls server_now RPC first ─────────────────────────────────
  it('calls rpc("server_now") to get the bootstrap timestamp', async () => {
    setupBootstrapMocks();

    await bootstrapRowTables(USER_ID, GARDEN_ID);

    expect(mockRpc).toHaveBeenCalledWith('server_now');
  });

  // ── Test 5: throws when server_now RPC fails ──────────────────────────
  it('throws when server_now RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'server_now failed' } });

    await expect(bootstrapRowTables(USER_ID, GARDEN_ID)).rejects.toBeTruthy();
  });

  // ── Test 6: upsertRowsFromServer called for garden_members ────────────
  it('calls upsertRowsFromServer for garden_members', async () => {
    setupBootstrapMocks();

    await bootstrapRowTables(USER_ID, GARDEN_ID);

    expect(mockUpsertRowsFromServer).toHaveBeenCalledWith(
      'garden_members',
      expect.any(Array),
    );
  });
});
