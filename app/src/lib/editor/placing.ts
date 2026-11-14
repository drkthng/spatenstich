// Phase 31 (EDIT3-09, EDIT3-16): what the palette offers and what the editor needs to know
// while a new element is being placed. Pure, no React.

import type { PlanElementRow, PlantRow } from '@spatenstich/shared';
import { DEFAULT_SIZES } from './elementFactory';
import { pointInBox, toBox } from './elementGeometry';
import { sortByZOrder } from './zOrder';
import { hasOverlap } from '../geometry/plantSpacing';

/** Something the palette can put on the plan. */
export interface PaletteItem {
  /** Stable key for lists and for marking the active entry. */
  key: string;
  kind: string;
  label: string;
  widthM: number;
  heightM: number;
  /** Plants only. */
  plantSlug?: string;
  /** Plants only: recommended distance to the next plant in metres. */
  spacingM?: number;
}

export const BED_KINDS = ['Beet'] as const;
export const FACILITY_KINDS = [
  'Rasen',
  'Weg',
  'Laube',
  'Kompost',
  'Wasserstelle',
  'Zaun',
  'Baum',
  'Sitzplatz',
  'Sonstiges',
] as const;

/** Distance used when the plant data has none. */
const DEFAULT_SPACING_CM = 30;
const GHOST_ID = '__ghost__';

export function kindItem(kind: string, label: string): PaletteItem {
  const size = DEFAULT_SIZES[kind] ?? DEFAULT_SIZES.Sonstiges;
  return { key: `kind:${kind}`, kind, label, widthM: size.widthM, heightM: size.heightM };
}

export function plantItem(plant: PlantRow): PaletteItem {
  const size = DEFAULT_SIZES.Pflanze;
  return {
    key: `plant:${plant.slug}`,
    kind: 'Pflanze',
    label: plant.nameDe,
    widthM: size.widthM,
    heightM: size.heightM,
    plantSlug: plant.slug,
    spacingM: (plant.minSpacingCm ?? DEFAULT_SPACING_CM) / 100,
  };
}

/**
 * Plants whose German name, an alternative name or the botanical name contains the query,
 * names starting with it first, then alphabetically.
 */
export function searchPlants(plants: PlantRow[], query: string, limit = 60): PlantRow[] {
  const q = query.trim().toLocaleLowerCase('de');
  const sorted = [...plants].sort((a, b) => a.nameDe.localeCompare(b.nameDe, 'de'));
  if (q.length === 0) return sorted.slice(0, limit);
  const starts: PlantRow[] = [];
  const contains: PlantRow[] = [];
  for (const plant of sorted) {
    const names = [plant.nameDe, ...(plant.nameAltDe ?? []), plant.nameBotanical ?? ''].map((n) =>
      n.toLocaleLowerCase('de'),
    );
    if (names.some((n) => n.startsWith(q))) starts.push(plant);
    else if (names.some((n) => n.includes(q))) contains.push(plant);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** The topmost bed under a point, following the bed's rotation. */
export function bedAt(elements: PlanElementRow[], xM: number, yM: number): PlanElementRow | undefined {
  const beds = sortByZOrder(elements.filter((e) => e.elementType === 'Beet' && e.deletedAt === null));
  for (let i = beds.length - 1; i >= 0; i--) {
    if (pointInBox(toBox(beds[i]), xM, yM)) return beds[i];
  }
  return undefined;
}

/** Provenance for a newly placed item: plant slug and the bed it stands in, if any. */
export function placementProvenance(
  item: PaletteItem,
  pos: { xM: number; yM: number },
  elements: PlanElementRow[],
): Record<string, unknown> {
  const provenance: Record<string, unknown> = { source: 'manual' };
  if (item.plantSlug) {
    provenance.plantSlug = item.plantSlug;
    const bed = bedAt(elements, pos.xM, pos.yM);
    if (bed) provenance.parentBedId = bed.id;
  }
  return provenance;
}

/**
 * A stand-in element for the placement preview, so the companion check can be asked
 * "what if this plant stood here?" before anything is placed.
 */
export function previewElement(
  item: PaletteItem,
  pos: { xM: number; yM: number },
  elements: PlanElementRow[],
): PlanElementRow {
  return {
    id: GHOST_ID,
    gardenId: '',
    elementType: item.kind,
    label: item.label,
    xM: pos.xM,
    yM: pos.yM,
    widthM: item.widthM,
    heightM: item.heightM,
    confidence: null,
    isAccepted: true,
    createdAt: '',
    updatedAt: '',
    updatedByUserId: null,
    deletedAt: null,
    importedFrom: null,
    provenance: placementProvenance(item, pos, elements),
    layer: item.kind === 'Pflanze' ? 'seasonal' : 'infrastructure',
  };
}

/** True when another plant stands closer than the recommended distance. */
export function isTooClose(
  item: PaletteItem,
  pos: { xM: number; yM: number },
  elements: PlanElementRow[],
): boolean {
  if (!item.plantSlug || !item.spacingM) return false;
  return hasOverlap({ xM: pos.xM, yM: pos.yM, id: GHOST_ID }, item.spacingM, elements);
}
