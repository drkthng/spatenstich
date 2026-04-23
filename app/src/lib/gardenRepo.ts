// Mode-aware garden persistence — Plan 02.5-03.
// Pattern: profileRepo.ts (mode-check) + vereinsregelnRepo.ts (toRow/fromRow split).
// Account-mode only: local-mode throws 'gardens are account-only' (D-13).
// RLS enforces member-check at DB layer; repo relies on RLS (thin guard).
// updated_by_user_id is client-first filled (Pattern 6) — trigger is fallback.
// D-16 Owner-Rights: deleteGarden + transferOwnership wrap SECURITY DEFINER RPCs
// and translate Postgres error codes to typed domain errors the UI can classify.
import { supabase } from './supabase';
import type { AuthMode } from '../stores/authStore';
import type {
  Garden,
  GardenMember,
  GardenRole,
  Klimazone,
  Archetype,
  Database,
} from '@spatenstich/shared';

type GardensRow = Database['public']['Tables']['gardens']['Row'];
type GardensInsert = Database['public']['Tables']['gardens']['Insert'];

// ── D-16 Typed Domain Errors ──────────────────────────────────────────────
// Repositories expose these so the UI can classify failure modes without
// re-parsing Postgres error codes everywhere. Message strings are i18n-keys
// the UI should map to German; the `cause` retains the original PostgrestError
// for logging.
export class NotOwnerError extends Error {
  readonly code = 'NOT_OWNER';
  constructor(cause?: unknown) {
    super('errors.not_owner');
    this.name = 'NotOwnerError';
    (this as { cause?: unknown }).cause = cause;
  }
}

export class GardenHasMembersError extends Error {
  readonly code = 'GARDEN_HAS_MEMBERS';
  constructor(cause?: unknown) {
    super('garden.delete.error_has_members');
    this.name = 'GardenHasMembersError';
    (this as { cause?: unknown }).cause = cause;
  }
}

export class CannotTransferToSelfError extends Error {
  readonly code = 'CANNOT_TRANSFER_TO_SELF';
  constructor(cause?: unknown) {
    super('garden.transferOwnership.error_self');
    this.name = 'CannotTransferToSelfError';
    (this as { cause?: unknown }).cause = cause;
  }
}

export class TargetNotMemberError extends Error {
  readonly code = 'TARGET_NOT_MEMBER';
  constructor(cause?: unknown) {
    super('garden.transferOwnership.error_target_not_member');
    this.name = 'TargetNotMemberError';
    (this as { cause?: unknown }).cause = cause;
  }
}

function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}

export function fromRow(row: GardensRow): Garden {
  return {
    id: row.id,
    name: row.name,
    plz: row.plz ?? null,
    klimazone: (row.klimazone as Klimazone | null) ?? null,
    archetype: (row.archetype as Archetype | null) ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    updatedByUserId: row.updated_by_user_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRow(garden: Garden, userId: string): GardensInsert {
  return {
    id: garden.id,
    name: garden.name,
    plz: garden.plz,
    klimazone: garden.klimazone,
    archetype: garden.archetype,
    created_by_user_id: garden.createdByUserId ?? userId,
    updated_by_user_id: userId, // Client-first fill (Pattern 6)
  };
}

export async function loadGarden(
  mode: AuthMode,
  gardenId: string,
): Promise<Garden | null> {
  assertAccount(mode);
  const { data, error } = await supabase
    .from('gardens')
    .select('*')
    .eq('id', gardenId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function loadMembers(
  mode: AuthMode,
  gardenId: string,
): Promise<GardenMember[]> {
  assertAccount(mode);
  const { data, error } = await supabase
    .from('garden_members')
    .select(
      'garden_id, user_id, role, joined_at, profile:profiles!inner(display_name)',
    )
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
  const { error } = await supabase
    .from('gardens')
    .update({
      ...patch,
      updated_by_user_id: userId, // Pattern 6
    })
    .eq('id', gardenId);
  if (error) throw error;
}

export async function removeMember(
  mode: AuthMode,
  gardenId: string,
  userId: string,
): Promise<void> {
  assertAccount(mode);
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
  // Same endpoint as removeMember but semantic intent differs.
  // RLS policy garden_members_self_or_owner_delete allows self-leave.
  return removeMember(mode, gardenId, userId);
}

// ── D-16 Owner-Only Actions ──────────────────────────────────────────────

/**
 * Delete an entire garden and all dependent rows (members, invites,
 * vereinsregeln, ai_jobs, ai_results — via FK CASCADE or explicit RPC body).
 * Only the current owner may call this; the RPC also refuses when the garden
 * still has other members (P9003 → GardenHasMembersError) to force an
 * explicit "remove members first" flow (prevents accidental co-member data wipe).
 *
 * Caller responsibility: clear `authStore.activeGardenId` + navigate away
 * after this resolves successfully.
 *
 * WR-04: Custom P9xxx SQLSTATEs (Migration 010) vermeiden Kollision mit
 * PL/pgSQL-Built-ins (P0002 no_data_found, P0003 too_many_rows, P0004
 * assert_failure). Ältere Deployments, die noch Migration 003/009 ohne 010
 * haben, nutzen P0003/P0004/P0005 — wir mappen aus Robustness-Gründen beide
 * während der Transition.
 */
export async function deleteGarden(
  mode: AuthMode,
  gardenId: string,
): Promise<void> {
  assertAccount(mode);
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
 * Atomically transfer ownership of a garden from the current user (who must be
 * owner) to another member. After success: current user has role='member',
 * target has role='owner'. Both roles flip in one RPC body (implicit
 * transaction) so there is no intermediate "two owners" or "no owner" state.
 *
 * Error mapping (WR-04: P9xxx custom SQLSTATEs, Migration 010):
 *   42501         → NotOwnerError (caller is not the owner)
 *   P9004 / P0004 → CannotTransferToSelfError (toUserId === caller)
 *   P9005 / P0005 → TargetNotMemberError (toUserId is not a member of gardenId)
 *
 * Beide Varianten (P0xxx und P9xxx) werden aus Robustness-Gründen erkannt,
 * solange ältere Deployments noch nicht Migration 010 haben.
 */
export async function transferOwnership(
  mode: AuthMode,
  gardenId: string,
  toUserId: string,
): Promise<void> {
  assertAccount(mode);
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
