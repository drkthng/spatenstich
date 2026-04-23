// migrateLocalToAccount unit tests — Plan 02-04 Task 2-04-03.
// Covers AUTH-04 (local→account transfer) with rollback safety:
//   - happy path: signUp → read storage → upsert profile → upsert vereinsregeln
//     → flip auth mode → delete local storage
//   - signUp failure: NO storage touched, NO auth flip
//   - profile upsert failure: NO storage.delete, NO auth flip (rollback safety)
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
const mockProfileUpsert = jest.fn();
const mockVereinsregelnUpsert = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return { upsert: (...a: unknown[]) => mockProfileUpsert(...a) };
      }
      if (table === 'vereinsregeln') {
        return {
          upsert: (...a: unknown[]) => mockVereinsregelnUpsert(...a),
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

jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}));

// Lazy import AFTER mocks.
import { migrateLocalToAccount } from '../migrateLocalToAccount';

// Local-mode storage holds a Partial<LocalProfile> JSON blob (see profileRepo).
// Post-Phase-2.5-pivot (D-01): plz/klimazone/archetype live on LocalProfile (lokal-mode)
// or Garden (account-mode), not on the account-scoped UserProfile.
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

describe('migrateLocalToAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      mode: 'local',
      setAccountMode: mockSetAccountMode,
    });
  });

  // Test 1: happy path — full migration chain.
  it('signs up, copies profile + vereinsregeln, flips mode, deletes local', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: NEW_USER_ID } },
      error: null,
    });
    mockStorageGet.mockImplementation(async (key: string) => {
      if (key === 'profile') return JSON.stringify(LOCAL_PROFILE);
      if (key === 'vereinsregeln') return JSON.stringify(LOCAL_RULES);
      return null;
    });
    mockProfileUpsert.mockResolvedValue({ error: null });
    mockVereinsregelnUpsert.mockResolvedValue({ error: null });

    const result = await migrateLocalToAccount({
      email: 'test@example.com',
      password: 'Password123!',
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });
    expect(mockProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: NEW_USER_ID, plz: '12043' }),
    );
    expect(mockVereinsregelnUpsert).toHaveBeenCalledTimes(1);
    const [upsertArg] = mockVereinsregelnUpsert.mock.calls[0];
    expect(Array.isArray(upsertArg)).toBe(true);
    expect(upsertArg).toHaveLength(2);
    // Every record must carry the NEW user_id (T-2-04-02 mitigation) AND use
    // snake_case `ist_bkleingg` — the Postgres column name (see
    // packages/shared/src/types/database.ts). The camelCase domain key
    // `istBKleingG` must not leak into the upsert payload.
    for (const row of upsertArg as Array<Record<string, unknown>>) {
      expect(row['user_id']).toBe(NEW_USER_ID);
      expect(row).toHaveProperty('ist_bkleingg');
      expect(row).not.toHaveProperty('istBKleingG');
    }
    expect(result.userId).toBe(NEW_USER_ID);
    expect(result.transferred.profile).toBe(true);
    expect(result.transferred.vereinsregeln).toBe(2);
  });

  // Test 2: auth mode flips from 'local' to 'account' with new user id.
  it('flips authStore.mode to account after successful migration', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: NEW_USER_ID } },
      error: null,
    });
    mockStorageGet.mockResolvedValue(null); // no data to migrate still flips
    mockProfileUpsert.mockResolvedValue({ error: null });
    mockVereinsregelnUpsert.mockResolvedValue({ error: null });

    await migrateLocalToAccount({
      email: 'e@x.de',
      password: 'P4ssword!',
    });

    expect(mockSetAccountMode).toHaveBeenCalledWith(NEW_USER_ID);
  });

  // Test 3: storage.delete runs LAST (after every Supabase upsert succeeds).
  it('deletes local profile + vereinsregeln entries after successful upserts', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: NEW_USER_ID } },
      error: null,
    });
    mockStorageGet.mockImplementation(async (key: string) => {
      if (key === 'profile') return JSON.stringify(LOCAL_PROFILE);
      if (key === 'vereinsregeln') return JSON.stringify(LOCAL_RULES);
      return null;
    });
    mockProfileUpsert.mockResolvedValue({ error: null });
    mockVereinsregelnUpsert.mockResolvedValue({ error: null });

    await migrateLocalToAccount({
      email: 'ok@ok.de',
      password: 'Password!1',
    });

    expect(mockStorageDelete).toHaveBeenCalledWith('profile');
    expect(mockStorageDelete).toHaveBeenCalledWith('vereinsregeln');
    expect(mockStorageDelete).toHaveBeenCalledTimes(2);
  });

  // Test 4: signUp failure → NO storage touched, NO mode flip.
  it('throws on signUp error without touching storage or auth', async () => {
    const dupErr = new Error('duplicate email');
    mockSignUp.mockResolvedValue({ data: { user: null }, error: dupErr });

    await expect(
      migrateLocalToAccount({
        email: 'dup@x.de',
        password: 'whatever',
      }),
    ).rejects.toThrow('duplicate email');

    expect(mockProfileUpsert).not.toHaveBeenCalled();
    expect(mockVereinsregelnUpsert).not.toHaveBeenCalled();
    expect(mockStorageDelete).not.toHaveBeenCalled();
    expect(mockSetAccountMode).not.toHaveBeenCalled();
  });

  // Test 5: profile upsert failure → rollback safety.
  it('rolls back (keeps local storage + local mode) on profile upsert failure', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: NEW_USER_ID } },
      error: null,
    });
    mockStorageGet.mockImplementation(async (key: string) => {
      if (key === 'profile') return JSON.stringify(LOCAL_PROFILE);
      if (key === 'vereinsregeln') return JSON.stringify(LOCAL_RULES);
      return null;
    });
    mockProfileUpsert.mockResolvedValue({
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
  });

  // Test 6: already in account mode → guard throws without side effects.
  it('throws "already in account mode" when called in account mode', async () => {
    mockGetState.mockReturnValue({
      mode: 'account',
      setAccountMode: mockSetAccountMode,
    });

    await expect(
      migrateLocalToAccount({
        email: 'a@a.de',
        password: 'P!1ssword',
      }),
    ).rejects.toThrow(/already in account mode/);

    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockProfileUpsert).not.toHaveBeenCalled();
    expect(mockVereinsregelnUpsert).not.toHaveBeenCalled();
    expect(mockStorageDelete).not.toHaveBeenCalled();
    expect(mockSetAccountMode).not.toHaveBeenCalled();
  });

  // ── Wave-0 contract for Phase 2.5 extension — Plan 02.5-01-05 (todo) / Plan 02.5-03 (green) ──
  describe('Phase 2.5 extension (shared garden)', () => {
    it.todo('calls supabase.rpc("ensure_default_garden_for_user") after signUp, before read local');
    it.todo('upserts garden metadata (PLZ, Klimazone, Archetyp) BEFORE vereinsregeln upsert (FK order)');
    it.todo('calls vereinsregelnRepo.toRow(r, newUserId, newGardenId) with gardenId param (extended signature)');
    it.todo('calls authStore.setActiveGarden(newGardenId) in the same set as setAccountMode');
    it.todo('storage.delete runs STRICTLY AFTER all supabase upserts (atomic-tail invariant preserved)');
    it.todo('throws migration_partial_garden_seed if ensure_default_garden_for_user RPC fails');
    it.todo('throws migration_partial_garden_metadata if gardens upsert fails');
  });
});
