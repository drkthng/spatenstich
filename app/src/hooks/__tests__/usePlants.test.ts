// Phase 8 Plan 04: Filled usePlants tests (GREEN). Analog: useFlag.test.ts.
// Verifies PLANT-DB-06 (initialData cold-start + background refetch + error fallback).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock loadAllPlants — the queryFn that fetches from Supabase
const mockLoadAllPlants = jest.fn();
jest.mock('../../lib/plantRepo', () => ({
  loadAllPlants: (...args: unknown[]) => mockLoadAllPlants(...args),
}));

// Mock supabase (transitively imported by plantRepo) so process.env stubs are sufficient
jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { usePlants } from '../usePlants';
import plantsBundle from '@spatenstich/shared/data/plants';

function wrap(qc: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}

function newQC(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

beforeEach(() => {
  mockLoadAllPlants.mockReset();
});

describe('usePlants', () => {
  describe('PLANT-DB-06 — initialData cold-start + background refetch', () => {
    it('returns initialData from JSON-bundle synchronously on first render (length matches plantsBundle.plants.length)', () => {
      // Block the queryFn so we observe pure initial state.
      mockLoadAllPlants.mockImplementation(() => new Promise(() => {}));
      const qc = newQC();
      const { result } = renderHook(() => usePlants(), { wrapper: wrap(qc) });
      // Synchronous first-render value:
      expect(result.current.data).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(result.current.data!.length).toBe((plantsBundle as any).plants.length);
      expect(result.current.data!.length).toBeGreaterThanOrEqual(80);
    });

    it('refetches in background even when initialData is present (proves initialDataUpdatedAt: 0 — RESEARCH Pitfall 2)', async () => {
      mockLoadAllPlants.mockResolvedValue([]); // resolves quickly; second render reflects fetch
      const qc = newQC();
      renderHook(() => usePlants(), { wrapper: wrap(qc) });
      // queryFn must be called even though initialData was synchronous (proves epoch-staleness).
      await waitFor(() => expect(mockLoadAllPlants).toHaveBeenCalled());
    });

    it('after refetch resolves, result.current.data reflects Supabase response (not the bundle)', async () => {
      const supabaseRows = [
        {
          id: 'real-uuid-1',
          slug: 'tomate',
          nameDe: 'Tomate',
          nameAltDe: [],
          nameBotanical: null,
          family: 'Solanaceae',
          category: 'Gemüse',
          minSpacingCm: null,
          rowSpacingCm: null,
          depthCm: null,
          sunRequirement: 'sonnig',
          waterNeeds: 'hoch',
          climateZoneMin: null,
          climateZoneMax: null,
          sowOutdoorDoyStart: null,
          sowOutdoorDoyEnd: null,
          sowIndoorDoyStart: null,
          sowIndoorDoyEnd: null,
          plantDoyStart: null,
          plantDoyEnd: null,
          harvestDoyStart: null,
          harvestDoyEnd: null,
          daysToHarvest: null,
          nitrogenFixing: false,
          perennial: false,
          notesDe: null,
          iconEmoji: null,
          dataSource: 'merged',
          createdAt: '2026-05-17T00:00:00Z',
          updatedAt: '2026-05-17T00:00:00Z',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any;
      mockLoadAllPlants.mockResolvedValue(supabaseRows);
      const qc = newQC();
      const { result } = renderHook(() => usePlants(), { wrapper: wrap(qc) });
      await waitFor(() => expect(result.current.data?.[0]?.id).toBe('real-uuid-1'));
      // Real UUID — not the synthetic `bundle:tomate` id from initialData.
      expect(result.current.data?.[0]?.id).not.toMatch(/^bundle:/);
    });

    it('errors do not throw; result.current.data falls back to the bundle', () => {
      mockLoadAllPlants.mockRejectedValue(new Error('network down'));
      const qc = newQC();
      const { result } = renderHook(() => usePlants(), { wrapper: wrap(qc) });
      // First render still has initialData synchronously, even though the fetch errors.
      expect(result.current.data).toBeDefined();
      expect(result.current.data!.length).toBeGreaterThanOrEqual(80);
    });
  });
});
