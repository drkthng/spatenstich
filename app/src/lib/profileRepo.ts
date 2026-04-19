// Mode-aware profile persistence (D-11).
// account-mode → Supabase `profiles` upsert. local-mode → StorageAdapter key 'profile' (JSON).
// Pattern: 02-PATTERNS.md §"app/app/(app)/profile/plz.tsx" + Pitfall 6 (single JSON blob, no flat keys).
import { supabase } from './supabase';
import { storage } from '../storage';
import { useAuthStore } from '../stores/authStore';
import type { UserProfile } from '@spatenstich/shared';

const PROFILE_KEY = 'profile';

export async function loadProfile(): Promise<Partial<UserProfile> | null> {
  const { mode, userId } = useAuthStore.getState();
  if (!mode || !userId) return null;
  if (mode === 'account') {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      plz: data.plz ?? null,
      // Supabase stores klimazone as smallint; cast to Klimazone union at the boundary.
      klimazone: (data.klimazone as UserProfile['klimazone']) ?? null,
      archetype: (data.archetype as UserProfile['archetype']) ?? null,
    };
  }
  const raw = await storage.get(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<UserProfile>;
  } catch {
    // Corrupted blob — treat as empty, caller will re-save.
    return null;
  }
}

export async function saveProfile(patch: Partial<UserProfile>): Promise<void> {
  const { mode, userId } = useAuthStore.getState();
  if (!mode || !userId) throw new Error('Not authenticated');
  if (mode === 'account') {
    const { error } = await supabase.from('profiles').upsert({ id: userId, ...patch });
    if (error) throw error;
    return;
  }
  // local-mode: read-modify-write against StorageAdapter (Pitfall 6 — one JSON blob key).
  const current = await loadProfile();
  const merged = { ...(current ?? {}), ...patch };
  await storage.set(PROFILE_KEY, JSON.stringify(merged));
}
