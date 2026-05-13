// Phase 7 Plan 01 Wave 0: plant-spacing overlap test scaffold (EDIT-07).
// Per RESEARCH Pattern 5 + Code Examples 5: pure Euclidean distance; seasonal layer only.

describe('geometry.plantSpacing > hasOverlap', () => {
  it.todo('returns true when a seasonal-layer neighbour is within spacingM (dx^2 + dy^2 < spacingM^2)');
  it.todo('returns false when nearest seasonal neighbour is at distance >= spacingM');
  it.todo('ignores neighbours on infrastructure layer (only seasonal counted)');
  it.todo('ignores deletedAt !== null neighbours');
  it.todo('ignores placed.id from the others list (no self-overlap)');
  it.todo('returns false on empty others array');
  it.todo('handles spacingM = 0 (no overlap reported even at coincident coords — degenerate boundary)');
});
