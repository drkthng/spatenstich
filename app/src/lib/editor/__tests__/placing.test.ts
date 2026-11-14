// Phase 31: palette items, plant search and placement helpers.

import type { PlanElementRow, PlantRow } from '@spatenstich/shared';
import {
  bedAt,
  isTooClose,
  kindItem,
  placementProvenance,
  plantItem,
  previewElement,
  searchPlants,
} from '../placing';

function plant(slug: string, nameDe: string, extra: Partial<PlantRow> = {}): PlantRow {
  return {
    slug,
    nameDe,
    nameAltDe: [],
    nameBotanical: null,
    minSpacingCm: null,
    ...extra,
  } as unknown as PlantRow;
}

function el(id: string, overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id,
    gardenId: 'g',
    elementType: 'Beet',
    label: id,
    xM: 5,
    yM: 5,
    widthM: 2,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T10:00:00.000Z',
    updatedByUserId: null,
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: 'infrastructure',
    ...overrides,
  };
}

const PLANTS = [
  plant('tomate', 'Tomate', { nameAltDe: ['Paradeiser'], nameBotanical: 'Solanum lycopersicum', minSpacingCm: 60 }),
  plant('basilikum', 'Basilikum', { minSpacingCm: 25 }),
  plant('bohne', 'Buschbohne'),
  plant('kartoffel', 'Kartoffel', { nameBotanical: 'Solanum tuberosum' }),
];

describe('palette items', () => {
  it('element kinds take their default size', () => {
    expect(kindItem('Rasen', 'Rasen')).toMatchObject({ kind: 'Rasen', widthM: 4, heightM: 3 });
    expect(kindItem('Unbekannt', 'x')).toMatchObject({ widthM: 1, heightM: 1 });
  });

  it('plants carry slug and spacing in metres', () => {
    expect(plantItem(PLANTS[0])).toMatchObject({
      kind: 'Pflanze',
      label: 'Tomate',
      plantSlug: 'tomate',
      spacingM: 0.6,
    });
    expect(plantItem(PLANTS[2]).spacingM).toBe(0.3);
  });
});

describe('plant search', () => {
  it('lists all plants alphabetically without a query', () => {
    expect(searchPlants(PLANTS, '').map((p) => p.slug)).toEqual(['basilikum', 'bohne', 'kartoffel', 'tomate']);
  });

  it('finds by name, ignoring case; names starting with the query come first', () => {
    // "Kartoffel" only contains a b in its botanical name (tuberosum), so it comes last.
    expect(searchPlants(PLANTS, 'b').map((p) => p.slug)).toEqual(['basilikum', 'bohne', 'kartoffel']);
    expect(searchPlants(PLANTS, 'BOHN').map((p) => p.slug)).toEqual(['bohne']);
  });

  it('finds by alternative and botanical name', () => {
    expect(searchPlants(PLANTS, 'parad').map((p) => p.slug)).toEqual(['tomate']);
    expect(searchPlants(PLANTS, 'solanum').map((p) => p.slug)).toEqual(['kartoffel', 'tomate']);
  });

  it('returns nothing for an unknown name', () => {
    expect(searchPlants(PLANTS, 'zzz')).toEqual([]);
  });
});

describe('placement', () => {
  it('bedAt follows the bed rotation and prefers the bed on top', () => {
    const turned = el('turned', { provenance: { rotateDeg: 90, zOrder: 1 } });
    // 2 × 1 bed turned by 90°: 1 wide, 2 tall.
    expect(bedAt([turned], 5, 5.9)?.id).toBe('turned');
    expect(bedAt([turned], 5.9, 5)).toBeUndefined();
    const upper = el('upper', { provenance: { zOrder: 5 } });
    expect(bedAt([turned, upper], 5, 5)?.id).toBe('upper');
    expect(bedAt([el('lawn', { elementType: 'Rasen' })], 5, 5)).toBeUndefined();
  });

  it('a plant placed in a bed remembers the bed; outside it does not', () => {
    const item = plantItem(PLANTS[0]);
    const beds = [el('bed')];
    expect(placementProvenance(item, { xM: 5, yM: 5 }, beds)).toEqual({
      source: 'manual',
      plantSlug: 'tomate',
      parentBedId: 'bed',
    });
    expect(placementProvenance(item, { xM: 9, yM: 9 }, beds)).toEqual({ source: 'manual', plantSlug: 'tomate' });
    expect(placementProvenance(kindItem('Weg', 'Weg'), { xM: 5, yM: 5 }, beds)).toEqual({ source: 'manual' });
  });

  it('the preview element stands in for the plant before it is placed', () => {
    const preview = previewElement(plantItem(PLANTS[1]), { xM: 5, yM: 5 }, [el('bed')]);
    expect(preview).toMatchObject({
      elementType: 'Pflanze',
      layer: 'seasonal',
      xM: 5,
      provenance: { plantSlug: 'basilikum', parentBedId: 'bed' },
    });
  });

  it('warns when another plant stands inside the spacing', () => {
    const item = plantItem(PLANTS[0]); // 60 cm
    const neighbour = el('p', { elementType: 'Pflanze', layer: 'seasonal', xM: 5.4, yM: 5 });
    expect(isTooClose(item, { xM: 5, yM: 5 }, [neighbour])).toBe(true);
    expect(isTooClose(item, { xM: 4, yM: 5 }, [neighbour])).toBe(false);
    expect(isTooClose(kindItem('Beet', 'Beet'), { xM: 5, yM: 5 }, [neighbour])).toBe(false);
  });
});
