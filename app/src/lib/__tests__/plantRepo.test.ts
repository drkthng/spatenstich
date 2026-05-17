// Phase 8 Plan 04: Filled plantRepo tests (GREEN). Mocks supabase chain at call-site level.
// Analog: gardenPlanRepo.test.ts (jest.mock supabase + lazy import).
// Phase-8 simplification: no storage layer mock, no writeWithOutbox — plantRepo is read-only.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

// Mock supabase chain. Each test sets the return value of the inner-most call.
const mockOrder = jest.fn();
const mockMaybeSingle = jest.fn();
const mockIn = jest.fn();
const mockLimit = jest.fn();

// The .select() call returns different chain shapes depending on what's called after.
// We return a "universal" shape exposing all possible terminators.
// `or` is special: in `loadCompanionsFor` it terminates the chain (awaited), in
// `searchPlants` it is followed by `.limit()`. We make `mockOr` return the
// selectChain by default (chainable); tests override with mockResolvedValueOnce
// for the terminal case.
const selectChain: {
  order: jest.Mock;
  eq: jest.Mock;
  or: jest.Mock;
  in: jest.Mock;
  limit: jest.Mock;
} = {
  order: mockOrder,
  eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })),
  or: jest.fn(),
  in: mockIn,
  limit: mockLimit,
};
const mockOr = selectChain.or;
const mockEq = selectChain.eq;
// Default: chainable (returns selectChain so `.limit()` can follow).
mockOr.mockReturnValue(selectChain);

const mockSelect = jest.fn(() => selectChain);
const mockFrom = jest.fn((_table: string) => ({ select: mockSelect }));

jest.mock('../supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

import {
  loadAllPlants,
  loadPlantBySlug,
  loadCompanionsFor,
  searchPlants,
} from '../plantRepo';

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply default chain wiring (clearAllMocks wipes implementations).
  mockOr.mockReturnValue(selectChain);
  mockEq.mockImplementation(() => ({ maybeSingle: mockMaybeSingle }));
  mockSelect.mockImplementation(() => selectChain);
  mockFrom.mockImplementation((_table: string) => ({ select: mockSelect }));
});

const dbRowTomate = {
  id: 'p-tomate',
  slug: 'tomate',
  name_de: 'Tomate',
  name_alt_de: ['Paradeiser'],
  name_botanical: 'Solanum lycopersicum',
  family: 'Solanaceae',
  category: 'Gemüse',
  min_spacing_cm: 60,
  row_spacing_cm: 80,
  depth_cm: 1,
  sun_requirement: 'sonnig',
  water_needs: 'hoch',
  climate_zone_min: 6,
  climate_zone_max: 9,
  sow_outdoor_doy_start: null,
  sow_outdoor_doy_end: null,
  sow_indoor_doy_start: 60,
  sow_indoor_doy_end: 90,
  plant_doy_start: 130,
  plant_doy_end: 150,
  harvest_doy_start: 200,
  harvest_doy_end: 290,
  days_to_harvest: 75,
  nitrogen_fixing: false,
  perennial: false,
  notes_de: null,
  icon_emoji: '🍅',
  data_source: 'merged',
  created_at: '2026-05-17T00:00:00Z',
  updated_at: '2026-05-17T00:00:00Z',
};
const dbRowBasilikum = {
  ...dbRowTomate,
  id: 'p-basilikum',
  slug: 'basilikum',
  name_de: 'Basilikum',
  family: 'Lamiaceae',
  category: 'Kraut',
};

describe('plantRepo', () => {
  describe('loadAllPlants', () => {
    it('returns rows mapped via snake_case → camelCase rowFromDb', async () => {
      mockOrder.mockResolvedValueOnce({
        data: [dbRowTomate, dbRowBasilikum],
        error: null,
      });
      const plants = await loadAllPlants();
      expect(plants).toHaveLength(2);
      expect(plants[0].slug).toBe('tomate');
      expect(plants[0].nameDe).toBe('Tomate');
      expect(plants[0].dataSource).toBe('merged');
    });

    it('orders results by name_de ascending', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });
      await loadAllPlants();
      expect(mockOrder).toHaveBeenCalledWith('name_de', { ascending: true });
    });
  });

  describe('loadPlantBySlug', () => {
    it('returns mapped row when slug matches', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: dbRowTomate, error: null });
      const plant = await loadPlantBySlug('tomate');
      expect(plant?.slug).toBe('tomate');
      expect(plant?.family).toBe('Solanaceae');
      expect(mockEq).toHaveBeenCalledWith('slug', 'tomate');
    });

    it('returns null when slug does not match (maybeSingle returns no data)', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const plant = await loadPlantBySlug('does-not-exist');
      expect(plant).toBeNull();
    });
  });

  describe('loadCompanionsFor (PLANT-DB-07 symmetry + partition)', () => {
    it('partitions related plants into {companions, incompatible, neutral} by relationship', async () => {
      mockOr.mockResolvedValueOnce({
        data: [
          { plant_a_id: 'p-tomate', plant_b_id: 'p-basilikum', relationship: 'companion' },
          { plant_a_id: 'p-tomate', plant_b_id: 'p-fenchel', relationship: 'incompatible' },
        ],
        error: null,
      });
      mockIn.mockResolvedValueOnce({
        data: [
          dbRowBasilikum,
          { ...dbRowTomate, id: 'p-fenchel', slug: 'fenchel', name_de: 'Fenchel', family: 'Apiaceae' },
        ],
        error: null,
      });
      const result = await loadCompanionsFor('p-tomate');
      expect(result.companions).toHaveLength(1);
      expect(result.companions[0].slug).toBe('basilikum');
      expect(result.incompatible).toHaveLength(1);
      expect(result.incompatible[0].slug).toBe('fenchel');
      expect(result.neutral).toHaveLength(0);
    });

    it('returns symmetric results — loadCompanionsFor(a) and loadCompanionsFor(b) each see the other (regardless of canonical a<b storage)', async () => {
      // Storage canonical: lo='p-basilikum', hi='p-tomate' (p-basilikum < p-tomate string compare)
      mockOr.mockResolvedValueOnce({
        data: [{ plant_a_id: 'p-basilikum', plant_b_id: 'p-tomate', relationship: 'companion' }],
        error: null,
      });
      mockIn.mockResolvedValueOnce({ data: [dbRowTomate], error: null });
      const result = await loadCompanionsFor('p-basilikum');
      expect(result.companions[0].slug).toBe('tomate');
    });

    it('handles plantId at storage-a position AND at storage-b position via .or(plant_a_id.eq.X, plant_b_id.eq.X) query', async () => {
      mockOr.mockResolvedValueOnce({ data: [], error: null });
      await loadCompanionsFor('p-tomate');
      expect(mockOr).toHaveBeenCalledWith('plant_a_id.eq.p-tomate,plant_b_id.eq.p-tomate');
    });

    it('returns empty partitions when plant has no companion rows', async () => {
      mockOr.mockResolvedValueOnce({ data: [], error: null });
      const result = await loadCompanionsFor('p-tomate');
      expect(result).toEqual({ companions: [], incompatible: [], neutral: [] });
    });
  });

  describe('searchPlants', () => {
    it('issues .or(name_de.ilike, name_alt_de.cs) with .limit(20)', async () => {
      mockLimit.mockResolvedValueOnce({ data: [dbRowTomate], error: null });
      const results = await searchPlants('toma');
      expect(mockOr).toHaveBeenCalledWith('name_de.ilike.%toma%,name_alt_de.cs.{toma}');
      expect(mockLimit).toHaveBeenCalledWith(20);
      expect(results[0].slug).toBe('tomate');
    });

    it('returns empty array when query is empty/whitespace-only', async () => {
      const results = await searchPlants('   ');
      expect(results).toEqual([]);
      expect(mockSelect).not.toHaveBeenCalled();
    });
  });
});
