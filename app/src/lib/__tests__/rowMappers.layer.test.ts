// Phase 7 Plan 01 Wave 0: rowMappers layer field test scaffold (Pitfall-8 + Migration 018).
// Per RESEARCH Code Examples 2 + 07-PATTERNS.md rowMappers.layer.test.ts.

// process.env stubs (matches gardenPlanRepo.test.ts:5-6 pattern for node-project tests)
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

describe('rowMappers layer field (Phase 7)', () => {
  it.todo('round-trips layer="infrastructure" through planElementToDb -> planElementToLocal');
  it.todo('round-trips layer="seasonal" through planElementToDb -> planElementToLocal');
  it.todo('planElementToDb writes "layer" snake_case key (camelToSnake)');
});

describe('rowMappers layer pre-018 lazy defaults (Pitfall-8)', () => {
  it.todo('pre-018 row with layer=undefined AND element_type="Pflanze" -> planElementToLocal returns layer="seasonal"');
  it.todo('pre-018 row with layer=undefined AND element_type="Beet" -> planElementToLocal returns layer="infrastructure"');
  it.todo('pre-018 row with layer=null AND element_type="Pflanze" -> layer="seasonal"');
  it.todo('row with explicit layer="seasonal" overrides element_type-based default');
  it.todo('row with explicit layer="infrastructure" overrides element_type-based default');
});
