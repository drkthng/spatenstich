// Mode-aware Vereinsregeln persistence — Plan 02-04 Task 2-04-01.
// Mirrors the pattern in profileRepo.ts (Plan 02-02).
//   account mode → supabase.from('vereinsregeln').upsert / select / delete
//   local mode   → storage.set('vereinsregeln', JSON.stringify(rules)) (Pitfall 6)
// RULES-04 enforced as a server-side guard in saveVereinsregeln + deleteVereinsregel
// (defense in depth above the UI-layer no-render-switch + store no-op).
//
// Domain note:
//   VereinsRegel (packages/shared) intentionally omits user_id/erstellt_am — those
//   live on the Supabase row only. The DB default gen_random_uuid() assigns ids
//   server-side; for locally-created rules (checklist, pdf_extraction draft) we
//   assign deterministic ids (bk-<userId>-<idx> for BKleingG seeds, random UUIDs
//   for user-authored rules) so upsert-by-id works on re-save.
import { supabase } from './supabase';
import { storage } from '../storage';
import { BKLEINGG_REGELN } from '@spatenstich/shared';
import type { VereinsRegel, Database } from '@spatenstich/shared';
import type { AuthMode } from '../stores/authStore';

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
 */
export function toRow(
  rule: VereinsRegel,
  userId: string,
): VereinsregelnInsert {
  return {
    id: rule.id,
    user_id: userId,
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
 * (`user_id`, `erstellt_am`) that do not belong in the client domain type.
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

export async function loadVereinsregeln(
  mode: AuthMode,
  userId: string,
): Promise<VereinsRegel[]> {
  if (mode === 'account') {
    const { data, error } = await supabase
      .from('vereinsregeln')
      .select('*')
      .eq('user_id', userId);
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
    const payload = ensured.map((r) => toRow(r, userId));
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
  userId: string,
): Promise<void> {
  // RULES-04 server guard — UI never calls this for BKleingG rules, but
  // defense in depth.
  if (ruleId.startsWith('bk-')) {
    throw new Error('cannot delete BKleingG rule');
  }

  if (mode === 'account') {
    const { error } = await supabase
      .from('vereinsregeln')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', userId);
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
