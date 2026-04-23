// Mode-aware profile persistence (D-11).
// account-mode → Supabase `profiles` upsert (POST-PIVOT: only display_name).
// local-mode → StorageAdapter key 'profile' (JSON blob, Partial<LocalProfile>).
// Pattern: 02-PATTERNS.md §"app/app/(app)/profile/plz.tsx" + Pitfall 6 (single JSON blob, no flat keys).
//
// Phase 2.5 pivot (D-01): plz/klimazone/archetype moved from profiles → gardens.
// Account-mode reads/writes ONLY display_name here; the lokal-mode blob still
// holds the LocalProfile shape (PLZ/Klima/Archetyp) so the lokal-only experience
// continues to work unchanged (D-13: lokal-mode has no garden).
import { supabase } from './supabase';
import { storage } from '../storage';
import { useAuthStore } from '../stores/authStore';
import type { LocalProfile, UserProfile } from '@spatenstich/shared';

const PROFILE_KEY = 'profile';

// Loosely typed read/write surface so existing lokal-mode callers (useProfile.ts)
// that still touch plz/klimazone/archetype keep compiling. In account-mode the
// read/write payload is restricted internally to `display_name`.
// Intersecting Partial<UserProfile> & Partial<LocalProfile> would narrow `mode`
// to the literal `'local'` (LocalProfile's constraint); we use a looser union
// on `mode` so account-mode returns are also expressible.
export type ProfilePatch = {
  userId?: string;
  mode?: UserProfile['mode'];
  displayName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  plz?: LocalProfile['plz'];
  klimazone?: LocalProfile['klimazone'];
  archetype?: LocalProfile['archetype'];
};

export async function loadProfile(): Promise<ProfilePatch | null> {
  const { mode, userId } = useAuthStore.getState();
  if (!mode || !userId) return null;
  if (mode === 'account') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      userId: data.id,
      mode: 'account',
      displayName: data.display_name ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
  const raw = await storage.get(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfilePatch;
  } catch {
    // Corrupted blob — treat as empty, caller will re-save.
    return null;
  }
}

export async function saveProfile(patch: ProfilePatch): Promise<void> {
  const { mode, userId } = useAuthStore.getState();
  if (!mode || !userId) throw new Error('Not authenticated');
  if (mode === 'account') {
    // Account-mode shrink (D-01): only display_name lives on profiles post-pivot.
    // plz/klimazone/archetype are silently dropped here — they now live on the
    // active garden row and must be saved via gardenRepo.updateGarden.
    const payload: { id: string; display_name?: string | null } = { id: userId };
    if ('displayName' in patch) payload.display_name = patch.displayName ?? null;
    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return;
  }
  // local-mode: read-modify-write against StorageAdapter (Pitfall 6 — one JSON blob key).
  const current = await loadProfile();
  const merged = { ...(current ?? {}), ...patch };
  await storage.set(PROFILE_KEY, JSON.stringify(merged));
}
