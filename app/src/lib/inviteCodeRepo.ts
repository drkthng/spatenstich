// Invite-Code RPC wrapper — Plan 02.5-03.
// Pattern: PATTERNS §4. Account-only (D-13); lokal-mode throws.
// Error codes propagated (UI classifies):
//   P0002 = invalid/expired code
//   23514 = garden at 2-member limit
//   42501 = insufficient_privilege (not owner)
import { supabase } from './supabase';
import type { AuthMode } from '../stores/authStore';

function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}

export async function createInviteForGarden(
  mode: AuthMode,
  gardenId: string,
): Promise<string> {
  assertAccount(mode);
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
  const normalized = normalizeCode(code);
  const { data, error } = await supabase.rpc('consume_invite_code', {
    p_code: normalized,
  });
  if (error) throw error;
  return data as string; // garden_id uuid
}

export async function ensureDefaultGardenForUser(): Promise<string> {
  // No mode guard: may be called right after signUp but before store flip.
  const { data, error } = await supabase.rpc('ensure_default_garden_for_user');
  if (error) throw error;
  return data as string; // garden_id uuid
}
