// Phase 10 Plan 03: GanttStreifen component tests (CAL-01).
// Replaces Wave-0 it.todo stub from Plan 01.
// Tests: View-bar rendering per Aktionstyp window, colors, accessibility.
import * as React from 'react';
import { render } from '@testing-library/react-native';
import { GanttStreifen } from '../GanttStreifen';
import type { PlantRow } from '@spatenstich/shared';

// Minimal PlantRow mock with DOY fields that yield 3 windows:
// Vorkultur (sowIndoor), Auspflanzen (plant), Ernte (harvest).
// No sowOutdoor → no Direktsaat window.
const MOCK_PLANT: PlantRow = {
  id: 'test-id-1',
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
  iconEmoji: null,
  // Vorkultur: DOY 60-90 (Zone 4 offset 0) → KW 9-13
  sowIndoorDoyStart: 60,
  sowIndoorDoyEnd: 90,
  // No Direktsaat
  sowOutdoorDoyStart: null,
  sowOutdoorDoyEnd: null,
  // Auspflanzen: DOY 130-150 → KW 19-21
  plantDoyStart: 130,
  plantDoyEnd: 150,
  // Ernte: DOY 200-260 → KW 29-37
  harvestDoyStart: 200,
  harvestDoyEnd: 260,
  daysToHarvest: null,
  dataSource: 'own-research',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// Plant with no DOY windows
const MOCK_PLANT_EMPTY: PlantRow = {
  ...MOCK_PLANT,
  id: 'test-id-2',
  slug: 'empty-plant',
  nameDe: 'Leerpflanze',
  sowIndoorDoyStart: null,
  sowIndoorDoyEnd: null,
  sowOutdoorDoyStart: null,
  sowOutdoorDoyEnd: null,
  plantDoyStart: null,
  plantDoyEnd: null,
  harvestDoyStart: null,
  harvestDoyEnd: null,
  daysToHarvest: null,
};

describe('GanttStreifen', () => {
  it('renders one positioned bar View per KalenderFenster (Vorkultur + Auspflanzen + Ernte = 3 bars)', () => {
    const { getAllByTestId } = render(
      <GanttStreifen plant={MOCK_PLANT} klimazone={4} />
    );
    const bars = getAllByTestId('gantt-bar');
    expect(bars).toHaveLength(3);
  });

  it('renders zero gantt-bar children for a plant with no DOY windows', () => {
    const { queryAllByTestId, getByLabelText } = render(
      <GanttStreifen plant={MOCK_PLANT_EMPTY} klimazone={4} />
    );
    const bars = queryAllByTestId('gantt-bar');
    expect(bars).toHaveLength(0);
    // Track View still renders (outer container)
    expect(getByLabelText('Gantt-Diagramm für Leerpflanze')).toBeTruthy();
  });

  it('outer track View carries accessibilityLabel that includes the plant nameDe', () => {
    const { getByLabelText } = render(
      <GanttStreifen plant={MOCK_PLANT} klimazone={4} />
    );
    // accessibilityLabel must contain the plant name
    expect(getByLabelText('Gantt-Diagramm für Tomate')).toBeTruthy();
  });

  it('each bar has a backgroundColor matching the FARBEN map for its Aktionstyp', () => {
    const EXPECTED_COLORS: Record<string, string> = {
      Vorkultur: '#A78BFA',
      Auspflanzen: '#60A5FA',
      Ernte: '#FB923C',
    };
    const { getAllByTestId } = render(
      <GanttStreifen plant={MOCK_PLANT} klimazone={4} />
    );
    const bars = getAllByTestId('gantt-bar');
    // Collect the backgroundColor values from each bar's style
    const colors = bars.map((bar) => {
      const style = bar.props.style;
      // style may be an array or object
      const styleObj = Array.isArray(style) ? Object.assign({}, ...style) : style;
      return styleObj.backgroundColor as string;
    });
    // All three expected colors must be present
    Object.values(EXPECTED_COLORS).forEach((hex) => {
      expect(colors).toContain(hex);
    });
  });
});
