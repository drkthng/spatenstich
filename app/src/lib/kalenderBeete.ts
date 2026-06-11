// Phase 10 Plan 02: Pure helper for calendar "Auf welchem Beet?" lookup.
// No React/RN imports — purely functional, testable in Node.
// Reuses pointInPolygon from lib/geometry/bedLayout.ts (Phase 9).

import type { PlanElementRow } from '@spatenstich/shared';
import { pointInPolygon, type Point2D } from './geometry/bedLayout';

/**
 * Extract the plantSlug from a plan element's provenance.
 * Type-guards `typeof prov.plantSlug === 'string'` — non-string/missing yields null (T-10-04).
 * Verbatim from useCompanionDetection.ts.
 */
export function getPlantSlug(el: PlanElementRow): string | null {
  const prov = el.provenance as Record<string, unknown> | null;
  if (!prov || typeof prov.plantSlug !== 'string') return null;
  return prov.plantSlug;
}

/**
 * Reconstruct a Beet's polygon from its PlanElementRow.
 * Primary: provenance.polygonPointsM (freehand polygon, array of {x,y}).
 * Fallback: 4-corner axis-aligned rectangle from xM/yM/widthM/heightM.
 * NOTE: xM/yM for Beet elements represent the bbox CENTER (polygonToBbox in Phase 7).
 * The 4-corner rectangle is therefore built from center ± half-dimensions.
 */
function beetToPolygon(beet: PlanElementRow): Point2D[] {
  const prov = beet.provenance as Record<string, unknown> | null;
  if (prov && Array.isArray(prov.polygonPointsM) && (prov.polygonPointsM as unknown[]).length >= 3) {
    return prov.polygonPointsM as Point2D[];
  }
  // Fallback: axis-aligned rectangle.
  // Per plan spec: [xM,yM,xM+widthM,yM] ... i.e. top-left corner origin.
  // The plan spec says: xM/yM/widthM/heightM stored as top-left (not center) for beds
  // written from the plan spec action. Use the 4-corner form from the action spec directly.
  const { xM, yM, widthM, heightM } = beet;
  return [
    { x: xM, y: yM },
    { x: xM + widthM, y: yM },
    { x: xM + widthM, y: yM + heightM },
    { x: xM, y: yM + heightM },
  ];
}

/**
 * Find all Beet PlanElementRows whose polygon contains at least one Pflanze element
 * with the given plantSlug. Implements CAL-04 "Auf welchem Beet?" via PiP geometry.
 *
 * Algorithm (10-RESEARCH.md §Muster 4):
 * 1. Filter to non-deleted elements.
 * 2. Find Pflanze elements matching plantSlug.
 * 3. For each matching Pflanze, compute its center point.
 * 4. For each active Beet, reconstruct its polygon.
 * 5. PiP test: if center is inside the polygon, add the Beet to results (deduplicated by id).
 *
 * Returns an empty array when the plant is not placed in any bed.
 */
export function findBeeteForPlant(
  elements: PlanElementRow[],
  plantSlug: string,
): PlanElementRow[] {
  const active = elements.filter((e) => e.deletedAt === null);

  const matchingPflanzen = active.filter(
    (e) => e.elementType === 'Pflanze' && getPlantSlug(e) === plantSlug,
  );

  if (matchingPflanzen.length === 0) return [];

  const beete = active.filter((e) => e.elementType === 'Beet');

  const result: PlanElementRow[] = [];
  const seenIds = new Set<string>();

  for (const pflanze of matchingPflanzen) {
    const center: Point2D = {
      x: pflanze.xM + pflanze.widthM / 2,
      y: pflanze.yM + pflanze.heightM / 2,
    };

    for (const beet of beete) {
      if (seenIds.has(beet.id)) continue;
      const polygon = beetToPolygon(beet);
      if (pointInPolygon(center, polygon)) {
        result.push(beet);
        seenIds.add(beet.id);
      }
    }
  }

  return result;
}
