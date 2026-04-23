// Local→Account migration (AUTH-04).
// Plan 02-04 Task 2-04-03; D-12 requires an explicit user-initiated migration.
//
// Invariant (T-2-04-03, rollback safety):
//   storage.delete('profile') and storage.delete('vereinsregeln') MUST run
//   strictly AFTER every Supabase upsert has succeeded. A signUp success
//   followed by an upsert failure leaves the local JSON intact so the user
//   can retry. authStore is flipped to 'account' only when the entire
//   server-side copy has landed.
//
// Invariant (T-2-04-02, user_id re-stamping):
//   Every vereinsregeln row is re-stamped with the NEW Supabase user id
//   before upsert. Server RLS (`auth.uid() = user_id`, Plan 02-01) is the
//   second line of defense.
import { supabase } from './supabase';
import { storage } from '../storage';
import { useAuthStore } from '../stores/authStore';
import { toRow } from './vereinsregelnRepo';
import type { LocalProfile, VereinsRegel } from '@spatenstich/shared';

export interface MigrateInput {
  email: string;
  password: string;
}

export interface MigrateResult {
  userId: string;
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

  // Step 2 — read local data (read-only; storage untouched).
  const profileJson = await storage.get(PROFILE_KEY);
  const vereinsregelnJson = await storage.get(VEREINSREGELN_KEY);
  // Lokal-Modus-Blob hält PLZ/Klimazone/Archetyp am Profil — LocalProfile per D-01.
  // Plan 03 wird den Block erweitern (ensure_default_garden_for_user RPC + garden_id-Stempel).
  const profile: Partial<LocalProfile> | null = profileJson
    ? (JSON.parse(profileJson) as Partial<LocalProfile>)
    : null;
  const vereinsregeln: VereinsRegel[] = vereinsregelnJson
    ? (JSON.parse(vereinsregelnJson) as VereinsRegel[])
    : [];

  // Step 3 — upsert profile under newUserId. Failure → rollback safety.
  let profileTransferred = false;
  if (profile) {
    const { error } = await supabase.from('profiles').upsert({
      id: newUserId,
      plz: profile.plz ?? null,
      klimazone: profile.klimazone ?? null,
      archetype: profile.archetype ?? null,
    });
    if (error) {
      throw new Error(`migration_partial_profile: ${error.message}`);
    }
    profileTransferred = true;
  }

  // Step 4 — upsert vereinsregeln with re-stamped user_id.
  // Run the domain→row mapper (toRow, vereinsregelnRepo.ts) so the Postgres
  // column contract (`ist_bkleingg` snake_case) is honoured. camelCase
  // `istBKleingG` would be silently dropped by Supabase otherwise.
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
    // NOTE (Plan 02.5-03 Task 04): gardenId is placeholder here; Task 04 replaces
    // this entire block with ensureDefaultGardenForUser() + real gardenId stamping.
    const payload = restamped.map((r) => toRow(r, newUserId, ''));
    const { error } = await supabase
      .from('vereinsregeln')
      .upsert(payload, { onConflict: 'id' });
    if (error) {
      throw new Error(`migration_partial_vereinsregeln: ${error.message}`);
    }
    vrCount = payload.length;
  }

  // Step 5 — flip auth mode + clean local storage. Atomic tail.
  state.setAccountMode(newUserId);
  await storage.delete(PROFILE_KEY);
  await storage.delete(VEREINSREGELN_KEY);

  return {
    userId: newUserId,
    transferred: {
      profile: profileTransferred,
      vereinsregeln: vrCount,
    },
  };
}
