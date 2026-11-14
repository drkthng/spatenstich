// Framework-agnostische Helper. Nutzbar aus app/ (RN) und supabase/ (Deno).
export function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0;
}
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ── North direction of a garden (Phase 30, decision D-11) ────────────────────
// Stored with the garden in `garden_dimensions.extraDims` under NORTH_DEG_KEY. This key and
// convention are synced data on every device: 0 = north points to the top of the plan,
// values grow clockwise, whole range 0…359. Changing either later needs a data rewrite.
export const NORTH_DEG_KEY = 'northDeg';

/** Direction of north on the plan in degrees; 0 (top of the plan) when none is stored. */
export function getNorthDeg(extraDims: Record<string, unknown> | null | undefined): number {
  const raw = extraDims ? extraDims[NORTH_DEG_KEY] : undefined;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  return ((Math.round(raw) % 360) + 360) % 360;
}

/** Returns a copy of `extraDims` with the north direction set; other keys are kept. */
export function withNorthDeg(
  extraDims: Record<string, unknown> | null | undefined,
  deg: number,
): Record<string, unknown> {
  const safe = Number.isFinite(deg) ? deg : 0;
  return { ...(extraDims ?? {}), [NORTH_DEG_KEY]: ((Math.round(safe) % 360) + 360) % 360 };
}
