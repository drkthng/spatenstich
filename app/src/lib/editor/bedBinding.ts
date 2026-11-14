// Phase 32 (EDIT3-12): plants that stand in a bed go with the bed when it is moved, turned
// or resized. Plants outside stay where they are. Pure, no DOM.

import type { PlanElementRow } from '@spatenstich/shared';
import { getRotateDeg, localToWorld, normalizeDeg, toBox, worldToLocal, type Box } from './elementGeometry';
import { elementPolygon, pointInPolygon } from './outline';
import { sortByZOrder } from './zOrder';

const isLive = (e: PlanElementRow): boolean => e.deletedAt === null;
const isBed = (e: PlanElementRow): boolean => e.elementType === 'Beet';
const isPlant = (e: PlanElementRow): boolean => e.elementType === 'Pflanze';

function parentBedId(el: PlanElementRow): string | null {
  const raw = (el.provenance as Record<string, unknown> | null)?.parentBedId;
  return typeof raw === 'string' ? raw : null;
}

/** The topmost bed whose shape contains the point. */
export function bedContaining(elements: PlanElementRow[], xM: number, yM: number): PlanElementRow | undefined {
  const beds = sortByZOrder(elements.filter((e) => isBed(e) && isLive(e)));
  for (let i = beds.length - 1; i >= 0; i--) {
    if (pointInPolygon(xM, yM, elementPolygon(beds[i]))) return beds[i];
  }
  return undefined;
}

/**
 * The plants that belong to a bed: those that name it as their bed, and those without a
 * named bed whose centre lies in it.
 */
export function plantsOfBed(bed: PlanElementRow, elements: PlanElementRow[]): PlanElementRow[] {
  const shape = elementPolygon(bed);
  return elements.filter((e) => {
    if (!isPlant(e) || !isLive(e)) return false;
    const parent = parentBedId(e);
    if (parent !== null) return parent === bed.id;
    return pointInPolygon(e.xM, e.yM, shape);
  });
}

/**
 * Where the bed's plants go when the bed changes from `before` to `after`: each plant keeps
 * its place relative to the bed (as a fraction of its width and depth) and turns with it.
 * The plants keep their own size.
 */
export function carryPlants(
  before: Box,
  after: Box,
  plants: PlanElementRow[],
): { id: string; patch: Partial<PlanElementRow> }[] {
  const turn = normalizeDeg(after.rotateDeg - before.rotateDeg);
  return plants.map((plant) => {
    const local = worldToLocal(before, plant.xM, plant.yM);
    const u = before.widthM > 0 ? local.x / before.widthM : 0;
    const v = before.heightM > 0 ? local.y / before.heightM : 0;
    const pos = localToWorld(after, u * after.widthM, v * after.heightM);
    const patch: Partial<PlanElementRow> = { xM: pos.xM, yM: pos.yM };
    if (turn !== 0) {
      patch.provenance = {
        ...(plant.provenance ?? {}),
        rotateDeg: normalizeDeg(getRotateDeg(plant) + turn),
      };
    }
    return { id: plant.id, patch };
  });
}

/** True when a patch changes where an element is, how big it is or how it is turned. */
export function changesBox(el: PlanElementRow, patch: Partial<PlanElementRow>): boolean {
  if (patch.xM !== undefined && patch.xM !== el.xM) return true;
  if (patch.yM !== undefined && patch.yM !== el.yM) return true;
  if (patch.widthM !== undefined && patch.widthM !== el.widthM) return true;
  if (patch.heightM !== undefined && patch.heightM !== el.heightM) return true;
  if (patch.provenance !== undefined) {
    return getRotateDeg({ provenance: patch.provenance }) !== getRotateDeg(el);
  }
  return false;
}

/**
 * Applies a patch to one element and lets what depends on it follow:
 *  - a bed that moves, turns or changes size takes its plants along;
 *  - a plant that moves is noted as standing in the bed it now lies in, or in none.
 * Returns the new element list (same array when nothing changed).
 */
export function applyElementPatch(
  elements: PlanElementRow[],
  id: string,
  patch: Partial<PlanElementRow>,
  now: string,
): PlanElementRow[] {
  const target = elements.find((e) => e.id === id);
  if (!target) return elements;
  const next: PlanElementRow = { ...target, ...patch, updatedAt: now };
  const follow = new Map<string, Partial<PlanElementRow>>();

  if (isBed(target) && isLive(target) && changesBox(target, patch)) {
    for (const move of carryPlants(toBox(target), toBox(next), plantsOfBed(target, elements))) {
      follow.set(move.id, move.patch);
    }
  }

  let updated = next;
  if (isPlant(target) && (next.xM !== target.xM || next.yM !== target.yM)) {
    const bed = bedContaining(elements, next.xM, next.yM);
    const current = parentBedId(next);
    if ((bed?.id ?? null) !== current) {
      const provenance: Record<string, unknown> = { ...(next.provenance ?? {}) };
      if (bed) provenance.parentBedId = bed.id;
      else delete provenance.parentBedId;
      updated = { ...next, provenance };
    }
  }

  return elements.map((e) => {
    if (e.id === id) return updated;
    const carried = follow.get(e.id);
    return carried ? { ...e, ...carried, updatedAt: now } : e;
  });
}
