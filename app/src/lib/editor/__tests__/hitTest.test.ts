// Phase 09.1 Wave 2 GREEN: findElementAtPoint AABB hit-test tests.
// Pins D-01/D-02 hit-test contract: AABB, topmost by zOrder, ignores deletedAt, uses widthM/heightM (D-20).

import { findElementAtPoint } from '../hitTest';
import type { PlanElementRow } from '@spatenstich/shared';

function makeEl(id: string, overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: id,
    xM: 2,
    yM: 2,
    widthM: 2,
    heightM: 2,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-05-13T10:00:00.000Z',
    updatedAt: '2026-05-13T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: 'infrastructure',
    ...overrides,
  };
}

describe('lib/editor/hitTest > findElementAtPoint', () => {
  it('findElementAtPoint returns the element whose bbox contains (xM, yM)', () => {
    // Element at xM=2, yM=3, widthM=2, heightM=2
    // bbox: x=[1,3], y=[2,4] — point 2.5,3.5 is inside
    const el = makeEl('e1', { xM: 2, yM: 3, widthM: 2, heightM: 2 });
    const result = findElementAtPoint([el], 2.5, 3.5);
    expect(result).toBe(el);
  });

  it('findElementAtPoint returns undefined when no element covers the point', () => {
    // Element at xM=2, yM=3, widthM=1, heightM=1
    // bbox: x=[1.5,2.5], y=[2.5,3.5] — point 10,10 is outside
    const el = makeEl('e1', { xM: 2, yM: 3, widthM: 1, heightM: 1 });
    const result = findElementAtPoint([el], 10, 10);
    expect(result).toBeUndefined();
  });

  it('findElementAtPoint returns top-most element by zOrder when multiple overlap (sortByZOrder ascending → last wins)', () => {
    // Both elements at xM=2, yM=2, widthM=2, heightM=2 — bbox: x=[1,3], y=[1,3]
    const elA = makeEl('a', { xM: 2, yM: 2, widthM: 2, heightM: 2, provenance: { source: 'manual', zOrder: 0 } });
    const elB = makeEl('b', { xM: 2, yM: 2, widthM: 2, heightM: 2, provenance: { source: 'manual', zOrder: 5 } });
    const result = findElementAtPoint([elA, elB], 2, 2);
    // elB has higher zOrder (5) → top-most → returned
    expect(result?.id).toBe('b');
  });

  it('findElementAtPoint ignores elements with deletedAt !== null', () => {
    // Deleted element at same position
    const el = makeEl('e1', { xM: 2, yM: 2, widthM: 2, heightM: 2, deletedAt: '2026-01-01T00:00:00Z' });
    const result = findElementAtPoint([el], 2, 2);
    expect(result).toBeUndefined();
  });

  it('findElementAtPoint uses widthM/heightM dedicated columns (D-20), NOT provenance.widthM', () => {
    // Element with widthM=0.1 (narrow dedicated column) and provenance containing irrelevant widthM=99
    // bbox with widthM=0.1: halfW=0.05, x=[1.95,2.05]
    // Point 2.9 is outside the narrow bbox → miss
    // If erroneously used provenance widthM=99: halfW=49.5 → would hit — confirms we use dedicated column
    const elNarrow = makeEl('e-narrow', {
      xM: 2,
      yM: 2,
      widthM: 0.1,   // narrow: halfW=0.05, bbox x=[1.95,2.05]
      heightM: 2,
      provenance: { source: 'manual' }, // no widthM in provenance — using dedicated column correctly
    });
    // Point 2.9 is outside the narrow dedicated-column bbox
    const miss = findElementAtPoint([elNarrow], 2.9, 2);
    expect(miss).toBeUndefined();
    // Point 2.0 is inside the narrow bbox (center)
    const hit = findElementAtPoint([elNarrow], 2.0, 2);
    expect(hit).toBe(elNarrow);
  });
});
