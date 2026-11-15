// Phase 38 (DESIGN3-07): the calendar screen has a search and the two lists "In eurem Plan"
// and "Alle Pflanzen"; "Diese Woche" is about the plan as soon as plants stand in it.
// (The former switch "Nur meine Pflanzen" and its tests are gone with the switch.)
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { PlantRow } from '@spatenstich/shared';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('@/src/hooks/usePlants', () => ({
  usePlants: jest.fn(),
}));

jest.mock('@/src/hooks/useKalenderData', () => ({
  useKalenderData: jest.fn(),
}));

import { usePlants } from '@/src/hooks/usePlants';
import { useKalenderData } from '@/src/hooks/useKalenderData';
import KalenderScreen from '../../../../app/(app)/kalender/index';

function plant(slug: string, nameDe: string, patch: Partial<PlantRow> = {}): PlantRow {
  return {
    id: `bundle:${slug}`,
    slug,
    nameDe,
    nameAltDe: [],
    nameBotanical: null,
    family: 'Familie',
    category: 'Gemüse',
    sunRequirement: 'sonnig',
    waterNeeds: 'mittel',
    climateZoneMin: null,
    climateZoneMax: null,
    minSpacingCm: 30,
    rowSpacingCm: null,
    depthCm: null,
    perennial: false,
    nitrogenFixing: false,
    notesDe: null,
    iconEmoji: null,
    sowIndoorDoyStart: null,
    sowIndoorDoyEnd: null,
    sowOutdoorDoyStart: 80,
    sowOutdoorDoyEnd: 120,
    plantDoyStart: null,
    plantDoyEnd: null,
    harvestDoyStart: 180,
    harvestDoyEnd: 250,
    daysToHarvest: null,
    dataSource: 'own-research',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...patch,
  } as PlantRow;
}

const PLANTS = [
  plant('tomate', 'Tomate', { nameBotanical: 'Solanum lycopersicum' }),
  plant('moehre', 'Möhre', { nameAltDe: ['Karotte'] }),
  plant('aepfel', 'Äpfel'),
  plant('salat', 'Salat'),
];

const baseHookReturn = {
  wochenAktionen: [],
  meinePflanzenslugs: new Set<string>(['tomate']),
  aktuelleKw: 24,
  klimazone: 4 as any,
  elements: [],
  dimensions: null,
  hasBeetImPlan: false,
  loading: false,
  addPlantToPlan: jest.fn(),
  refresh: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (usePlants as jest.Mock).mockReturnValue({ data: PLANTS });
  (useKalenderData as jest.Mock).mockReturnValue({ ...baseHookReturn });
});

describe('Kalender: sections', () => {
  it('lists the plants of the plan under "In eurem Plan" and every plant under "Alle Pflanzen"', () => {
    const { getByText, queryByTestId, getByTestId } = render(<KalenderScreen />);
    expect(getByText('In eurem Plan')).toBeTruthy();
    expect(getByText('Alle Pflanzen')).toBeTruthy();
    expect(getByTestId('kalender-plan-tomate')).toBeTruthy();
    expect(queryByTestId('kalender-plan-salat')).toBeNull();
    for (const slug of ['tomate', 'moehre', 'aepfel', 'salat']) {
      expect(getByTestId(`kalender-alle-${slug}`)).toBeTruthy();
    }
  });

  it('"Alle Pflanzen" runs from A to Z under letter headings, Ä filed under A', () => {
    const { getByTestId, queryByTestId } = render(<KalenderScreen />);
    for (const letter of ['A', 'M', 'S', 'T']) expect(getByTestId(`kalender-buchstabe-${letter}`)).toBeTruthy();
    expect(queryByTestId('kalender-buchstabe-Ä')).toBeNull();
  });

  it('marks in the full list which plants stand in the plan', () => {
    const { getAllByText } = render(<KalenderScreen />);
    expect(getAllByText('im Plan')).toHaveLength(1);
  });

  it('without plants in the plan the first section says so and offers the plan', () => {
    (useKalenderData as jest.Mock).mockReturnValue({ ...baseHookReturn, meinePflanzenslugs: new Set<string>() });
    const { getByText } = render(<KalenderScreen />);
    expect(getByText(/Im Plan stehen noch keine Pflanzen/)).toBeTruthy();
    fireEvent.press(getByText('Plan öffnen'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/plan');
  });

  it('a row opens the page of its plant', () => {
    const { getByTestId } = render(<KalenderScreen />);
    fireEvent.press(getByTestId('kalender-alle-salat'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/kalender/salat');
  });

  it('every strip carries a mark for today', () => {
    const { getAllByTestId } = render(<KalenderScreen />);
    // One strip in the plan section, four in the full list.
    expect(getAllByTestId('gantt-heute')).toHaveLength(5);
  });
});

describe('Kalender: search', () => {
  it('narrows both lists, by another German name or the botanical name too', () => {
    const { getByTestId, queryByTestId } = render(<KalenderScreen />);
    fireEvent.changeText(getByTestId('kalender-suche'), 'karot');
    expect(getByTestId('kalender-alle-moehre')).toBeTruthy();
    expect(queryByTestId('kalender-alle-tomate')).toBeNull();
    expect(getByTestId('kalender-im-plan-leer')).toBeTruthy();

    fireEvent.changeText(getByTestId('kalender-suche'), 'solanum');
    expect(getByTestId('kalender-alle-tomate')).toBeTruthy();
    expect(getByTestId('kalender-plan-tomate')).toBeTruthy();
  });

  it('finds "Möhre" typed without the umlaut', () => {
    const { getByTestId } = render(<KalenderScreen />);
    fireEvent.changeText(getByTestId('kalender-suche'), 'moehre');
    expect(getByTestId('kalender-alle-moehre')).toBeTruthy();
  });

  it('says when nothing is found, and the clear button brings everything back', () => {
    const { getByTestId, queryByTestId } = render(<KalenderScreen />);
    fireEvent.changeText(getByTestId('kalender-suche'), 'xyz');
    expect(getByTestId('kalender-alle-leer')).toBeTruthy();
    fireEvent.press(getByTestId('kalender-suche-leeren'));
    expect(queryByTestId('kalender-alle-leer')).toBeNull();
    expect(getByTestId('kalender-alle-salat')).toBeTruthy();
  });

  it('"Diese Woche" steps aside while searching', () => {
    const { getByTestId, queryByTestId } = render(<KalenderScreen />);
    expect(getByTestId('kalender-woche')).toBeTruthy();
    fireEvent.changeText(getByTestId('kalender-suche'), 'tom');
    expect(queryByTestId('kalender-woche')).toBeNull();
  });
});

describe('Kalender: this week', () => {
  const fenster = { typ: 'Ernte' as const, startDoy: 180, endDoy: 250, startKw: 26, endKw: 36 };

  it('says whether it is about the plan or about all plants', () => {
    const { getByTestId, rerender } = render(<KalenderScreen />);
    expect(getByTestId('kalender-woche-quelle').props.children).toMatch(/in eurem Plan/);
    (useKalenderData as jest.Mock).mockReturnValue({ ...baseHookReturn, meinePflanzenslugs: new Set<string>() });
    rerender(<KalenderScreen />);
    expect(getByTestId('kalender-woche-quelle').props.children).toMatch(/Aus allen Pflanzen/);
  });

  it('asks the data hook without a filter of its own', () => {
    render(<KalenderScreen />);
    expect((useKalenderData as jest.Mock).mock.calls[0]).toEqual([]);
  });

  it('a long list shows six entries and opens on request', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ plant: plant(`p${i}`, `Pflanze ${i}`), fenster }));
    (useKalenderData as jest.Mock).mockReturnValue({ ...baseHookReturn, wochenAktionen: many });
    const { getByTestId, queryByText, getByText } = render(<KalenderScreen />);
    expect(queryByText('Pflanze 8')).toBeNull();
    fireEvent.press(getByTestId('kalender-woche-mehr'));
    expect(getByText('Pflanze 8')).toBeTruthy();
  });

  it('names the kind of action in words next to the plant', () => {
    (useKalenderData as jest.Mock).mockReturnValue({
      ...baseHookReturn,
      wochenAktionen: [{ plant: PLANTS[0], fenster }],
    });
    const { getByLabelText } = render(<KalenderScreen />);
    expect(getByLabelText('Tomate, Ernte, Kalender öffnen')).toBeTruthy();
  });
});

describe('Kalender: without a postcode', () => {
  it('says that it reckons with middle times', () => {
    (useKalenderData as jest.Mock).mockReturnValue({ ...baseHookReturn, klimazone: null });
    const { getByText } = render(<KalenderScreen />);
    expect(getByText(/Ohne Postleitzahl rechnet der Kalender/)).toBeTruthy();
  });
});
