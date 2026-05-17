// Phase 9 Plan 02: useCompanionDetection hook tests.
// Pattern: usePlants.test.ts (TanStack wrapper + mock editorStore + mock plants bundle).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---- Mocks ----

// Mock editorStore
const mockElements: any[] = [];
const mockSubscribers: Array<(state: any, prev: any) => void> = [];
const mockUpdateElement = jest.fn();

jest.mock('../../stores/editorStore', () => ({
  useEditorStore: Object.assign(
    (selector: (s: any) => any) => selector({ elements: mockElements }),
    {
      subscribe: (fn: (state: any, prev: any) => void) => {
        mockSubscribers.push(fn);
        return () => {
          const idx = mockSubscribers.indexOf(fn);
          if (idx >= 0) mockSubscribers.splice(idx, 1);
        };
      },
      getState: () => ({
        elements: mockElements,
        updateElement: mockUpdateElement,
      }),
    },
  ),
}));

// Mock plantRepo + supabase (transitive deps)
jest.mock('../../lib/plantRepo', () => ({
  loadAllPlants: jest.fn().mockImplementation(() => new Promise(() => {})),
}));
jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

// Mock plants bundle with 3 plants + 2 companion pairs
jest.mock('@spatenstich/shared/data/plants', () => ({
  __esModule: true,
  default: {
    schemaVersion: 'plant-db.v1',
    plants: [
      {
        slug: 'tomate',
        nameDe: 'Tomate',
        nameAltDe: ['Paradeiser'],
        nameBotanical: 'Solanum lycopersicum',
        family: 'Solanaceae',
        category: 'Gemuese',
        sunRequirement: 'sonnig',
        waterNeeds: 'hoch',
        iconEmoji: null,
        dataSource: 'own-research',
      },
      {
        slug: 'kartoffel',
        nameDe: 'Kartoffel',
        nameAltDe: ['Erdapfel'],
        nameBotanical: 'Solanum tuberosum',
        family: 'Solanaceae',
        category: 'Gemuese',
        sunRequirement: 'sonnig',
        waterNeeds: 'mittel',
        iconEmoji: null,
        dataSource: 'own-research',
      },
      {
        slug: 'basilikum',
        nameDe: 'Basilikum',
        nameAltDe: [],
        nameBotanical: 'Ocimum basilicum',
        family: 'Lamiaceae',
        category: 'Kraut',
        sunRequirement: 'sonnig',
        waterNeeds: 'mittel',
        iconEmoji: null,
        dataSource: 'own-research',
      },
    ],
    companions: [
      {
        plantASlug: 'kartoffel',
        plantBSlug: 'tomate',
        relationship: 'incompatible',
        source: 'own-research',
        notes: null,
      },
      {
        plantASlug: 'tomate',
        plantBSlug: 'basilikum',
        relationship: 'companion',
        source: 'own-research',
        notes: null,
      },
    ],
  },
}));

// Mock authStore (transitive dep from editorStore auto-save subscription)
jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ mode: 'account', userId: 'test-user' }),
  },
}));

// Mock saveDebounce (transitive dep from editorStore)
jest.mock('../../lib/editor/saveDebounce', () => ({
  scheduleSaveElement: jest.fn(),
}));

// Import after mocks
import {
  buildCompanionMap,
  computeConflicts,
  computeToastForElement,
  findBedForPlant,
  getBedPolygon,
  bestEffortSlugFromLabel,
  useCompanionDetection,
} from '../useCompanionDetection';
import type { PlanElementRow, PlantRow } from '@spatenstich/shared';

// ---- Helpers ----

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

/** 4x4 bed polygon as a square from (0,0) to (4,4) */
const BED_POLYGON = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
];

function makeBed(id: string, polygonPointsM = BED_POLYGON): PlanElementRow {
  return {
    id,
    gardenId: 'g1',
    elementType: 'Beet',
    label: 'Test-Beet',
    xM: 2,
    yM: 2,
    widthM: 4,
    heightM: 4,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    updatedByUserId: 'u1',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual', polygonPointsM },
    layer: 'infrastructure',
  };
}

function makePlant(
  id: string,
  slug: string | null,
  xM: number,
  yM: number,
  label = 'Plant',
  parentBedId?: string,
): PlanElementRow {
  return {
    id,
    gardenId: 'g1',
    elementType: 'Pflanze',
    label,
    xM,
    yM,
    widthM: 0.3,
    heightM: 0.3,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    updatedByUserId: 'u1',
    deletedAt: null,
    importedFrom: null,
    provenance: {
      source: 'manual',
      ...(slug ? { plantSlug: slug } : {}),
      ...(parentBedId ? { parentBedId } : {}),
    },
    layer: 'seasonal',
  };
}

// Plant DB data for pure function tests
const TEST_PLANTS: PlantRow[] = [
  {
    id: 'bundle:tomate',
    slug: 'tomate',
    nameDe: 'Tomate',
    nameAltDe: ['Paradeiser'],
    nameBotanical: 'Solanum lycopersicum',
    family: 'Solanaceae',
    category: 'Gemüse',
    sunRequirement: 'sonnig',
    waterNeeds: 'hoch',
    minSpacingCm: null,
    rowSpacingCm: null,
    depthCm: null,
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
    dataSource: 'own-research',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'bundle:kartoffel',
    slug: 'kartoffel',
    nameDe: 'Kartoffel',
    nameAltDe: ['Erdapfel'],
    nameBotanical: 'Solanum tuberosum',
    family: 'Solanaceae',
    category: 'Gemüse',
    sunRequirement: 'sonnig',
    waterNeeds: 'mittel',
    minSpacingCm: null,
    rowSpacingCm: null,
    depthCm: null,
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
    dataSource: 'own-research',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'bundle:basilikum',
    slug: 'basilikum',
    nameDe: 'Basilikum',
    nameAltDe: [],
    nameBotanical: 'Ocimum basilicum',
    family: 'Lamiaceae',
    category: 'Kraut',
    sunRequirement: 'sonnig',
    waterNeeds: 'mittel',
    minSpacingCm: null,
    rowSpacingCm: null,
    depthCm: null,
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
    dataSource: 'own-research',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
] as PlantRow[];

// ---- Tests ----

describe('useCompanionDetection', () => {
  beforeEach(() => {
    mockElements.length = 0;
    mockSubscribers.length = 0;
    mockUpdateElement.mockReset();
  });

  describe('buildCompanionMap', () => {
    it('builds bidirectional slug lookup from bundle companions', () => {
      const bundle = {
        schemaVersion: 'plant-db.v1' as const,
        plants: [],
        companions: [
          { plantASlug: 'kartoffel', plantBSlug: 'tomate', relationship: 'incompatible' as const, source: 'own-research' as const, notes: null },
          { plantASlug: 'tomate', plantBSlug: 'basilikum', relationship: 'companion' as const, source: 'own-research' as const, notes: null },
        ],
      };
      const map = buildCompanionMap(bundle);
      // kartoffel -> incompatible with tomate (bidirectional)
      expect(map.get('kartoffel')?.incompatibleSlugs.has('tomate')).toBe(true);
      expect(map.get('tomate')?.incompatibleSlugs.has('kartoffel')).toBe(true);
      // tomate -> companion with basilikum (bidirectional)
      expect(map.get('tomate')?.companionSlugs.has('basilikum')).toBe(true);
      expect(map.get('basilikum')?.companionSlugs.has('tomate')).toBe(true);
    });
  });

  describe('getBedPolygon', () => {
    it('extracts polygonPointsM from provenance', () => {
      const bed = makeBed('bed1');
      const polygon = getBedPolygon(bed);
      expect(polygon).toEqual(BED_POLYGON);
    });

    it('falls back to bbox rectangle when no polygonPointsM', () => {
      const bed = makeBed('bed1');
      bed.provenance = { source: 'manual' }; // no polygonPointsM
      const polygon = getBedPolygon(bed);
      expect(polygon.length).toBe(4);
      // Should create rectangle from xM/yM/widthM/heightM
      expect(polygon[0].x).toBeDefined();
    });
  });

  describe('findBedForPlant', () => {
    it('finds bed via parentBedId fast path', () => {
      const bed = makeBed('bed1');
      const plant = makePlant('p1', 'tomate', 2, 2, 'Tomate', 'bed1');
      const result = findBedForPlant(plant, [bed]);
      expect(result?.id).toBe('bed1');
    });

    it('finds bed via PiP fallback when no parentBedId', () => {
      const bed = makeBed('bed1');
      const plant = makePlant('p1', 'tomate', 2, 2); // inside 4x4 polygon at origin
      const result = findBedForPlant(plant, [bed]);
      expect(result?.id).toBe('bed1');
    });

    it('returns null for plant outside all beds', () => {
      const bed = makeBed('bed1');
      const plant = makePlant('p1', 'tomate', 100, 100); // far outside
      const result = findBedForPlant(plant, [bed]);
      expect(result).toBeNull();
    });
  });

  describe('bestEffortSlugFromLabel', () => {
    it('matches exact nameDe (case-insensitive)', () => {
      const plantByName = new Map<string, PlantRow>();
      for (const p of TEST_PLANTS) {
        plantByName.set(p.nameDe.toLowerCase(), p);
        for (const alt of p.nameAltDe) plantByName.set(alt.toLowerCase(), p);
      }
      expect(bestEffortSlugFromLabel('Tomate', plantByName)).toBe('tomate');
      expect(bestEffortSlugFromLabel('tomate', plantByName)).toBe('tomate');
    });

    it('matches nameAltDe (case-insensitive)', () => {
      const plantByName = new Map<string, PlantRow>();
      for (const p of TEST_PLANTS) {
        plantByName.set(p.nameDe.toLowerCase(), p);
        for (const alt of p.nameAltDe) plantByName.set(alt.toLowerCase(), p);
      }
      expect(bestEffortSlugFromLabel('Paradeiser', plantByName)).toBe('tomate');
    });

    it('returns null for unknown label', () => {
      const plantByName = new Map<string, PlantRow>();
      expect(bestEffortSlugFromLabel('Unbekannt', plantByName)).toBeNull();
    });
  });

  describe('computeConflicts', () => {
    let plantBySlug: Map<string, PlantRow>;
    let companionMap: ReturnType<typeof buildCompanionMap>;

    beforeEach(() => {
      plantBySlug = new Map(TEST_PLANTS.map((p) => [p.slug, p]));
      companionMap = buildCompanionMap({
        schemaVersion: 'plant-db.v1',
        plants: [],
        companions: [
          { plantASlug: 'kartoffel', plantBSlug: 'tomate', relationship: 'incompatible', source: 'own-research', notes: null },
          { plantASlug: 'tomate', plantBSlug: 'basilikum', relationship: 'companion', source: 'own-research', notes: null },
        ],
      });
    });

    it('kartoffel + tomate in same bed -> both in conflictElementIds', () => {
      const bed = makeBed('bed1');
      const tomate = makePlant('p-tomate', 'tomate', 1, 1);
      const kartoffel = makePlant('p-kartoffel', 'kartoffel', 2, 2);
      const elements = [bed, tomate, kartoffel];
      const conflicts = computeConflicts(elements, plantBySlug, companionMap);
      expect(conflicts.has('p-tomate')).toBe(true);
      expect(conflicts.has('p-kartoffel')).toBe(true);
    });

    it('tomate + basilikum in same bed -> no conflict', () => {
      const bed = makeBed('bed1');
      const tomate = makePlant('p-tomate', 'tomate', 1, 1);
      const basilikum = makePlant('p-basilikum', 'basilikum', 2, 2);
      const elements = [bed, tomate, basilikum];
      const conflicts = computeConflicts(elements, plantBySlug, companionMap);
      expect(conflicts.size).toBe(0);
    });

    it('plant outside all beds -> empty conflictElementIds', () => {
      const bed = makeBed('bed1');
      const tomate = makePlant('p-tomate', 'tomate', 100, 100);
      const elements = [bed, tomate];
      const conflicts = computeConflicts(elements, plantBySlug, companionMap);
      expect(conflicts.size).toBe(0);
    });

    it('plant without plantSlug -> no companion check (D-14)', () => {
      const bed = makeBed('bed1');
      const noSlug = makePlant('p-noslug', null, 1, 1);
      const tomate = makePlant('p-tomate', 'tomate', 2, 2);
      const elements = [bed, noSlug, tomate];
      const conflicts = computeConflicts(elements, plantBySlug, companionMap);
      expect(conflicts.size).toBe(0); // no conflict because noSlug has no plantSlug
    });

    it('multiple conflicts in same bed -> all conflicting ids present', () => {
      // Add a second kartoffel to have more conflicts
      const bed = makeBed('bed1');
      const tomate = makePlant('p-tomate', 'tomate', 1, 1);
      const kartoffel1 = makePlant('p-kartoffel1', 'kartoffel', 2, 2);
      const kartoffel2 = makePlant('p-kartoffel2', 'kartoffel', 3, 3);
      const elements = [bed, tomate, kartoffel1, kartoffel2];
      const conflicts = computeConflicts(elements, plantBySlug, companionMap);
      expect(conflicts.has('p-tomate')).toBe(true);
      expect(conflicts.has('p-kartoffel1')).toBe(true);
      expect(conflicts.has('p-kartoffel2')).toBe(true);
    });
  });

  describe('computeToastForElement', () => {
    let plantBySlug: Map<string, PlantRow>;
    let companionMap: ReturnType<typeof buildCompanionMap>;

    beforeEach(() => {
      plantBySlug = new Map(TEST_PLANTS.map((p) => [p.slug, p]));
      companionMap = buildCompanionMap({
        schemaVersion: 'plant-db.v1',
        plants: [],
        companions: [
          { plantASlug: 'kartoffel', plantBSlug: 'tomate', relationship: 'incompatible', source: 'own-research', notes: null },
          { plantASlug: 'tomate', plantBSlug: 'basilikum', relationship: 'companion', source: 'own-research', notes: null },
        ],
      });
    });

    it('tomate + basilikum -> toast variant success', () => {
      const bed = makeBed('bed1');
      const tomate = makePlant('p-tomate', 'tomate', 1, 1);
      const basilikum = makePlant('p-basilikum', 'basilikum', 2, 2);
      const elements = [bed, tomate, basilikum];
      const toast = computeToastForElement(basilikum, elements, plantBySlug, companionMap);
      expect(toast).not.toBeNull();
      expect(toast!.variant).toBe('success');
    });

    it('conflict priority: tomate with both companion (basilikum) and incompatible (kartoffel) -> toast variant error (D-08)', () => {
      const bed = makeBed('bed1');
      const tomate = makePlant('p-tomate', 'tomate', 1, 1);
      const basilikum = makePlant('p-basilikum', 'basilikum', 2, 2);
      const kartoffel = makePlant('p-kartoffel', 'kartoffel', 3, 3);
      const elements = [bed, tomate, basilikum, kartoffel];
      const toast = computeToastForElement(tomate, elements, plantBySlug, companionMap);
      expect(toast).not.toBeNull();
      expect(toast!.variant).toBe('error');
    });

    it('plant outside bed -> null toast', () => {
      const bed = makeBed('bed1');
      const tomate = makePlant('p-tomate', 'tomate', 100, 100);
      const elements = [bed, tomate];
      const toast = computeToastForElement(tomate, elements, plantBySlug, companionMap);
      expect(toast).toBeNull();
    });
  });

  describe('hook integration', () => {
    it('returns conflictElementIds and toastState from hook', () => {
      const qc = newQC();
      const { result } = renderHook(() => useCompanionDetection(), {
        wrapper: wrap(qc),
      });
      expect(result.current.conflictElementIds).toBeDefined();
      expect(result.current.toastState).toBeNull();
      expect(typeof result.current.dismissToast).toBe('function');
    });
  });
});
