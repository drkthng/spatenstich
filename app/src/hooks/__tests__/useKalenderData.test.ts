// Phase 10 Plan 02: useKalenderData hook tests (fills Wave-0 stubs).
// Covers CAL-04 (hasBeetImPlan + addPlantToPlan), CAL-05 (written row shape),
// filter (nur meine Pflanzen), and null-klimazone guard (Fallstrick 2).
//
// Mocks:
//   - usePlants (TanStack Query wrapper)
//   - useProfileStore (klimazone selector)
//   - useAuthStore (activeGardenId + mode + getState)
//   - gardenPlanRepo (loadAcceptedElements, loadDimensions, writePlanElement)
//   - draftPromotionRepo (nextFreeBedSlot)

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---- Mock usePlants ----

const mockPlantsData: any[] = [];
jest.mock('../usePlants', () => ({
  usePlants: () => ({ data: mockPlantsData }),
}));

// ---- Mock profileStore ----

let mockKlimazone: number | null = 4;
jest.mock('../../stores/profileStore', () => ({
  useProfileStore: (selector: (s: any) => any) => selector({ klimazone: mockKlimazone }),
}));

// ---- Mock authStore ----

let mockActiveGardenId: string | null = 'garden-1';
let mockMode: string | null = 'account';
let mockUserId: string | null = 'user-1';

// useAuthStore is used both as a React hook (selector call) and as a Zustand store
// via useAuthStore.getState() (imperative call in addPlantToPlan).
// We mock it as a function with a .getState method attached.
// The jest.mock factory is hoisted — but the variables are referenced at call-time,
// so closures over let variables work correctly here.
jest.mock('../../stores/authStore', () => {
  function hookFn(selector: (s: any) => any) {
    return selector({ activeGardenId: mockActiveGardenId, mode: mockMode });
  }
  hookFn.getState = () => ({ userId: mockUserId });
  return { useAuthStore: hookFn };
});

// ---- Mock gardenPlanRepo ----

const mockLoadAcceptedElements = jest.fn().mockResolvedValue([]);
const mockLoadDimensions = jest.fn().mockResolvedValue(null);
const mockWritePlanElement = jest.fn().mockResolvedValue(undefined);

jest.mock('../../lib/gardenPlanRepo', () => ({
  loadAcceptedElements: (...args: unknown[]) => mockLoadAcceptedElements(...args),
  loadDimensions: (...args: unknown[]) => mockLoadDimensions(...args),
  writePlanElement: (...args: unknown[]) => mockWritePlanElement(...args),
}));

// ---- Mock draftPromotionRepo ----

const mockNextFreeBedSlot = jest.fn().mockReturnValue({ xM: 2, yM: 3 });
jest.mock('../../lib/draftPromotionRepo', () => ({
  nextFreeBedSlot: (...args: unknown[]) => mockNextFreeBedSlot(...args),
}));

// ---- Mock kalenderBeete (pointInPolygon für In-Bed-Test wird nicht gemockt) ----
// pointInPolygon aus geometry/bedLayout wird direkt im Test genutzt, nicht gemockt.

// ---- Mock supabase (transitive dep via gardenPlanRepo) ----

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

// ---- Mock plants bundle (transitive dep via usePlants) ----

jest.mock('@spatenstich/shared/data/plants', () => ({
  __esModule: true,
  default: {
    schemaVersion: 'plant-db.v1',
    plants: [],
    companions: [],
  },
}));

import { useKalenderData } from '../useKalenderData';
import type { PlanElementRow, GardenDimensionsRow, PlantRow } from '@spatenstich/shared';

// ---- Helpers ----

function wrap(qc: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}

function newQC(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeBeet(overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id: 'beet-1',
    gardenId: 'garden-1',
    elementType: 'Beet',
    label: 'Beet A',
    xM: 0,
    yM: 0,
    widthM: 2,
    heightM: 2,
    confidence: null,
    isAccepted: true,
    importedFrom: null,
    provenance: null,
    layer: 'infrastructure',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    updatedByUserId: null,
    deletedAt: null,
    ...overrides,
  };
}

function makePflanze(plantSlug: string, overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id: `pflanze-${plantSlug}`,
    gardenId: 'garden-1',
    elementType: 'Pflanze',
    label: plantSlug,
    xM: 0.5,
    yM: 0.5,
    widthM: 0.3,
    heightM: 0.3,
    confidence: null,
    isAccepted: true,
    importedFrom: null,
    provenance: { plantSlug },
    layer: 'seasonal',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    updatedByUserId: null,
    deletedAt: null,
    ...overrides,
  };
}

const MOCK_DIMS: GardenDimensionsRow = {
  id: 'dims-1',
  gardenId: 'garden-1',
  shape: 'rectangle',
  widthM: 10,
  heightM: 8,
  extraDims: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  updatedByUserId: null,
  deletedAt: null,
};

const MOCK_PLANT: PlantRow = {
  id: 'bundle:tomate',
  slug: 'tomate',
  nameDe: 'Tomate',
  nameAltDe: ['Paradeiser'],
  nameBotanical: 'Solanum lycopersicum',
  family: 'Solanaceae',
  category: 'Gemüse',
  minSpacingCm: 50,
  rowSpacingCm: 60,
  depthCm: null,
  sunRequirement: 'sonnig',
  waterNeeds: 'hoch',
  climateZoneMin: null,
  climateZoneMax: null,
  sowOutdoorDoyStart: null,
  sowOutdoorDoyEnd: null,
  sowIndoorDoyStart: 60,
  sowIndoorDoyEnd: 90,
  plantDoyStart: 130,
  plantDoyEnd: 150,
  harvestDoyStart: 200,
  harvestDoyEnd: 280,
  daysToHarvest: 75,
  nitrogenFixing: false,
  perennial: false,
  notesDe: null,
  iconEmoji: '🍅',
  dataSource: 'own-research',
  createdAt: '1970-01-01T00:00:00Z',
  updatedAt: '1970-01-01T00:00:00Z',
};

// ---- Reset before each test ----

beforeEach(() => {
  mockPlantsData.length = 0;
  mockKlimazone = 4;
  mockActiveGardenId = 'garden-1';
  mockMode = 'account';
  mockUserId = 'user-1';
  mockLoadAcceptedElements.mockReset().mockResolvedValue([]);
  mockLoadDimensions.mockReset().mockResolvedValue(null);
  mockWritePlanElement.mockReset().mockResolvedValue(undefined);
  mockNextFreeBedSlot.mockReset().mockReturnValue({ xM: 2, yM: 3 });
});

// ---- Tests ----

describe('useKalenderData', () => {
  describe('placement: hasBeetImPlan (CAL-04)', () => {
    it('returns hasBeetImPlan === true when elements include at least one non-deleted Beet', async () => {
      mockLoadAcceptedElements.mockResolvedValue([makeBeet()]);
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData(), { wrapper: wrap(qc) });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasBeetImPlan).toBe(true);
    });

    it('returns hasBeetImPlan === false when no Beet elements exist', async () => {
      mockLoadAcceptedElements.mockResolvedValue([]);
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData(), { wrapper: wrap(qc) });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasBeetImPlan).toBe(false);
    });
  });

  describe('add plant: writes PlanElementRow (CAL-05)', () => {
    it('calls writePlanElement with a row having elementType=Pflanze, layer=seasonal, provenance.plantSlug=slug', async () => {
      // Beet mit Center (5, 4) — Pflanze wird an Beet-Center platziert (WR-06 In-Bed-Placement)
      const BEET = makeBeet({ xM: 5, yM: 4, widthM: 2, heightM: 2 });
      mockLoadAcceptedElements.mockResolvedValue([BEET]);
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData(), { wrapper: wrap(qc) });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let writtenElement: PlanElementRow | undefined;
      mockWritePlanElement.mockImplementation((_mode: unknown, el: PlanElementRow) => {
        writtenElement = el;
        return Promise.resolve();
      });

      await act(async () => {
        await result.current.addPlantToPlan(MOCK_PLANT);
      });

      expect(mockWritePlanElement).toHaveBeenCalledTimes(1);
      expect(writtenElement).toBeDefined();
      expect(writtenElement!.elementType).toBe('Pflanze');
      expect(writtenElement!.layer).toBe('seasonal');
      expect(writtenElement!.isAccepted).toBe(true);
      expect(writtenElement!.provenance).toEqual(expect.objectContaining({ plantSlug: 'tomate' }));
      // WR-06: Platzierung am Beet-Center (Center-Konvention Plan 10-06/08)
      expect(writtenElement!.xM).toBe(5);
      expect(writtenElement!.yM).toBe(4);
      expect(writtenElement!.widthM).toBe(0.3);
      expect(writtenElement!.heightM).toBe(0.3);
    });

    it('throws when hasBeetImPlan is false (Fallstrick 5)', async () => {
      mockLoadAcceptedElements.mockResolvedValue([]); // no Beete
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData(), { wrapper: wrap(qc) });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(result.current.addPlantToPlan(MOCK_PLANT)).rejects.toThrow('kein_beet_im_plan');
    });
  });

  describe('filter: nur meine Pflanzen', () => {
    it('meinePflanzenslugs contains the plantSlug of non-deleted Pflanze elements', async () => {
      mockLoadAcceptedElements.mockResolvedValue([
        makeBeet(),
        makePflanze('tomate'),
        makePflanze('karotte'),
      ]);
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData(), { wrapper: wrap(qc) });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.meinePflanzenslugs.has('tomate')).toBe(true);
      expect(result.current.meinePflanzenslugs.has('karotte')).toBe(true);
      expect(result.current.meinePflanzenslugs.size).toBe(2);
    });

    it('excludes soft-deleted Pflanze elements from meinePflanzenslugs', async () => {
      mockLoadAcceptedElements.mockResolvedValue([
        makeBeet(),
        makePflanze('tomate', { deletedAt: '2026-02-01T00:00:00Z' }),
      ]);
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData(), { wrapper: wrap(qc) });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.meinePflanzenslugs.size).toBe(0);
    });

    it('wochenAktionen restricts to meinePflanzenslugs when nurMeinePflanzen=true and plan has slugs', async () => {
      // Two plants in DB; only 'tomate' is in the plan
      const tomatePlant = MOCK_PLANT;
      const karottePlant: PlantRow = {
        ...MOCK_PLANT,
        id: 'bundle:karotte',
        slug: 'karotte',
        nameDe: 'Karotte',
        sowIndoorDoyStart: null,
        sowIndoorDoyEnd: null,
        sowOutdoorDoyStart: 70,
        sowOutdoorDoyEnd: 100,
        plantDoyStart: 90,
        plantDoyEnd: 120,
        harvestDoyStart: 170,
        harvestDoyEnd: 220,
      };
      mockPlantsData.push(tomatePlant, karottePlant);
      mockKlimazone = 4;

      mockLoadAcceptedElements.mockResolvedValue([
        makeBeet(),
        makePflanze('tomate'), // only tomate in plan
      ]);
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData({ nurMeinePflanzen: true }), {
        wrapper: wrap(qc),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // wochenAktionen should only reference tomate (the plant in the plan)
      const slugsInAktionen = new Set(result.current.wochenAktionen.map((a) => a.plant.slug));
      expect(slugsInAktionen.has('karotte')).toBe(false);
      // meinePflanzenslugs must contain tomate
      expect(result.current.meinePflanzenslugs.has('tomate')).toBe(true);
    });
  });

  describe('returns empty wochenAktionen when klimazone is null (Fallstrick 2)', () => {
    it('wochenAktionen is empty array and klimazone is null when profileStore.klimazone is null', async () => {
      mockKlimazone = null;
      mockPlantsData.push(MOCK_PLANT);
      mockLoadAcceptedElements.mockResolvedValue([makeBeet(), makePflanze('tomate')]);
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData(), { wrapper: wrap(qc) });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.klimazone).toBeNull();
      expect(result.current.wochenAktionen).toHaveLength(0);
      // Ensure no NaN in wochenAktionen (by it being empty — no computation runs)
    });
  });

  describe('WR-06: addPlantToPlan platziert Pflanze IM Beet (In-Bed-Placement)', () => {
    it('schreibt Element mit Mittelpunkt innerhalb des Beet-Polygons und setzt provenance.parentBedId', async () => {
      // Beet: Center (2, 2), 2x2 → Polygon [1,1]→[3,3]
      const BEET = makeBeet({ id: 'beet-x', xM: 2, yM: 2, widthM: 2, heightM: 2 });
      mockLoadAcceptedElements.mockResolvedValue([BEET]);
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData(), { wrapper: wrap(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let writtenElement: PlanElementRow | undefined;
      mockWritePlanElement.mockImplementation((_mode: unknown, el: PlanElementRow) => {
        writtenElement = el;
        return Promise.resolve();
      });

      await act(async () => {
        await result.current.addPlantToPlan(MOCK_PLANT);
      });

      expect(writtenElement).toBeDefined();
      // Pflanze-Mittelpunkt muss im Beet [1,1]→[3,3] liegen
      expect(writtenElement!.xM).toBeGreaterThanOrEqual(1);
      expect(writtenElement!.xM).toBeLessThanOrEqual(3);
      expect(writtenElement!.yM).toBeGreaterThanOrEqual(1);
      expect(writtenElement!.yM).toBeLessThanOrEqual(3);
      // Im Plan 10-06 gelernt: CENTER = (2,2) → exakter Beet-Center-Test
      expect(writtenElement!.xM).toBe(2);
      expect(writtenElement!.yM).toBe(2);
      // D-03 Fast-Path: parentBedId gesetzt
      const prov = writtenElement!.provenance as Record<string, unknown>;
      expect(prov.parentBedId).toBe('beet-x');
    });
  });

  describe('IN-04: addPlantToPlan wirft bei lokalem Modus mit aussagekräftigem Fehler', () => {
    it('rejects mit account_erforderlich wenn mode="local" und ruft writePlanElement NICHT auf', async () => {
      mockMode = 'local';
      const BEET = makeBeet();
      mockLoadAcceptedElements.mockResolvedValue([BEET]);
      mockLoadDimensions.mockResolvedValue(MOCK_DIMS);

      const qc = newQC();
      const { result } = renderHook(() => useKalenderData(), { wrapper: wrap(qc) });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(result.current.addPlantToPlan(MOCK_PLANT)).rejects.toThrow('account_erforderlich');
      expect(mockWritePlanElement).not.toHaveBeenCalled();
    });
  });
});
