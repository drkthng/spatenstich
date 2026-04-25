// Mode-aware garden persistence — Plan 02.5-03, Phase 3 Plan 03-03.
// Phase 3 offline-first refactor:
//   - loadGarden: reads FIRST from local Row-Table (StorageAdapter.getRow), falls back to Supabase
//   - updateGarden: writes optimistically local + creates Outbox entry (L-6)
//   - loadMembers: reads FIRST from local garden_members, falls back to Supabase
//   - deleteGarden + transferOwnership: remain RPC-based (D-16, online-only)
//   - removeMember/leaveGarden: online-only (SECURITY DEFINER with atomic side-effects)
//
// Typed Domain Errors remain re-exported for UI backward compat (D-16).
import { supabase } from './supabase';
import { storage } from '../storage';
import NetInfo from '@react-native-community/netinfo';
import type { AuthMode } from '../stores/authStore';
import type { Garden, GardenMember, GardenRow, GardenMemberRow, GardenRole } from '@spatenstich/shared';
import {
  NotOwnerError,
  GardenHasMembersError,
  CannotTransferToSelfError,
  TargetNotMemberError,
  OutboxEnqueueError,
} from './errors';
import {
  gardenToLocalRow,
  localToGardenView,
  gardenFromDb,
} from './mappers/rowMappers';
import { scheduleWriteDebounced } from './sync/SyncTriggers';

// ── Re-export for backward compat (UI callers import from gardenRepo) ─────
export {
  NotOwnerError,
  GardenHasMembersError,
  CannotTransferToSelfError,
  TargetNotMemberError,
} from './errors';

function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export async function loadGarden(
  mode: AuthMode,
  gardenId: string,
): Promise<Garden | null> {
  assertAccount(mode);
  // Offline-first: lokale Row zuerst lesen (SYNC-01).
  const localRow = await storage.getRow<GardenRow>('gardens', gardenId);
  if (localRow) {
    return localToGardenView(localRow);
  }
  // Kein lokaler Eintrag (z. B. neu eingeloggter User vor Initial-Pull):
  // Fallback auf Supabase-Read. SyncWorker (Plan 03-04) hydriert danach die lokale Row.
  const { data, error } = await supabase
    .from('gardens')
    .select('*')
    .eq('id', gardenId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = gardenFromDb(data);
  await storage.upsertRowFromServer('gardens', row);
  return localToGardenView(row);
}

export async function loadMembers(
  mode: AuthMode,
  gardenId: string,
): Promise<GardenMember[]> {
  assertAccount(mode);
  // Offline-first: lokale garden_members aus Row-Table lesen.
  const localMembers = await storage.getRowsByGarden<GardenMemberRow>(
    'garden_members',
    gardenId,
  );
  if (localMembers.length > 0) {
    // Profile-Display-Name aus lokalem profiles-Store joinen.
    const results: GardenMember[] = [];
    for (const m of localMembers) {
      const profile = await storage.getRow<import('@spatenstich/shared').ProfileRow>(
        'profiles',
        m.userId,
      );
      results.push({
        gardenId: m.gardenId,
        userId: m.userId,
        role: m.role as GardenRole,
        joinedAt: m.createdAt,
        displayName: profile?.displayName ?? null,
      });
    }
    return results;
  }
  // Fallback: Supabase mit Join
  const { data, error } = await supabase
    .from('garden_members')
    .select('garden_id, user_id, role, joined_at, profile:profiles!inner(display_name)')
    .eq('garden_id', gardenId);
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row['profile'] as { display_name?: string | null } | null;
    return {
      gardenId: row['garden_id'] as string,
      userId: row['user_id'] as string,
      role: row['role'] as GardenRole,
      joinedAt: row['joined_at'] as string,
      displayName: profile?.display_name ?? null,
    };
  });
}

export async function updateGarden(
  mode: AuthMode,
  gardenId: string,
  userId: string,
  patch: Partial<Pick<Garden, 'name' | 'plz' | 'klimazone' | 'archetype'>>,
): Promise<void> {
  assertAccount(mode);
  // 1. Lokale Row laden (oder fresh anlegen wenn noch nicht vorhanden)
  const existing = await storage.getRow<GardenRow>('gardens', gardenId);
  // 2. Merge + Stempel (Pattern 6: Client-first fill)
  const updated = gardenToLocalRow(
    gardenId,
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
    },
    userId,
    existing,
  );
  // Extended-Fields (plz/klimazone/archetype) anhängen
  const extendedUpdated = {
    ...updated,
    ...(patch.plz !== undefined ? { plz: patch.plz } : {}),
    ...(patch.klimazone !== undefined ? { klimazone: patch.klimazone } : {}),
    ...(patch.archetype !== undefined ? { archetype: patch.archetype } : {}),
  } as GardenRow;

  // 3. Atomic Row-Write + Outbox-Enqueue (L-6)
  try {
    await storage.writeWithOutbox('gardens', extendedUpdated, {
      entity: 'gardens',
      rowId: gardenId,
      operation: existing ? 'update' : 'insert',
      payload: extendedUpdated as unknown as Record<string, unknown>,
    });
    scheduleWriteDebounced();
  } catch (cause) {
    throw new OutboxEnqueueError('gardens', gardenId, cause);
  }
}

/**
 * D-16: removeMember ist online-only (RLS-Prüfung + garden_members DELETE).
 * Offline: wirft „offline_required".
 */
export async function removeMember(
  mode: AuthMode,
  gardenId: string,
  userId: string,
): Promise<void> {
  assertAccount(mode);
  if (!(await isOnline())) throw new Error('offline_required');
  const { error } = await supabase
    .from('garden_members')
    .delete()
    .eq('garden_id', gardenId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function leaveGarden(
  mode: AuthMode,
  gardenId: string,
  userId: string,
): Promise<void> {
  return removeMember(mode, gardenId, userId);
}

// ── D-16 Owner-Only Actions ───────────────────────────────────────────────

/**
 * Delete an entire garden and all dependent rows.
 * Bleibt RPC-basiert (SECURITY DEFINER mit atomaren Side-Effects, D-16).
 * Offline: wirft „offline_required".
 *
 * WR-04: Custom P9xxx SQLSTATEs (Migration 010):
 *   P9003 / P0003 → GardenHasMembersError
 *   42501 → NotOwnerError
 */
export async function deleteGarden(
  mode: AuthMode,
  gardenId: string,
): Promise<void> {
  assertAccount(mode);
  if (!(await isOnline())) throw new Error('offline_required');
  const { error } = await supabase.rpc('delete_garden', {
    p_garden_id: gardenId,
  });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === 'P9003' || code === 'P0003')
      throw new GardenHasMembersError(error);
    if (code === '42501') throw new NotOwnerError(error);
    throw error;
  }
}

/**
 * Transfer ownership atomically (RPC, D-16).
 * Offline: wirft „offline_required".
 *
 * WR-04: P9004/P0004 → CannotTransferToSelfError, P9005/P0005 → TargetNotMemberError.
 */
export async function transferOwnership(
  mode: AuthMode,
  gardenId: string,
  toUserId: string,
): Promise<void> {
  assertAccount(mode);
  if (!(await isOnline())) throw new Error('offline_required');
  const { error } = await supabase.rpc('transfer_ownership', {
    p_garden_id: gardenId,
    p_to_user_id: toUserId,
  });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === '42501') throw new NotOwnerError(error);
    if (code === 'P9004' || code === 'P0004')
      throw new CannotTransferToSelfError(error);
    if (code === 'P9005' || code === 'P0005')
      throw new TargetNotMemberError(error);
    throw error;
  }
}
