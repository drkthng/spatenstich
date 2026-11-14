// Phase 30: German number entry for the properties field (EDIT3-06).
// Metres with a decimal comma, exact to 1 cm; degrees as whole numbers.

/** "1,2" / "1.25" / " 3 " -> metres rounded to 1 cm; null when not a positive number. */
export function parseMeters(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

/** 1.2 -> "1,20" */
export function formatMeters(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2).replace('.', ',');
}

/** "15" / "-90" / "370" -> whole degrees in 0…359; null when not a number. */
export function parseDegrees(input: string): number | null {
  const cleaned = input.trim().replace(',', '.').replace('°', '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Math.round(Number(cleaned));
  if (!Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
}

export function formatDegrees(value: number): string {
  return String(Math.round(((value % 360) + 360) % 360) % 360);
}
