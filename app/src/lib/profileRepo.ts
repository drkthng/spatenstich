// Mode-aware profile persistence (D-11).
// Phase 3 Plan 03-03 offline-first refactor:
//   account-mode → StorageAdapter profiles Row-Table (offline-first read + writeWithOutbox)
//   local-mode   → StorageAdapter key 'profile' (JSON blob, Partial<LocalProfile>) — unverändert
//
// Phase 2.5 pivot (D-01): plz/klimazone/archetype moved from profiles → gardens.
// Account-mode reads/writes ONLY display_name here; the local-mode blob still
// holds the LocalProfile shape (PLZ/Klima/Archetyp) so the local-only experience
// continues to work unchanged (D-13: local-mode has no garden).
import { supabase } from './supabase';
import { storage } from '../storage';
import { useAuthStore } from '../stores/authStore';
import type { LocalProfile, UserProfile, ProfileRow } from '@spatenstich/shared';
import { OutboxEnqueueError } from './errors';
import {
  profileToLocalRow,
  profileFromDb,
  normalizeDisplayName,
} from './mappers/rowMappers';

const PROFILE_KEY = 'profile';

// Loosely typed read/write surface so existing local-mode callers (useProfile.ts)
// that still touch plz/klimazone/archetype keep compiling. In account-mode the
// read/write payload is restricted internally to `display_name`.
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
    // Offline-first: lokale ProfileRow lesen (SYNC-01)
    const localRow = await storage.getRow<ProfileRow>('profiles', userId);
    if (localRow) {
      return {
        userId: localRow.userId,
        mode: 'account',
        displayName: localRow.displayName,
        createdAt: localRow.createdAt,
        updatedAt: localRow.updatedAt,
      };
    }
    // Fallback: Supabase (SyncWorker hydriert beim nächsten Pull)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = profileFromDb(data as any);
    await storage.upsertRowFromServer('profiles', row);
    return {
      userId: row.userId,
      mode: 'account',
      displayName: row.displayName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
  // local mode: read-only from KV blob (unverändert)
  const raw = await storage.get(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfilePatch;
  } catch {
    return null;
  }
}

export async function saveProfile(patch: ProfilePatch): Promise<void> {
  const { mode, userId } = useAuthStore.getState();
  if (!mode || !userId) throw new Error('Not authenticated');
  if (mode === 'account') {
    // Account-mode: offline-first write via Row-Table + Outbox (L-6)
    const existing = await storage.getRow<ProfileRow>('profiles', userId);
    const updated = profileToLocalRow(
      userId,
      {
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
      },
      existing,
    );
    try {
      await storage.writeWithOutbox('profiles', updated, {
        entity: 'profiles',
        rowId: userId,
        operation: existing ? 'update' : 'insert',
        payload: updated as unknown as Record<string, unknown>,
      });
    } catch (cause) {
      throw new OutboxEnqueueError('profiles', userId, cause);
    }
    return;
  }
  // local-mode: read-modify-write against StorageAdapter (Pitfall 6 — one JSON blob key).
  const current = await loadProfile();
  const merged = { ...(current ?? {}), ...patch };
  await storage.set(PROFILE_KEY, JSON.stringify(merged));
}

// Re-export normalizeDisplayName for any callers that imported from this module.
export { normalizeDisplayName };
