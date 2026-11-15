// Phase 36: calendar days as YYYY-MM-DD strings. Tasks are about days, not moments, so
// everything here is plain day arithmetic without time zones.

const DAY_MS = 86_400_000;

/** Today in the device's own time, as YYYY-MM-DD. */
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function addDays(day: string, days: number): string {
  return new Date(toUtc(day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` lies before). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function yearOf(day: string): number {
  return Number(day.slice(0, 4));
}

export function monthOf(day: string): number {
  return Number(day.slice(5, 7));
}

/** Day of the year, 1 to 366. */
export function dayOfYear(day: string): number {
  return Math.round((toUtc(day) - Date.UTC(yearOf(day), 0, 1)) / DAY_MS) + 1;
}

const MONTH_START = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

/** "Anfang Mai", "Mitte Oktober", "Ende Juni" for a day of the year. */
export function doyInWords(
  doy: number,
  monthNames: readonly string[],
  parts: readonly [string, string, string] = ['Anfang', 'Mitte', 'Ende'],
): string {
  const clamped = Math.max(1, Math.min(365, Math.round(doy)));
  let month = 11;
  while (month > 0 && clamped < MONTH_START[month]!) month -= 1;
  const dayInMonth = clamped - MONTH_START[month]! + 1;
  const part = dayInMonth <= 10 ? parts[0] : dayInMonth <= 20 ? parts[1] : parts[2];
  return `${part} ${monthNames[month]}`;
}

/** "15.11." */
export function shortDate(day: string): string {
  return `${Number(day.slice(8, 10))}.${Number(day.slice(5, 7))}.`;
}
