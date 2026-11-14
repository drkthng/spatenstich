// Phase 30: one place that creates plan elements and knows their default sizes
// (Masterplan WP 22.1). Used by the interim "+" list (30-CONTEXT D-09); the full palette
// with plants arrives in Phase 31.

import type { PlanElementRow } from '@spatenstich/shared';

export const DEFAULT_SIZES: Record<string, { widthM: number; heightM: number }> = {
  Beet: { widthM: 2, heightM: 1 },
  Pflanze: { widthM: 0.4, heightM: 0.4 },
  Rasen: { widthM: 4, heightM: 3 },
  Weg: { widthM: 3, heightM: 0.6 },
  Laube: { widthM: 3, heightM: 2 },
  Kompost: { widthM: 1, heightM: 1 },
  Wasserstelle: { widthM: 1, heightM: 1 },
  Zaun: { widthM: 0.1, heightM: 3 },
  Baum: { widthM: 1, heightM: 1 },
  Sitzplatz: { widthM: 1.5, heightM: 1.5 },
  Sonstiges: { widthM: 1, heightM: 1 },
};

/** Element kinds offered by the "+" list, in display order. Plants are not among them. */
export const ADDABLE_KINDS = [
  'Beet',
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

export function newElementId(): string {
  // Chrome on Android and every desktop browser the app targets provide randomUUID in a
  // secure context. The plan_elements.id column is a uuid, so there is no non-UUID fallback.
  return crypto.randomUUID();
}

export function createElement(
  kind: string,
  centerM: { xM: number; yM: number },
  gardenId: string,
  userId: string | null,
  label?: string,
): PlanElementRow {
  const size = DEFAULT_SIZES[kind] ?? DEFAULT_SIZES.Sonstiges;
  const now = new Date().toISOString();
  return {
    id: newElementId(),
    gardenId,
    elementType: kind,
    label: label ?? kind,
    xM: centerM.xM,
    yM: centerM.yM,
    widthM: size.widthM,
    heightM: size.heightM,
    confidence: null,
    isAccepted: true,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: userId,
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: kind === 'Pflanze' ? 'seasonal' : 'infrastructure',
  };
}
