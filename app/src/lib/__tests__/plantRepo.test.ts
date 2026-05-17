// Phase 8 Plan 01: Wave-0 test scaffold for plantRepo (read-only global plant DB).
// Tests filled in by Plan 04 (Wave 3). Stubs use it.todo() to mark coverage targets.
// Analog: gardenPlanRepo.test.ts (jest.mock supabase + lazy import). Phase-8 simplification:
//   no storage layer mock, no writeWithOutbox, no scheduleWriteDebounced — plantRepo is read-only.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

describe('plantRepo', () => {
  describe('loadAllPlants', () => {
    it.todo('returns rows mapped via snake_case → camelCase rowFromDb');
    it.todo('orders results by name_de ascending');
  });

  describe('loadPlantBySlug', () => {
    it.todo('returns mapped row when slug matches');
    it.todo('returns null when slug does not match (maybeSingle returns no data)');
  });

  describe('loadCompanionsFor (PLANT-DB-07 symmetry + partition)', () => {
    it.todo('partitions related plants into {companions, incompatible, neutral} by relationship');
    it.todo('returns symmetric results — loadCompanionsFor(a) and loadCompanionsFor(b) each see the other (regardless of canonical a<b storage)');
    it.todo('handles plantId at storage-a position AND at storage-b position via .or(plant_a_id.eq.X, plant_b_id.eq.X) query');
    it.todo('returns empty partitions when plant has no companion rows');
  });

  describe('searchPlants', () => {
    it.todo('issues .or(name_de.ilike, name_alt_de.cs) with .limit(20)');
    it.todo('returns empty array when query is empty/whitespace-only');
  });
});
