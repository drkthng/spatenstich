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
