// Phase 35: what a photo check sends and what comes back.
// The edge function keeps its own copy of these shapes in supabase/functions/ai/photo.ts,
// because it is built separately. Keep the two in step.

export const PHOTO_MAX_PHOTOS = 6;
export const PHOTO_MAX_CLOSEUP_PHOTOS = 3;
/** Below this a finding is shown as uncertain (PHOTO-11). */
export const PHOTO_UNCERTAIN_BELOW = 0.6;

export const PHOTO_FINDING_KINDS = [
  'resize',
  'move',
  'rename',
  'remove',
  'add_element',
  'add_plant',
  'catalog_plant',
  'pest',
  'disease',
  'stage',
  'unclear',
] as const;
export type PhotoFindingKind = (typeof PHOTO_FINDING_KINDS)[number];

/** Element types a finding may propose (a plant is proposed with add_plant). */
export const PHOTO_ELEMENT_TYPES = [
  'Beet',
  'Rasen',
  'Weg',
  'Laube',
  'Kompost',
  'Wasserstelle',
  'Baum',
  'Zaun',
  'Sitzplatz',
  'Sonstiges',
] as const;

/** One plan element as the model sees it. `ref` is a short stand-in for the id. */
export interface PhotoPlanElement {
  ref: string;
  type: string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  rotationDeg: number;
  bedRef: string | null;
}

export interface PhotoCheckInput {
  /** Base64 JPEG, downscaled on the device. */
  photos: string[];
  garden: { widthM: number; heightM: number };
  elements: PhotoPlanElement[];
  /** Names of the plants the catalog already has. */
  catalog: string[];
  month: number;
}

export interface PhotoCloseupInput {
  photos: string[];
  finding: { kind: PhotoFindingKind; title: string; detail: string; closeupOf: string; ref: string | null };
  elements: PhotoPlanElement[];
  catalog: string[];
  month: number;
}

/** A catalog entry the model proposes; windows as months 1 to 12. */
export interface PhotoCatalogProposal {
  nameDe: string;
  nameBotanical: string | null;
  family: string;
  category: 'Gemüse' | 'Kraut' | 'Beere' | 'Obstbaum' | 'Blume';
  sowStartMonth: number | null;
  sowEndMonth: number | null;
  plantStartMonth: number | null;
  plantEndMonth: number | null;
  harvestStartMonth: number | null;
  harvestEndMonth: number | null;
  spacingCm: number | null;
}

/** One finding as the edge function returns it. */
export interface PhotoFindingResult {
  kind: PhotoFindingKind;
  ref: string | null;
  title: string;
  detail: string;
  confidence: number;
  closeupOf: string | null;
  label: string | null;
  elementType: string | null;
  xM: number | null;
  yM: number | null;
  widthM: number | null;
  heightM: number | null;
  plantName: string | null;
  catalog: PhotoCatalogProposal | null;
  action: string | null;
}

export interface PhotoCheckResult {
  findings: PhotoFindingResult[];
  summary: string;
}

/**
 * What accepting a finding would do. Stored with the finding, and what the person edits
 * before accepting (PHOTO-07). Which fields count depends on the kind.
 */
export interface PhotoProposal {
  label?: string | null;
  elementType?: string | null;
  xM?: number | null;
  yM?: number | null;
  widthM?: number | null;
  heightM?: number | null;
  plantName?: string | null;
  catalog?: PhotoCatalogProposal | null;
  action?: string | null;
}
