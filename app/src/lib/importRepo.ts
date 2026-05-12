// Phase 6 Plan 06-02: Import persistence via writeWithOutbox pattern.
// Folgt gardenPlanRepo.ts-Muster: assertAccount, writeWithOutbox, scheduleWriteDebounced.
// Account-only: saveImport schreibt Import-Header + Draft-Rows für alle selektierten Items.
// Security (T-06-05): assertAccount(mode) + userId-Check vor jedem Write. Alle Writes
// sind an gardenId gebunden.

import { storage } from '../storage';
import { useAuthStore, type AuthMode } from '../stores/authStore';
import type {
  ImportRow,
  ImportItemRow,
  BedDraftRow,
  PlantDraftRow,
  ObservationDraftRow,
  ImportPayload,
  ImportPayloadBed,
  ImportPayloadPlant,
  ImportPayloadObservation,
} from '@spatenstich/shared';
import { OutboxEnqueueError } from './errors';
import { scheduleWriteDebounced } from './sync/SyncTriggers';

function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('imports are account-only');
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── saveImport ────────────────────────────────────────────────────────────────

/**
 * Persists a validated import payload as draft rows in SQLite via writeWithOutbox.
 *
 * Writes:
 *   1. One `imports` header row
 *   2. For each selected bed: one `import_items` row + one `bed_drafts` row
 *   3. For each selected plant: one `import_items` row + one `plant_drafts` row
 *   4. For each selected observation: one `import_items` row + one `observation_drafts` row
 *
 * @param mode      Auth mode — must be 'account'
 * @param gardenId  Active garden UUID
 * @param payload   Validated ImportPayload
 * @param selectedLocalIds  Set of localIds the user selected to import (undefined = import all)
 */
export async function saveImport(
  mode: AuthMode,
  gardenId: string,
  payload: ImportPayload,
  selectedLocalIds?: Set<string>,
): Promise<ImportRow> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  const now = new Date().toISOString();
  const importId = randomId();

  // ── 1. Import header row ─────────────────────────────────────────────────
  const importRow: ImportRow = {
    id: importId,
    gardenId,
    source: 'claude-ai-project',
    importedAt: now,
    chatReference: payload.capture.chatReference ?? null,
    payloadSchemaVersion: payload.schemaVersion,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: userId,
    deletedAt: null,
  };

  try {
    await storage.writeWithOutbox('imports', importRow, {
      entity: 'imports',
      rowId: importRow.id,
      operation: 'insert',
      payload: importRow as unknown as Record<string, unknown>,
    });
  } catch (cause) {
    throw new OutboxEnqueueError('imports', importRow.id, cause);
  }

  // ── 2. Beds ──────────────────────────────────────────────────────────────
  for (const bed of payload.beds ?? []) {
    if (selectedLocalIds && !selectedLocalIds.has(bed.localId)) continue;

    const importItemId = randomId();
    const bedDraftId = randomId();

    const importItem: ImportItemRow = {
      id: importItemId,
      importId,
      gardenId,
      itemType: 'bed',
      localId: bed.localId,
      payload: bed as unknown as Record<string, unknown>,
      confidence: bed.confidence ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const bedDraft: BedDraftRow = {
      id: bedDraftId,
      importItemId,
      gardenId,
      label: bed.label,
      lengthCm: bed.approxDimensions?.lengthCm ?? null,
      widthCm: bed.approxDimensions?.widthCm ?? null,
      sunExposure: bed.sunExposure ?? null,
      soilNotes: bed.soilNotes ?? null,
      confidence: bed.confidence ?? null,
      status: 'pending',
      promotedAt: null,
      createdAt: now,
      updatedAt: now,
      updatedByUserId: userId,
      deletedAt: null,
    };

    try {
      await storage.writeWithOutbox('import_items', importItem, {
        entity: 'import_items',
        rowId: importItem.id,
        operation: 'insert',
        payload: importItem as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('import_items', importItem.id, cause);
    }

    try {
      await storage.writeWithOutbox('bed_drafts', bedDraft, {
        entity: 'bed_drafts',
        rowId: bedDraft.id,
        operation: 'insert',
        payload: bedDraft as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('bed_drafts', bedDraft.id, cause);
    }
  }

  // ── 3. Plants ────────────────────────────────────────────────────────────
  for (const plant of payload.plants ?? []) {
    if (selectedLocalIds && !selectedLocalIds.has(plant.localId)) continue;

    const importItemId = randomId();
    const plantDraftId = randomId();

    const importItem: ImportItemRow = {
      id: importItemId,
      importId,
      gardenId,
      itemType: 'plant',
      localId: plant.localId,
      payload: plant as unknown as Record<string, unknown>,
      confidence: plant.confidence ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const plantDraft: PlantDraftRow = {
      id: plantDraftId,
      importItemId,
      gardenId,
      bedDraftId: null, // bedDraftId linkage handled in Phase 6-03 (promotion flow)
      scientificName: plant.scientificName ?? null,
      commonNameDe: plant.commonNameDe ?? '',
      stageEstimate: plant.stageEstimate ?? null,
      healthNotes: plant.healthNotes ?? null,
      confidence: plant.confidence ?? null,
      status: 'pending',
      promotedAt: null,
      createdAt: now,
      updatedAt: now,
      updatedByUserId: userId,
      deletedAt: null,
    };

    try {
      await storage.writeWithOutbox('import_items', importItem, {
        entity: 'import_items',
        rowId: importItem.id,
        operation: 'insert',
        payload: importItem as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('import_items', importItem.id, cause);
    }

    try {
      await storage.writeWithOutbox('plant_drafts', plantDraft, {
        entity: 'plant_drafts',
        rowId: plantDraft.id,
        operation: 'insert',
        payload: plantDraft as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('plant_drafts', plantDraft.id, cause);
    }
  }

  // ── 4. Observations ──────────────────────────────────────────────────────
  for (const obs of payload.observations ?? []) {
    if (selectedLocalIds && !selectedLocalIds.has(obs.localId)) continue;

    const importItemId = randomId();
    const obsDraftId = randomId();

    const importItem: ImportItemRow = {
      id: importItemId,
      importId,
      gardenId,
      itemType: 'observation',
      localId: obs.localId,
      payload: obs as unknown as Record<string, unknown>,
      confidence: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const obsDraft: ObservationDraftRow = {
      id: obsDraftId,
      importItemId,
      gardenId,
      bedRefLocalId: obs.bedRef ?? null,
      kind: obs.kind,
      summary: obs.summary,
      suggestedActions: obs.suggestedActions ?? null,
      confidence: null,
      status: 'pending',
      promotedAt: null,
      createdAt: now,
      updatedAt: now,
      updatedByUserId: userId,
      deletedAt: null,
    };

    try {
      await storage.writeWithOutbox('import_items', importItem, {
        entity: 'import_items',
        rowId: importItem.id,
        operation: 'insert',
        payload: importItem as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('import_items', importItem.id, cause);
    }

    try {
      await storage.writeWithOutbox('observation_drafts', obsDraft, {
        entity: 'observation_drafts',
        rowId: obsDraft.id,
        operation: 'insert',
        payload: obsDraft as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('observation_drafts', obsDraft.id, cause);
    }
  }

  // Debounced push — einmalig am Ende aller Writes (D-16/D-26)
  scheduleWriteDebounced();

  return importRow;
}

// ── loadPendingDrafts ─────────────────────────────────────────────────────────

export interface PendingDrafts {
  beds: BedDraftRow[];
  plants: PlantDraftRow[];
  observations: ObservationDraftRow[];
}

/**
 * Loads all pending (not yet promoted/dismissed) drafts for a garden.
 * Filters: status === 'pending' && deletedAt === null.
 */
export async function loadPendingDrafts(gardenId: string): Promise<PendingDrafts> {
  const [bedRows, plantRows, obsRows] = await Promise.all([
    storage.getRowsByGarden<BedDraftRow>('bed_drafts', gardenId),
    storage.getRowsByGarden<PlantDraftRow>('plant_drafts', gardenId),
    storage.getRowsByGarden<ObservationDraftRow>('observation_drafts', gardenId),
  ]);

  return {
    beds: bedRows.filter((r) => r.status === 'pending' && r.deletedAt === null),
    plants: plantRows.filter((r) => r.status === 'pending' && r.deletedAt === null),
    observations: obsRows.filter((r) => r.status === 'pending' && r.deletedAt === null),
  };
}

// Re-export types for consumers
export type {
  ImportPayloadBed,
  ImportPayloadPlant,
  ImportPayloadObservation,
};
