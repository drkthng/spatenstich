// Phase 7 Plan 03 (Wave 2 GREEN): plantSpacing assertions filled in (was Plan 01 Wave 0 it.todo).
// EDIT-07. Pure Euclidean distance; seasonal layer only.

import { hasOverlap } from '../plantSpacing';
import type { PlanElementRow } from '@spatenstich/shared';

function makePlant(
  id: string,
  xM: number,
  yM: number,
  overrides: Partial<PlanElementRow> = {},
): PlanElementRow {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Pflanze',
    label: id,
    xM,
    yM,
    widthM: 0.3,
    heightM: 0.3,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-05-13T10:00:00.000Z',
    updatedAt: '2026-05-13T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: null,
    layer: 'seasonal',
    ...overrides,
  };
}

describe('geometry.plantSpacing > hasOverlap', () => {
  it('returns true when a seasonal-layer neighbour is within spacingM (dx^2 + dy^2 < spacingM^2)', () => {
    const placed = { id: 'p-new', xM: 0, yM: 0 };
    const neighbour = makePlant('p-1', 0.2, 0.2); // dist ~0.283
    expect(hasOverlap(placed, 0.5, [neighbour])).toBe(true);
  });

  it('returns false when nearest seasonal neighbour is at distance >= spacingM', () => {
    const placed = { id: 'p-new', xM: 0, yM: 0 };
    const neighbour = makePlant('p-1', 1.0, 1.0); // dist ~1.414
    expect(hasOverlap(placed, 0.5, [neighbour])).toBe(false);
  });

  it('ignores neighbours on infrastructure layer (only seasonal counted)', () => {
    const placed = { id: 'p-new', xM: 0, yM: 0 };
    const bed = makePlant('bed-1', 0.1, 0.1, {
      elementType: 'Beet',
      layer: 'infrastructure',
    });
    expect(hasOverlap(placed, 0.5, [bed])).toBe(false);
  });

  it('ignores deletedAt !== null neighbours', () => {
    const placed = { id: 'p-new', xM: 0, yM: 0 };
    const ghost = makePlant('p-deleted', 0.05, 0.05, {
      deletedAt: '2026-05-12T00:00:00.000Z',
    });
    expect(hasOverlap(placed, 0.5, [ghost])).toBe(false);
  });

  it('ignores placed.id from the others list (no self-overlap)', () => {
    const placed = { id: 'p-self', xM: 0, yM: 0 };
    const self = makePlant('p-self', 0, 0); // same id, same coords
    expect(hasOverlap(placed, 0.5, [self])).toBe(false);
  });

  it('returns false on empty others array', () => {
    const placed = { id: 'p-new', xM: 0, yM: 0 };
    expect(hasOverlap(placed, 0.5, [])).toBe(false);
  });

  it('handles spacingM = 0 (no overlap reported even at coincident coords — degenerate boundary)', () => {
    const placed = { id: 'p-new', xM: 0, yM: 0 };
    const coincident = makePlant('p-1', 0, 0);
    expect(hasOverlap(placed, 0, [coincident])).toBe(false);
  });
});
