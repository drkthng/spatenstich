// Phase 7 Plan 03 (Wave 2 GREEN): viewMatrix assertions filled in (was Plan 01 Wave 0 it.todo).
// EDIT-06. Pitfall-4: round-trip symmetry within 1e-9, no rounding at storage layer.

import { mToPx, pxToM, screenToGarden, gardenToScreen } from '../viewMatrix';

describe('geometry.viewMatrix > mToPx / pxToM', () => {
  it('mToPx is symmetric inverse of pxToM at scale=1', () => {
    expect(pxToM(mToPx(3, 1), 1)).toBe(3);
    expect(mToPx(pxToM(42, 1), 1)).toBe(42);
  });

  it('mToPx multiplies by scale (m=2, scale=10 -> 20)', () => {
    expect(mToPx(2, 10)).toBe(20);
  });

  it('pxToM divides by scale (px=200, scale=10 -> 20)', () => {
    expect(pxToM(200, 10)).toBe(20);
  });
});

describe('geometry.viewMatrix > screenToGarden / gardenToScreen round-trip (Pitfall-4)', () => {
  it('round-trip screenToGarden(gardenToScreen(x, y, vm), vm) === {x, y} within 1e-9 for vm={tx:0, ty:0, scale:1}', () => {
    const vm = { tx: 0, ty: 0, scale: 1 };
    const screen = gardenToScreen(2.5, 1.3, vm);
    const back = screenToGarden(screen.xPx, screen.yPx, vm);
    expect(Math.abs(back.xM - 2.5)).toBeLessThan(1e-9);
    expect(Math.abs(back.yM - 1.3)).toBeLessThan(1e-9);
  });

  it('round-trip is symmetric for randomized vm with non-zero translation (tx=100, ty=50, scale=2.5)', () => {
    const vm = { tx: 100, ty: 50, scale: 2.5 };
    const points: Array<[number, number]> = [
      [1, 2],
      [3.7, -1.1],
      [10, 10],
      [0, 0],
      [-2.5, 7.3],
    ];
    for (const [xM, yM] of points) {
      const screen = gardenToScreen(xM, yM, vm);
      const back = screenToGarden(screen.xPx, screen.yPx, vm);
      expect(Math.abs(back.xM - xM)).toBeLessThan(1e-9);
      expect(Math.abs(back.yM - yM)).toBeLessThan(1e-9);
    }
  });

  it('round-trip preserves negative coordinates (xM=-3, yM=-1)', () => {
    const vm = { tx: 0, ty: 0, scale: 50 };
    const screen = gardenToScreen(-3, -1, vm);
    const back = screenToGarden(screen.xPx, screen.yPx, vm);
    expect(back.xM).toBeCloseTo(-3, 9);
    expect(back.yM).toBeCloseTo(-1, 9);
  });

  it('does NOT round at any step (no Math.round, Math.floor, Math.trunc)', () => {
    // Spot-check: irrational-like values must survive round-trip — any rounding would collapse them.
    const vm = { tx: 7, ty: 11, scale: 1.7 };
    const screen = gardenToScreen(1 / 3, 1 / 7, vm);
    const back = screenToGarden(screen.xPx, screen.yPx, vm);
    expect(back.xM).toBeCloseTo(1 / 3, 10);
    expect(back.yM).toBeCloseTo(1 / 7, 10);
    // And the intermediate pixel value MUST be a non-integer (proof no rounding happened).
    expect(Number.isInteger(screen.xPx)).toBe(false);
    expect(Number.isInteger(screen.yPx)).toBe(false);
  });
});
