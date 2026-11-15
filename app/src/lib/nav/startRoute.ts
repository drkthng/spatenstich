// Phase 37 (NAV3-02, NAV3-03): where a person lands after signing in.
//   - Someone who typed an invite code at sign-up joins that garden instead of getting
//     an empty one of their own.
//   - Someone whose garden has no size yet is led through the first steps.
// Pure, so the rules can be tested without a router or a server.

/** Invite codes are six characters from A–Z and 1–9 (no 0). */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z1-9]/g, '').slice(0, 6);
}

export function isInviteCode(raw: string): boolean {
  return normalizeInviteCode(raw).length === 6;
}

export type InviteProblem = 'invalid' | 'full' | 'failed';

/** Why joining did not work, from the server's error code. */
export function inviteProblem(error: unknown): InviteProblem {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'P9001' || code === 'P0002') return 'invalid';
  if (code === '23514') return 'full';
  return 'failed';
}

export interface GardenResolution {
  gardenId: string;
  /** Joined through the invite code typed at sign-up. */
  joined: boolean;
  /** The code did not work; the person has a garden of their own instead. */
  codeProblem: InviteProblem | null;
}

/**
 * Finds the garden for a freshly signed-in person. The invite code comes first: asking
 * for a default garden before would create an empty second one. When the code does not
 * work the person still gets a garden, and is told why the code was not used.
 * A connection problem while joining is passed on, so the caller tries again later with
 * the code still in hand.
 */
export async function resolveGarden(deps: {
  pendingCode: string | null;
  consume: (code: string) => Promise<string>;
  ensureDefault: () => Promise<string>;
  isOffline?: (error: unknown) => boolean;
}): Promise<GardenResolution> {
  const code = deps.pendingCode ? normalizeInviteCode(deps.pendingCode) : '';
  if (code.length === 6) {
    try {
      return { gardenId: await deps.consume(code), joined: true, codeProblem: null };
    } catch (error) {
      if (deps.isOffline?.(error)) throw error;
      return { gardenId: await deps.ensureDefault(), joined: false, codeProblem: inviteProblem(error) };
    }
  }
  return { gardenId: await deps.ensureDefault(), joined: false, codeProblem: null };
}

export const ONBOARDING_START = '/(app)/onboarding/groesse';

/**
 * Should this person be led to the first steps now? Only when it is certain that the
 * garden has no size: the first sync must be through (a garden joined by code brings
 * its size with that sync), and the person must not be in the steps already.
 */
export function needsOnboarding(state: {
  mode: string | null;
  gardenId: string | null;
  /** The garden's size was fetched from the server at least once. */
  firstPullDone: boolean;
  hasDimensions: boolean;
  segments: readonly string[];
}): boolean {
  if (state.mode !== 'account' || !state.gardenId) return false;
  if (!state.firstPullDone || state.hasDimensions) return false;
  const [group, first] = state.segments;
  if (group !== '(app)') return false;
  if (first === 'onboarding') return false;
  // Someone who went on to draw the plan by hand is not pulled back.
  if (first === 'plan') return false;
  return true;
}

/** A garden size a person typed: metres with comma or point, between 1 and 200. */
export function parseMetres(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= 1 && value <= 200 ? Math.round(value * 100) / 100 : null;
}

/** A six-digit code from an e-mail. */
export function isResetCode(text: string): boolean {
  return /^\d{6}$/.test(text.trim());
}

/** The shortest password the sign-in service accepts. */
export const MIN_PASSWORD = 8;
