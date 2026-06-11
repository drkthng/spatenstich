// Phase 10 Plan 02: Pure helper for calendar "Auf welchem Beet?" lookup.
// Phase 10 Plan 06: WR-01 Fix — Center-Konvention; WR-02 findPflanzenInBeet hinzugefügt.
// No React/RN imports — purely functional, testable in Node.
// Reuses pointInPolygon from lib/geometry/bedLayout.ts (Phase 9).
// Codebase-Konvention: xM/yM = bbox CENTER (bedLayout.ts:3-4, editorStore.polygonCommit).

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
 * Mirrors useCompanionDetection.getBedPolygon exactly (Phase 9 Source-of-Truth).
 * T-10-06-01: Array.isArray + length >= 3 guard prevents degenerate polygon fallback.
 */
function beetToPolygon(beet: PlanElementRow): Point2D[] {
  const prov = beet.provenance as Record<string, unknown> | null;
  if (prov && Array.isArray(prov.polygonPointsM) && (prov.polygonPointsM as unknown[]).length >= 3) {
    return prov.polygonPointsM as Point2D[];
  }
  // Fallback: axis-aligned rectangle from bbox CENTER ± half-dimensions.
  // Matches useCompanionDetection.getBedPolygon (Phase 9): xM/yM = center.
  const halfW = beet.widthM / 2;
  const halfH = beet.heightM / 2;
  return [
    { x: beet.xM - halfW, y: beet.yM - halfH },
    { x: beet.xM + halfW, y: beet.yM - halfH },
    { x: beet.xM + halfW, y: beet.yM + halfH },
    { x: beet.xM - halfW, y: beet.yM + halfH },
  ];
}

/**
 * Find all Beet PlanElementRows whose polygon contains at least one Pflanze element
 * with the given plantSlug. Implements CAL-04 "Auf welchem Beet?" via PiP geometry.
 *
 * Algorithm (10-RESEARCH.md §Muster 4):
 * 1. Filter to non-deleted elements.
 * 2. Find Pflanze elements matching plantSlug.
 * 3. For each matching Pflanze, use xM/yM directly as Mittelpunkt (CENTER-Konvention).
 * 4. For each active Beet, reconstruct its polygon.
 * 5. PiP test: if center is inside the polygon, add the Beet to results (deduplicated by id).
 *
 * Returns an empty array when the plant is not placed in any bed.
 * WR-01 Fix: Pflanze-Center ist {x: xM, y: yM} (konsistent mit findBedForPlant in useCompanionDetection).
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
    // WR-01: xM/yM ist der Mittelpunkt (CENTER-Konvention) — konsistent mit
    // useCompanionDetection.findBedForPlant (Phase 9, useCompanionDetection.ts:91).
    const center: Point2D = {
      x: pflanze.xM,
      y: pflanze.yM,
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

/**
 * Find all non-deleted Pflanze PlanElementRows whose Mittelpunkt (xM/yM) lies within
 * the given Beet's polygon. Beet-scoped Gegenstück zur plan-globalen Filterung.
 *
 * Implementiert CAL-06 Beet-Scoping: liefert nur Pflanzen, die tatsächlich in diesem
 * spezifischen Beet liegen — konsumiert von Plan 10-07 (Detail-Screen WR-02 Fix).
 *
 * @param elements - Alle PlanElementRows des Plans (gefiltert wird intern).
 * @param beet     - Das Ziel-Beet, dessen Polygon als Scope dient.
 * @returns Nicht-gelöschte Pflanze-Elemente mit CENTER im Beet-Polygon.
 */
export function findPflanzenInBeet(
  elements: PlanElementRow[],
  beet: PlanElementRow,
): PlanElementRow[] {
  const polygon = beetToPolygon(beet);

  return elements.filter((e) => {
    if (e.elementType !== 'Pflanze') return false;
    if (e.deletedAt !== null) return false;
    const center: Point2D = { x: e.xM, y: e.yM };
    return pointInPolygon(center, polygon);
  });
}
