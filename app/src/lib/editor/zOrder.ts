// Phase 09.1 Wave 0: Z-Order pure-function stubs.
// GREEN-fill: Plan 01 (bringForward/bringToFront/sendBackward/sendToBack/getZOrder) + Plan 04 (sortByZOrder render integration).
//
// Design decisions (D-13/D-14/D-15):
//   - Z-Order is plan-wide (not bed-local). Consistent with flat plan_elements structure.
//   - provenance.zOrder: number — integer, default 0 when not set (Assumption A9).
//   - Render-sort: ascending — higher zOrder renders on top.
//   - Lazy conflict-resolution: "eine Ebene vor" finds next-higher Z + 1 (no global renumbering).
//   - Tie-break by createdAt ASC for stable render order when zOrder values collide.

import type { PlanElementRow } from '@spatenstich/shared';

/**
 * Returns the z-order value for an element.
 * Defaults to 0 when provenance.zOrder is not set (Assumption A9 — missing field = bottom of stack).
 */
export function getZOrder(el: PlanElementRow): number {
  throw new Error('TODO Plan 01 GREEN');
}

/**
 * Returns the new zOrder value for bringing `id` to the absolute front.
 * Result = max(zOrder of all other elements) + 1.
 * If no other elements exist, returns 1.
 * Does NOT mutate provenance.plantSlug or other fields (Pitfall 5 guard).
 */
export function bringToFront(els: PlanElementRow[], id: string): number {
  throw new Error('TODO Plan 01 GREEN');
}

/**
 * Returns the new zOrder value for moving `id` one step forward (above nearest higher neighbour).
 * If element is already on top, returns its current zOrder (no-op).
 */
export function bringForward(els: PlanElementRow[], id: string): number {
  throw new Error('TODO Plan 01 GREEN');
}

/**
 * Returns the new zOrder value for moving `id` one step backward (below nearest lower neighbour).
 * If element is already at bottom, returns its current zOrder (no-op).
 */
export function sendBackward(els: PlanElementRow[], id: string): number {
  throw new Error('TODO Plan 01 GREEN');
}

/**
 * Returns the new zOrder value for sending `id` to the absolute back.
 * Result = min(zOrder of all other elements) - 1.
 * If no other elements exist, returns -1 (caller may normalize to 0 if preferred).
 */
export function sendToBack(els: PlanElementRow[], id: string): number {
  throw new Error('TODO Plan 01 GREEN');
}

/**
 * Sorts elements ascending by zOrder (lower zOrder rendered first = behind).
 * Tie-break: createdAt ASC for stable, reproducible render order.
 * Returns a new array (does not mutate input).
 */
export function sortByZOrder(els: PlanElementRow[]): PlanElementRow[] {
  throw new Error('TODO Plan 01 / Plan 04 GREEN');
}
