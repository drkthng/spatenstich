// Wave-0 test contract for inviteCodeRepo.ts — Plan 02.5-01-05 (todo stubs) / Plan 02.5-03 (green).
// Pattern: RPC-wrapper — jest.mock('@/src/lib/supabase') with rpc() spy.
//
// NOTE: Project uses Jest (not Vitest) — see app/package.json devDependencies.
// describe/it are globals provided by jest-expo; no explicit import needed.

describe('inviteCodeRepo', () => {
  describe('createInviteForGarden(gardenId)', () => {
    it.todo('throws "gardens are account-only" when mode !== "account"');
    it.todo('calls supabase.rpc("create_invite_for_garden", { p_garden_id })');
    it.todo('returns 6-character uppercase code from rpc data');
    it.todo('throws with code="42501" when caller is not owner (RPC-side enforced)');
  });

  describe('consumeInviteCode(code)', () => {
    it.todo('throws "gardens are account-only" when mode !== "account"');
    it.todo('uppercases + trims input before rpc call');
    it.todo('strips confusable chars [0OILU] before submit');
    it.todo('calls supabase.rpc("consume_invite_code", { p_code })');
    it.todo('returns garden_id uuid on success');
    it.todo('throws PostgrestError with code="P0002" when code invalid or expired');
    it.todo('throws PostgrestError with code="23514" when garden already has 2 members');
  });

  describe('ensureDefaultGardenForUser()', () => {
    it.todo('calls supabase.rpc("ensure_default_garden_for_user") without args');
    it.todo('returns garden_id uuid (existing or newly created — idempotent)');
    it.todo('throws on unauthenticated caller (42501)');
  });

  describe('error code classification helper (optional export)', () => {
    it.todo('classifyInviteError(err) returns "invalid" for P0002, "full" for 23514, "not_owner" for 42501, "unknown" otherwise');
  });
});
