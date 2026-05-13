// Phase 7 Plan 01 Wave 0: pure-geometry test scaffold for viewMatrix (EDIT-06).
// Pattern: 6.5 P01 — it.todo() shells; no production imports until Plan 02 creates the module.
// Pitfall-4: round-trip symmetry within 1e-9, no rounding at storage layer.

describe('geometry.viewMatrix > mToPx / pxToM', () => {
  it.todo('mToPx is symmetric inverse of pxToM at scale=1');
  it.todo('mToPx multiplies by scale (m=2, scale=10 -> 20)');
  it.todo('pxToM divides by scale (px=200, scale=10 -> 20)');
});

describe('geometry.viewMatrix > screenToGarden / gardenToScreen round-trip (Pitfall-4)', () => {
  it.todo('round-trip screenToGarden(gardenToScreen(x, y, vm), vm) === {x, y} within 1e-9 for vm={tx:0, ty:0, scale:1}');
  it.todo('round-trip is symmetric for randomized vm with non-zero translation (tx=100, ty=50, scale=2.5)');
  it.todo('round-trip preserves negative coordinates (xM=-3, yM=-1)');
  it.todo('does NOT round at any step (no Math.round, Math.floor, Math.trunc)');
});
