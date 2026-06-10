// Phase 09.1 Wave 0: Handle-Geometry pure-function stubs.
// GREEN-fill: Plan 03 (resize handles) + Plan 03 (rotation handle).
// Rotated-resize math implemented at handle layer: quick-260610-jtf.
//
// Design decisions (D-05/D-06/D-08):
//   - 4 corner handles for resize (D-05). No edge-mid handles in MVP.
//   - Separate rotation handle: small circle above element center (16–24px offset above top edge, D-06).
//   - Handle coordinates are in garden meters (xM/yM space), except rotation handle offset which
//     is screen-relative (scaled by viewport.scale) to keep visual size constant at all zoom levels.
//
// Corner handle contract:
//   computeCornerHandles returns axis-aligned local-frame corners (element's own unrotated space).
//   The caller (WebPlanEditor) wraps handles in a rotation <G> for display and passes rotateDeg
//   to WebResizeHandle so drag deltas are converted into local frame before applying resize math.

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
 * Corners are computed in the element's local (unrotated) frame:
 * - tl = (xM - widthM/2,  yM - heightM/2)
 * - tr = (xM + widthM/2,  yM - heightM/2)
 * - bl = (xM - widthM/2,  yM + heightM/2)
 * - br = (xM + widthM/2,  yM + heightM/2)
 *
 * Caller wraps these in a rotation <G> for display and passes rotateDeg to
 * WebResizeHandle so drag deltas are converted to local frame. This function
 * is unchanged; rotated-resize math lives in WebResizeHandle.computeResize.
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
