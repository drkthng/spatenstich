// Hit test for plan elements: which element is under a point in garden metres.
// Used by the interaction controller (tap, double-tap, drag start).

import type { PlanElementRow } from '@spatenstich/shared';
import { sortByZOrder } from './zOrder';
import { pointInBox, toBox } from './elementGeometry';

/**
 * Finds the topmost plan element that contains the point (xM, yM).
 *
 * Phase 30: the test follows the element's rotation (it used to be an axis-aligned
 * bounding-box check). Elements are sorted ascending by zOrder; the last match is the top
 * of the visual stack. Soft-deleted elements are ignored.
 */
export function findElementAtPoint(
  elements: PlanElementRow[],
  xM: number,
  yM: number,
): PlanElementRow | undefined {
  const sorted = sortByZOrder(elements.filter((e) => e.deletedAt === null));
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (pointInBox(toBox(sorted[i]), xM, yM)) return sorted[i];
  }
  return undefined;
}
