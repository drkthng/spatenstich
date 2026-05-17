// Phase 8 Plan 01: Wave-0 test scaffold for usePlants() hook.
// Tests filled in by Plan 04 (Wave 3). Stubs use it.todo() to mark coverage targets.
// Analog: useFlag.test.ts (QueryClientProvider wrap + renderHook + mock supabase).
// Phase-8 extension: usePlants uses initialData (sync) + initialDataUpdatedAt: 0 (force refetch).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

describe('usePlants', () => {
  describe('PLANT-DB-06 — initialData cold-start + background refetch', () => {
    it.todo('returns initialData from JSON-bundle synchronously on first render (length matches plantsBundle.plants.length)');
    it.todo('refetches in background even when initialData is present (proves initialDataUpdatedAt: 0 — RESEARCH Pitfall 2)');
    it.todo('after refetch resolves, result.current.data reflects Supabase response (not the bundle)');
    it.todo('errors do not throw; result.current.data falls back to the bundle');
  });
});
