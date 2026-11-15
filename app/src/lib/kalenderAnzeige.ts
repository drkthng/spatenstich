// Phase 38 (DESIGN3-07): what the calendar screens show, worked out without React so it can be
// tested: where a window sits on the year strip, where today is, how a window reads in words,
// which plants a search finds and how the list splits into "In eurem Plan" and "Alle Pflanzen".

import type { AktionsTyp, KalenderFenster, PlantRow } from '@spatenstich/shared';
import { doyInWords } from './tasks/dates';

const DAYS = 365;

/** Day of the year (1 to 366) in the device's own time. */
export function dayOfYearOf(now: Date): number {
  const start = Date.UTC(now.getFullYear(), 0, 1);
  const day = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((day - start) / 86_400_000) + 1;
}

/** Where today lies on the year strip, in percent from the left (middle of the day). */
export function todayPercent(now: Date = new Date()): number {
  const doy = Math.min(DAYS, dayOfYearOf(now));
  return ((doy - 0.5) / DAYS) * 100;
}

export interface StripBar {
  typ: AktionsTyp;
  leftPercent: number;
  widthPercent: number;
}

/** One bar per window, placed by day of the year. Windows that cannot be drawn are left out. */
export function stripBars(fenster: readonly KalenderFenster[]): StripBar[] {
  const bars: StripBar[] = [];
  for (const f of fenster) {
    const start = Math.max(1, Math.min(DAYS, f.startDoy));
    const end = Math.max(1, Math.min(DAYS, f.endDoy));
    if (!(end >= start)) continue;
    bars.push({
      typ: f.typ,
      leftPercent: ((start - 1) / DAYS) * 100,
      widthPercent: ((end - start + 1) / DAYS) * 100,
    });
  }
  return bars;
}

export interface WindowInWords {
  typ: AktionsTyp;
  /** "Anfang März", the start of the whole window. */
  from: string;
  /** "Ende April", the end of the whole window. */
  to: string;
  /** The parts to draw; two when the window runs over New Year. */
  parts: KalenderFenster[];
  /** Whether today lies in the window. */
  active: boolean;
}

const ORDER: AktionsTyp[] = ['Vorkultur', 'Direktsaat', 'Auspflanzen', 'Ernte'];

/**
 * The windows of a plant, one entry per kind of action, with start and end in words. The two
 * parts of a window over New Year become one entry ("Anfang Oktober bis Ende März").
 */
export function windowsInWords(
  fenster: readonly KalenderFenster[],
  monthNames: readonly string[],
  parts: readonly [string, string, string],
  now: Date = new Date(),
): WindowInWords[] {
  const doy = Math.min(DAYS, dayOfYearOf(now));
  const out: WindowInWords[] = [];
  for (const typ of ORDER) {
    const own = fenster.filter((f) => f.typ === typ);
    if (own.length === 0) continue;
    const whole = own.find((f) => f.ueberJahreswechsel)?.ueberJahreswechsel;
    const startDoy = whole ? whole.startDoy : Math.min(...own.map((f) => f.startDoy));
    const endDoy = whole ? whole.endDoy : Math.max(...own.map((f) => f.endDoy));
    out.push({
      typ,
      from: doyInWords(startDoy, monthNames, parts),
      to: doyInWords(endDoy, monthNames, parts),
      parts: [...own],
      active: own.some((f) => doy >= f.startDoy && doy <= f.endDoy),
    });
  }
  return out;
}

/** Lower case, umlauts and ß spelled out, accents dropped: "Möhre" and "moehre" and "mohre" meet. */
export function searchKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Whether a plant answers to the search: German name, other German names, botanical name. */
export function matchesSearch(plant: Pick<PlantRow, 'nameDe' | 'nameAltDe' | 'nameBotanical'>, query: string): boolean {
  const q = searchKey(query);
  if (q === '') return true;
  const names = [plant.nameDe, ...(plant.nameAltDe ?? []), plant.nameBotanical ?? ''];
  return names.some((name) => searchKey(name).includes(q));
}

export interface LetterGroup<P> {
  letter: string;
  plants: P[];
}

export interface CalendarSections<P> {
  /** Plants that stand in the plan, A to Z. */
  inPlan: P[];
  /** All plants, A to Z, grouped by first letter. */
  all: LetterGroup<P>[];
  /** How many plants the search left in "all". */
  allCount: number;
}

/** First letter for the A to Z headings; "Ä" files under "A" as in a German index. */
export function indexLetter(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  const plain = first.replace('Ä', 'A').replace('Ö', 'O').replace('Ü', 'U');
  return /[A-Z]/.test(plain) ? plain : '#';
}

export function calendarSections<P extends Pick<PlantRow, 'slug' | 'nameDe' | 'nameAltDe' | 'nameBotanical'>>(
  plants: readonly P[],
  slugsInPlan: ReadonlySet<string>,
  query: string,
): CalendarSections<P> {
  const sorted = plants
    .filter((p) => matchesSearch(p, query))
    .sort((a, b) => a.nameDe.localeCompare(b.nameDe, 'de'));
  const all: LetterGroup<P>[] = [];
  for (const plant of sorted) {
    const letter = indexLetter(plant.nameDe);
    const last = all[all.length - 1];
    if (last && last.letter === letter) last.plants.push(plant);
    else all.push({ letter, plants: [plant] });
  }
  return {
    inPlan: sorted.filter((p) => slugsInPlan.has(p.slug)),
    all,
    allCount: sorted.length,
  };
}
