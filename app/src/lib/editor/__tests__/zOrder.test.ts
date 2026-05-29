// Phase 09.1 Wave 1 GREEN: zOrder pure-function implementations.
// Plan 01 GREEN-fill: bringToFront, bringForward, sendBackward, sendToBack, getZOrder, sortByZOrder.
// Pins algorithmic invariants from RESEARCH §Pattern 5 + VALIDATION T-09.1-Z-INTEGRITY.

import type { PlanElementRow } from '@spatenstich/shared';
import { bringToFront, bringForward, sendBackward, sendToBack, getZOrder, sortByZOrder } from '../zOrder';

function makeEl(id: string, overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: id,
    xM: 0,
    yM: 0,
    widthM: 1,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-05-13T10:00:00.000Z',
    updatedAt: '2026-05-13T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: null,
    layer: 'infrastructure',
    ...overrides,
  };
}

function makeElWithZ(id: string, z: number, overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return makeEl(id, { provenance: { source: 'manual', zOrder: z }, ...overrides });
}

describe('lib/editor/zOrder', () => {
  it('getZOrder returns 0 for missing provenance.zOrder field (Assumption A9)', () => {
    const el = makeEl('e1', { provenance: null });
    expect(getZOrder(el)).toBe(0);
    const el2 = makeEl('e2', { provenance: { source: 'manual' } });
    expect(getZOrder(el2)).toBe(0);
  });

  it('getZOrder reads provenance.zOrder as number when set', () => {
    const el = makeElWithZ('e1', 5);
    expect(getZOrder(el)).toBe(5);
    const elNeg = makeElWithZ('e2', -3);
    expect(getZOrder(elNeg)).toBe(-3);
  });

  it('bringToFront returns max(zOrder) + 1 excluding self', () => {
    const els = [makeElWithZ('e1', 5), makeElWithZ('e2', 3), makeElWithZ('e3', 7)];
    // bringToFront e1 (currently z=5); others are z=3 and z=7, max=7
    expect(bringToFront(els, 'e1')).toBe(8);
  });

  it('bringToFront with empty other-elements returns 1', () => {
    const els = [makeElWithZ('e1', 5)];
    expect(bringToFront(els, 'e1')).toBe(1);
  });

  it('bringForward returns nextHigher zOrder + 1', () => {
    const els = [makeElWithZ('e1', 2), makeElWithZ('e2', 5), makeElWithZ('e3', 8)];
    // bringForward e1 (z=2); higher neighbors: z=5, z=8; nextHigher=5; result=6
    expect(bringForward(els, 'e1')).toBe(6);
  });

  it('bringForward when already on top returns same zOrder (no-op)', () => {
    const els = [makeElWithZ('e1', 10), makeElWithZ('e2', 3), makeElWithZ('e3', 7)];
    // e1 has highest z=10; no higher neighbors; no-op
    expect(bringForward(els, 'e1')).toBe(10);
  });

  it('sendBackward returns nextLower zOrder - 1', () => {
    const els = [makeElWithZ('e1', 8), makeElWithZ('e2', 3), makeElWithZ('e3', 5)];
    // sendBackward e1 (z=8); lower neighbors: z=3, z=5; nextLower=5; result=4
    expect(sendBackward(els, 'e1')).toBe(4);
  });

  it('sendBackward when already at bottom returns same zOrder (no-op)', () => {
    const els = [makeElWithZ('e1', 1), makeElWithZ('e2', 5), makeElWithZ('e3', 8)];
    // e1 has lowest z=1; no lower neighbors; no-op
    expect(sendBackward(els, 'e1')).toBe(1);
  });

  it('sendToBack returns min(zOrder) - 1 excluding self', () => {
    const els = [makeElWithZ('e1', 5), makeElWithZ('e2', 3), makeElWithZ('e3', 7)];
    // sendToBack e1 (z=5); others: z=3, z=7; min=3; result=2
    expect(sendToBack(els, 'e1')).toBe(2);
  });

  it('sortByZOrder sorts ascending; lower zOrder first (rendered behind)', () => {
    const els = [makeElWithZ('e1', 5), makeElWithZ('e2', 1), makeElWithZ('e3', 3)];
    const sorted = sortByZOrder(els);
    expect(sorted.map((e) => e.id)).toEqual(['e2', 'e3', 'e1']);
  });

  it('sortByZOrder tiebreaks by createdAt ASC for stable order (RENDER-SORT)', () => {
    const elA = makeEl('older', {
      provenance: { source: 'manual', zOrder: 5 },
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const elB = makeEl('newer', {
      provenance: { source: 'manual', zOrder: 5 },
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    const sorted = sortByZOrder([elB, elA]);
    // Same zOrder: older createdAt first
    expect(sorted[0].id).toBe('older');
    expect(sorted[1].id).toBe('newer');
  });

  it('sortByZOrder is stable across repeated calls (idempotent)', () => {
    const els = [makeElWithZ('e1', 5), makeElWithZ('e2', 1), makeElWithZ('e3', 3)];
    const sorted1 = sortByZOrder(els);
    const sorted2 = sortByZOrder(sorted1);
    expect(sorted1.map((e) => e.id)).toEqual(sorted2.map((e) => e.id));
  });

  it('z-order operations do not mutate provenance.plantSlug or other fields (Pitfall 5)', () => {
    const el = makeEl('e1', {
      provenance: { source: 'manual', plantSlug: 'tomate', zOrder: 3 },
    });
    const others = [makeElWithZ('e2', 1), makeElWithZ('e3', 5)];
    const allEls = [el, ...others];

    // Run all four operations
    bringToFront(allEls, 'e1');
    bringForward(allEls, 'e1');
    sendBackward(allEls, 'e1');
    sendToBack(allEls, 'e1');

    // Original element must be completely unmodified
    expect((el.provenance as Record<string, unknown>).plantSlug).toBe('tomate');
    expect((el.provenance as Record<string, unknown>).zOrder).toBe(3);
    expect(el.id).toBe('e1');
  });
});
