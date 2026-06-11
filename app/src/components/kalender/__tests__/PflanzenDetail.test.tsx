// Phase 10 Plan 04: Pflanzen-Detail screen unit tests (CAL-05, CAL-06).
// Tests:
// (a) Phase-8 info strings render (Mindestabstand, Sonnenbedarf, Familie)
// (b) hasBeetImPlan=false → keinBeetImPlan InlineBanner + no add button
// (c) hasBeetImPlan=true → pressing add button calls addPlantToPlan once with the plant
// (d) same-family plant in a bed → fruchtfolge-warnung testID appears
import * as React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import type { PlantRow, PlanElementRow } from '@spatenstich/shared';

// ── Router mock ───────────────────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));

// ── usePlants mock ────────────────────────────────────────────────────────────
jest.mock('@/src/hooks/usePlants', () => ({
  usePlants: jest.fn(),
}));

// ── useKalenderData mock ──────────────────────────────────────────────────────
jest.mock('@/src/hooks/useKalenderData', () => ({
  useKalenderData: jest.fn(),
}));

// ── kalenderBeete mock ────────────────────────────────────────────────────────
jest.mock('@/src/lib/kalenderBeete', () => ({
  findBeeteForPlant: jest.fn(),
  getPlantSlug: jest.fn((el: any) => {
    const prov = el.provenance as Record<string, unknown> | null;
    if (!prov || typeof prov.plantSlug !== 'string') return null;
    return prov.plantSlug;
  }),
}));

// ── @spatenstich/shared mock ──────────────────────────────────────────────────
jest.mock('@spatenstich/shared', () => ({
  getFensterFuerPflanze: jest.fn(() => []),
  pruefeEinfacheFruchtfolge: jest.fn(() => ({ warnung: false, grund: null })),
}));

// ── Import screen after mocks ─────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { usePlants } from '@/src/hooks/usePlants';
import { useKalenderData } from '@/src/hooks/useKalenderData';
import { findBeeteForPlant } from '@/src/lib/kalenderBeete';
import { pruefeEinfacheFruchtfolge } from '@spatenstich/shared';
import PflanzenDetailScreen from '../../../../app/(app)/kalender/[slug]';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_PLANT: PlantRow = {
  id: 'bundle:tomate',
  slug: 'tomate',
  nameDe: 'Tomate',
  nameAltDe: [],
  nameBotanical: 'Solanum lycopersicum',
  family: 'Solanaceae',
  category: 'Gemüse',
  sunRequirement: 'sonnig',
  waterNeeds: 'mittel',
  climateZoneMin: null,
  climateZoneMax: null,
  minSpacingCm: 60,
  rowSpacingCm: null,
  depthCm: null,
  perennial: false,
  nitrogenFixing: false,
  notesDe: null,
  iconEmoji: '🍅',
  sowIndoorDoyStart: 60,
  sowIndoorDoyEnd: 90,
  sowOutdoorDoyStart: null,
  sowOutdoorDoyEnd: null,
  plantDoyStart: 130,
  plantDoyEnd: 150,
  harvestDoyStart: 200,
  harvestDoyEnd: 260,
  daysToHarvest: 90,
  dataSource: 'own-research',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// A bed element
const MOCK_BEET: PlanElementRow = {
  id: 'beet-1',
  gardenId: 'garden-1',
  elementType: 'Beet',
  label: 'Südseite',
  xM: 0,
  yM: 0,
  widthM: 3,
  heightM: 2,
  confidence: null,
  isAccepted: true,
  importedFrom: null,
  provenance: null,
  layer: 'infrastructure',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  updatedByUserId: 'user-1',
  deletedAt: null,
};

// A Pflanze element for same-family test
const MOCK_PFLANZE_PAPRIKA: PlanElementRow = {
  id: 'pflanze-paprika-1',
  gardenId: 'garden-1',
  elementType: 'Pflanze',
  label: 'Paprika',
  xM: 0.5,
  yM: 0.5,
  widthM: 0.3,
  heightM: 0.3,
  confidence: null,
  isAccepted: true,
  importedFrom: null,
  provenance: { plantSlug: 'paprika' },
  layer: 'seasonal',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  updatedByUserId: 'user-1',
  deletedAt: null,
};

// Helper: base hook return with hasBeetImPlan=true
const baseKalenderData = {
  elements: [MOCK_BEET],
  klimazone: 4,
  hasBeetImPlan: true,
  addPlantToPlan: jest.fn().mockResolvedValue(MOCK_PLANT),
  loading: false,
  wochenAktionen: [],
  meinePflanzenslugs: new Set<string>(),
  aktuelleKw: 24,
  dimensions: { id: 'dim-1', gardenId: 'garden-1', widthM: 10, heightM: 8, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', updatedByUserId: 'user-1', deletedAt: null } as any,
  refresh: jest.fn(),
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ slug: 'tomate' });
  (usePlants as jest.Mock).mockReturnValue({ data: [MOCK_PLANT] });
  (useKalenderData as jest.Mock).mockReturnValue({ ...baseKalenderData, addPlantToPlan: jest.fn().mockResolvedValue(MOCK_PLANT) });
  (findBeeteForPlant as jest.Mock).mockReturnValue([]);
  (pruefeEinfacheFruchtfolge as jest.Mock).mockReturnValue({ warnung: false, grund: null });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PflanzenDetailScreen', () => {
  // (a) Phase-8 info strings render
  it('(a) renders Phase-8 plant info: Mindestabstand, Sonnenbedarf, Familie', () => {
    const { getByText } = render(<PflanzenDetailScreen />);
    // Mindestabstand with the plant's minSpacingCm value
    expect(getByText(/Mindestabstand: 60 cm/)).toBeTruthy();
    // Sonnenbedarf
    expect(getByText(/Sonnenbedarf: sonnig/)).toBeTruthy();
    // Familie
    expect(getByText(/Familie: Solanaceae/)).toBeTruthy();
  });

  // (b) hasBeetImPlan=false → keinBeetImPlan warning, no add button
  it('(b) when hasBeetImPlan=false: shows keinBeetImPlan banner, no add button', () => {
    (useKalenderData as jest.Mock).mockReturnValue({
      ...baseKalenderData,
      hasBeetImPlan: false,
      elements: [],
    });
    const { queryByTestId, getByText } = render(<PflanzenDetailScreen />);
    // keinBeetImPlan text is present
    expect(getByText(/Noch kein Beet im Plan/)).toBeTruthy();
    // add button is absent
    expect(queryByTestId('detail-add-to-plan-button')).toBeNull();
  });

  // (c) hasBeetImPlan=true → pressing add button calls addPlantToPlan with the plant
  it('(c) when hasBeetImPlan=true: pressing add button calls addPlantToPlan with plant', async () => {
    const mockAdd = jest.fn().mockResolvedValue(MOCK_PLANT);
    (useKalenderData as jest.Mock).mockReturnValue({
      ...baseKalenderData,
      hasBeetImPlan: true,
      addPlantToPlan: mockAdd,
    });
    const { getByTestId } = render(<PflanzenDetailScreen />);
    const addButton = getByTestId('detail-add-to-plan-button');
    fireEvent.press(addButton);
    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledTimes(1);
      expect(mockAdd).toHaveBeenCalledWith(MOCK_PLANT);
    });
  });

  // (d) same-family plant in a bed → fruchtfolge-warnung testID appears
  it('(d) same-family plant in bed → renders fruchtfolge-warnung testID', () => {
    // MOCK_PLANT is Solanaceae (tomate); MOCK_PFLANZE_PAPRIKA is also Solanaceae (paprika)
    // Setup: elements include the bed and the paprika Pflanze
    (useKalenderData as jest.Mock).mockReturnValue({
      ...baseKalenderData,
      elements: [MOCK_BEET, MOCK_PFLANZE_PAPRIKA],
      hasBeetImPlan: true,
    });
    // findBeeteForPlant returns the bed (plant placed in it for context)
    (findBeeteForPlant as jest.Mock).mockReturnValue([MOCK_BEET]);
    // pruefeEinfacheFruchtfolge returns a warning
    (pruefeEinfacheFruchtfolge as jest.Mock).mockReturnValue({
      warnung: true,
      grund: 'Fruchtfolge: Solanaceae bereits im Beet (paprika)',
    });
    // Add paprika to usePlants so family lookup resolves
    const paprikaPlant: PlantRow = {
      ...MOCK_PLANT,
      id: 'bundle:paprika',
      slug: 'paprika',
      nameDe: 'Paprika',
      family: 'Solanaceae',
    };
    (usePlants as jest.Mock).mockReturnValue({ data: [MOCK_PLANT, paprikaPlant] });

    const { getByTestId } = render(<PflanzenDetailScreen />);
    expect(getByTestId('fruchtfolge-warnung')).toBeTruthy();
  });
});
