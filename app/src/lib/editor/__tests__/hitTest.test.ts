// Phase 09.1 Wave 0 RED: it.todo() pins; Plan 02 GREEN fills findElementAtPoint.
// Pins D-01/D-02 hit-test contract: AABB, topmost by zOrder, ignores deletedAt.

describe('lib/editor/hitTest > findElementAtPoint', () => {
  it.todo('findElementAtPoint returns the element whose bbox contains (xM, yM)');
  it.todo('findElementAtPoint returns undefined when no element covers the point');
  it.todo('findElementAtPoint returns top-most element by zOrder when multiple overlap (sortByZOrder ascending → last wins)');
  it.todo('findElementAtPoint ignores elements with deletedAt !== null');
  it.todo('findElementAtPoint uses widthM/heightM dedicated columns (D-20), NOT provenance.widthM');
});
