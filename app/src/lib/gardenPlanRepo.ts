// Phase 4 Plan 04-01: CRUD for garden_dimensions + plan_elements.
// Pattern: gardenRepo.ts — assertAccount, writeWithOutbox, scheduleWriteDebounced.
// Account-only.

import { storage } from '../storage';
import { useAuthStore, type AuthMode } from '../stores/authStore';
import type {
  GardenDimensionsRow,
  PlanElementRow,
} from '@spatenstich/shared';
import { OutboxEnqueueError } from './errors';
import { scheduleWriteDebounced } from './sync/SyncTriggers';

function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── garden_dimensions ─────────────────────────────────────────────────────

export async function saveDimensions(
  mode: AuthMode,
  gardenId: string,
  dims: {
    shape: GardenDimensionsRow['shape'];
    widthM: number;
    heightM: number;
    extraDims: Record<string, unknown> | null;
  },
): Promise<GardenDimensionsRow> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  // Check if existing dimensions row for this garden
  const existing = await storage.getRowsByGarden<GardenDimensionsRow>(
    'garden_dimensions',
    gardenId,
  );
  const existingRow = existing.length > 0 ? existing[0] : null;

  const now = new Date().toISOString();
  const row: GardenDimensionsRow = {
    id: existingRow?.id ?? randomId(),
    gardenId,
    shape: dims.shape,
    widthM: dims.widthM,
    heightM: dims.heightM,
    extraDims: dims.extraDims,
    createdAt: existingRow?.createdAt ?? now,
    updatedAt: now,
    updatedByUserId: userId,
    deletedAt: null,
  };

  try {
    await storage.writeWithOutbox('garden_dimensions', row, {
      entity: 'garden_dimensions',
      rowId: row.id,
      operation: existingRow ? 'update' : 'insert',
      payload: row as unknown as Record<string, unknown>,
    });
    scheduleWriteDebounced();
  } catch (cause) {
    throw new OutboxEnqueueError('garden_dimensions', row.id, cause);
  }

  return row;
}

export async function loadDimensions(
  gardenId: string,
): Promise<GardenDimensionsRow | null> {
  const rows = await storage.getRowsByGarden<GardenDimensionsRow>(
    'garden_dimensions',
    gardenId,
  );
  return rows.length > 0 ? rows[0] : null;
}

// ── plan_elements ─────────────────────────────────────────────────────────

/**
 * Returns only accepted, non-deleted plan elements for a garden.
 */
export async function loadAcceptedElements(
  gardenId: string,
): Promise<PlanElementRow[]> {
  const rows = await storage.getRowsByGarden<PlanElementRow>(
    'plan_elements',
    gardenId,
  );
  return rows.filter((r) => r.isAccepted === true && r.deletedAt === null);
}

/**
 * Soft-deletes all existing plan_elements for a garden (for re-capture flow).
 */
export async function deleteAllElements(
  mode: AuthMode,
  gardenId: string,
): Promise<void> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  const rows = await storage.getRowsByGarden<PlanElementRow>(
    'plan_elements',
    gardenId,
  );

  const now = new Date().toISOString();
  for (const row of rows) {
    if (row.deletedAt !== null) continue; // already deleted
    const deleted: PlanElementRow = {
      ...row,
      deletedAt: now,
      updatedAt: now,
      updatedByUserId: userId,
    };
    try {
      await storage.writeWithOutbox('plan_elements', deleted, {
        entity: 'plan_elements',
        rowId: row.id,
        operation: 'update',
        payload: deleted as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('plan_elements', row.id, cause);
    }
  }

  scheduleWriteDebounced();
}

// ── UUID repair (Bug C fix) ────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true when `id` is a valid UUID (any version/variant).
 * Used by repairNonUuidElementIds to detect legacy `el-` ids created
 * before Bug C was fixed.
 */
export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * One-time, idempotent data repair for local plan_elements with non-UUID ids.
 *
 * Background: Before Bug C was fixed, editorStore.ts and WebPlanEditor.tsx generated
 * element ids as `'el-' + Math.random()...` — not valid UUIDs. The Supabase
 * `plan_elements.id` column is type `uuid`, so every push of such an element
 * was rejected with 22P02. Old `el-` rows were never persisted on the server,
 * so no server cleanup is needed.
 *
 * Repair steps (garden-scoped):
 *   1. Load all local plan_elements.
 *   2. Build an old-id → new-UUID mapping for every element whose id is non-UUID.
 *   3. For elements that are a bed (elementType !== 'Pflanze'), rewrite their id.
 *   4. For ALL elements, rewrite provenance.parentBedId references pointing to any old id.
 *   5. Write each changed element via writeWithOutbox (insert, because old id was
 *      never on the server) so it enters the sync pipeline.
 *
 * The function is safe to call on every app boot — elements with valid UUID ids
 * are skipped entirely.
 *
 * @returns number of elements that were re-identified and re-enqueued.
 */
export async function repairNonUuidElementIds(
  mode: AuthMode,
  gardenId: string,
): Promise<number> {
  if (mode !== 'account') return 0; // local mode has no server — nothing to repair
  const userId = useAuthStore.getState().userId;
  if (!userId) return 0;

  const allRows = await storage.getRowsByGarden<PlanElementRow>('plan_elements', gardenId);
  if (allRows.length === 0) return 0;

  // Build old-id → new-UUID map for every non-UUID element id.
  const idRemap = new Map<string, string>();
  for (const row of allRows) {
    if (!isValidUuid(row.id)) {
      idRemap.set(row.id, randomId());
    }
  }

  if (idRemap.size === 0) return 0; // nothing to repair

  const now = new Date().toISOString();
  let repaired = 0;

  for (const row of allRows) {
    const newId = idRemap.get(row.id);
    const idChanged = newId !== undefined;

    // Rewrite provenance.parentBedId if it points to a remapped id.
    const prov = (row.provenance ?? {}) as Record<string, unknown>;
    const oldParentBedId =
      typeof prov.parentBedId === 'string' ? prov.parentBedId : null;
    const newParentBedId =
      oldParentBedId !== null ? (idRemap.get(oldParentBedId) ?? oldParentBedId) : oldParentBedId;
    const provenanceChanged =
      oldParentBedId !== null && newParentBedId !== oldParentBedId;

    if (!idChanged && !provenanceChanged) continue;

    const repairedRow: PlanElementRow = {
      ...row,
      id: newId ?? row.id,
      provenance: provenanceChanged
        ? { ...prov, parentBedId: newParentBedId }
        : row.provenance,
      updatedAt: now,
      updatedByUserId: userId,
    };

    try {
      await storage.writeWithOutbox('plan_elements', repairedRow, {
        entity: 'plan_elements',
        rowId: repairedRow.id,
        operation: 'insert', // old el- id was never on the server
        payload: repairedRow as unknown as Record<string, unknown>,
      });
      // When the id changed, soft-delete the stale legacy row locally so the
      // element does not appear twice on this device. upsertRowFromServer
      // bypasses the outbox on purpose: the old `el-` id was never on the
      // server, so a delete-push would only fail with 22P02 (invalid uuid).
      if (idChanged) {
        await storage.upsertRowFromServer('plan_elements', {
          ...row,
          deletedAt: now,
          updatedAt: now,
        });
      }
      repaired++;
    } catch {
      // Best-effort — log and continue so one bad row does not block others.
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[repairNonUuidElementIds] Failed to re-enqueue element', repairedRow.id);
      }
    }
  }

  if (repaired > 0) {
    scheduleWriteDebounced();
  }

  return repaired;
}

// ── single-row editor writes (Phase 7 Plan 03) ─────────────────────────────

/**
 * Phase 7 Plan 03: Single-row write for the editor. Pairs with editorSaveDebounce's
 * per-element 5s timer — Pattern K two-stage debounce (editor 5s -> outbox 500ms -> push).
 *
 * Caller passes a complete PlanElementRow snapshot. Repo detects insert-vs-update by
 * checking the local storage layer for an existing row with the same id.
 *
 * @throws OutboxEnqueueError on storage write failure
 * @throws Error 'gardens are account-only' when mode !== 'account'
 * @throws Error 'not_authenticated' when userId is null
 */
export async function writePlanElement(
  mode: AuthMode,
  el: PlanElementRow,
): Promise<void> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  // Detect insert vs update by checking local storage for an existing row.
  const existing = await storage.getRowsByGarden<PlanElementRow>(
    'plan_elements',
    el.gardenId,
  );
  const op: 'insert' | 'update' = existing.some((r) => r.id === el.id)
    ? 'update'
    : 'insert';

  try {
    await storage.writeWithOutbox('plan_elements', el, {
      entity: 'plan_elements',
      rowId: el.id,
      operation: op,
      payload: el as unknown as Record<string, unknown>,
    });
    scheduleWriteDebounced();
  } catch (cause) {
    throw new OutboxEnqueueError('plan_elements', el.id, cause);
  }
}
