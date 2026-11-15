// Phase 36 (TASK-01, TASK-02, TASK-04, TASK-07, TASK-08): today's tasks, worked out on
// the device from the plan, the calendar, the season, the climate zone, the last loaded
// forecast, the members' own tasks and accepted photo findings. No network, no clock of
// its own: the same inputs always give the same list (TASK-09).
//
// Every task says what to do, where, how long it takes, how urgent it is and why.

import {
  getFensterFuerPflanze,
  type AktionsTyp,
  type GardenTaskRow,
  type KalenderFenster,
  type PhotoFindingRow,
  type PlanElementRow,
  type PlantRow,
} from '@spatenstich/shared';
import { t } from '../i18n';
import { getPlantSlug } from '../kalenderBeete';
import { dayOfYear, daysBetween, doyInWords, shortDate, yearOf } from './dates';

export type Urgency = 'high' | 'medium' | 'low';
export type TaskSource = 'calendar' | 'season' | 'weather' | 'finding' | 'own';

export interface Task {
  /** Stable for as long as the task is the same task; what a tick-off refers to. */
  key: string;
  title: string;
  /** Bed, plant or place, in words. */
  where: string;
  elementId: string | null;
  durationMin: number;
  urgency: Urgency;
  /** One sentence: why now. */
  reason: string;
  /** For the order of the list, higher first. */
  value: number;
  source: TaskSource;
  /** Days until it comes back after it was done; null: it does not come back. */
  repeatDays: number | null;
}

export interface ForecastDay {
  /** YYYY-MM-DD */
  date: string;
  tMin: number;
  tMax: number;
  rainMm: number;
}

export interface Forecast {
  fetchedAt: string;
  place: string | null;
  days: ForecastDay[];
}

export interface TaskInputs {
  /** YYYY-MM-DD */
  today: string;
  klimazone: number | null;
  elements: PlanElementRow[];
  /** Shared catalog plus the garden's own entries. */
  plants: PlantRow[];
  ownTasks: GardenTaskRow[];
  findings: PhotoFindingRow[];
  /** The last loaded forecast, or null when there is none (or it is too old). */
  forecast: Forecast | null;
}

const URGENCY_VALUE: Record<Urgency, number> = { high: 80, medium: 50, low: 20 };
const SOURCE_BONUS: Record<TaskSource, number> = { weather: 15, finding: 10, calendar: 6, own: 5, season: 0 };

const FROST_AT = 0.5;
const HEAT_AT = 28;
const RAIN_ENOUGH_MM = 5;

// Shift of the season against climate zone 4, in days (same table as the calendar).
const LAST_FROST_DOY: Record<number, number> = { 1: 66, 2: 76, 3: 86, 4: 96, 5: 106, 6: 116, 7: 126 };
function zoneShift(klimazone: number | null): number {
  if (!klimazone || klimazone < 1 || klimazone > 7) return 0;
  return LAST_FROST_DOY[klimazone]! - LAST_FROST_DOY[4]!;
}

const months = (): string[] => Array.from({ length: 12 }, (_, i) => t(`photo.months.${i}`));

function make(task: Omit<Task, 'value'>): Task {
  return { ...task, value: URGENCY_VALUE[task.urgency] + SOURCE_BONUS[task.source] };
}

/** The forecast for a day, when the forecast is fresh enough to count. */
export function usableForecast(forecast: Forecast | null, today: string): ForecastDay[] {
  if (!forecast) return [];
  const age = daysBetween(forecast.fetchedAt.slice(0, 10), today);
  if (age < 0 || age > 1) return [];
  return forecast.days.filter((d) => daysBetween(today, d.date) >= 0 && daysBetween(today, d.date) <= 2);
}

const fmtTemp = (value: number): string => `${Math.round(value)} °C`.replace('-', '−');

// ── Calendar ─────────────────────────────────────────────────────────────────

const CALENDAR: Record<AktionsTyp, { verb: string; minutes: number; repeatDays: number | null }> = {
  Vorkultur: { verb: 'tasks.rule.presow', minutes: 20, repeatDays: null },
  Direktsaat: { verb: 'tasks.rule.sow', minutes: 20, repeatDays: null },
  Auspflanzen: { verb: 'tasks.rule.plantOut', minutes: 25, repeatDays: null },
  Ernte: { verb: 'tasks.rule.harvest', minutes: 15, repeatDays: 7 },
};

function windowUrgency(daysLeft: number): Urgency {
  if (daysLeft <= 7) return 'high';
  if (daysLeft <= 21) return 'medium';
  return 'low';
}

function calendarTasks(input: TaskInputs, frostAhead: ForecastDay | null): Task[] {
  const doy = dayOfYear(input.today);
  const year = yearOf(input.today);
  const bySlug = new Map(input.plants.map((p) => [p.slug, p]));
  const beds = new Map(input.elements.filter((e) => e.elementType === 'Beet').map((e) => [e.id, e]));
  const names = months();

  // One task per kind of plant and bed, however many plants of it stand there.
  const groups = new Map<string, { plant: PlantRow; bed: PlanElementRow | null }>();
  for (const el of input.elements) {
    if (el.elementType !== 'Pflanze') continue;
    const slug = getPlantSlug(el);
    const plant = slug ? bySlug.get(slug) : undefined;
    if (!plant) continue;
    const parent = (el.provenance as Record<string, unknown> | null)?.parentBedId;
    const bed = typeof parent === 'string' ? (beds.get(parent) ?? null) : null;
    const key = `${plant.slug}:${bed?.id ?? 'none'}`;
    if (!groups.has(key)) groups.set(key, { plant, bed });
  }

  const tasks: Task[] = [];
  for (const [groupKey, { plant, bed }] of groups) {
    const windows: KalenderFenster[] = getFensterFuerPflanze(plant, input.klimazone ?? 4);
    for (const window of windows) {
      if (doy < window.startDoy || doy > window.endDoy) continue;
      const rule = CALENDAR[window.typ];
      // A window over New Year (winter harvest) ends next year, not on 31 December.
      const whole = window.ueberJahreswechsel;
      const endsNextYear = whole !== undefined && window.endDoy === 365 && whole.endDoy < whole.startDoy;
      const lastDoy = whole ? whole.endDoy : window.endDoy;
      const daysLeft = endsNextYear ? 365 - doy + lastDoy : window.endDoy - doy;
      let urgency = windowUrgency(daysLeft);
      let reason = t(`tasks.reason.${window.typ}`, { until: doyInWords(lastDoy, names) });
      // Nothing goes out into a frost night.
      if (frostAhead && (window.typ === 'Auspflanzen' || window.typ === 'Direktsaat')) {
        urgency = 'low';
        reason = t('tasks.reason.waitForFrost', { temp: fmtTemp(frostAhead.tMin), day: shortDate(frostAhead.date) });
      }
      tasks.push(
        make({
          key:
            rule.repeatDays === null
              ? `cal:${window.typ}:${groupKey}:${year}`
              : `cal:${window.typ}:${groupKey}`,
          title: t(rule.verb, { plant: plant.nameDe }),
          where: bed ? bed.label : t('tasks.where.garden'),
          elementId: bed?.id ?? null,
          durationMin: rule.minutes,
          urgency,
          reason,
          source: 'calendar',
          repeatDays: rule.repeatDays,
        }),
      );
    }
  }
  return tasks;
}

// ── Season ───────────────────────────────────────────────────────────────────

interface SeasonContext {
  input: TaskInputs;
  /** Day of the year, moved to where climate zone 4 would be on this day. */
  seasonDoy: number;
  year: number;
  beds: PlanElementRow[];
  plantedBeds: PlanElementRow[];
  has: (kind: string) => PlanElementRow | undefined;
  days: ForecastDay[];
}

const between = (doy: number, from: number, to: number): boolean => doy >= from && doy <= to;

function seasonTasks(ctx: SeasonContext): Task[] {
  const { seasonDoy: doy, year, beds, plantedBeds, has, days } = ctx;
  const today = days.find((d) => d.date === ctx.input.today) ?? null;
  const tasks: Task[] = [];
  const all = t('tasks.where.garden');

  // Watering: April to September, for the beds that have plants.
  if (plantedBeds.length > 0 && between(doy, 100, 273)) {
    const rainToday = today ? today.rainMm >= RAIN_ENOUGH_MM : false;
    if (!rainToday) {
      const hot = today ? today.tMax >= HEAT_AT : false;
      const summer = between(doy, 152, 243);
      tasks.push(
        make({
          key: 'season:water',
          title: t('tasks.rule.water'),
          where:
            plantedBeds.length === 1
              ? plantedBeds[0]!.label
              : t('tasks.where.plantedBeds', { n: plantedBeds.length }),
          elementId: plantedBeds.length === 1 ? plantedBeds[0]!.id : null,
          durationMin: Math.min(40, 5 + plantedBeds.length * 5),
          urgency: hot ? 'high' : summer ? 'medium' : 'low',
          reason: hot
            ? t('tasks.reason.waterHeat', { temp: fmtTemp(today!.tMax) })
            : today
              ? t('tasks.reason.waterDry')
              : t('tasks.reason.waterNoForecast'),
          source: hot ? 'weather' : 'season',
          repeatDays: hot || summer ? 1 : 2,
        }),
      );
    }
  }

  // Weeding: April to October, bed by bed, every two weeks.
  if (between(doy, 100, 304)) {
    for (const bed of beds) {
      tasks.push(
        make({
          key: `season:weed:${bed.id}`,
          title: t('tasks.rule.weed'),
          where: bed.label,
          elementId: bed.id,
          durationMin: Math.max(10, Math.min(45, Math.round(bed.widthM * bed.heightM * 5))),
          urgency: between(doy, 130, 243) ? 'medium' : 'low',
          reason: t('tasks.reason.weed'),
          source: 'season',
          repeatDays: 14,
        }),
      );
    }
  }

  // Preparing the beds: mid February to end of March.
  if (between(doy, 46, 90)) {
    for (const bed of beds) {
      tasks.push(
        make({
          key: `season:prepare:${bed.id}:${year}`,
          title: t('tasks.rule.prepareBed'),
          where: bed.label,
          elementId: bed.id,
          durationMin: Math.max(20, Math.min(60, Math.round(bed.widthM * bed.heightM * 12))),
          urgency: doy >= 75 ? 'medium' : 'low',
          reason: t('tasks.reason.prepareBed'),
          source: 'season',
          repeatDays: null,
        }),
      );
    }
  }

  const compost = has('Kompost');
  if (compost && (between(doy, 60, 120) || between(doy, 244, 304))) {
    tasks.push(
      make({
        key: `season:compost:${year}:${doy < 180 ? 'spring' : 'autumn'}`,
        title: t('tasks.rule.compost'),
        where: compost.label,
        elementId: compost.id,
        durationMin: 30,
        urgency: 'low',
        reason: t(doy < 180 ? 'tasks.reason.compostSpring' : 'tasks.reason.compostAutumn'),
        source: 'season',
        repeatDays: null,
      }),
    );
  }

  const lawn = has('Rasen');
  if (lawn && between(doy, 100, 304)) {
    const growing = between(doy, 121, 258);
    tasks.push(
      make({
        key: 'season:mow',
        title: t('tasks.rule.mow'),
        where: lawn.label,
        elementId: lawn.id,
        durationMin: Math.max(15, Math.min(60, Math.round(lawn.widthM * lawn.heightM * 0.8))),
        urgency: growing ? 'medium' : 'low',
        reason: t(growing ? 'tasks.reason.mowGrowing' : 'tasks.reason.mowSlow'),
        source: 'season',
        repeatDays: growing ? 7 : 12,
      }),
    );
  }

  const tree = has('Baum');
  if (tree && between(doy, 32, 80)) {
    tasks.push(
      make({
        key: `season:prune:${year}`,
        title: t('tasks.rule.prune'),
        where: tree.label,
        elementId: tree.id,
        durationMin: 45,
        urgency: doy >= 60 ? 'medium' : 'low',
        reason: t('tasks.reason.prune'),
        source: 'season',
        repeatDays: null,
      }),
    );
  }

  // Autumn.
  if (between(doy, 288, 334)) {
    tasks.push(
      make({
        key: `season:leaves:${year}`,
        title: t('tasks.rule.leaves'),
        where: all,
        elementId: null,
        durationMin: 30,
        urgency: 'low',
        reason: t('tasks.reason.leaves'),
        source: 'season',
        repeatDays: 14,
      }),
    );
  }
  const water = has('Wasserstelle');
  if (water && between(doy, 288, 349)) {
    const frost = days.find((d) => d.tMin <= FROST_AT) ?? null;
    tasks.push(
      make({
        key: `season:waterOff:${year}`,
        title: t('tasks.rule.waterOff'),
        where: water.label,
        elementId: water.id,
        durationMin: 15,
        urgency: frost ? 'high' : doy >= 319 ? 'medium' : 'low',
        reason: frost
          ? t('tasks.reason.waterOffFrost', { temp: fmtTemp(frost.tMin), day: shortDate(frost.date) })
          : t('tasks.reason.waterOff'),
        source: frost ? 'weather' : 'season',
        repeatDays: null,
      }),
    );
  }

  // Winter.
  if (doy >= 335 || doy <= 45) {
    const winter = doy >= 335 ? year : year - 1;
    tasks.push(
      make({
        key: `season:tools:${winter}`,
        title: t('tasks.rule.tools'),
        where: has('Laube')?.label ?? all,
        elementId: has('Laube')?.id ?? null,
        durationMin: 30,
        urgency: 'low',
        reason: t('tasks.reason.tools'),
        source: 'season',
        repeatDays: null,
      }),
    );
  }
  if (between(doy, 1, 59)) {
    tasks.push(
      make({
        key: `season:plan:${year}`,
        title: t('tasks.rule.planSeason'),
        where: all,
        elementId: null,
        durationMin: 30,
        urgency: doy >= 32 ? 'medium' : 'low',
        reason: t('tasks.reason.planSeason'),
        source: 'season',
        repeatDays: null,
      }),
    );
  }
  return tasks;
}

// ── Weather on its own ───────────────────────────────────────────────────────

function frostTask(ctx: SeasonContext, frost: ForecastDay | null): Task[] {
  // Frost matters while tender plants are out: April to October.
  const plantsOut = ctx.input.elements.some((e) => e.elementType === 'Pflanze');
  if (!frost || !plantsOut || !between(ctx.seasonDoy, 91, 304)) return [];
  return [
    make({
      key: `weather:frost:${frost.date}`,
      title: t('tasks.rule.frost'),
      where:
        ctx.plantedBeds.length === 1
          ? ctx.plantedBeds[0]!.label
          : ctx.plantedBeds.length > 1
            ? t('tasks.where.plantedBeds', { n: ctx.plantedBeds.length })
            : t('tasks.where.garden'),
      elementId: ctx.plantedBeds.length === 1 ? ctx.plantedBeds[0]!.id : null,
      durationMin: Math.min(40, 10 + ctx.plantedBeds.length * 5),
      urgency: 'high',
      reason: t('tasks.reason.frost', { temp: fmtTemp(frost.tMin), day: shortDate(frost.date) }),
      source: 'weather',
      repeatDays: null,
    }),
  ];
}

// ── Findings and own tasks ───────────────────────────────────────────────────

function findingTasks(input: TaskInputs): Task[] {
  const labels = new Map(input.elements.map((e) => [e.id, e.label]));
  return input.findings
    .filter((f) => f.deletedAt === null && f.status === 'accepted' && f.taskRequested)
    .map((f) =>
      make({
        key: `finding:${f.id}`,
        title: (f.proposal?.action ?? '').trim() || f.title,
        where:
          (f.targetElementId ? labels.get(f.targetElementId) : undefined) ??
          f.proposal?.plantName ??
          t('tasks.where.garden'),
        elementId: f.targetElementId && labels.has(f.targetElementId) ? f.targetElementId : null,
        durationMin: 15,
        urgency: f.kind === 'stage' ? 'medium' : 'high',
        reason: t('tasks.reason.finding', { title: f.title }),
        source: 'finding',
        repeatDays: null,
      }),
    );
}

function ownTasks(input: TaskInputs): Task[] {
  const labels = new Map(input.elements.map((e) => [e.id, e.label]));
  const tasks: Task[] = [];
  for (const own of input.ownTasks) {
    if (own.deletedAt !== null) continue;
    const late = daysBetween(own.dueOn, input.today);
    if (late < 0) continue; // not due yet
    tasks.push(
      make({
        key: `own:${own.id}`,
        title: own.title,
        where:
          (own.targetElementId ? labels.get(own.targetElementId) : undefined) ??
          own.whereText ??
          t('tasks.where.garden'),
        elementId: own.targetElementId && labels.has(own.targetElementId) ? own.targetElementId : null,
        durationMin: own.durationMin,
        urgency: late > 3 ? 'high' : 'medium',
        reason:
          own.intervalDays !== null
            ? t('tasks.reason.ownRepeating', { n: own.intervalDays })
            : late === 0
              ? t('tasks.reason.ownToday')
              : t('tasks.reason.ownLate', { day: shortDate(own.dueOn) }),
        source: 'own',
        repeatDays: own.intervalDays,
      }),
    );
  }
  return tasks;
}

// ── All together ─────────────────────────────────────────────────────────────

const ORDER: Record<Urgency, number> = { high: 0, medium: 1, low: 2 };

/** The order of the base list: most valuable first, then shorter, then by key. */
export function byValue(a: Task, b: Task): number {
  return b.value - a.value || ORDER[a.urgency] - ORDER[b.urgency] || a.durationMin - b.durationMin || a.key.localeCompare(b.key);
}

/**
 * Every task that is due today, most valuable first. Ticked-off tasks are still in the
 * list; `splitDone()` in done.ts takes them out.
 */
export function buildTasks(raw: TaskInputs): Task[] {
  const input: TaskInputs = {
    ...raw,
    elements: raw.elements.filter((e) => e.deletedAt === null && e.isAccepted !== false),
  };
  const days = usableForecast(input.forecast, input.today);
  const seasonDoy = dayOfYear(input.today) - zoneShift(input.klimazone);
  const beds = input.elements.filter((e) => e.elementType === 'Beet');
  const bedOfPlant = new Set<string>();
  for (const el of input.elements) {
    if (el.elementType !== 'Pflanze') continue;
    const parent = (el.provenance as Record<string, unknown> | null)?.parentBedId;
    if (typeof parent === 'string') bedOfPlant.add(parent);
  }
  const ctx: SeasonContext = {
    input,
    seasonDoy,
    year: yearOf(input.today),
    beds,
    plantedBeds: beds.filter((b) => bedOfPlant.has(b.id)),
    has: (kind) => input.elements.find((e) => e.elementType === kind),
    days,
  };
  // The coming night and the one after.
  const frost = days.filter((d) => daysBetween(input.today, d.date) <= 1).find((d) => d.tMin <= FROST_AT) ?? null;

  const tasks = [
    ...frostTask(ctx, frost),
    ...calendarTasks(input, between(seasonDoy, 91, 304) ? frost : null),
    ...seasonTasks(ctx),
    ...findingTasks(input),
    ...ownTasks(input),
  ];
  return tasks.sort(byValue);
}

/** A short sentence about the forecast for the top of the list; null without one. */
export function forecastLine(forecast: Forecast | null, today: string): string | null {
  const day = usableForecast(forecast, today).find((d) => d.date === today);
  if (!day) return null;
  const place = forecast?.place ? t('tasks.weather.place', { place: forecast.place }) : '';
  const rain = day.rainMm >= RAIN_ENOUGH_MM ? t('tasks.weather.rain', { mm: Math.round(day.rainMm) }) : t('tasks.weather.dry');
  return t('tasks.weather.line', { min: fmtTemp(day.tMin), max: fmtTemp(day.tMax), rain, place }).trim();
}
