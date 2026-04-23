// Local→Account migration (AUTH-04).
// Plan 02-04 Task 2-04-03; Phase 2.5 extension in Plan 02.5-03 Task 04
// (D-12 requires an explicit user-initiated migration).
//
// Atomic-tail invariant (T-2-04-03, Phase 2.5 extension):
//   8 steps total. storage.delete(*) MUST run strictly AFTER every Supabase
//   side-effect (signUp, RPC, 3× upsert). Any earlier throw leaves the local
//   JSON blob intact so the user can retry safely. authStore is flipped to
//   'account' + activeGardenId is set AFTER all server-side writes land.
//
// Invariant (T-2-04-02, user_id re-stamping):
//   Every vereinsregeln row is re-stamped with the NEW Supabase user id AND
//   scoped to the default garden id (Phase 2.5 D-02 NOT NULL). Server RLS
//   (member-check via is_garden_member) is the second line of defense.
//
// 8-step flow (Phase 2.5):
//   1. supabase.auth.signUp → newUserId
//   2. ensureDefaultGardenForUser() → gardenId (RPC; server-idempotent)
//   3. Read local blob (profile + vereinsregeln)
//   4. profiles.upsert({id, display_name: emailPrefix}) (display_name ONLY — D-01)
//   5. gardens.update({plz, klimazone, archetype, updated_by_user_id}) (metadata from local)
//   6. vereinsregeln.upsert(toRow(r, newUserId, gardenId)) (re-stamped + garden-scoped)
//   7. authStore.setAccountMode(newUserId) + setActiveGarden(gardenId)
//   8. storage.delete('profile') + storage.delete('vereinsregeln')
import { supabase } from './supabase';
import { storage } from '../storage';
import { useAuthStore } from '../stores/authStore';
import { toRow } from './vereinsregelnRepo';
import { ensureDefaultGardenForUser } from './inviteCodeRepo';
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
  let profileTransferred = false;
  const emailPrefix = input.email.split('@')[0] ?? null;
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
  // Run the domain→row mapper (toRow, vereinsregelnRepo.ts) so the Postgres
  // column contract (`ist_bkleingg` snake_case + garden_id NOT NULL) is honoured.
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
    const payload = restamped.map((r) => toRow(r, newUserId, gardenId));
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

  // Step 8 — clean local storage. Atomic tail (MUST be last).
  await storage.delete(PROFILE_KEY);
  await storage.delete(VEREINSREGELN_KEY);

  return {
    userId: newUserId,
    gardenId,
    transferred: {
      profile: profileTransferred,
      vereinsregeln: vrCount,
    },
  };
}
