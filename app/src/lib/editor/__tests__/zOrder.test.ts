// Phase 09.1 Wave 0 RED: it.todo() pins; Wave 1 GREEN fills.
// Plan 01 GREEN-fill: bringToFront, bringForward, sendBackward, sendToBack, getZOrder, sortByZOrder.
// Pins algorithmic invariants from RESEARCH §Pattern 5 + VALIDATION T-09.1-Z-INTEGRITY.

describe('lib/editor/zOrder', () => {
  it.todo('getZOrder returns 0 for missing provenance.zOrder field (Assumption A9)');
  it.todo('getZOrder reads provenance.zOrder as number when set');
  it.todo('bringToFront returns max(zOrder) + 1 excluding self');
  it.todo('bringToFront with empty other-elements returns 1');
  it.todo('bringForward returns nextHigher zOrder + 1');
  it.todo('bringForward when already on top returns same zOrder (no-op)');
  it.todo('sendBackward returns nextLower zOrder - 1');
  it.todo('sendBackward when already at bottom returns same zOrder (no-op)');
  it.todo('sendToBack returns min(zOrder) - 1 excluding self');
  it.todo('sortByZOrder sorts ascending; lower zOrder first (rendered behind)');
  it.todo('sortByZOrder tiebreaks by createdAt ASC for stable order (RENDER-SORT)');
  it.todo('sortByZOrder is stable across repeated calls (idempotent)');
  it.todo('z-order operations do not mutate provenance.plantSlug or other fields (Pitfall 5)');
});
