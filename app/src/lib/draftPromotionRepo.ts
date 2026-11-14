// Phase 6.5 Plan 03: Draft -> plan_elements promotion repo.
// Pattern: gardenPlanRepo.ts (assertAccount + writeWithOutbox + scheduleWriteDebounced).
// Idempotency: detection-first strategy (Pitfall-1). Account-only.

import { storage } from '../storage';
import { useAuthStore, type AuthMode } from '../stores/authStore';
import type {
  BedDraftRow,
  PlantDraftRow,
  ObservationDraftRow,
  PlanElementRow,
  GardenDimensionsRow,
  EntityName,
  AnyRow,
  PlantDbBundle,
} from '@spatenstich/shared';
import { OutboxEnqueueError } from './errors';
import { scheduleWriteDebounced } from './sync/SyncTriggers';
import plantsBundle from '@spatenstich/shared/data/plants';

function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('drafts are account-only');
}

/**
 * Resolve plantSlug from a German common name label (D-13).
 * Case-insensitive match against nameDe + nameAltDe in the plants.json bundle.
 */
function resolveSlugFromLabel(label: string): string | null {
  const bundle = plantsBundle as unknown as PlantDbBundle;
  const normalized = label.trim().toLowerCase();
  for (const p of bundle.plants) {
    if (p.nameDe.toLowerCase() === normalized) return p.slug;
    if (p.nameAltDe?.some((alt: string) => alt.toLowerCase() === normalized)) return p.slug;
  }
  return null;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function confidenceToBand(c: number | null): 'high' | 'medium' | 'low' | null {
  if (c === null) return null;
  if (c >= 0.8) return 'high';
  if (c >= 0.6) return 'medium';
  return 'low';
}

/**
 * Finds room for a new bed: the first free place when scanning the parcel row by row,
 * 1 m from the boundary and 50 cm from other beds. Returns the CENTRE of the new bed,
 * like every other position in the plan (Phase 33; it used to return a corner, which
 * put accepted beds half outside the parcel). Ignores other kinds of elements and
 * deleted beds. If nothing is free, the first place is used and the bed lies on top.
 */
export function nextFreeBedSlot(
  existing: PlanElementRow[],
  dims: GardenDimensionsRow,
  size: { widthM: number; heightM: number },
): { xM: number; yM: number } {
  const GAP = 0.5;
  const MARGIN = 1;
  const STEP = 0.5;
  const taken = existing
    .filter((e) => e.elementType === 'Beet' && e.deletedAt === null)
    .map((e) => ({
      left: e.xM - e.widthM / 2 - GAP,
      right: e.xM + e.widthM / 2 + GAP,
      top: e.yM - e.heightM / 2 - GAP,
      bottom: e.yM + e.heightM / 2 + GAP,
    }));
  const isFree = (left: number, top: number): boolean =>
    taken.every(
      (t) =>
        left >= t.right || left + size.widthM <= t.left || top >= t.bottom || top + size.heightM <= t.top,
    );
  const centre = (left: number, top: number) => ({
    xM: left + size.widthM / 2,
    yM: top + size.heightM / 2,
  });
  const maxLeft = Math.max(MARGIN, dims.widthM - MARGIN - size.widthM);
  const maxTop = Math.max(MARGIN, dims.heightM - MARGIN - size.heightM);
  for (let top = MARGIN; top <= maxTop + 1e-9; top += STEP) {
    for (let left = MARGIN; left <= maxLeft + 1e-9; left += STEP) {
      if (isFree(left, top)) return centre(left, top);
    }
  }
  return centre(MARGIN, MARGIN);
}

/**
 * Promote a bed draft to a plan_element (Crit-3 + DRAFT-02).
 * Writes:
 *   1. plan_elements insert (elementType='Beet', importedFrom=importItemId)
 *   2. bed_drafts update (status='promoted', promotedAt=now)
 * Idempotent (Pitfall-1): if a non-deleted plan_element with importedFrom=importItemId
 * already exists in `existingElements`, returns it without writing.
 */
export async function promoteBedDraft(
  mode: AuthMode,
  draft: BedDraftRow,
  dims: GardenDimensionsRow,
  existingElements: PlanElementRow[],
  importItemId: string,
  finalCoords?: { xM: number; yM: number }, // Phase 7 Plan 03 — drop position override (DRAFT-02)
): Promise<PlanElementRow> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  // Pitfall-1: idempotency. If a non-deleted plan_element already references this
  // import_item, return it without writing — re-promote is a no-op.
  const dup = existingElements.find(
    (e) => e.importedFrom === importItemId && e.deletedAt === null,
  );
  if (dup) return dup;

  // Pitfall-2: defaults when draft has null dimensions.
  const widthM = (draft.lengthCm ?? 150) / 100;
  const heightM = (draft.widthCm ?? 100) / 100;
  // Phase 7 Plan 03: when caller (editor drop-handler) passes finalCoords, those override
  // the auto-layout slot. Existing 5-arg call sites get unchanged auto-layout behavior.
  const slot = nextFreeBedSlot(existingElements, dims, { widthM, heightM });
  const xM = finalCoords?.xM ?? slot.xM;
  const yM = finalCoords?.yM ?? slot.yM;
  const now = new Date().toISOString();

  const element: PlanElementRow = {
    id: randomId(),
    gardenId: draft.gardenId,
    elementType: 'Beet',
    label: draft.label,
    xM,
    yM,
    widthM,
    heightM,
    confidence: confidenceToBand(draft.confidence),
    isAccepted: true,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: userId,
    deletedAt: null,
    importedFrom: importItemId,
    provenance: {
      source: 'claude-ai-project',
      sunExposure: draft.sunExposure,
      soilNotes: draft.soilNotes,
    },
    layer: 'infrastructure',
  };

  // Write 1: insert plan_element.
  try {
    await storage.writeWithOutbox('plan_elements', element, {
      entity: 'plan_elements',
      rowId: element.id,
      operation: 'insert',
      payload: element as unknown as Record<string, unknown>,
    });
  } catch (cause) {
    throw new OutboxEnqueueError('plan_elements', element.id, cause);
  }

  // Write 2: mark draft as promoted.
  const promotedDraft: BedDraftRow = {
    ...draft,
    status: 'promoted',
    promotedAt: now,
    updatedAt: now,
    updatedByUserId: userId,
  };
  try {
    await storage.writeWithOutbox('bed_drafts', promotedDraft, {
      entity: 'bed_drafts',
      rowId: draft.id,
      operation: 'update',
      payload: promotedDraft as unknown as Record<string, unknown>,
    });
  } catch (cause) {
    throw new OutboxEnqueueError('bed_drafts', draft.id, cause);
  }

  scheduleWriteDebounced();
  return element;
}

/**
 * Promote a plant draft to a plan_element (DRAFT-02).
 * Writes:
 *   1. plan_elements insert (elementType='Pflanze', importedFrom=importItemId,
 *      provenance.parentBedId=parentBedElement?.id ?? null)
 *   2. plant_drafts update (status='promoted', promotedAt=now)
 *
 * Idempotency check is left to the caller (UI re-loads pending drafts after each
 * promote, so the screen never re-promotes a draft whose status flipped to 'promoted').
 */
export async function promotePlantDraft(
  mode: AuthMode,
  draft: PlantDraftRow,
  parentBedElement: PlanElementRow | null,
  importItemId: string,
): Promise<PlanElementRow> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  const now = new Date().toISOString();
  // Positions are centres: next to the middle of its bed, or 1 m inside the parcel.
  const xM = parentBedElement ? parentBedElement.xM + 0.2 : 1;
  const yM = parentBedElement ? parentBedElement.yM + 0.2 : 1;

  const element: PlanElementRow = {
    id: randomId(),
    gardenId: draft.gardenId,
    elementType: 'Pflanze',
    label: draft.commonNameDe,
    xM,
    yM,
    widthM: 0.3,
    heightM: 0.3,
    confidence: confidenceToBand(draft.confidence),
    isAccepted: true,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: userId,
    deletedAt: null,
    importedFrom: importItemId,
    provenance: {
      source: 'claude-ai-project',
      scientificName: draft.scientificName,
      stageEstimate: draft.stageEstimate,
      healthNotes: draft.healthNotes,
      parentBedId: parentBedElement?.id ?? null,
      plantSlug: resolveSlugFromLabel(draft.commonNameDe),
    },
    layer: 'seasonal',
  };

  // Write 1: insert plan_element.
  try {
    await storage.writeWithOutbox('plan_elements', element, {
      entity: 'plan_elements',
      rowId: element.id,
      operation: 'insert',
      payload: element as unknown as Record<string, unknown>,
    });
  } catch (cause) {
    throw new OutboxEnqueueError('plan_elements', element.id, cause);
  }

  // Write 2: mark draft as promoted.
  const promotedDraft: PlantDraftRow = {
    ...draft,
    status: 'promoted',
    promotedAt: now,
    updatedAt: now,
    updatedByUserId: userId,
  };
  try {
    await storage.writeWithOutbox('plant_drafts', promotedDraft, {
      entity: 'plant_drafts',
      rowId: draft.id,
      operation: 'update',
      payload: promotedDraft as unknown as Record<string, unknown>,
    });
  } catch (cause) {
    throw new OutboxEnqueueError('plant_drafts', draft.id, cause);
  }

  scheduleWriteDebounced();
  return element;
}

/**
 * Promote an observation draft (Pitfall-3).
 * Observations are NOT spatial — NO plan_elements insert.
 * Single write: observation_drafts update (status='promoted', promotedAt=now).
 */
export async function promoteObservationDraft(
  mode: AuthMode,
  draft: ObservationDraftRow,
  _importItemId: string,
): Promise<void> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  // Pitfall-3: Observations are annotations only, not plan_elements.
  const now = new Date().toISOString();
  const promoted: ObservationDraftRow = {
    ...draft,
    status: 'promoted',
    promotedAt: now,
    updatedAt: now,
    updatedByUserId: userId,
  };
  try {
    await storage.writeWithOutbox('observation_drafts', promoted, {
      entity: 'observation_drafts',
      rowId: draft.id,
      operation: 'update',
      payload: promoted as unknown as Record<string, unknown>,
    });
  } catch (cause) {
    throw new OutboxEnqueueError('observation_drafts', draft.id, cause);
  }

  scheduleWriteDebounced();
}

/**
 * Dismiss a draft (Crit-4) by soft-deleting it.
 * Single write: <entity> update (deletedAt=now).
 * Works for any of: bed_drafts | plant_drafts | observation_drafts.
 */
export async function dismissDraft(
  mode: AuthMode,
  entity: 'bed_drafts' | 'plant_drafts' | 'observation_drafts',
  draft: BedDraftRow | PlantDraftRow | ObservationDraftRow,
): Promise<void> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  const now = new Date().toISOString();
  const updated = {
    ...draft,
    deletedAt: now,
    updatedAt: now,
    updatedByUserId: userId,
  };
  try {
    // The entity is a union of draft tables; writeWithOutbox is generic over T extends AnyRow.
    // The row type matches `entity` at runtime by construction. The cast narrows for TS.
    await storage.writeWithOutbox<AnyRow>(entity as EntityName, updated as unknown as AnyRow, {
      entity: entity as EntityName,
      rowId: draft.id,
      operation: 'update',
      payload: updated as unknown as Record<string, unknown>,
    });
  } catch (cause) {
    throw new OutboxEnqueueError(entity, draft.id, cause);
  }

  scheduleWriteDebounced();
}
