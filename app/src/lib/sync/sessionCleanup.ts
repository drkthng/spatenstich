// Phase 33 (SYNC3-07): nothing of one account stays on the device for the next one.
//
// Local storage holds rows of exactly one user in exactly one garden. The "scope" notes
// which. When the app starts syncing for a different user or garden, everything stored
// is dropped first; signing out drops it too.

import type { StorageAdapter } from '@spatenstich/shared';
import { storage as defaultStorage } from '../../storage';
import { useProfileStore } from '../../stores/profileStore';
import { useEditorStore } from '../../stores/editorStore';
import { _resetEditorSaveTimers, hasPendingSaves } from '../editor/saveDebounce';
import { _resetSyncTriggers } from './SyncTriggers';

export const SYNC_SCOPE_KEY = 'sync_scope';

export type ScopeChange = 'first' | 'same' | 'new_garden' | 'new_user';

interface Scope {
  userId: string;
  gardenId: string;
}

/**
 * Compares the stored scope with the one about to sync and clears local data when it
 * differs. A device that never stored a scope (installed before Phase 33) keeps its data.
 */
export async function ensureSyncScope(
  userId: string,
  gardenId: string,
  storage: StorageAdapter = defaultStorage,
): Promise<ScopeChange> {
  let previous: Scope | null = null;
  try {
    const raw = await storage.get(SYNC_SCOPE_KEY);
    previous = raw ? (JSON.parse(raw) as Scope) : null;
  } catch {
    previous = null;
  }
  let change: ScopeChange = 'first';
  if (previous) {
    if (previous.userId !== userId) change = 'new_user';
    else if (previous.gardenId !== gardenId) change = 'new_garden';
    else change = 'same';
  }
  if (change === 'new_user' || change === 'new_garden') {
    await storage.clearAll();
  }
  if (change !== 'same') {
    await storage.set(SYNC_SCOPE_KEY, JSON.stringify({ userId, gardenId } satisfies Scope));
  }
  return change;
}

/** Changes on this device that the server does not have yet (waiting or failed). */
export async function countUnsyncedChanges(storage: StorageAdapter = defaultStorage): Promise<number> {
  const entries = await storage.listOutboxEntries();
  return entries.length + (hasPendingSaves() ? 1 : 0);
}

/** Removes everything of the signed-in account from this device. */
export async function clearLocalAccountData(storage: StorageAdapter = defaultStorage): Promise<void> {
  _resetSyncTriggers();
  _resetEditorSaveTimers();
  await storage.clearAll();
  await storage.delete(SYNC_SCOPE_KEY);
  useProfileStore.getState().reset();
  useEditorStore.getState().hydrate([]);
}
