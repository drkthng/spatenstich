// Phase 10 Plan 05: WR-04 defensiver Breiten-Guard in GanttStreifen.
// Separates Testmodul damit die echten Engine-Tests (GanttStreifen.test.tsx) unberührt bleiben.
// Hier wird getFensterFuerPflanze auf Modul-Ebene gemockt — jest.mock() Hoisting sichert das ab.
import * as React from 'react';
import { render } from '@testing-library/react-native';
import type { PlantRow } from '@spatenstich/shared';

// Modul-Level-Mock: getFensterFuerPflanze liefert ein invertiertes Fenster (startKw > endKw)
// plus ein gültiges Fenster. Ohne Guard würde das invertierte einen negativen width-Prozentsatz erzeugen.
jest.mock('@spatenstich/shared', () => {
  const actual = jest.requireActual<typeof import('@spatenstich/shared')>('@spatenstich/shared');
  return {
    ...actual,
    getFensterFuerPflanze: jest.fn().mockReturnValue([
      // Invertiertes Fenster: startKw=30 > endKw=5 — zweite Verteidigungslinie, nach Engine-Fix
      // theoretisch nicht mehr möglich, aber defensiv abzusichern.
      { typ: 'Vorkultur' as const, startDoy: 1, endDoy: 10, startKw: 30, endKw: 5 },
      // Gültiges Fenster: soll normal gerendert werden
      { typ: 'Ernte' as const, startDoy: 200, endDoy: 260, startKw: 29, endKw: 37 },
    ]),
  };
});

// Import NACH jest.mock() — erhält den gemockten Namespace
import { GanttStreifen } from '../GanttStreifen';

// Minimale PlantRow — Felder irrelevant, da getFensterFuerPflanze gemockt
const MOCK_PLANT_GUARD: PlantRow = {
  id: 'guard-test-id',
  slug: 'guard-plant',
  nameDe: 'Guard-Testpflanze',
  nameAltDe: [],
  nameBotanical: 'Testus plantus',
  family: 'Testaceae',
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
  sowOutdoorDoyStart: null,
  sowOutdoorDoyEnd: null,
  plantDoyStart: null,
  plantDoyEnd: null,
  harvestDoyStart: null,
  harvestDoyEnd: null,
  daysToHarvest: null,
  dataSource: 'own-research',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('GanttStreifen — WR-04 defensiver Breiten-Guard', () => {
  it('WR-04: invertiertes Fenster (startKw=30 > endKw=5) wird übersprungen → nur 1 gültiger Balken', () => {
    // getFensterFuerPflanze gibt 2 Fenster zurück: 1 invertiert + 1 gültig.
    // Der Guard in GanttStreifen muss das invertierte überspringen (return null).
    // Ergebnis: genau 1 Balken (Ernte, KW 29-37).
    const { queryAllByTestId } = render(
      <GanttStreifen plant={MOCK_PLANT_GUARD} klimazone={4} />
    );
    const bars = queryAllByTestId('gantt-bar');
    // Invertiertes Fenster (startKw=30 > endKw=5) wird von Guard übersprungen
    // Gültiges Ernte-Fenster (startKw=29 <= endKw=37) wird gerendert
    expect(bars).toHaveLength(1);
  });

  it('WR-04: kein gantt-bar mit negativer Breite — GanttStreifen stürzt nicht ab', () => {
    // Smoke-Test: render wirft keinen Fehler trotz invertiertem Fenster in Mock
    expect(() => {
      render(<GanttStreifen plant={MOCK_PLANT_GUARD} klimazone={4} />);
    }).not.toThrow();
  });
});
