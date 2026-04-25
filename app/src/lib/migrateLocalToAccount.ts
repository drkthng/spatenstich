// Local→Account migration (AUTH-04).
// Plan 02-04 Task 2-04-03; Phase 2.5 extension in Plan 02.5-03 Task 04;
// Phase 3 Plan 03-03 Task 03: Step 9 — Row-Table Bootstrap.
//
// Atomic-tail invariant (T-2-04-03, Phase 2.5 extension):
//   9 steps total. storage.delete(*) MUST run strictly AFTER every Supabase
//   side-effect (signUp, RPC, 3× upsert). Any earlier throw leaves the local
//   JSON blob intact so the user can retry safely. authStore is flipped to
//   'account' + activeGardenId is set AFTER all server-side writes land.
//
//   Step 9 (Phase 3, Plan 03-03) — Row-Table Bootstrap:
//   Runs after Step 8 (storage.delete). Fail-soft: if Step 9 throws, the error
//   is logged but NOT re-thrown. The user is already in account-mode; SyncWorker
//   (Plan 03-04) will pick up the bootstrap on the next online event.
//
// Invariant (T-2-04-02, user_id re-stamping):
//   Every vereinsregeln row is re-stamped with the NEW Supabase user id AND
//   scoped to the default garden id (Phase 2.5 D-02 NOT NULL). Server RLS
//   (member-check via is_garden_member) is the second line of defense.
//
// 9-step flow (Phase 3):
//   1. supabase.auth.signUp → newUserId
//   2. ensureDefaultGardenForUser() → gardenId (RPC; server-idempotent)
//   3. Read local blob (profile + vereinsregeln)
//   4. profiles.upsert({id, display_name: emailPrefix}) (display_name ONLY — D-01)
//   5. gardens.update({plz, klimazone, archetype, updated_by_user_id}) (metadata from local)
//   6. vereinsregeln.upsert(toRow(r, newUserId, gardenId)) (re-stamped + garden-scoped)
//   7. authStore.setAccountMode(newUserId) + setActiveGarden(gardenId)
//   8. storage.delete('profile') + storage.delete('vereinsregeln')
//   9. bootstrapRowTables(newUserId, gardenId) — Initial-Pull → Row-Tables (fail-soft)
import { supabase } from './supabase';
import { storage } from '../storage';
import { useAuthStore } from '../stores/authStore';
import { ensureDefaultGardenForUser } from './inviteCodeRepo';
import {
  gardenFromDb,
  profileFromDb,
  vereinsregelnFromDbRows,
  vereinsregelnToLocalRow,
  vereinsregelnToDbRows,
  gardenMemberFromDb,
  inviteCodeFromDb,
} from './mappers/rowMappers';
import type { LocalProfile, VereinsRegel } from '@spatenstich/shared';

export interface MigrateInput {
  email: string;
  password: string;
}

export interface MigrateResult {
  userId: string;
  gardenId: string;
  transferred: {
    profile: boolean;
    vereinsregeln: number;
  };
}

const PROFILE_KEY = 'profile';
const VEREINSREGELN_KEY = 'vereinsregeln';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function migrateLocalToAccount(
  input: MigrateInput,
): Promise<MigrateResult> {
  // Guard: only runnable from local (or null) mode.
  const state = useAuthStore.getState();
  if (state.mode === 'account') {
    throw new Error('already in account mode');
  }

  // Step 1 — sign up. Any error aborts BEFORE touching storage.
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (signUpErr) throw signUpErr;
  const newUserId = signUpData?.user?.id;
  if (!newUserId) throw new Error('signup_no_user');

  // Step 2 (NEW, Phase 2.5) — ensure a default garden exists for this user.
  // RPC is server-idempotent: returns existing garden_id if already present
  // (from a prior partial migration retry). Atomic-tail: failure here leaves
  // profiles/vereinsregeln untouched AND local storage intact.
  let gardenId: string;
  try {
    gardenId = await ensureDefaultGardenForUser();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`migration_partial_garden_seed: ${msg}`);
  }

  // Step 3 — read local data (read-only; storage untouched).
  const profileJson = await storage.get(PROFILE_KEY);
  const vereinsregelnJson = await storage.get(VEREINSREGELN_KEY);
  const profile: Partial<LocalProfile> | null = profileJson
    ? (JSON.parse(profileJson) as Partial<LocalProfile>)
    : null;
  const vereinsregeln: VereinsRegel[] = vereinsregelnJson
    ? (JSON.parse(vereinsregelnJson) as VereinsRegel[])
    : [];

  // Step 4 — upsert profile (display_name ONLY post-Phase-2.5-pivot, D-01).
  // plz/klimazone/archetype moved to gardens (Step 5).
  // WR-03: emailPrefix wird auf 40 Zeichen limitiert + getrimmt, um den
  // profiles_display_name_len CHECK-Constraint (Migration 012) nicht zu
  // verletzen. Leer-Strings werden zu null (Constraint erlaubt NULL).
  let profileTransferred = false;
  const rawPrefix = input.email.split('@')[0] ?? '';
  const trimmed = rawPrefix.trim().slice(0, 40);
  const emailPrefix = trimmed.length > 0 ? trimmed : null;
  {
    const { error } = await supabase.from('profiles').upsert(
      {
        id: newUserId,
        display_name: emailPrefix,
      },
      { onConflict: 'id' },
    );
    if (error) {
      throw new Error(`migration_partial_profile: ${error.message}`);
    }
    profileTransferred = true;
  }

  // Step 5 (NEW, Phase 2.5) — copy local PLZ/Klima/Archetyp to the default garden.
  if (profile) {
    const { error: gardenError } = await supabase
      .from('gardens')
      .update({
        plz: profile.plz ?? null,
        klimazone: profile.klimazone ?? null,
        archetype: profile.archetype ?? null,
        updated_by_user_id: newUserId,
      })
      .eq('id', gardenId);
    if (gardenError) {
      throw new Error(
        `migration_partial_garden_metadata: ${gardenError.message}`,
      );
    }
  }

  // Step 6 — upsert vereinsregeln with re-stamped user_id + gardenId.
  // Uses rowMappers (vereinsregelnToLocalRow + vereinsregelnToDbRows) so that the
  // Postgres column contract (ist_bkleingg snake_case + garden_id NOT NULL) is honoured.
  let vrCount = 0;
  if (vereinsregeln.length > 0) {
    const restamped: VereinsRegel[] = vereinsregeln.map((r) => {
      if (r.istBKleingG) {
        // Keep the deterministic `bk-<userId>-<index>` shape from Plan 02-01
        // so the server-side CHECK constraint and the client-side guard
        // both continue to recognise BKleingG seed rows.
        const idx = r.id.split('-').pop() ?? '0';
        return { ...r, id: `bk-${newUserId}-${idx}` };
      }
      return { ...r, id: randomId() };
    });
    // Build aggregate local Row → split into DB rows for upsert
    const localRow = vereinsregelnToLocalRow(gardenId, restamped, newUserId, null);
    const payload = vereinsregelnToDbRows(localRow, newUserId);
    const { error } = await supabase
      .from('vereinsregeln')
      .upsert(payload, { onConflict: 'id' });
    if (error) {
      throw new Error(`migration_partial_vereinsregeln: ${error.message}`);
    }
    vrCount = payload.length;
  }

  // Step 7 — flip auth mode + set active garden BEFORE clearing storage.
  state.setAccountMode(newUserId);
  state.setActiveGarden(gardenId);

  // Step 8 — clean local storage. Atomic tail (MUST be last before Step 9).
  await storage.delete(PROFILE_KEY);
  await storage.delete(VEREINSREGELN_KEY);

  // Step 9 (NEW, Phase 3 Plan 03-03) — Bootstrap der lokalen Row-Tables.
  // Nach erfolgreicher Migration: Initial-Pull aller 6 Entities vom Server und
  // Upsert in lokale Row-Tables. Damit beim nächsten App-Start offline der
  // Garden + Profile + Regeln sofort lokal sichtbar sind (SYNC-01).
  // Fail-Soft: bei Fehler nur loggen, nicht werfen — SyncWorker holt's nach.
  try {
    await bootstrapRowTables(newUserId, gardenId);
  } catch (e) {
    console.warn('[migrate] Step 9 row-table bootstrap failed (will retry on next sync):', e);
  }

  return {
    userId: newUserId,
    gardenId,
    transferred: {
      profile: profileTransferred,
      vereinsregeln: vrCount,
    },
  };
}

/**
 * Bootstrap local Row-Tables after migration.
 * Pulls current state from Supabase for all Phase-3 entities and stores
 * via upsertRowFromServer (NO Outbox entry — this is server-state pull).
 * Sets sync_state.lastPullAt to server_now() ISO-Timestamp for all 6 entities.
 *
 * Called from migrateLocalToAccount Step 9 (fail-soft: caller catches + logs).
 * Exported for direct testing.
 */
export async function bootstrapRowTables(
  userId: string,
  gardenId: string,
): Promise<void> {
  // server_now() RPC (aus Plan 03-01 Section 8)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nowData, error: nowErr } = await (supabase.rpc as any)('server_now');
  if (nowErr) throw nowErr;
  const serverNow = nowData as string;

  // gardens — die eine Row des neuen User's Gartens
  {
    const { data, error } = await supabase
      .from('gardens')
      .select('*')
      .eq('id', gardenId)
      .maybeSingle();
    if (error) throw error;
    if (data) await storage.upsertRowFromServer('gardens', gardenFromDb(data));
    await storage.setSyncState({ entity: 'gardens', lastPullAt: serverNow, lastPushAt: null });
  }

  // profiles — das eigene Profil
  {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (data) await storage.upsertRowFromServer('profiles', profileFromDb(data as any));
    await storage.setSyncState({ entity: 'profiles', lastPullAt: serverNow, lastPushAt: null });
  }

  // vereinsregeln — N DB-Rows → 1 aggregierte lokale Row
  {
    const { data, error } = await supabase
      .from('vereinsregeln')
      .select('*')
      .eq('garden_id', gardenId);
    if (error) throw error;
    const aggregated = vereinsregelnFromDbRows(data ?? [], gardenId);
    if (aggregated) await storage.upsertRowFromServer('vereinsregeln', aggregated);
    await storage.setSyncState({ entity: 'vereinsregeln', lastPullAt: serverNow, lastPushAt: null });
  }

  // garden_members — alle Members des Gartens (nach Migration: 1 Self-Entry)
  {
    const { data, error } = await supabase
      .from('garden_members')
      .select('garden_id, user_id, role, joined_at')
      .eq('garden_id', gardenId);
    if (error) throw error;
    if (data) {
      const rows = (data as Parameters<typeof gardenMemberFromDb>[0][]).map(gardenMemberFromDb);
      await storage.upsertRowsFromServer('garden_members', rows);
    }
    await storage.setSyncState({ entity: 'garden_members', lastPullAt: serverNow, lastPushAt: null });
  }

  // invite_codes — aktive Codes des Gartens (nach Migration: 0)
  {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('garden_id', gardenId);
    if (error) throw error;
    if (data) {
      const rows = (data as Parameters<typeof inviteCodeFromDb>[0][]).map(inviteCodeFromDb);
      await storage.upsertRowsFromServer('invite_codes', rows);
    }
    await storage.setSyncState({ entity: 'invite_codes', lastPullAt: serverNow, lastPushAt: null });
  }

  // photo_queue — nach Migration: 0 Einträge (keine Rows zu pullen)
  await storage.setSyncState({ entity: 'photo_queue', lastPullAt: serverNow, lastPushAt: null });
}
