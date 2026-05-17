// Phase 9 Plan 02: Companion detection hook — the brain of Phase 9.
// Subscribes to editorStore, determines bed membership via PiP (Plan 01),
// builds companion map from plants.json bundle, exposes conflictElementIds +
// toastState for canvas overlays (Plan 04) and CompanionToast (Plan 03).
// Per D-02: fully client-side, synchronous. Per D-11: computed on-demand.

import * as React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { usePlants } from './usePlants';
import plantsBundle from '@spatenstich/shared/data/plants';
import type { PlanElementRow, PlantRow, PlantDbBundle } from '@spatenstich/shared';
import { pointInPolygon, type Point2D } from '../lib/geometry/bedLayout';

// ---- Exported types ----

export interface ToastState {
  variant: 'error' | 'success';
  message: string;
}

export interface CompanionEntry {
  incompatibleSlugs: Set<string>;
  companionSlugs: Set<string>;
}

// ---- Pure exported functions (testable without React) ----

/**
 * Build bidirectional slug->CompanionEntry lookup from bundle companions.
 * Skips 'neutral' relationships (D-12).
 */
export function buildCompanionMap(bundle: PlantDbBundle): Map<string, CompanionEntry> {
  const map = new Map<string, CompanionEntry>();

  function ensureEntry(slug: string): CompanionEntry {
    let entry = map.get(slug);
    if (!entry) {
      entry = { incompatibleSlugs: new Set(), companionSlugs: new Set() };
      map.set(slug, entry);
    }
    return entry;
  }

  for (const c of bundle.companions) {
    if (c.relationship === 'neutral') continue;
    const setKey = c.relationship === 'incompatible' ? 'incompatibleSlugs' : 'companionSlugs';
    ensureEntry(c.plantASlug)[setKey].add(c.plantBSlug);
    ensureEntry(c.plantBSlug)[setKey].add(c.plantASlug);
  }

  return map;
}

/**
 * Extract bed polygon from provenance or fall back to bbox rectangle.
 * Per D-03: provenance.polygonPointsM is the primary source.
 */
export function getBedPolygon(bed: PlanElementRow): Point2D[] {
  const prov = bed.provenance as Record<string, unknown> | null;
  if (prov && Array.isArray(prov.polygonPointsM) && prov.polygonPointsM.length >= 3) {
    return prov.polygonPointsM as Point2D[];
  }
  // Fallback: axis-aligned rectangle from xM/yM/widthM/heightM
  const halfW = bed.widthM / 2;
  const halfH = bed.heightM / 2;
  return [
    { x: bed.xM - halfW, y: bed.yM - halfH },
    { x: bed.xM + halfW, y: bed.yM - halfH },
    { x: bed.xM + halfW, y: bed.yM + halfH },
    { x: bed.xM - halfW, y: bed.yM + halfH },
  ];
}

/**
 * Find which bed a plant belongs to.
 * Fast path: provenance.parentBedId lookup (D-03).
 * Fallback: pointInPolygon against all beds (D-04).
 * Returns null if plant is outside all beds.
 */
export function findBedForPlant(
  plant: PlanElementRow,
  beds: PlanElementRow[],
): PlanElementRow | null {
  const prov = plant.provenance as Record<string, unknown> | null;
  // Fast path: parentBedId hint
  if (prov && typeof prov.parentBedId === 'string') {
    const bed = beds.find((b) => b.id === prov.parentBedId && b.deletedAt === null);
    if (bed) return bed; // T-09-03: fall through if bed not found (deleted/missing)
  }
  // Fallback: PiP
  const plantCenter: Point2D = { x: plant.xM, y: plant.yM };
  for (const bed of beds) {
    if (bed.deletedAt !== null) continue;
    const polygon = getBedPolygon(bed);
    if (pointInPolygon(plantCenter, polygon)) return bed;
  }
  return null;
}

/**
 * Best-effort slug resolution from label text (D-15).
 * Case-insensitive match against nameDe + nameAltDe.
 */
export function bestEffortSlugFromLabel(
  label: string,
  plantByName: Map<string, PlantRow>,
): string | null {
  const normalized = label.trim().toLowerCase();
  const plant = plantByName.get(normalized);
  return plant ? plant.slug : null;
}

/**
 * Get the plantSlug from an element's provenance.
 */
function getPlantSlug(el: PlanElementRow): string | null {
  const prov = el.provenance as Record<string, unknown> | null;
  if (!prov || typeof prov.plantSlug !== 'string') return null;
  return prov.plantSlug;
}

/**
 * Compute all element IDs that have at least one incompatible neighbour (D-11, D-12).
 * Groups plants by bed, cross-checks companion map.
 */
export function computeConflicts(
  elements: PlanElementRow[],
  plantBySlug: Map<string, PlantRow>,
  companionMap: Map<string, CompanionEntry>,
): Set<string> {
  const conflicts = new Set<string>();
  const beds = elements.filter((e) => e.elementType === 'Beet' && e.deletedAt === null);
  const plants = elements.filter(
    (e) => e.elementType === 'Pflanze' && e.deletedAt === null && getPlantSlug(e) !== null,
  );

  // Group plants by bed
  const bedPlants = new Map<string, PlanElementRow[]>();
  for (const plant of plants) {
    const bed = findBedForPlant(plant, beds);
    if (!bed) continue; // D-04: outside all beds -> no check
    const group = bedPlants.get(bed.id);
    if (group) group.push(plant);
    else bedPlants.set(bed.id, [plant]);
  }

  // Cross-check within each bed
  for (const group of bedPlants.values()) {
    for (let i = 0; i < group.length; i++) {
      const slugA = getPlantSlug(group[i])!;
      const entryA = companionMap.get(slugA);
      if (!entryA) continue;
      for (let j = i + 1; j < group.length; j++) {
        const slugB = getPlantSlug(group[j])!;
        if (entryA.incompatibleSlugs.has(slugB)) {
          conflicts.add(group[i].id);
          conflicts.add(group[j].id);
        }
      }
    }
  }

  return conflicts;
}

/**
 * Build display name for a plant (with emoji if available).
 */
function displayName(slug: string, plantBySlug: Map<string, PlantRow>): string {
  const plant = plantBySlug.get(slug);
  if (!plant) return slug;
  return plant.iconEmoji ? `${plant.iconEmoji} ${plant.nameDe}` : plant.nameDe;
}

/**
 * Compute toast for a single changed element (D-08).
 * Conflict has priority over companion.
 */
export function computeToastForElement(
  changed: PlanElementRow,
  allElements: PlanElementRow[],
  plantBySlug: Map<string, PlantRow>,
  companionMap: Map<string, CompanionEntry>,
): ToastState | null {
  const changedSlug = getPlantSlug(changed);
  if (!changedSlug) return null;

  const beds = allElements.filter((e) => e.elementType === 'Beet' && e.deletedAt === null);
  const bed = findBedForPlant(changed, beds);
  if (!bed) return null; // D-04: outside all beds

  const entry = companionMap.get(changedSlug);
  if (!entry) return null;

  // Find neighbours in same bed
  const neighbours = allElements.filter(
    (e) =>
      e.elementType === 'Pflanze' &&
      e.deletedAt === null &&
      e.id !== changed.id &&
      getPlantSlug(e) !== null &&
      findBedForPlant(e, beds)?.id === bed.id,
  );

  const changedName = displayName(changedSlug, plantBySlug);
  const incompatibleNames: string[] = [];
  const companionNames: string[] = [];

  for (const n of neighbours) {
    const nSlug = getPlantSlug(n)!;
    if (entry.incompatibleSlugs.has(nSlug)) {
      incompatibleNames.push(displayName(nSlug, plantBySlug));
    } else if (entry.companionSlugs.has(nSlug)) {
      companionNames.push(displayName(nSlug, plantBySlug));
    }
  }

  // D-08: conflict has priority
  if (incompatibleNames.length > 0) {
    const others = incompatibleNames.join(', ');
    return {
      variant: 'error',
      message:
        incompatibleNames.length === 1
          ? `\u26A0 Konflikt: ${changedName} vertr\u00E4gt sich nicht mit ${others}`
          : `\u26A0 Konflikt: ${changedName} vertr\u00E4gt sich nicht mit ${others}`,
    };
  }

  if (companionNames.length > 0) {
    const others = companionNames.join(', ');
    return {
      variant: 'success',
      message:
        companionNames.length === 1
          ? `\u2713 Gute Nachbarschaft: ${changedName} + ${others}`
          : `\u2713 Gute Nachbarschaft: ${changedName} + ${others}`,
    };
  }

  return null;
}

// ---- Internal helpers ----

/**
 * Find the plant element that was added or moved between state snapshots.
 */
function findChangedPlantElement(
  current: PlanElementRow[],
  prev: PlanElementRow[],
): PlanElementRow | null {
  const prevMap = new Map(prev.map((e) => [e.id, e]));
  for (const el of current) {
    if (el.elementType !== 'Pflanze' || el.deletedAt !== null) continue;
    const old = prevMap.get(el.id);
    if (!old) return el; // added
    if (old.xM !== el.xM || old.yM !== el.yM) return el; // moved
  }
  return null;
}

/**
 * Silent upgrade: enrich plantSlug in provenance if missing (D-15).
 */
function enrichPlantSlug(
  element: PlanElementRow,
  plantByNameDe: Map<string, PlantRow>,
): void {
  if (getPlantSlug(element) !== null) return;
  const slug = bestEffortSlugFromLabel(element.label, plantByNameDe);
  if (!slug) return;
  const prov = (element.provenance ?? {}) as Record<string, unknown>;
  useEditorStore.getState().updateElement(element.id, {
    provenance: { ...prov, plantSlug: slug },
  });
}

// ---- Hook ----

export function useCompanionDetection() {
  const { data: plants = [] } = usePlants();
  const elements = useEditorStore((s) => s.elements);

  const plantBySlug = React.useMemo(
    () => new Map(plants.map((p) => [p.slug, p])),
    [plants],
  );

  const plantByNameDe = React.useMemo(() => {
    const map = new Map<string, PlantRow>();
    for (const p of plants) {
      map.set(p.nameDe.toLowerCase(), p);
      for (const alt of p.nameAltDe) map.set(alt.toLowerCase(), p);
    }
    return map;
  }, [plants]);

  const companionMap = React.useMemo(
    () => buildCompanionMap(plantsBundle as unknown as PlantDbBundle),
    [],
  );

  const conflictElementIds = React.useMemo(
    () => computeConflicts(elements, plantBySlug, companionMap),
    [elements, plantBySlug, companionMap],
  );

  const [toastState, setToastState] = React.useState<ToastState | null>(null);
  const dismissToast = React.useCallback(() => setToastState(null), []);

  // Subscribe to element changes for toast trigger (placement/move only, NOT plan-load)
  React.useEffect(() => {
    return useEditorStore.subscribe((state, prev) => {
      if (state.elements === prev.elements) return;
      const changed = findChangedPlantElement(state.elements, prev.elements);
      if (!changed) return;
      // Enrich with best-effort slug if missing (D-15 silent upgrade)
      enrichPlantSlug(changed, plantByNameDe);
      const toast = computeToastForElement(
        changed,
        state.elements,
        plantBySlug,
        companionMap,
      );
      if (toast) setToastState(toast);
    });
  }, [plantBySlug, plantByNameDe, companionMap]);

  return { conflictElementIds, toastState, dismissToast };
}
