// Phase 09.1 Wave 0: Handle-Geometry pure-function stubs.
// GREEN-fill: Plan 03 (resize handles) + Plan 03 (rotation handle).
//
// Design decisions (D-05/D-06/D-08):
//   - 4 corner handles for resize (D-05). No edge-mid handles in MVP.
//   - Separate rotation handle: small circle above element center (16–24px offset above top edge, D-06).
//   - Handle coordinates are in garden meters (xM/yM space), except rotation handle offset which
//     is screen-relative (scaled by viewport.scale) to keep visual size constant at all zoom levels.
//
// MVP Carve-Out (RESEARCH §A1):
//   TODO v1.1: rotated-resize math currently NOT implemented. Caller MUST hide resize handles when
//   (el.provenance?.rotateDeg ?? 0) !== 0. Until then, user falls back to Modal numeric width/height
//   input (D-04 Hybrid: handles are the optional fast-path, Modal is precise-path).
//   Track: DEFERRED-rotated-resize-math

import type { PlanElementRow } from '@spatenstich/shared';

/** Four corner handle positions in garden-meter coordinates. */
export interface CornerHandles {
  tl: { xM: number; yM: number };
  tr: { xM: number; yM: number };
  bl: { xM: number; yM: number };
  br: { xM: number; yM: number };
}

/**
 * Computes the four corner handle positions for an element in garden-meter space.
 * - tl = (xM - widthM/2,  yM - heightM/2)
 * - tr = (xM + widthM/2,  yM - heightM/2)
 * - bl = (xM - widthM/2,  yM + heightM/2)
 * - br = (xM + widthM/2,  yM + heightM/2)
 *
 * MVP: Caller must hide these handles when (el.provenance?.rotateDeg ?? 0) !== 0
 * (rotated-resize math not yet implemented — see carve-out above).
 */
export function computeCornerHandles(el: PlanElementRow): CornerHandles {
  const halfW = el.widthM / 2;
  const halfH = el.heightM / 2;
  return {
    tl: { xM: el.xM - halfW, yM: el.yM - halfH },
    tr: { xM: el.xM + halfW, yM: el.yM - halfH },
    bl: { xM: el.xM - halfW, yM: el.yM + halfH },
    br: { xM: el.xM + halfW, yM: el.yM + halfH },
  };
}

/**
 * Computes the rotation handle position in garden-meter space.
 * The handle is placed above the top-center of the element at a fixed screen-pixel offset.
 * `offsetPx` is the vertical offset in screen pixels (typically 20–24px).
 * `scale` is the current viewport scale (pixels-per-meter) to convert offsetPx to meters.
 *
 * Position: { xM: el.xM, yM: el.yM - el.heightM/2 - offsetPx/scale }
 *
 * The offsetPx/scale conversion keeps the visual distance constant regardless of zoom level.
 */
export function computeRotationHandle(
  el: PlanElementRow,
  offsetPx: number,
  scale: number,
): { xM: number; yM: number } {
  return {
    xM: el.xM,
    yM: el.yM - el.heightM / 2 - offsetPx / scale,
  };
}
