// Phase 09.1 Wave 0: Hit-test pure-function stub.
// GREEN-fill: Plan 02 (findElementAtPoint implementation for Long-Press + Doppelklick).
//
// Design decisions (D-01/D-02):
//   - Finds the topmost element at a given garden-coordinate point (xM/yM).
//   - Topmost = highest zOrder in ascending sort → last element in sorted array wins.
//   - Used by: Long-Press handler in EditorCanvas.tsx (Skia) and onDoubleClick in WebPlanEditor.tsx (SVG).
//   - Caller may pre-filter deletedAt !== null, or this function filters internally.
//   - Uses widthM/heightM dedicated columns (D-20), NOT provenance.widthM (which does not exist).
//   - Hit-test is simple axis-aligned bounding-box (AABB) check for MVP.
//     Rotated elements use un-rotated bbox in MVP (rotated hit-test deferred to v1.1).
// MVP carve-out: axis-aligned bbox (RESEARCH A1). Rotated-element hit-test deferred to v1.1 —
//   User-tap auf rotated element greift solange Punkt in der achsenparallelen bbox liegt.

import type { PlanElementRow } from '@spatenstich/shared';
import { sortByZOrder } from './zOrder';

/**
 * Finds the topmost plan element whose axis-aligned bounding box contains the point (xM, yM).
 *
 * The bounding box for an element is:
 *   left   = el.xM - el.widthM / 2
 *   right  = el.xM + el.widthM / 2
 *   top    = el.yM - el.heightM / 2
 *   bottom = el.yM + el.heightM / 2
 *
 * Elements are sorted ascending by zOrder (via sortByZOrder); the last matching element
 * (highest zOrder) is returned — this is the top of the visual stack.
 *
 * Elements with deletedAt !== null are ignored.
 *
 * @param elements - All plan elements (may include soft-deleted; function filters them).
 * @param xM - Garden-meter X coordinate of the touch/click point.
 * @param yM - Garden-meter Y coordinate of the touch/click point.
 * @returns The topmost element covering (xM, yM), or undefined if none.
 */
export function findElementAtPoint(
  elements: PlanElementRow[],
  xM: number,
  yM: number,
): PlanElementRow | undefined {
  // Filter out soft-deleted elements
  const live = elements.filter((e) => e.deletedAt === null);
  // Sort ascending by zOrder — top-most element is last in sorted array
  const sorted = sortByZOrder(live);
  // Collect all elements whose axis-aligned bbox contains the point
  const hits = sorted.filter((e) => {
    const halfW = e.widthM / 2;
    const halfH = e.heightM / 2;
    return (
      xM >= e.xM - halfW &&
      xM <= e.xM + halfW &&
      yM >= e.yM - halfH &&
      yM <= e.yM + halfH
    );
  });
  // Return top-most (last in ascending-sorted hits array) or undefined if no hits
  return hits.length === 0 ? undefined : hits[hits.length - 1];
}
