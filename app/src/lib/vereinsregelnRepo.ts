// Mode-aware Vereinsregeln persistence — Plan 02-04 Task 2-04-01.
// Phase 3 Plan 03-03 offline-first refactor:
//   account mode → StorageAdapter Row-Table (writeWithOutbox / getRow) — offline-capable
//   local mode   → storage.set('vereinsregeln', JSON.stringify(rules)) — unverändert
//
// VereinsregelnRow-Design: 1 Row pro Garden (Option A) — rules:{list:[...]} JSON-Payload.
// DB bleibt N Rows; SyncWorker-Push splittet bei Upload (vereinsregelnToDbRows).
//
// RULES-04 enforced: BKleingG rules may never be disabled or deleted.
// toRow export retained for migrateLocalToAccount.ts compat (will be removed in Phase 4).
import { supabase } from './supabase';
import { storage } from '../storage';
import { BKLEINGG_REGELN } from '@spatenstich/shared';
import type { VereinsRegel, VereinsregelnRow } from '@spatenstich/shared';
import { useAuthStore, type AuthMode } from '../stores/authStore';
import { OutboxEnqueueError } from './errors';
import {
  vereinsregelnToLocalRow,
  localToVereinsregeln,
  vereinsregelnFromDbRows,
  vereinsregelnToDbRows,
} from './mappers/rowMappers';

const STORAGE_KEY_LOCAL = 'vereinsregeln'; // KV-Blob für local-mode

/**
 * Backward compat: toRow was previously exported from this module and imported by
 * migrateLocalToAccount.ts. Delegate to vereinsregelnToDbRows via a helper.
 * Plan 03-03 Task 03 will update migrateLocalToAccount to import from rowMappers directly.
 */
export function toRow(
  rule: VereinsRegel,
  userId: string,
  gardenId: string,
): import('@spatenstich/shared').Database['public']['Tables']['vereinsregeln']['Insert'] {
  // Build a minimal VereinsregelnRow to call vereinsregelnToDbRows
  const now = new Date().toISOString();
  const singleRow: VereinsregelnRow = {
    id: gardenId,
    gardenId,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: userId,
    deletedAt: null,
    rules: { list: [rule] },
  };
  const rows = vereinsregelnToDbRows(singleRow, userId);
  return rows[0]!;
}

function requireActiveGardenId(): string {
  const { activeGardenId } = useAuthStore.getState();
  if (!activeGardenId) throw new Error('no_active_garden');
  return activeGardenId;
}

/**
 * Ensure BKleingG seed rules are present in the rule set, matched by id.
 * Seeds use deterministic ids `bk-<userId>-<idx>` so local mode and account
 * mode dedupe the same way on re-save.
 */
function ensureBKleingGRules(
  rules: VereinsRegel[],
  userId: string,
): VereinsRegel[] {
  const existingIds = new Set(
    rules.filter((r) => r.istBKleingG).map((r) => r.id),
  );
  const seeds: VereinsRegel[] = BKLEINGG_REGELN.map((seed, i) => ({
    id: `bk-${userId}-${i}`,
    titel: seed.label,
    wert: seed.defaultWert,
    einheit: seed.einheit,
    istBKleingG: true,
    aktiv: true,
    source: 'manual' as const,
  }));
  const missing = seeds.filter((s) => !existingIds.has(s.id));
  return [...missing, ...rules];
}

/** RULES-04 server-side guard: a BKleingG rule may never be marked aktiv=false. */
function assertBKleingGActive(rules: VereinsRegel[]): void {
  const violation = rules.find((r) => r.istBKleingG && !r.aktiv);
  if (violation) {
    throw new Error(`cannot disable BKleingG rule: ${violation.titel}`);
  }
}

export async function loadVereinsregeln(
  mode: AuthMode,
  userId: string,
): Promise<VereinsRegel[]> {
  if (mode === 'account') {
    const gardenId = requireActiveGardenId();
    // Offline-first: lokale Row lesen (SYNC-01)
    const localRow = await storage.getRow<VereinsregelnRow>('vereinsregeln', gardenId);
    if (localRow) {
      const rules = localToVereinsregeln(localRow);
      return rules.length > 0 ? rules : ensureBKleingGRules([], userId);
    }
    // Fallback: Supabase (SyncWorker hydriert die lokale Row beim nächsten Pull)
    const { data, error } = await supabase
      .from('vereinsregeln')
      .select('*')
      .eq('garden_id', gardenId);
    if (error) throw error;
    const aggregated = vereinsregelnFromDbRows(data ?? [], gardenId);
    if (aggregated) {
      await storage.upsertRowFromServer('vereinsregeln', aggregated);
      return localToVereinsregeln(aggregated);
    }
    return ensureBKleingGRules([], userId);
  }
  // local mode: unverändert (KV-Blob)
  const raw = await storage.get(STORAGE_KEY_LOCAL);
  if (!raw) return ensureBKleingGRules([], userId);
  try {
    return JSON.parse(raw) as VereinsRegel[];
  } catch {
    return ensureBKleingGRules([], userId);
  }
}

export async function saveVereinsregeln(
  rules: VereinsRegel[],
  mode: AuthMode,
  userId: string,
): Promise<void> {
  const ensured = ensureBKleingGRules(rules, userId);
  assertBKleingGActive(ensured);

  if (mode === 'account') {
    const gardenId = requireActiveGardenId();
    const existing = await storage.getRow<VereinsregelnRow>('vereinsregeln', gardenId);
    const updated = vereinsregelnToLocalRow(gardenId, ensured, userId, existing);
    try {
      await storage.writeWithOutbox('vereinsregeln', updated, {
        entity: 'vereinsregeln',
        rowId: gardenId,
        operation: existing ? 'update' : 'insert',
        payload: updated as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('vereinsregeln', gardenId, cause);
    }
    return;
  }
  // local mode: unverändert
  await storage.set(STORAGE_KEY_LOCAL, JSON.stringify(ensured));
}

export async function deleteVereinsregel(
  ruleId: string,
  mode: AuthMode,
  userId: string,
): Promise<void> {
  // RULES-04 defense in depth: BKleingG rules may never be deleted.
  if (ruleId.startsWith('bk-')) {
    throw new Error('cannot delete BKleingG rule');
  }

  if (mode === 'account') {
    const gardenId = requireActiveGardenId();
    const existing = await storage.getRow<VereinsregelnRow>('vereinsregeln', gardenId);
    const current = localToVereinsregeln(existing);
    const filtered = current.filter((r) => r.id !== ruleId);
    const updated = vereinsregelnToLocalRow(gardenId, filtered, userId, existing);
    try {
      await storage.writeWithOutbox('vereinsregeln', updated, {
        entity: 'vereinsregeln',
        rowId: gardenId,
        operation: 'update', // Row bleibt bestehen — nur rule aus liste entfernt
        payload: updated as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('vereinsregeln', gardenId, cause);
    }
    return;
  }
  // local mode
  const raw = await storage.get(STORAGE_KEY_LOCAL);
  const rules: VereinsRegel[] = raw ? (JSON.parse(raw) as VereinsRegel[]) : [];
  await storage.set(
    STORAGE_KEY_LOCAL,
    JSON.stringify(rules.filter((r) => r.id !== ruleId)),
  );
}

// Re-export normalizeDisplayName for any callers that imported from this module.
export { normalizeDisplayName } from './mappers/rowMappers';
