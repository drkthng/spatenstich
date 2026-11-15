// Phase 35 (PHOTO-05): plants a garden adds to the catalog.
//
// The shared catalog is read-only. An entry accepted from a photo finding lives in
// garden_plants, is synced to the partner like the plan, and shows up in palette and
// calendar next to the shared entries. Pure helpers; storage access is in photoRepo.ts.

import type { GardenPlantRow, PhotoCatalogProposal, PlantCategory, PlantRow } from '@spatenstich/shared';

const CATEGORIES: PlantCategory[] = ['Gemüse', 'Kraut', 'Beere', 'Obstbaum', 'Blume'];

/** First day of each month as day of the year (non-leap year). */
const MONTH_START_DOY = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_LENGTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const validMonth = (m: number | null | undefined): m is number => Number.isInteger(m) && m! >= 1 && m! <= 12;

/** First day of a month as day of the year. */
export function monthStartDoy(month: number): number {
  return MONTH_START_DOY[month - 1]!;
}

/** Last day of a month as day of the year. */
export function monthEndDoy(month: number): number {
  return MONTH_START_DOY[month - 1]! + MONTH_LENGTH[month - 1]! - 1;
}

/** A window given in months as days of the year; null when an end is missing. */
export function monthWindowToDoy(
  start: number | null | undefined,
  end: number | null | undefined,
): { start: number | null; end: number | null } {
  if (!validMonth(start) || !validMonth(end)) return { start: null, end: null };
  return { start: monthStartDoy(start), end: monthEndDoy(end) };
}

/** The month a day of the year falls in (1 to 12); null for no day. */
export function doyToMonth(doy: number | null | undefined): number | null {
  if (!Number.isFinite(doy) || doy! < 1) return null;
  for (let month = 12; month >= 1; month--) {
    if (doy! >= MONTH_START_DOY[month - 1]!) return month;
  }
  return null;
}

/** A name as a slug: lower case, umlauts written out, everything else as hyphens. */
export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'pflanze';
}

/** A slug no other entry uses: the plain one, or with -2, -3, … appended. */
export function uniqueSlug(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(name);
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

const sameName = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The catalog entry with this German name (or alternative name), if there is one. */
export function findPlantByName(plants: PlantRow[], name: string | null | undefined): PlantRow | null {
  if (!name || !name.trim()) return null;
  return (
    plants.find((p) => sameName(p.nameDe, name)) ??
    plants.find((p) => p.nameAltDe.some((alt) => sameName(alt, name))) ??
    null
  );
}

/** A proposal from a photo check as a row of the garden's own catalog. */
export function gardenPlantFromProposal(
  proposal: PhotoCatalogProposal,
  ctx: { id: string; gardenId: string; userId: string | null; now: string; takenSlugs: Iterable<string> },
): GardenPlantRow {
  const sow = monthWindowToDoy(proposal.sowStartMonth, proposal.sowEndMonth);
  const plant = monthWindowToDoy(proposal.plantStartMonth, proposal.plantEndMonth);
  const harvest = monthWindowToDoy(proposal.harvestStartMonth, proposal.harvestEndMonth);
  const spacing = proposal.spacingCm;
  return {
    id: ctx.id,
    gardenId: ctx.gardenId,
    slug: uniqueSlug(proposal.nameDe, ctx.takenSlugs),
    nameDe: proposal.nameDe.trim().slice(0, 80),
    nameBotanical: proposal.nameBotanical?.trim().slice(0, 120) || null,
    family: (proposal.family ?? '').trim().slice(0, 80),
    category: CATEGORIES.includes(proposal.category) ? proposal.category : 'Gemüse',
    minSpacingCm: typeof spacing === 'number' && spacing >= 1 && spacing <= 1000 ? Math.round(spacing) : null,
    sowOutdoorDoyStart: sow.start,
    sowOutdoorDoyEnd: sow.end,
    plantDoyStart: plant.start,
    plantDoyEnd: plant.end,
    harvestDoyStart: harvest.start,
    harvestDoyEnd: harvest.end,
    notesDe: null,
    source: 'photo',
    createdAt: ctx.now,
    updatedAt: ctx.now,
    updatedByUserId: ctx.userId,
    deletedAt: null,
  };
}

/** A garden's own entry in the shape palette and calendar work with. */
export function gardenPlantToPlantRow(row: GardenPlantRow): PlantRow {
  return {
    id: row.id,
    slug: row.slug,
    nameDe: row.nameDe,
    nameAltDe: [],
    nameBotanical: row.nameBotanical,
    family: row.family,
    category: (CATEGORIES as string[]).includes(row.category) ? (row.category as PlantCategory) : 'Gemüse',
    minSpacingCm: row.minSpacingCm,
    rowSpacingCm: null,
    depthCm: null,
    sunRequirement: 'sonnig',
    waterNeeds: 'mittel',
    climateZoneMin: null,
    climateZoneMax: null,
    sowOutdoorDoyStart: row.sowOutdoorDoyStart,
    sowOutdoorDoyEnd: row.sowOutdoorDoyEnd,
    sowIndoorDoyStart: null,
    sowIndoorDoyEnd: null,
    plantDoyStart: row.plantDoyStart,
    plantDoyEnd: row.plantDoyEnd,
    harvestDoyStart: row.harvestDoyStart,
    harvestDoyEnd: row.harvestDoyEnd,
    daysToHarvest: null,
    nitrogenFixing: false,
    perennial: false,
    notesDe: row.notesDe,
    iconEmoji: null,
    dataSource: 'own-research',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * The shared catalog plus the garden's own entries. An own entry never hides a shared
 * one with the same slug (the shared entry has the companion data).
 */
export function mergeCatalog(shared: PlantRow[], own: GardenPlantRow[]): PlantRow[] {
  if (own.length === 0) return shared;
  const slugs = new Set(shared.map((p) => p.slug));
  const extra = own
    .filter((row) => row.deletedAt === null && !slugs.has(row.slug))
    .map(gardenPlantToPlantRow);
  if (extra.length === 0) return shared;
  return [...shared, ...extra].sort((a, b) => a.nameDe.localeCompare(b.nameDe, 'de'));
}
