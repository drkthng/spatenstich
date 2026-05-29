// Phase 09.1 Wave 0 RED: it.todo() pins; Wave 3 GREEN fills.
// Plan 03 GREEN-fill: computeCornerHandles + computeRotationHandle geometry math.
// Pins RESEARCH §Pattern 3 + MVP carve-out A1 (hidden handles when rotateDeg !== 0).

import type { PlanElementRow } from '@spatenstich/shared';
import { computeCornerHandles, computeRotationHandle } from '../handleGeometry';

function makeEl(overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id: 'el-1',
    gardenId: 'g-1',
    elementType: 'Beet',
    label: 'Beet',
    xM: 5,
    yM: 5,
    widthM: 2,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: null,
    layer: 'infrastructure',
    ...overrides,
  };
}

describe('lib/editor/handleGeometry', () => {
  it('computeCornerHandles returns 4 corner positions in garden meters', () => {
    const el = makeEl({ xM: 5, yM: 5, widthM: 2, heightM: 1 });
    const handles = computeCornerHandles(el);
    expect(handles).toHaveProperty('tl');
    expect(handles).toHaveProperty('tr');
    expect(handles).toHaveProperty('bl');
    expect(handles).toHaveProperty('br');
  });

  it('computeCornerHandles tl == (xM - widthM/2, yM - heightM/2)', () => {
    const el = makeEl({ xM: 2, yM: 3, widthM: 1, heightM: 0.5 });
    const handles = computeCornerHandles(el);
    // tl = (2 - 0.5, 3 - 0.25) = (1.5, 2.75)
    expect(handles.tl.xM).toBeCloseTo(1.5);
    expect(handles.tl.yM).toBeCloseTo(2.75);
    // br = (2 + 0.5, 3 + 0.25) = (2.5, 3.25)
    expect(handles.br.xM).toBeCloseTo(2.5);
    expect(handles.br.yM).toBeCloseTo(3.25);
  });

  it('computeCornerHandles tr/bl symmetrical around center', () => {
    const el = makeEl({ xM: 4, yM: 6, widthM: 2, heightM: 3 });
    const handles = computeCornerHandles(el);
    // tr = (4 + 1, 6 - 1.5) = (5, 4.5)
    expect(handles.tr.xM).toBeCloseTo(5);
    expect(handles.tr.yM).toBeCloseTo(4.5);
    // bl = (4 - 1, 6 + 1.5) = (3, 7.5)
    expect(handles.bl.xM).toBeCloseTo(3);
    expect(handles.bl.yM).toBeCloseTo(7.5);
  });

  it('computeRotationHandle returns position above top-center with offsetPx scaled by viewport', () => {
    const el = makeEl({ xM: 5, yM: 5, widthM: 2, heightM: 1 });
    // With scale=100 px/m, offsetPx=20px => offsetM = 0.2m
    // Expected: xM=5, yM = 5 - 0.5 - 0.2 = 4.3
    const handle = computeRotationHandle(el, 20, 100);
    expect(handle.xM).toBeCloseTo(5);
    expect(handle.yM).toBeCloseTo(4.3);
  });

  it('MVP carve-out: rotated-resize math TODO; resize handles hidden when rotateDeg !== 0 (A1)', () => {
    // This test verifies the no-op contract: computeCornerHandles does NOT throw for
    // rotated elements, but callers are documented to hide the result.
    // The MVP carve-out is enforced at the render layer (EditorCanvas / WebPlanEditor),
    // not in this pure function. The function should still return valid geometry.
    const el = makeEl({
      xM: 3,
      yM: 3,
      widthM: 1,
      heightM: 1,
      provenance: { source: 'manual', rotateDeg: 45 } as any,
    });
    // Should not throw — carve-out is caller-enforced
    expect(() => computeCornerHandles(el)).not.toThrow();
    const handles = computeCornerHandles(el);
    // Even for rotated elements, axis-aligned corners still computed correctly
    expect(handles.tl.xM).toBeCloseTo(2.5);
    expect(handles.tl.yM).toBeCloseTo(2.5);
  });
});
