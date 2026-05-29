// Phase 09.1 Wave 1 GREEN: snapRotation 15-deg snap math + freeRotation override.
// Plan 01 GREEN-fill.
// Pins RESEARCH §Pattern 4 invariants.

import { snapRotation } from '../rotationSnap';

describe('lib/editor/rotationSnap > snapRotation', () => {
  it('snapRotation snaps 7deg to 0deg (round-down nearest 15)', () => {
    expect(snapRotation(7, false)).toBe(0);
  });

  it('snapRotation snaps 8deg to 15deg (round-up nearest 15)', () => {
    expect(snapRotation(8, false)).toBe(15);
  });

  it('snapRotation normalizes 365deg to 5deg (modulo 360)', () => {
    // 365 % 360 = 5; snap(5, false) → round(5/15)*15 = 0; but 5 is closer to 0 → 0
    // Wait: round(5/15) = round(0.333) = 0; 0*15 = 0
    expect(snapRotation(365, false)).toBe(0);
  });

  it('snapRotation normalizes -15deg to 345deg (positive modulo)', () => {
    // -15 → normalized = ((-15 % 360) + 360) % 360 = (-15 + 360) % 360 = 345
    // snap(345, false) = round(345/15)*15 % 360 = 23*15 % 360 = 345
    expect(snapRotation(-15, false)).toBe(345);
  });

  it('snapRotation with freeRotation=true bypasses snap (returns normalized deg)', () => {
    expect(snapRotation(22.3, true)).toBeCloseTo(22.3, 5);
    expect(snapRotation(-10, true)).toBeCloseTo(350, 5);
  });

  it('snapRotation(0, false) returns 0', () => {
    expect(snapRotation(0, false)).toBe(0);
  });

  it('snapRotation(360, false) returns 0 (wraparound)', () => {
    // 360 % 360 = 0; snap(0, false) = 0
    expect(snapRotation(360, false)).toBe(0);
  });
});
