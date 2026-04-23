// Mode-aware Vereinsregeln persistence — Plan 02-04 Task 2-04-01.
// Extended in Plan 02.5-03 Task 03:
//   - Column rename: user_id → created_by_user_id (Migration 003)
//   - New column: updated_by_user_id (D-14 LWW audit, Pattern 6)
//   - New column: garden_id (D-02 NOT NULL; pulled from authStore.activeGardenId)
// Mirrors the pattern in profileRepo.ts (Plan 02-02).
//   account mode → supabase.from('vereinsregeln').upsert / select / delete (garden-scoped)
//   local mode   → storage.set('vereinsregeln', JSON.stringify(rules)) (Pitfall 6)
// RULES-04 enforced as a server-side guard in saveVereinsregeln + deleteVereinsregel.
//
// Domain note:
//   VereinsRegel (packages/shared) intentionally omits user_id/garden_id/audit fields —
//   those live on the Supabase row only. `toRow` stamps them; `fromRow` drops them.
import { supabase } from './supabase';
import { storage } from '../storage';
import { BKLEINGG_REGELN } from '@spatenstich/shared';
import type { VereinsRegel, Database } from '@spatenstich/shared';
import { useAuthStore, type AuthMode } from '../stores/authStore';

const STORAGE_KEY = 'vereinsregeln';

type VereinsregelnRow = Database['public']['Tables']['vereinsregeln']['Row'];
type VereinsregelnInsert =
  Database['public']['Tables']['vereinsregeln']['Insert'];

/**
 * Map a domain `VereinsRegel` to a DB row ready for upsert.
 * Required because Postgres column is `ist_bkleingg` (snake_case) while the
 * domain type uses `istBKleingG` (camelCase). Without this mapping Supabase
 * would silently drop the camelCase key and the BKleingG branch would break
 * on round-trip.
 *
 * Phase 2.5 extension:
 *   - `user_id` → `created_by_user_id` (Migration 003 column rename)
 *   - Adds `updated_by_user_id` (D-14 LWW audit, Pattern 6)
 *   - Adds `garden_id` (D-02 NOT NULL — caller must supply the active garden)
 */
export function toRow(
  rule: VereinsRegel,
  userId: string,
  gardenId: string,
): VereinsregelnInsert {
  return {
    id: rule.id,
    created_by_user_id: userId,
    updated_by_user_id: userId, // Client-first fill (Pattern 6 / D-18)
    garden_id: gardenId,
    titel: rule.titel,
    beschreibung: rule.beschreibung ?? null,
    wert: rule.wert ?? null,
    einheit: rule.einheit ?? null,
    ist_bkleingg: rule.istBKleingG,
    aktiv: rule.aktiv,
    source: rule.source,
  };
}

/**
 * Map a DB row back to a domain `VereinsRegel`, dropping server-only fields
 * (audit columns, garden_id, erstellt_am) that do not belong in the client
 * domain type. If the UI needs "last-edited-by" attribution, it should query
 * `updated_by_user_id` separately (planned in Plan 04 audit-label rendering).
 */
export function fromRow(row: VereinsregelnRow): VereinsRegel {
  return {
    id: row.id,
    titel: row.titel,
    ...(row.beschreibung != null ? { beschreibung: row.beschreibung } : {}),
    ...(row.wert != null ? { wert: row.wert } : {}),
    ...(row.einheit != null ? { einheit: row.einheit } : {}),
    istBKleingG: row.ist_bkleingg,
    aktiv: row.aktiv,
    source: row.source as VereinsRegel['source'],
  };
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
    source: 'manual',
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

/** Resolve the active garden id from authStore; throws if absent in account-mode. */
function requireActiveGardenId(): string {
  const { activeGardenId } = useAuthStore.getState();
  if (!activeGardenId) throw new Error('no_active_garden');
  return activeGardenId;
}

export async function loadVereinsregeln(
  mode: AuthMode,
  userId: string,
): Promise<VereinsRegel[]> {
  if (mode === 'account') {
    const gardenId = requireActiveGardenId();
    const { data, error } = await supabase
      .from('vereinsregeln')
      .select('*')
      .eq('garden_id', gardenId);
    if (error) throw error;
    const rows = (data ?? []).map(fromRow);
    return rows.length > 0 ? rows : ensureBKleingGRules([], userId);
  }
  // local mode
  const raw = await storage.get(STORAGE_KEY);
  if (!raw) return ensureBKleingGRules([], userId);
  try {
    return JSON.parse(raw) as VereinsRegel[];
  } catch {
    // Corrupt blob — treat as empty and hand back the BKleingG seed.
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
    const payload = ensured.map((r) => toRow(r, userId, gardenId));
    const { error } = await supabase
      .from('vereinsregeln')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return;
  }
  await storage.set(STORAGE_KEY, JSON.stringify(ensured));
}

export async function deleteVereinsregel(
  ruleId: string,
  mode: AuthMode,
  _userId: string,
): Promise<void> {
  // RULES-04 server guard — UI never calls this for BKleingG rules, but
  // defense in depth.
  if (ruleId.startsWith('bk-')) {
    throw new Error('cannot delete BKleingG rule');
  }

  if (mode === 'account') {
    const gardenId = requireActiveGardenId();
    const { error } = await supabase
      .from('vereinsregeln')
      .delete()
      .eq('id', ruleId)
      .eq('garden_id', gardenId);
    if (error) throw error;
    return;
  }

  const raw = await storage.get(STORAGE_KEY);
  const rules: VereinsRegel[] = raw ? (JSON.parse(raw) as VereinsRegel[]) : [];
  await storage.set(
    STORAGE_KEY,
    JSON.stringify(rules.filter((r) => r.id !== ruleId)),
  );
}
