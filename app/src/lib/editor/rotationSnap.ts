// Phase 09.1 Wave 0: Rotation-Snap pure-function stub.
// GREEN-fill: Plan 01.
//
// Design decisions (D-07):
//   - 15°-Snap: Math.round(deg / 15) * 15 with positive modulo normalization.
//   - freeRotation=true (Shift-Modifier on Web) disables snap, returns normalized deg only.
//   - Mobile has no Shift key — freeRotation is always false on Skia canvas.
//   - Modal input field uses raw numeric entry without snap (D-07: "Modal-Eingabe: freie Grad").

/**
 * Snaps a rotation angle to the nearest 15° increment.
 *
 * @param deg - Raw rotation in degrees (may be negative or > 360).
 * @param freeRotation - When true (Shift pressed on Web), snapping is bypassed;
 *                       only normalization to [0, 360) is applied.
 * @returns Normalized angle in [0, 360), snapped to nearest 15° unless freeRotation.
 */
export function snapRotation(deg: number, freeRotation: boolean): number {
  throw new Error('TODO Plan 01 GREEN');
}
