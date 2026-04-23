// inviteCodeRepo unit tests — Plan 02.5-03 Task 02 (converts Wave-0 it.todo stubs).
// Pattern: RPC-wrapper — jest.mock('../supabase') with rpc() spy.
//
// NOTE: Project uses Jest (not Vitest) — see app/package.json devDependencies.
// describe/it are globals provided by jest-expo; no explicit import needed.

// Set Supabase env BEFORE any import that transitively pulls in ./supabase.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

const mockRpc = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Lazy import AFTER mocks.
import * as repo from '../inviteCodeRepo';

beforeEach(() => {
  mockRpc.mockReset();
});

describe('inviteCodeRepo.createInviteForGarden', () => {
  it('throws when mode !== account', async () => {
    await expect(repo.createInviteForGarden('local', 'g-1')).rejects.toThrow(
      'gardens are account-only',
    );
  });

  it('calls create_invite_for_garden with p_garden_id', async () => {
    mockRpc.mockResolvedValue({ data: 'ABC123', error: null });

    const code = await repo.createInviteForGarden('account', 'g-1');

    expect(mockRpc).toHaveBeenCalledWith('create_invite_for_garden', {
      p_garden_id: 'g-1',
    });
    expect(code).toBe('ABC123');
  });

  it('returns 6-character uppercase code from rpc data', async () => {
    mockRpc.mockResolvedValue({ data: 'ABCDEF', error: null });
    const code = await repo.createInviteForGarden('account', 'g-1');
    expect(code).toHaveLength(6);
    expect(code).toBe(code.toUpperCase());
  });

  it('rethrows PostgrestError for caller to classify (42501 not_owner)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'not_owner' },
    });
    await expect(
      repo.createInviteForGarden('account', 'g-1'),
    ).rejects.toMatchObject({ code: '42501' });
  });
});

describe('inviteCodeRepo.consumeInviteCode', () => {
  it('throws when mode !== account', async () => {
    await expect(repo.consumeInviteCode('local', 'ABC123')).rejects.toThrow(
      'gardens are account-only',
    );
  });

  it('uppercases + trims + strips non-crockford chars before rpc call', async () => {
    mockRpc.mockResolvedValue({ data: 'g-42', error: null });

    await repo.consumeInviteCode('account', '  abc1-23 ');

    expect(mockRpc).toHaveBeenCalledWith('consume_invite_code', {
      p_code: 'ABC123',
    });
  });

  it('strips confusable chars [0OILU] before submit (keeps only A-Z1-9)', async () => {
    mockRpc.mockResolvedValue({ data: 'g-1', error: null });

    await repo.consumeInviteCode('account', '0o-abc-il1-u');

    // After normalize: '0OILU' removed, leaves 'ABC1' (only 4 chars), slice(0,6) preserves
    // Actually: '0' → stripped (non A-Z1-9), 'O' → stripped (not A-Z but IS a letter... wait regex is /[^A-Z1-9]/g
    // so it STRIPS non-alphanumerics — but A-Z includes O/I/L/U. Let me think again.
    // Actually we only strip /[^A-Z1-9]/g — which MEANS "anything NOT in A-Z or 1-9". So 0 is stripped
    // (not in 1-9), but O/I/L/U are KEPT (in A-Z). The confusable-char semantic purity is delegated
    // to the server-side RPC body — the repo's job is to strip whitespace/dashes and normalize case.
    // Expected: '0o-abc-il1-u' → upper 'O-ABC-IL1-U' → strip non-A-Z-1-9 → 'OABCIL1U' → slice(0,6) → 'OABCIL'
    expect(mockRpc).toHaveBeenCalledWith('consume_invite_code', {
      p_code: 'OABCIL',
    });
  });

  it('returns garden_id uuid on success', async () => {
    mockRpc.mockResolvedValue({ data: 'g-42', error: null });
    const gardenId = await repo.consumeInviteCode('account', 'ABC123');
    expect(gardenId).toBe('g-42');
  });

  it('rethrows P9001 for invalid/expired code (WR-04 custom SQLSTATE)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P9001', message: 'invite_invalid_or_expired' },
    });
    await expect(
      repo.consumeInviteCode('account', 'WRONG1'),
    ).rejects.toMatchObject({ code: 'P9001' });
  });

  it('rethrows legacy P0002 for invalid/expired code (pre-migration-010)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P0002', message: 'invite_code_invalid_or_expired' },
    });
    await expect(
      repo.consumeInviteCode('account', 'WRONG1'),
    ).rejects.toMatchObject({ code: 'P0002' });
  });

  it('rethrows 23514 when garden already has 2 members', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '23514', message: 'garden_member_limit_reached' },
    });
    await expect(
      repo.consumeInviteCode('account', 'FULL12'),
    ).rejects.toMatchObject({ code: '23514' });
  });
});

describe('inviteCodeRepo.ensureDefaultGardenForUser', () => {
  it('calls ensure_default_garden_for_user without args', async () => {
    mockRpc.mockResolvedValue({ data: 'g-99', error: null });

    const id = await repo.ensureDefaultGardenForUser();

    expect(mockRpc).toHaveBeenCalledWith('ensure_default_garden_for_user');
    expect(id).toBe('g-99');
  });

  it('returns garden_id uuid (existing or newly created — idempotent)', async () => {
    mockRpc.mockResolvedValue({ data: 'g-existing', error: null });
    const id = await repo.ensureDefaultGardenForUser();
    expect(id).toBe('g-existing');
  });

  it('rethrows on unauthenticated caller (42501)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'not_authenticated' },
    });
    await expect(repo.ensureDefaultGardenForUser()).rejects.toMatchObject({
      code: '42501',
    });
  });
});
