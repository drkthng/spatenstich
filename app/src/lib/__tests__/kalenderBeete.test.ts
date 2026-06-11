// Phase 10 Plan 02: Tests for kalenderBeete.ts (findBeeteForPlant + getPlantSlug).
// Phase 10 Plan 06: Center-Konvention-Fixtures + findPflanzenInBeet-Tests.
// Pure node test — no React, no RN. Runs in the 'hooks' jest project.
// Covers: rectangle-bed containment, outside-bed exclusion, soft-deleted-bed exclusion,
//         getPlantSlug null-guard for elements without provenance.plantSlug.
// WR-01: Fixtures kodieren bbox-CENTER-Konvention (xM/yM = Mittelpunkt des Beets).

import { findBeeteForPlant, getPlantSlug, findPflanzenInBeet } from '../kalenderBeete';
import type { PlanElementRow } from '@spatenstich/shared';

// ---- Factory helpers ----

function makeBeet(
  overrides: Partial<PlanElementRow> & { xM: number; yM: number; widthM: number; heightM: number },
): PlanElementRow {
  const base: PlanElementRow = {
    id: 'beet-1',
    gardenId: 'g1',
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
  };
  return { ...base, ...overrides };
}

function makePflanze(
  overrides: Partial<PlanElementRow> & { xM: number; yM: number; plantSlug: string | null },
): PlanElementRow {
  const { plantSlug, ...rest } = overrides;
  const base: PlanElementRow = {
    id: 'pflanze-1',
    gardenId: 'g1',
    elementType: 'Pflanze',
    label: plantSlug ?? 'Pflanze',
    xM: 0,
    yM: 0,
    widthM: 0.3,
    heightM: 0.3,
    confidence: null,
    isAccepted: true,
    importedFrom: null,
    provenance: plantSlug != null ? { plantSlug } : null,
    layer: 'seasonal',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    updatedByUserId: null,
    deletedAt: null,
  };
  return { ...base, ...rest };
}

// ---- CENTER-Konvention-Fixture (WR-01) ----
// Beet mit xM=1, yM=1 (CENTER), widthM=2, heightM=2
// → Polygon-Ecken: [(0,0),(2,0),(2,2),(0,2)]
// Eine Pflanze mit xM=1, yM=1 (Mittelpunkt = CENTER) liegt darin.
const BEET_RECT: PlanElementRow = makeBeet({ id: 'beet-rect', xM: 1, yM: 1, widthM: 2, heightM: 2 });

describe('getPlantSlug', () => {
  it('returns the plantSlug string from provenance', () => {
    const el = makePflanze({ xM: 1, yM: 1, plantSlug: 'tomate' });
    expect(getPlantSlug(el)).toBe('tomate');
  });

  it('returns null when provenance is null', () => {
    const el = makePflanze({ xM: 1, yM: 1, plantSlug: null });
    expect(getPlantSlug(el)).toBeNull();
  });

  it('returns null when provenance exists but plantSlug is not a string', () => {
    const el: PlanElementRow = {
      ...makePflanze({ xM: 1, yM: 1, plantSlug: null }),
      provenance: { plantSlug: 42 },
    };
    expect(getPlantSlug(el)).toBeNull();
  });
});

describe('findBeeteForPlant', () => {
  it('returns the containing Beet when a Pflanze center is inside it (CENTER-Konvention)', () => {
    // Beet: xM=1, yM=1 (CENTER), w=2, h=2 → Polygon [(0,0),(2,0),(2,2),(0,2)]
    // Pflanze: xM=1, yM=1 (Mittelpunkt = CENTER des Beets) → strikt drin
    const pflanze = makePflanze({ id: 'pf-1', xM: 1, yM: 1, plantSlug: 'tomate' });
    const result = findBeeteForPlant([BEET_RECT, pflanze], 'tomate');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('beet-rect');
  });

  it('returns empty array when Pflanze center is outside the Beet (CENTER-Konvention)', () => {
    // Beet: [(0,0)→(2,2)]; Pflanze-Center 2.5,2.5 → außerhalb
    const pflanze = makePflanze({ id: 'pf-out', xM: 2.5, yM: 2.5, plantSlug: 'tomate' });
    const result = findBeeteForPlant([BEET_RECT, pflanze], 'tomate');
    expect(result).toHaveLength(0);
  });

  it('excludes soft-deleted Beet elements (deletedAt set)', () => {
    // Same geometry as BEET_RECT but soft-deleted
    const deletedBeet: PlanElementRow = {
      ...BEET_RECT,
      id: 'beet-deleted',
      deletedAt: '2026-02-01T00:00:00Z',
    };
    // Pflanze inside the (deleted) bed area — CENTER at (1,1) inside the rect
    const pflanze = makePflanze({ id: 'pf-del', xM: 1, yM: 1, plantSlug: 'tomate' });
    const result = findBeeteForPlant([deletedBeet, pflanze], 'tomate');
    expect(result).toHaveLength(0);
  });

  it('excludes soft-deleted Pflanze elements', () => {
    const deletedPflanze: PlanElementRow = {
      ...makePflanze({ id: 'pf-d', xM: 1, yM: 1, plantSlug: 'tomate' }),
      deletedAt: '2026-02-01T00:00:00Z',
    };
    const result = findBeeteForPlant([BEET_RECT, deletedPflanze], 'tomate');
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no Pflanze with the given plantSlug exists', () => {
    const pflanze = makePflanze({ id: 'pf-other', xM: 1, yM: 1, plantSlug: 'karotte' });
    const result = findBeeteForPlant([BEET_RECT, pflanze], 'tomate');
    expect(result).toHaveLength(0);
  });

  it('deduplicates Beet results when multiple Pflanze instances of same slug are in the same Beet', () => {
    // Both plants have CENTER coords within BEET_RECT [(0,0)→(2,2)]
    const pflanze1 = makePflanze({ id: 'pf-a', xM: 0.5, yM: 0.5, plantSlug: 'tomate' });
    const pflanze2 = makePflanze({ id: 'pf-b', xM: 1.5, yM: 1.5, plantSlug: 'tomate' });
    const result = findBeeteForPlant([BEET_RECT, pflanze1, pflanze2], 'tomate');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('beet-rect');
  });

  it('returns empty array when elements list is empty', () => {
    expect(findBeeteForPlant([], 'tomate')).toHaveLength(0);
  });

  it('uses provenance.polygonPointsM when available (non-rectangular polygon)', () => {
    // Triangle polygon: (0,0), (4,0), (2,4) — Pflanze-CENTER at (2,1) → inside
    const triangleBeet: PlanElementRow = {
      ...makeBeet({ id: 'beet-tri', xM: 2, yM: 2, widthM: 4, heightM: 4 }),
      provenance: {
        polygonPointsM: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 2, y: 4 },
        ],
      },
    };
    // Pflanze-CENTER at (2, 1) — inside the triangle
    const pflanze = makePflanze({ id: 'pf-tri', xM: 2, yM: 1, plantSlug: 'tomate' });
    const result = findBeeteForPlant([triangleBeet, pflanze], 'tomate');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('beet-tri');
  });
});

describe('findPflanzenInBeet', () => {
  // Beet: xM=1, yM=1 (CENTER), w=2, h=2 → Polygon [(0,0),(2,0),(2,2),(0,2)]
  const ZIEL_BEET = makeBeet({ id: 'beet-ziel', xM: 1, yM: 1, widthM: 2, heightM: 2 });

  // Anderes Beet: xM=10, yM=10 (CENTER), w=2, h=2 → Polygon [(9,9),(11,9),(11,11),(9,11)]
  const ANDERES_BEET = makeBeet({ id: 'beet-other', xM: 10, yM: 10, widthM: 2, heightM: 2 });

  it('gibt Pflanzen zurück, deren Mittelpunkt im Beet liegt', () => {
    // Pflanze-CENTER (1,1) — im ZIEL_BEET [(0,0)→(2,2)]
    const pflanze = makePflanze({ id: 'pf-in', xM: 1, yM: 1, plantSlug: 'tomate' });
    const result = findPflanzenInBeet([ZIEL_BEET, ANDERES_BEET, pflanze], ZIEL_BEET);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pf-in');
  });

  it('schließt Pflanzen in einem ANDEREN Beet aus (Beet-Scoping)', () => {
    // Pflanze-CENTER (10,10) — im ANDERES_BEET, nicht im ZIEL_BEET
    const pflanze = makePflanze({ id: 'pf-other-beet', xM: 10, yM: 10, plantSlug: 'karotte' });
    const result = findPflanzenInBeet([ZIEL_BEET, ANDERES_BEET, pflanze], ZIEL_BEET);
    expect(result).toHaveLength(0);
  });

  it('schließt soft-deleted Pflanzen aus', () => {
    const deletedPflanze: PlanElementRow = {
      ...makePflanze({ id: 'pf-del', xM: 1, yM: 1, plantSlug: 'tomate' }),
      deletedAt: '2026-02-01T00:00:00Z',
    };
    const result = findPflanzenInBeet([ZIEL_BEET, deletedPflanze], ZIEL_BEET);
    expect(result).toHaveLength(0);
  });

  it('schließt Nicht-Pflanze-Elemente (z.B. Beet) aus', () => {
    // Nur Beete in der Liste, kein Pflanze-Element
    const result = findPflanzenInBeet([ZIEL_BEET, ANDERES_BEET], ZIEL_BEET);
    expect(result).toHaveLength(0);
  });

  it('gibt leeres Array zurück bei leerer Elementliste', () => {
    const result = findPflanzenInBeet([], ZIEL_BEET);
    expect(result).toHaveLength(0);
  });

  it('gibt leeres Array zurück wenn kein Pflanze-Element im Beet liegt', () => {
    // Pflanze außerhalb des Beets (CENTER 5,5 — klar außerhalb [(0,0)→(2,2)])
    const pflanze = makePflanze({ id: 'pf-far', xM: 5, yM: 5, plantSlug: 'salat' });
    const result = findPflanzenInBeet([ZIEL_BEET, pflanze], ZIEL_BEET);
    expect(result).toHaveLength(0);
  });
});
