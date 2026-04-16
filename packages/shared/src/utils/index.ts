// Framework-agnostische Helper. Nutzbar aus app/ (RN) und supabase/ (Deno).
export function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0;
}
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
