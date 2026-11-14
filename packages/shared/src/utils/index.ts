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

// ── Free boundary of a parcel (Phase 32, EDIT3-15) ───────────────────────────
// Stored with the garden in `garden_dimensions.extraDims` under BOUNDARY_KEY as corner points
// in metres. The points lie inside the rectangle 0…widthM by 0…heightM, which stays the
// extent of the plan; without the key the boundary is that rectangle.
export const BOUNDARY_KEY = 'boundary';

export interface BoundaryPoint {
  x: number;
  y: number;
}

/** The free boundary, clamped into the rectangle; null when the parcel is a plain rectangle. */
export function getBoundary(
  extraDims: Record<string, unknown> | null | undefined,
  widthM: number,
  heightM: number,
): BoundaryPoint[] | null {
  const raw = extraDims ? extraDims[BOUNDARY_KEY] : undefined;
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const points: BoundaryPoint[] = [];
  for (const p of raw as BoundaryPoint[]) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    points.push({ x: Math.min(widthM, Math.max(0, p.x)), y: Math.min(heightM, Math.max(0, p.y)) });
  }
  return points;
}

/** Returns a copy of `extraDims` with the boundary set, or removed when `points` is null. */
export function withBoundary(
  extraDims: Record<string, unknown> | null | undefined,
  points: BoundaryPoint[] | null,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(extraDims ?? {}) };
  if (points && points.length >= 3) next[BOUNDARY_KEY] = points.map((p) => ({ x: p.x, y: p.y }));
  else delete next[BOUNDARY_KEY];
  return next;
}
