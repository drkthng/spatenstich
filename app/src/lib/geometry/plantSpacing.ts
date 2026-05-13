// Phase 7 Plan 03: Pflanzenabstand-Hinweis overlap detection (EDIT-07).
// Pure-JS Euclidean overlap test. Non-blocking — caller decides what to do with `true`.
// Per CONTEXT D-10: plant placement is never blocked; ring color is the soft signal.

import type { PlanElementRow } from '@spatenstich/shared';

/** Returns true if `placed` plant is closer than `spacingM` to any other seasonal-layer plant. */
export function hasOverlap(
  placed: { xM: number; yM: number; id: string },
  spacingM: number,
  others: PlanElementRow[],
): boolean {
  // Degenerate boundary: spacingM <= 0 means "no minimum spacing" — never report overlap.
  if (spacingM <= 0) return false;
  const seasonalNeighbours = others.filter(
    (e) =>
      e.layer === 'seasonal' &&
      e.deletedAt === null &&
      e.id !== placed.id,
  );
  return seasonalNeighbours.some((o) => {
    const dx = o.xM - placed.xM;
    const dy = o.yM - placed.yM;
    return Math.sqrt(dx * dx + dy * dy) < spacingM;
  });
}
