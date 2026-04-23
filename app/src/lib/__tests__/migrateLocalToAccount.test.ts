// migrateLocalToAccount unit tests — Plan 02-04 Task 2-04-03 + Phase 2.5-03 Task 04.
// Covers AUTH-04 (local→account transfer) with rollback safety:
//   - happy path: signUp → ensureDefaultGardenForUser → read storage
//     → upsert profile (display_name only) → update gardens (metadata)
//     → upsert vereinsregeln (3-arg toRow w/ gardenId)
//     → setAccountMode + setActiveGarden → delete local storage
//   - signUp failure: NO storage touched, NO auth flip
//   - RPC failure (ensureDefaultGardenForUser): NO storage touched, NO auth flip
//   - profile upsert failure: rollback safety
//   - gardens update failure: rollback safety
//   - already-in-account guard
//
// Rollback invariant (T-2-04-03 in threat model): storage.delete MUST execute
// strictly AFTER all Supabase writes have succeeded, so a partial failure
// leaves the local JSON intact for the user to retry.

// Set Supabase env BEFORE any import that transitively pulls in ./supabase.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import type { LocalProfile, VereinsRegel } from '@spatenstich/shared';

// ── Mocks ───────────────────────────────────────────────────────────────
const mockSignUp = jest.fn();
const mockRpc = jest.fn();
const mockProfileUpsert = jest.fn();
const mockVereinsregelnUpsert = jest.fn();
const mockGardensUpdate = jest.fn();
const mockGardensUpdateEq = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return { upsert: (...a: unknown[]) => mockProfileUpsert(...a) };
      }
      if (table === 'vereinsregeln') {
        return {
          upsert: (...a: unknown[]) => mockVereinsregelnUpsert(...a),
        };
      }
      if (table === 'gardens') {
        return {
          update: (...a: unknown[]) => {
            mockGardensUpdate(...a);
            return {
              eq: (...b: unknown[]) => mockGardensUpdateEq(...b),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  },
}));

const mockStorageGet = jest.fn();
const mockStorageDelete = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    get: (...a: unknown[]) => mockStorageGet(...a),
    set: jest.fn(),
    delete: (...a: unknown[]) => mockStorageDelete(...a),
  },
}));

const mockGetState = jest.fn();
const mockSetAccountMode = jest.fn();
const mockSetActiveGarden = jest.fn();

jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}));

// Lazy import AFTER mocks.
import { migrateLocalToAccount } from '../migrateLocalToAccount';

const LOCAL_PROFILE: Partial<LocalProfile> = {
  plz: '12043',
  klimazone: 7,
  archetype: 'familien_naschgarten',
};

const LOCAL_RULES: VereinsRegel[] = [
  {
    id: 'bk-local-0',
    titel: 'Laubenfläche maximal 24 m²',
    wert: 24,
    einheit: 'm2',
    istBKleingG: true,
    aktiv: true,
    source: 'manual',
  },
  {
    id: 'u-heck',
    titel: 'Heckenhöhe',
    wert: 120,
    einheit: 'cm',
    istBKleingG: false,
    aktiv: true,
    source: 'checklist',
  },
];

const NEW_USER_ID = 'new-user-123';
const NEW_GARDEN_ID = 'g-default-42';

function setupHappyPath(): void {
  mockSignUp.mockResolvedValue({
    data: { user: { id: NEW_USER_ID } },
    error: null,
  });
  mockRpc.mockResolvedValue({ data: NEW_GARDEN_ID, error: null });
  mockStorageGet.mockImplementation(async (key: string) => {
    if (key === 'profile') return JSON.stringify(LOCAL_PROFILE);
    if (key === 'vereinsregeln') return JSON.stringify(LOCAL_RULES);
    return null;
  });
  mockProfileUpsert.mockResolvedValue({ error: null });
  mockVereinsregelnUpsert.mockResolvedValue({ error: null });
  mockGardensUpdateEq.mockResolvedValue({ error: null });
}

describe('migrateLocalToAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      mode: 'local',
      setAccountMode: mockSetAccountMode,
      setActiveGarden: mockSetActiveGarden,
    });
  });

  // ── Legacy Phase-2 tests (adapted for Phase 2.5 flow) ────────────────

  // Test 1: happy path — full 8-step migration chain.
  it('runs full 8-step migration: signUp → ensureGarden → upserts → flip → delete', async () => {
    setupHappyPath();

    const result = await migrateLocalToAccount({
      email: 'test@example.com',
      password: 'Password123!',
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });
    expect(mockRpc).toHaveBeenCalledWith('ensure_default_garden_for_user');
    // profile upsert is display_name only (no plz/klimazone/archetype)
    expect(mockProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: NEW_USER_ID, display_name: 'test' }),
      expect.objectContaining({ onConflict: 'id' }),
    );
    const profileCall = mockProfileUpsert.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(profileCall).not.toHaveProperty('plz');
    expect(profileCall).not.toHaveProperty('klimazone');
    expect(profileCall).not.toHaveProperty('archetype');

    // gardens.update carries metadata from local profile
    expect(mockGardensUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        plz: '12043',
        klimazone: 7,
        archetype: 'familien_naschgarten',
        updated_by_user_id: NEW_USER_ID,
      }),
    );
    expect(mockGardensUpdateEq).toHaveBeenCalledWith('id', NEW_GARDEN_ID);

    // vereinsregeln payload stamps garden_id + created_by + updated_by
    expect(mockVereinsregelnUpsert).toHaveBeenCalledTimes(1);
    const [upsertArg] = mockVereinsregelnUpsert.mock.calls[0]!;
    const rows = upsertArg as Array<Record<string, unknown>>;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row['created_by_user_id']).toBe(NEW_USER_ID);
      expect(row['updated_by_user_id']).toBe(NEW_USER_ID);
      expect(row['garden_id']).toBe(NEW_GARDEN_ID);
      expect(row).toHaveProperty('ist_bkleingg');
      expect(row).not.toHaveProperty('istBKleingG');
      expect(row).not.toHaveProperty('user_id');
    }

    expect(result.userId).toBe(NEW_USER_ID);
    expect(result.gardenId).toBe(NEW_GARDEN_ID);
    expect(result.transferred.profile).toBe(true);
    expect(result.transferred.vereinsregeln).toBe(2);
  });

  // Test 2: authStore.setAccountMode + setActiveGarden both called.
  it('flips authStore.mode to account AND sets activeGarden to new gardenId', async () => {
    setupHappyPath();

    await migrateLocalToAccount({
      email: 'e@x.de',
      password: 'P4ssword!',
    });

    expect(mockSetAccountMode).toHaveBeenCalledWith(NEW_USER_ID);
    expect(mockSetActiveGarden).toHaveBeenCalledWith(NEW_GARDEN_ID);
  });

  // Test 3: storage.delete runs LAST (after every Supabase side-effect succeeds).
  it('deletes local profile + vereinsregeln entries after successful upserts', async () => {
    setupHappyPath();

    await migrateLocalToAccount({
      email: 'ok@ok.de',
      password: 'Password!1',
    });

    expect(mockStorageDelete).toHaveBeenCalledWith('profile');
    expect(mockStorageDelete).toHaveBeenCalledWith('vereinsregeln');
    expect(mockStorageDelete).toHaveBeenCalledTimes(2);
  });

  // Test 4: signUp failure → NO storage touched, NO mode flip, NO RPC called.
  it('throws on signUp error without touching storage, RPC, or auth', async () => {
    const dupErr = new Error('duplicate email');
    mockSignUp.mockResolvedValue({ data: { user: null }, error: dupErr });

    await expect(
      migrateLocalToAccount({
        email: 'dup@x.de',
        password: 'whatever',
      }),
    ).rejects.toThrow('duplicate email');

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockProfileUpsert).not.toHaveBeenCalled();
    expect(mockVereinsregelnUpsert).not.toHaveBeenCalled();
    expect(mockGardensUpdate).not.toHaveBeenCalled();
    expect(mockStorageDelete).not.toHaveBeenCalled();
    expect(mockSetAccountMode).not.toHaveBeenCalled();
    expect(mockSetActiveGarden).not.toHaveBeenCalled();
  });

  // Test 5: profile upsert failure → rollback safety.
  it('rolls back (keeps local storage + local mode) on profile upsert failure', async () => {
    setupHappyPath();
    mockProfileUpsert.mockResolvedValueOnce({
      error: { message: 'network down' },
    });

    await expect(
      migrateLocalToAccount({
        email: 'err@x.de',
        password: 'Password1!',
      }),
    ).rejects.toThrow(/migration_partial|network down/);

    expect(mockStorageDelete).not.toHaveBeenCalled();
    expect(mockSetAccountMode).not.toHaveBeenCalled();
    expect(mockSetActiveGarden).not.toHaveBeenCalled();
  });

  // Test 6: already in account mode → guard throws without side effects.
  it('throws "already in account mode" when called in account mode', async () => {
    mockGetState.mockReturnValue({
      mode: 'account',
      setAccountMode: mockSetAccountMode,
      setActiveGarden: mockSetActiveGarden,
    });

    await expect(
      migrateLocalToAccount({
        email: 'a@a.de',
        password: 'P!1ssword',
      }),
    ).rejects.toThrow(/already in account mode/);

    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockProfileUpsert).not.toHaveBeenCalled();
    expect(mockVereinsregelnUpsert).not.toHaveBeenCalled();
    expect(mockStorageDelete).not.toHaveBeenCalled();
    expect(mockSetAccountMode).not.toHaveBeenCalled();
    expect(mockSetActiveGarden).not.toHaveBeenCalled();
  });

  // ── Phase 2.5 extension — Wave-0 contract now green (was 7× it.todo in Plan 01) ──
  describe('Phase 2.5 extension (shared garden)', () => {
    it('calls ensure_default_garden_for_user after signUp, before profile upsert', async () => {
      setupHappyPath();

      await migrateLocalToAccount({
        email: 'a@b.de',
        password: 'pw12345678',
      });

      expect(mockRpc).toHaveBeenCalledWith('ensure_default_garden_for_user');
      // signUp happens before RPC; RPC happens before profile upsert
      const rpcCallOrder = mockRpc.mock.invocationCallOrder[0]!;
      const signUpCallOrder = mockSignUp.mock.invocationCallOrder[0]!;
      const profileCallOrder = mockProfileUpsert.mock.invocationCallOrder[0]!;
      expect(signUpCallOrder).toBeLessThan(rpcCallOrder);
      expect(rpcCallOrder).toBeLessThan(profileCallOrder);
    });

    it('upserts garden metadata (PLZ, Klimazone, Archetyp) BEFORE vereinsregeln upsert (FK order)', async () => {
      setupHappyPath();

      await migrateLocalToAccount({
        email: 'a@b.de',
        password: 'pw12345678',
      });

      const gardenUpdateOrder = mockGardensUpdate.mock.invocationCallOrder[0]!;
      const vrUpsertOrder =
        mockVereinsregelnUpsert.mock.invocationCallOrder[0]!;
      expect(gardenUpdateOrder).toBeLessThan(vrUpsertOrder);
    });

    it('calls toRow(r, newUserId, newGardenId) with gardenId param (extended 3-arg signature)', async () => {
      setupHappyPath();

      await migrateLocalToAccount({
        email: 'a@b.de',
        password: 'pw12345678',
      });

      const [upsertArg] = mockVereinsregelnUpsert.mock.calls[0]!;
      const rows = upsertArg as Array<Record<string, unknown>>;
      for (const row of rows) {
        expect(row['garden_id']).toBe(NEW_GARDEN_ID);
        expect(row['created_by_user_id']).toBe(NEW_USER_ID);
        expect(row['updated_by_user_id']).toBe(NEW_USER_ID);
      }
    });

    it('calls authStore.setActiveGarden(newGardenId) right after setAccountMode', async () => {
      setupHappyPath();

      await migrateLocalToAccount({
        email: 'a@b.de',
        password: 'pw12345678',
      });

      const setModeOrder = mockSetAccountMode.mock.invocationCallOrder[0]!;
      const setGardenOrder = mockSetActiveGarden.mock.invocationCallOrder[0]!;
      expect(setModeOrder).toBeLessThan(setGardenOrder);
      expect(mockSetActiveGarden).toHaveBeenCalledWith(NEW_GARDEN_ID);
    });

    it('storage.delete runs STRICTLY AFTER all supabase upserts (atomic-tail invariant)', async () => {
      setupHappyPath();

      await migrateLocalToAccount({
        email: 'a@b.de',
        password: 'pw12345678',
      });

      const profileOrder = mockProfileUpsert.mock.invocationCallOrder[0]!;
      const gardenOrder = mockGardensUpdate.mock.invocationCallOrder[0]!;
      const vrOrder = mockVereinsregelnUpsert.mock.invocationCallOrder[0]!;
      const firstDeleteOrder = mockStorageDelete.mock.invocationCallOrder[0]!;

      expect(profileOrder).toBeLessThan(firstDeleteOrder);
      expect(gardenOrder).toBeLessThan(firstDeleteOrder);
      expect(vrOrder).toBeLessThan(firstDeleteOrder);
    });

    it('throws migration_partial_garden_seed when ensure_default_garden_for_user RPC fails (atomic tail preserved)', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: NEW_USER_ID } },
        error: null,
      });
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'rpc_failed' },
      });

      await expect(
        migrateLocalToAccount({
          email: 'a@b.de',
          password: 'pw12345678',
        }),
      ).rejects.toThrow('migration_partial_garden_seed');

      // Atomic-tail verified: no downstream Supabase writes, no auth flip,
      // no storage cleanup.
      expect(mockProfileUpsert).not.toHaveBeenCalled();
      expect(mockGardensUpdate).not.toHaveBeenCalled();
      expect(mockVereinsregelnUpsert).not.toHaveBeenCalled();
      expect(mockStorageDelete).not.toHaveBeenCalled();
      expect(mockSetAccountMode).not.toHaveBeenCalled();
      expect(mockSetActiveGarden).not.toHaveBeenCalled();
    });

    it('throws migration_partial_garden_metadata when gardens update fails (atomic tail preserved)', async () => {
      setupHappyPath();
      mockGardensUpdateEq.mockResolvedValueOnce({
        error: { message: 'permission denied' },
      });

      await expect(
        migrateLocalToAccount({
          email: 'a@b.de',
          password: 'pw12345678',
        }),
      ).rejects.toThrow('migration_partial_garden_metadata');

      // Vereinsregeln upsert must NOT run (order respected), storage intact.
      expect(mockVereinsregelnUpsert).not.toHaveBeenCalled();
      expect(mockStorageDelete).not.toHaveBeenCalled();
      expect(mockSetAccountMode).not.toHaveBeenCalled();
      expect(mockSetActiveGarden).not.toHaveBeenCalled();
    });
  });
});
