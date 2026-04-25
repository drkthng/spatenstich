// Invite-Code RPC wrapper — Plan 02.5-03, extended in Phase 3 Plan 03-03.
// Pattern: PATTERNS §4. Account-only (D-13); local-mode throws.
// Phase 3 extension: offline-guard on all RPC methods.
// RPCs are SECURITY DEFINER with atomic side-effects (garden member INSERT),
// so offline queuing is not safe — throw 'offline_required' instead.
//
// Error codes propagated (UI classifies):
//   WR-04: Custom P9xxx SQLSTATEs (Migration 010):
//     P9001 = invalid/expired code
//     P9006 = garden at 2-member limit
//     23514 = generic check_violation
//     42501 = insufficient_privilege (not owner)
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import type { AuthMode } from '../stores/authStore';

function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}

async function assertOnline(): Promise<void> {
  const state = await NetInfo.fetch();
  if (state.isConnected !== true || state.isInternetReachable === false) {
    throw new Error('offline_required');
  }
}

export async function createInviteForGarden(
  mode: AuthMode,
  gardenId: string,
): Promise<string> {
  assertAccount(mode);
  await assertOnline();
  const { data, error } = await supabase.rpc('create_invite_for_garden', {
    p_garden_id: gardenId,
  });
  if (error) throw error;
  return data as string; // 6-char code (Crockford-Base32, D-08)
}

/**
 * Normalize a raw user-entered code to the canonical shape expected by
 * `consume_invite_code`: uppercase + trimmed + confusable-chars removed + at
 * most 6 chars. Crockford-Base32 alphabet excludes 0/O/I/L/U (see D-08).
 */
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z1-9]/g, '').slice(0, 6);
}

export async function consumeInviteCode(
  mode: AuthMode,
  code: string,
): Promise<string> {
  assertAccount(mode);
  await assertOnline();
  const normalized = normalizeCode(code);
  const { data, error } = await supabase.rpc('consume_invite_code', {
    p_code: normalized,
  });
  if (error) throw error;
  return data as string; // garden_id uuid
}

export async function ensureDefaultGardenForUser(): Promise<string> {
  // No mode guard: may be called right after signUp but before store flip.
  // No online guard: this is called during migration which requires network anyway.
  const { data, error } = await supabase.rpc('ensure_default_garden_for_user');
  if (error) throw error;
  return data as string; // garden_id uuid
}
