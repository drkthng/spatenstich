// Phase 10 Plan 02: Tests for kalenderBeete.ts (findBeeteForPlant + getPlantSlug).
// Pure node test — no React, no RN. Runs in the 'hooks' jest project.
// Covers: rectangle-bed containment, outside-bed exclusion, soft-deleted-bed exclusion,
//         getPlantSlug null-guard for elements without provenance.plantSlug.

import { findBeeteForPlant, getPlantSlug } from '../kalenderBeete';
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

// ---- Beet at (0,0) with width=2, height=2 — corners at (0,0)→(2,2) ----
// A Pflanze at (0.85, 0.85) has center (1.0, 1.0) → strictly inside.
const BEET_RECT: PlanElementRow = makeBeet({ id: 'beet-rect', xM: 0, yM: 0, widthM: 2, heightM: 2 });

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
  it('returns the containing Beet when a Pflanze center is inside it (rectangle containment)', () => {
    // Pflanze at (0.85, 0.85) → center = (1.0, 1.0) — strictly inside BEET_RECT [0,0]→[2,2]
    const pflanze = makePflanze({ id: 'pf-1', xM: 0.85, yM: 0.85, plantSlug: 'tomate' });
    const result = findBeeteForPlant([BEET_RECT, pflanze], 'tomate');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('beet-rect');
  });

  it('returns empty array when Pflanze center is outside the Beet', () => {
    // Pflanze at (3.0, 3.0) — outside the BEET_RECT which ends at (2,2)
    const pflanze = makePflanze({ id: 'pf-out', xM: 3.0, yM: 3.0, plantSlug: 'tomate' });
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
    // Pflanze inside the (deleted) bed area
    const pflanze = makePflanze({ id: 'pf-del', xM: 0.85, yM: 0.85, plantSlug: 'tomate' });
    const result = findBeeteForPlant([deletedBeet, pflanze], 'tomate');
    expect(result).toHaveLength(0);
  });

  it('excludes soft-deleted Pflanze elements', () => {
    const deletedPflanze: PlanElementRow = {
      ...makePflanze({ id: 'pf-d', xM: 0.85, yM: 0.85, plantSlug: 'tomate' }),
      deletedAt: '2026-02-01T00:00:00Z',
    };
    const result = findBeeteForPlant([BEET_RECT, deletedPflanze], 'tomate');
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no Pflanze with the given plantSlug exists', () => {
    const pflanze = makePflanze({ id: 'pf-other', xM: 0.85, yM: 0.85, plantSlug: 'karotte' });
    const result = findBeeteForPlant([BEET_RECT, pflanze], 'tomate');
    expect(result).toHaveLength(0);
  });

  it('deduplicates Beet results when multiple Pflanze instances of same slug are in the same Beet', () => {
    const pflanze1 = makePflanze({ id: 'pf-a', xM: 0.2, yM: 0.2, plantSlug: 'tomate' });
    const pflanze2 = makePflanze({ id: 'pf-b', xM: 0.8, yM: 0.8, plantSlug: 'tomate' });
    const result = findBeeteForPlant([BEET_RECT, pflanze1, pflanze2], 'tomate');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('beet-rect');
  });

  it('returns empty array when elements list is empty', () => {
    expect(findBeeteForPlant([], 'tomate')).toHaveLength(0);
  });

  it('uses provenance.polygonPointsM when available (non-rectangular polygon)', () => {
    // Triangle polygon: (0,0), (4,0), (2,4) — center of a Pflanze at (2,1) → inside
    const triangleBeet: PlanElementRow = {
      ...makeBeet({ id: 'beet-tri', xM: 0, yM: 0, widthM: 4, heightM: 4 }),
      provenance: {
        polygonPointsM: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 2, y: 4 },
        ],
      },
    };
    // Pflanze at (1.85, 0.85) → center = (2, 1) — inside the triangle
    const pflanze = makePflanze({ id: 'pf-tri', xM: 1.85, yM: 0.85, plantSlug: 'tomate' });
    const result = findBeeteForPlant([triangleBeet, pflanze], 'tomate');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('beet-tri');
  });
});
