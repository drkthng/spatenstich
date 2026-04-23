// Wave-0 test contract for gardenRepo.ts — Plan 02.5-01-05 (todo stubs) / Plan 02.5-03 (implementations).
// Pattern: vereinsregelnRepo.test.ts — jest.mock for supabase + authStore.
// Every `it.todo` here MUST be converted to a passing test by Plan 03 Task gardenRepo-01.
//
// NOTE: Project uses Jest (not Vitest) — see app/package.json devDependencies.
// describe/it are globals provided by jest-expo; no explicit import needed.

describe('gardenRepo', () => {
  describe('mode-guard', () => {
    it.todo('throws "gardens are account-only" when mode === "local"');
    it.todo('throws "Not authenticated" when mode is null');
  });

  describe('getGarden(gardenId)', () => {
    it.todo('returns Garden via supabase.from("gardens").select().eq("id", gardenId).single()');
    it.todo('returns null when row not found (PGRST116)');
    it.todo('throws on unexpected supabase error');
    it.todo('applies fromRow mapping: created_by_user_id → createdByUserId (snake → camel)');
  });

  describe('getMembers(gardenId)', () => {
    it.todo('returns GardenMember[] with displayName from foreign-table embed profile:profiles(display_name)');
    it.todo('returns empty array when no members');
    it.todo('maps role string to GardenRole narrow type');
  });

  describe('updateGarden(gardenId, patch)', () => {
    it.todo('calls supabase.from("gardens").update(toRow(patch, userId)).eq("id", gardenId)');
    it.todo('sets updated_by_user_id to current user (Client-first fill, Pattern 6)');
    it.todo('sends only patched fields (partial update)');
  });

  describe('removeMember(gardenId, userId)', () => {
    it.todo('deletes from garden_members with .eq("garden_id", gardenId).eq("user_id", userId)');
    it.todo('RLS enforces self-or-owner policy — test relies on SQL test in member_limit.sql for server-side proof');
  });

  describe('leaveGarden(gardenId)', () => {
    it.todo('delegates to removeMember(gardenId, currentUserId)');
    it.todo('clears authStore.activeGardenId on success');
  });

  describe('deleteGarden(gardenId) [D-16]', () => {
    it.todo('calls supabase.rpc("delete_garden", { p_garden_id: gardenId })');
    it.todo('throws GardenHasMembersError when RPC returns SQLSTATE P0003');
    it.todo('throws NotOwnerError when RPC returns SQLSTATE 42501');
    it.todo('clears authStore.activeGardenId on success');
  });

  describe('transferOwnership(gardenId, toUserId) [D-16]', () => {
    it.todo('calls supabase.rpc("transfer_ownership", { p_garden_id, p_to_user_id })');
    it.todo('throws NotOwnerError when caller is not current owner (SQLSTATE 42501)');
    it.todo('throws domain error when toUserId equals current user (SQLSTATE P0004)');
    it.todo('throws domain error when toUserId is not a member of gardenId (SQLSTATE P0005)');
    it.todo('atomic: after success, caller has role=member AND toUserId has role=owner');
  });
});
