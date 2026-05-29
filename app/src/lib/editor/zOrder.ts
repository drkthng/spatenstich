// Phase 09.1 Wave 0: Z-Order pure-function stubs.
// GREEN-fill: Plan 01 (bringForward/bringToFront/sendBackward/sendToBack/getZOrder/sortByZOrder).
//
// Design decisions (D-13/D-14/D-15):
//   - Z-Order is plan-wide (not bed-local). Consistent with flat plan_elements structure.
//   - provenance.zOrder: number — integer, default 0 when not set (Assumption A9).
//   - Render-sort: ascending — higher zOrder renders on top.
//   - Lazy conflict-resolution: "eine Ebene vor" finds next-higher Z + 1 (no global renumbering).
//   - Tie-break by createdAt ASC for stable render order when zOrder values collide.
// Pitfall 3 (zOrder overflow): Risk classified as nil — JS Number safe up to 2^53;
//   user would need ~9e15 bringToFront clicks (T-09.1-OVERFLOW accepted in threat model).

import type { PlanElementRow } from '@spatenstich/shared';

/**
 * Returns the z-order value for an element.
 * Defaults to 0 when provenance.zOrder is not set (Assumption A9 — missing field = bottom of stack).
 * Defensive read — does NOT overwrite provenance (Pattern S2 / Pitfall 5 guard).
 */
export function getZOrder(el: PlanElementRow): number {
  const prov = (el.provenance ?? {}) as Record<string, unknown>;
  return typeof prov.zOrder === 'number' ? prov.zOrder : 0;
}

/**
 * Returns the new zOrder value for bringing `id` to the absolute front.
 * Result = max(zOrder of all other non-deleted elements) + 1.
 * If no other elements exist, returns 1.
 * Does NOT mutate provenance.plantSlug or other fields (Pitfall 5 guard).
 */
export function bringToFront(els: PlanElementRow[], id: string): number {
  const others = els.filter((e) => e.id !== id && e.deletedAt === null);
  if (others.length === 0) return 1;
  return Math.max(...others.map(getZOrder)) + 1;
}

/**
 * Returns the new zOrder value for moving `id` one step forward (above nearest higher neighbour).
 * If element is already on top, returns its current zOrder (no-op).
 */
export function bringForward(els: PlanElementRow[], id: string): number {
  const target = els.find((e) => e.id === id);
  if (!target) return 0;
  const targetZ = getZOrder(target);
  const higherZs = els
    .filter((e) => e.id !== id && e.deletedAt === null && getZOrder(e) > targetZ)
    .map(getZOrder);
  if (higherZs.length === 0) return targetZ; // already on top, no-op
  const nextHigher = Math.min(...higherZs);
  return nextHigher + 1;
}

/**
 * Returns the new zOrder value for moving `id` one step backward (below nearest lower neighbour).
 * If element is already at bottom, returns its current zOrder (no-op).
 */
export function sendBackward(els: PlanElementRow[], id: string): number {
  const target = els.find((e) => e.id === id);
  if (!target) return 0;
  const targetZ = getZOrder(target);
  const lowerZs = els
    .filter((e) => e.id !== id && e.deletedAt === null && getZOrder(e) < targetZ)
    .map(getZOrder);
  if (lowerZs.length === 0) return targetZ; // already at bottom, no-op
  const nextLower = Math.max(...lowerZs);
  return nextLower - 1;
}

/**
 * Returns the new zOrder value for sending `id` to the absolute back.
 * Result = min(zOrder of all other non-deleted elements) - 1.
 * If no other elements exist, returns -1.
 */
export function sendToBack(els: PlanElementRow[], id: string): number {
  const others = els.filter((e) => e.id !== id && e.deletedAt === null);
  if (others.length === 0) return -1;
  return Math.min(...others.map(getZOrder)) - 1;
}

/**
 * Sorts elements ascending by zOrder (lower zOrder rendered first = behind).
 * Tie-break: createdAt ASC for stable, reproducible render order (RENDER-SORT D-13).
 * Returns a new array (does not mutate input).
 */
export function sortByZOrder(els: PlanElementRow[]): PlanElementRow[] {
  return [...els].sort((a, b) => {
    const za = getZOrder(a);
    const zb = getZOrder(b);
    if (za !== zb) return za - zb;
    // Tiebreaker: createdAt ascending so older elements render below newer within same z-band
    return a.createdAt.localeCompare(b.createdAt);
  });
}
