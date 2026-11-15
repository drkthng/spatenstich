// Phase 35: the plan as the photo check sees it.
//
// The model gets a short description of every element with a stand-in reference (E1,
// E2, …) instead of the real ids: shorter, and a reference it makes up cannot hit a
// real row. The mapping stays on the device.

import type { PhotoPlanElement, PlanElementRow, PlantRow } from '@spatenstich/shared';
import { getRotateDeg } from '../editor/elementGeometry';

/** The edge function accepts at most this many elements. */
export const MAX_PLAN_ELEMENTS = 300;
export const MAX_CATALOG_NAMES = 500;

export interface PlanSummary {
  elements: PhotoPlanElement[];
  refToId: Map<string, string>;
  idToRef: Map<string, string>;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function parentBedId(el: PlanElementRow): string | null {
  const raw = (el.provenance as Record<string, unknown> | null)?.parentBedId;
  return typeof raw === 'string' ? raw : null;
}

/**
 * Describes the live elements of a plan. Fixed things come first, plants after, each
 * group in the order it was created, so the same plan always gets the same references.
 * A plan with more elements than the check accepts loses its newest plants first.
 */
export function buildPlanSummary(elements: PlanElementRow[]): PlanSummary {
  const live = elements.filter((e) => e.deletedAt === null && e.isAccepted !== false);
  const byAge = (a: PlanElementRow, b: PlanElementRow): number =>
    a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt);
  const fixed = live.filter((e) => e.elementType !== 'Pflanze').sort(byAge);
  const plants = live.filter((e) => e.elementType === 'Pflanze').sort(byAge);
  const chosen = [...fixed, ...plants].slice(0, MAX_PLAN_ELEMENTS);

  const refToId = new Map<string, string>();
  const idToRef = new Map<string, string>();
  chosen.forEach((el, index) => {
    const ref = `E${index + 1}`;
    refToId.set(ref, el.id);
    idToRef.set(el.id, ref);
  });

  const described = chosen.map((el): PhotoPlanElement => {
    const bed = parentBedId(el);
    return {
      ref: idToRef.get(el.id)!,
      type: el.elementType,
      label: el.label,
      xM: round2(el.xM),
      yM: round2(el.yM),
      widthM: round2(el.widthM),
      heightM: round2(el.heightM),
      rotationDeg: Math.round(getRotateDeg(el)),
      bedRef: bed ? (idToRef.get(bed) ?? null) : null,
    };
  });
  return { elements: described, refToId, idToRef };
}

/** The names the catalog already has, so the check can tell what is missing from it. */
export function catalogNames(plants: PlantRow[]): string[] {
  const names = new Set<string>();
  for (const plant of plants) names.add(plant.nameDe);
  return [...names].sort((a, b) => a.localeCompare(b, 'de')).slice(0, MAX_CATALOG_NAMES);
}
