// Phase 36: today's tasks. The rules (offline, same inputs give the same list), ticking
// off, the time budget, the AI's order, the forecast cache, and two devices.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import type {
  AiResult,
  GardenTaskRow,
  PhotoFindingRow,
  PlanElementRow,
  PlantRow,
  TaskDoneRow,
  TaskSortRow,
} from '@spatenstich/shared';
import { IndexedDbAdapter } from '../../../storage/IndexedDbAdapter';
import { runMigrations } from '../../../storage/migrations';
import { SyncWorker } from '../../sync/SyncWorker';
import { FakeServer } from '../../sync/__tests__/fakeServer';

const GARDEN = '11111111-1111-4111-8111-111111111111';
const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let mockAuth: { userId: string | null; activeGardenId: string | null; mode: string | null } = {
  userId: USER_A,
  activeGardenId: GARDEN,
  mode: 'account',
};
jest.mock('../../../stores/authStore', () => ({ useAuthStore: { getState: () => mockAuth } }));

let mockStorage: IndexedDbAdapter;
jest.mock('../../../storage', () => ({
  get storage() {
    return mockStorage;
  },
}));

const mockCallAi = jest.fn<Promise<AiResult>, [string, unknown]>();
jest.mock('../../ai/aiClient', () => ({ callAi: (feature: string, input: unknown) => mockCallAi(feature, input) }));

const mockInvoke = jest.fn();
jest.mock('../../supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

jest.mock('../../sync/SyncTriggers', () => ({ scheduleWriteDebounced: jest.fn() }));
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: Record<string, unknown>) => obj['web'] ?? obj['default'] },
  AppState: { addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }) },
}));
jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: jest.fn().mockReturnValue(() => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

import { addDays, dayOfYear, daysBetween, doyInWords, isDay, monthOf, shortDate, todayString } from '../dates';
import { activeDone, applySort, findSort, hideUntilFor, listHash, planForBudget, splitDone } from '../list';
import { buildTasks, forecastLine, usableForecast, type Forecast, type Task, type TaskInputs } from '../rules';
import {
  cachedForecast,
  checkOwnTask,
  checkTask,
  deleteOwnTask,
  loadForecast,
  loadTaskData,
  saveOwnTask,
  sortWithAi,
  storedSort,
  uncheckTask,
} from '../tasksRepo';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const BED = uuid(1);
const BED2 = uuid(2);
const AT = '2026-01-01T09:00:00.000Z';
const base = { createdAt: AT, updatedAt: AT, updatedByUserId: USER_A, deletedAt: null };

function element(id: string, patch: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    ...base,
    id,
    gardenId: GARDEN,
    elementType: 'Beet',
    label: 'Tomatenbeet',
    xM: 3,
    yM: 4,
    widthM: 2,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    importedFrom: null,
    provenance: null,
    layer: 'infrastructure',
    ...patch,
  };
}

const plantEl = (id: string, slug: string, bed: string | null, label = slug): PlanElementRow =>
  element(id, {
    elementType: 'Pflanze',
    label,
    widthM: 0.4,
    heightM: 0.4,
    layer: 'seasonal',
    provenance: bed ? { plantSlug: slug, parentBedId: bed } : { plantSlug: slug },
  });

function plant(slug: string, nameDe: string, patch: Partial<PlantRow> = {}): PlantRow {
  return {
    id: `bundle:${slug}`,
    slug,
    nameDe,
    nameAltDe: [],
    nameBotanical: null,
    family: 'Familie',
    category: 'Gemüse',
    minSpacingCm: 40,
    rowSpacingCm: null,
    depthCm: null,
    sunRequirement: 'sonnig',
    waterNeeds: 'mittel',
    climateZoneMin: null,
    climateZoneMax: null,
    sowOutdoorDoyStart: null,
    sowOutdoorDoyEnd: null,
    sowIndoorDoyStart: null,
    sowIndoorDoyEnd: null,
    plantDoyStart: null,
    plantDoyEnd: null,
    harvestDoyStart: null,
    harvestDoyEnd: null,
    daysToHarvest: null,
    nitrogenFixing: false,
    perennial: false,
    notesDe: null,
    iconEmoji: null,
    dataSource: 'merged',
    createdAt: AT,
    updatedAt: AT,
    ...patch,
  };
}

// Tomato: pre-sow March, plant out mid May to mid June, harvest July to early October.
const TOMATO = plant('tomate', 'Tomate', {
  sowIndoorDoyStart: 60,
  sowIndoorDoyEnd: 100,
  plantDoyStart: 135,
  plantDoyEnd: 166,
  harvestDoyStart: 190,
  harvestDoyEnd: 280,
});
const CARROT = plant('moehre', 'Möhre', { sowOutdoorDoyStart: 80, sowOutdoorDoyEnd: 180, harvestDoyStart: 170, harvestDoyEnd: 300 });
const PLANTS = [TOMATO, CARROT];

const PLAN: PlanElementRow[] = [
  element(BED),
  element(BED2, { label: 'Möhrenbeet', widthM: 3, heightM: 1.2 }),
  plantEl(uuid(10), 'tomate', BED, 'Tomate'),
  plantEl(uuid(11), 'tomate', BED, 'Tomate'),
  plantEl(uuid(12), 'moehre', BED2, 'Möhre'),
];

function inputs(patch: Partial<TaskInputs> = {}): TaskInputs {
  return { today: '2026-07-20', klimazone: 4, elements: PLAN, plants: PLANTS, ownTasks: [], findings: [], forecast: null, ...patch };
}

const forecast = (today: string, days: [number, number, number][], fetchedAt = `${today}T06:00:00.000Z`): Forecast => ({
  fetchedAt,
  place: 'Berlin',
  days: days.map(([tMin, tMax, rainMm], i) => ({ date: addDays(today, i), tMin, tMax, rainMm })),
});

const byKey = (tasks: Task[], key: string): Task | undefined => tasks.find((task) => task.key === key);
const keys = (tasks: Task[]): string[] => tasks.map((task) => task.key);

function ownTask(id: string, patch: Partial<GardenTaskRow> = {}): GardenTaskRow {
  return {
    ...base,
    id,
    gardenId: GARDEN,
    title: 'Regentonne leeren',
    whereText: 'an der Laube',
    targetElementId: null,
    durationMin: 20,
    intervalDays: null,
    dueOn: '2026-07-20',
    notes: null,
    createdByUserId: USER_A,
    ...patch,
  };
}

function doneRow(key: string, doneOn: string, hideUntil: string | null, patch: Partial<TaskDoneRow> = {}): TaskDoneRow {
  return { ...base, id: uuid(500 + Math.floor(Math.random() * 1e6)), gardenId: GARDEN, taskKey: key, doneOn, hideUntil, doneByUserId: USER_A, ...patch };
}

let counter = 1000;
async function freshStorage(): Promise<IndexedDbAdapter> {
  const adapter = new IndexedDbAdapter(`tasks-${Date.now()}-${counter++}`);
  await runMigrations(adapter);
  return adapter;
}

beforeEach(async () => {
  mockAuth = { userId: USER_A, activeGardenId: GARDEN, mode: 'account' };
  mockCallAi.mockReset();
  mockInvoke.mockReset();
  mockStorage = await freshStorage();
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Days ─────────────────────────────────────────────────────────────────────

describe('days', () => {
  it('adds, subtracts and counts days across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-07-01', '2026-07-20')).toBe(19);
    expect(daysBetween('2026-07-20', '2026-07-01')).toBe(-19);
    expect(dayOfYear('2026-01-01')).toBe(1);
    expect(dayOfYear('2026-07-20')).toBe(201);
    expect(monthOf('2026-07-20')).toBe(7);
    expect(shortDate('2026-07-05')).toBe('5.7.');
  });

  it('knows a real day from a made-up one', () => {
    expect(isDay('2026-02-28')).toBe(true);
    expect(isDay('2026-02-30')).toBe(false);
    expect(isDay('20.07.2026')).toBe(false);
    expect(isDay(null)).toBe(false);
    expect(todayString(new Date(2026, 6, 5, 23, 59))).toBe('2026-07-05');
  });

  it('says a day of the year in words', () => {
    const names = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    expect(doyInWords(1, names)).toBe('Anfang Januar');
    expect(doyInWords(135, names)).toBe('Mitte Mai');
    expect(doyInWords(280, names)).toBe('Anfang Oktober');
    expect(doyInWords(365, names)).toBe('Ende Dezember');
  });
});

// ── Rules ────────────────────────────────────────────────────────────────────

describe('today\'s tasks from plan, calendar and season (TASK-01, TASK-02)', () => {
  it('every task says what, where, how long, how urgent and why', () => {
    const tasks = buildTasks(inputs());
    expect(tasks.length).toBeGreaterThan(3);
    for (const task of tasks) {
      expect(task.title.length).toBeGreaterThan(2);
      expect(task.where.length).toBeGreaterThan(2);
      expect(task.durationMin).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(task.urgency);
      expect(task.reason).toMatch(/[.!]$/);
      // No untranslated key and no id in what people read.
      expect(`${task.title} ${task.where} ${task.reason}`).not.toMatch(/tasks\.|[0-9a-f]{8}-[0-9a-f]{4}/);
    }
  });

  it('a harvest window that is open gives one harvest task per kind of plant and bed', () => {
    const tasks = buildTasks(inputs());
    const harvest = tasks.filter((task) => task.key.startsWith('cal:Ernte:tomate'));
    expect(harvest).toHaveLength(1); // two tomato plants, one task
    expect(harvest[0]).toMatchObject({
      title: 'Tomate ernten',
      where: 'Tomatenbeet',
      elementId: BED,
      source: 'calendar',
      repeatDays: 7,
      reason: 'Die Erntezeit läuft bis Anfang Oktober.',
    });
    expect(byKey(tasks, `cal:Ernte:moehre:${BED2}`)?.where).toBe('Möhrenbeet');
  });

  it('a window that closes soon is urgent, one with weeks to go is not', () => {
    const late = byKey(buildTasks(inputs({ today: '2026-10-04' })), `cal:Ernte:tomate:${BED}`)!; // closes 7 Oct
    expect(late.urgency).toBe('high');
    const early = byKey(buildTasks(inputs({ today: '2026-07-20' })), `cal:Ernte:tomate:${BED}`)!;
    expect(early.urgency).toBe('low');
    expect(late.value).toBeGreaterThan(early.value);
  });

  it('planting out is a task of the season, once per year', () => {
    const tasks = buildTasks(inputs({ today: '2026-05-20' }));
    expect(byKey(tasks, `cal:Auspflanzen:tomate:${BED}:2026`)).toMatchObject({ title: 'Tomate auspflanzen', repeatDays: null });
    expect(buildTasks(inputs({ today: '2026-04-01' })).some((task) => task.key.startsWith('cal:Auspflanzen'))).toBe(false);
  });

  it('the climate zone moves the calendar: later in a cold zone', () => {
    const day = '2026-06-25'; // zone 4: planting out is over (ends 15 June); zone 7: 30 days later
    expect(buildTasks(inputs({ today: day, klimazone: 4 })).some((task) => task.key.startsWith('cal:Auspflanzen'))).toBe(false);
    expect(buildTasks(inputs({ today: day, klimazone: 7 })).some((task) => task.key.startsWith('cal:Auspflanzen'))).toBe(true);
    // Without a zone the baseline is used.
    expect(keys(buildTasks(inputs({ today: day, klimazone: null })))).toEqual(keys(buildTasks(inputs({ today: day, klimazone: 4 }))));
  });

  it('in summer: watering for the planted beds together, weeding bed by bed', () => {
    const tasks = buildTasks(inputs());
    expect(byKey(tasks, 'season:water')).toMatchObject({ title: 'Gießen', where: '2 bepflanzte Beete', urgency: 'medium' });
    expect(byKey(tasks, `season:weed:${BED}`)).toMatchObject({ where: 'Tomatenbeet', repeatDays: 14 });
    expect(byKey(tasks, `season:weed:${BED2}`)).toMatchObject({ where: 'Möhrenbeet' });
  });

  it('what the garden does not have gives no task', () => {
    const tasks = buildTasks(inputs());
    expect(tasks.some((task) => task.key.startsWith('season:mow') || task.key.startsWith('season:compost'))).toBe(false);
    const withLawn = buildTasks(inputs({ elements: [...PLAN, element(uuid(20), { elementType: 'Rasen', label: 'Wiese', widthM: 5, heightM: 4 })] }));
    expect(byKey(withLawn, 'season:mow')).toMatchObject({ title: 'Rasen mähen', where: 'Wiese' });
  });

  it('winter and early spring have their own tasks, and nothing to water or weed', () => {
    const november = buildTasks(inputs({ today: '2026-11-15', elements: [...PLAN, element(uuid(21), { elementType: 'Wasserstelle', label: 'Wasserhahn' })] }));
    expect(byKey(november, 'season:waterOff:2026')).toMatchObject({ title: 'Wasser abstellen und Leitungen entleeren', where: 'Wasserhahn' });
    expect(byKey(november, 'season:leaves:2026')).toBeTruthy();
    expect(november.some((task) => task.key === 'season:water' || task.key.startsWith('season:weed'))).toBe(false);
    const january = buildTasks(inputs({ today: '2027-01-20' }));
    expect(keys(january)).toEqual(expect.arrayContaining(['season:plan:2027', 'season:tools:2026']));
    const march = buildTasks(inputs({ today: '2026-03-20' }));
    expect(byKey(march, `season:prepare:${BED}:2026`)).toMatchObject({ title: 'Beet vorbereiten', where: 'Tomatenbeet' });
  });

  it('an empty plan still gives the tasks of the season, and deleted elements count for nothing', () => {
    expect(buildTasks(inputs({ elements: [], today: '2026-11-15' })).map((task) => task.key)).toEqual(['season:leaves:2026']);
    const gone = PLAN.map((el) => ({ ...el, deletedAt: AT }));
    expect(buildTasks(inputs({ elements: gone })).length).toBe(0);
  });

  it('the same inputs give the same list, in the same order (TASK-09)', () => {
    const a = buildTasks(inputs());
    const b = buildTasks(inputs({ elements: [...PLAN].reverse(), plants: [...PLANTS].reverse() }));
    expect(b).toEqual(a);
    // Most valuable first.
    for (let i = 1; i < a.length; i++) expect(a[i - 1]!.value).toBeGreaterThanOrEqual(a[i]!.value);
  });
});

describe('weather changes urgency, and the reason says so (TASK-07)', () => {
  it('heat makes watering urgent and names the temperature', () => {
    const task = byKey(buildTasks(inputs({ forecast: forecast('2026-07-20', [[16, 32, 0]]) })), 'season:water')!;
    expect(task).toMatchObject({ urgency: 'high', source: 'weather', reason: 'Heute werden 32 °C erwartet. Gieß am besten abends.' });
  });

  it('rain today takes watering off the list', () => {
    const tasks = buildTasks(inputs({ forecast: forecast('2026-07-20', [[14, 21, 9]]) }));
    expect(byKey(tasks, 'season:water')).toBeUndefined();
  });

  it('frost in the growing season: protect the plants, and wait with planting out', () => {
    const tasks = buildTasks(inputs({ today: '2026-05-20', forecast: forecast('2026-05-20', [[4, 14, 0], [-2, 12, 0]]) }));
    const frost = byKey(tasks, 'weather:frost:2026-05-21')!;
    expect(frost).toMatchObject({ urgency: 'high', title: 'Empfindliche Pflanzen vor Frost schützen' });
    expect(frost.reason).toBe('Am 21.5. sind −2 °C angesagt. Vlies oder Eimer über die empfindlichen Pflanzen.');
    expect(tasks[0]!.key).toBe('weather:frost:2026-05-21'); // on top
    const plantOut = byKey(tasks, `cal:Auspflanzen:tomate:${BED}:2026`)!;
    expect(plantOut.urgency).toBe('low');
    expect(plantOut.reason).toContain('Warte damit, bis der Frost vorbei ist.');
  });

  it('frost in winter is no news; frost in autumn makes turning the water off urgent', () => {
    const cold = forecast('2026-11-15', [[-3, 4, 0]]);
    const tasks = buildTasks(inputs({ today: '2026-11-15', forecast: cold, elements: [...PLAN, element(uuid(21), { elementType: 'Wasserstelle', label: 'Wasserhahn' })] }));
    expect(tasks.some((task) => task.key.startsWith('weather:frost'))).toBe(false);
    expect(byKey(tasks, 'season:waterOff:2026')).toMatchObject({ urgency: 'high', source: 'weather' });
    expect(byKey(tasks, 'season:waterOff:2026')!.reason).toContain('−3 °C');
  });

  it('without a forecast, or with one that is too old, the list is the one without weather', () => {
    const none = buildTasks(inputs());
    const old = buildTasks(inputs({ forecast: forecast('2026-07-17', [[16, 35, 0], [16, 35, 0], [16, 35, 0]]) }));
    expect(old).toEqual(none);
    expect(byKey(none, 'season:water')!.reason).toBe('In dieser Jahreszeit brauchen bepflanzte Beete regelmäßig Wasser.');
    expect(usableForecast(forecast('2026-07-19', [[1, 2, 0], [3, 4, 0]]), '2026-07-20').map((d) => d.date)).toEqual(['2026-07-20']);
    expect(forecastLine(null, '2026-07-20')).toBeNull();
    expect(forecastLine(forecast('2026-07-20', [[14, 31, 0]]), '2026-07-20')).toBe('Heute 14 °C bis 31 °C, kaum Regen in Berlin.');
    expect(forecastLine(forecast('2026-07-20', [[14, 21, 8.6]]), '2026-07-20')).toBe('Heute 14 °C bis 21 °C, etwa 9 mm Regen in Berlin.');
  });
});

describe('own tasks and accepted findings (TASK-06, TASK-08)', () => {
  it('an own task appears from the day it is due, urgent when it is late', () => {
    const tasks = (today: string) => buildTasks(inputs({ today, ownTasks: [ownTask(uuid(30))] }));
    expect(byKey(tasks('2026-07-19'), `own:${uuid(30)}`)).toBeUndefined();
    expect(byKey(tasks('2026-07-20'), `own:${uuid(30)}`)).toMatchObject({
      title: 'Regentonne leeren',
      where: 'an der Laube',
      durationMin: 20,
      urgency: 'medium',
      reason: 'Eigene Aufgabe, heute fällig.',
      repeatDays: null,
    });
    expect(byKey(tasks('2026-07-25'), `own:${uuid(30)}`)).toMatchObject({ urgency: 'high', reason: 'Eigene Aufgabe, fällig seit dem 20.7.' });
  });

  it('a repeating own task says how often, a deleted one is gone', () => {
    const tasks = buildTasks(inputs({ ownTasks: [ownTask(uuid(31), { intervalDays: 7, whereText: null }), ownTask(uuid(32), { deletedAt: AT })] }));
    expect(byKey(tasks, `own:${uuid(31)}`)).toMatchObject({ repeatDays: 7, reason: 'Eigene Aufgabe, alle 7 Tage.', where: 'im ganzen Garten' });
    expect(byKey(tasks, `own:${uuid(32)}`)).toBeUndefined();
  });

  it('a finding accepted as a task is on the list with what to do and where', () => {
    const finding = {
      ...base,
      id: uuid(40),
      gardenId: GARDEN,
      checkId: uuid(41),
      kind: 'pest',
      targetElementId: BED,
      title: 'Blattläuse an der Tomate',
      detail: '',
      proposal: { plantName: 'Tomate', action: 'Mit Wasser abspritzen.' },
      confidence: 0.8,
      closeupOf: null,
      status: 'accepted',
      resolvedAt: AT,
      taskRequested: true,
      createdByUserId: USER_A,
    } as PhotoFindingRow;
    const tasks = buildTasks(inputs({ findings: [finding, { ...finding, id: uuid(42), taskRequested: false }, { ...finding, id: uuid(43), status: 'open' }] }));
    expect(tasks.filter((task) => task.source === 'finding')).toHaveLength(1);
    expect(byKey(tasks, `finding:${uuid(40)}`)).toMatchObject({
      title: 'Mit Wasser abspritzen.',
      where: 'Tomatenbeet',
      urgency: 'high',
      reason: 'Beim Foto-Abgleich gefunden: Blattläuse an der Tomate',
    });
  });
});

// ── Ticking off, budget, order ───────────────────────────────────────────────

describe('ticking off (TASK-05)', () => {
  const weekly: Task = { key: 'k', title: 'x', where: 'y', elementId: null, durationMin: 10, urgency: 'low', reason: 'r.', value: 20, source: 'season', repeatDays: 7 };
  const once: Task = { ...weekly, key: 'o', repeatDays: null };

  it('a repeating task comes back when it is due again, a one-off never', () => {
    expect(hideUntilFor(weekly, '2026-07-20')).toBe('2026-07-26');
    expect(hideUntilFor({ repeatDays: 1 }, '2026-07-20')).toBe('2026-07-20');
    expect(hideUntilFor(once, '2026-07-20')).toBeNull();

    const done = [doneRow('k', '2026-07-20', '2026-07-26'), doneRow('o', '2026-07-20', null)];
    expect(splitDone([weekly, once], done, '2026-07-20')).toMatchObject({ open: [], doneToday: [{ task: weekly }, { task: once }] });
    // The next days: not shown at all.
    expect(splitDone([weekly, once], done, '2026-07-23')).toEqual({ open: [], doneToday: [] });
    // A week later the weekly one is back, the one-off is not.
    expect(splitDone([weekly, once], done, '2026-07-27').open).toEqual([weekly]);
  });

  it('a tick that was taken back does not count; a tick for another task neither', () => {
    const done = [doneRow('k', '2026-07-20', '2026-07-26', { deletedAt: AT }), doneRow('other', '2026-07-20', null)];
    expect(splitDone([weekly], done, '2026-07-20').open).toEqual([weekly]);
    expect(activeDone('k', [doneRow('k', '2026-07-25', null)], '2026-07-20')).toBeNull(); // dated in the future
  });
});

describe('"I have N minutes" (TASK-03)', () => {
  const t = (key: string, durationMin: number, value: number): Task => ({
    key, title: key, where: 'w', elementId: null, durationMin, urgency: 'medium', reason: 'r.', value, source: 'season', repeatDays: null,
  });
  const list = [t('a', 20, 90), t('b', 25, 80), t('c', 10, 70), t('d', 5, 60)];

  it('takes the most valuable tasks that fit and sums their time; the rest comes below', () => {
    const plan = planForBudget(list, 30);
    expect(keys(plan.fits)).toEqual(['a', 'c']);
    expect(plan.totalMin).toBe(30);
    expect(keys(plan.rest)).toEqual(['b', 'd']);
  });

  it('without a budget everything is on the list; a budget nothing fits into leaves it empty', () => {
    expect(planForBudget(list, null)).toMatchObject({ totalMin: 60, rest: [] });
    expect(planForBudget(list, null).fits).toHaveLength(4);
    expect(planForBudget([t('x', 45, 90)], 30)).toMatchObject({ fits: [], totalMin: 0 });
  });
});

describe('the AI\'s order (TASK-04, TASK-09)', () => {
  const tasks = buildTasks(inputs());

  it('puts the tasks in the given order with the given reasons; nothing is added or lost', () => {
    const reversed = [...tasks].reverse().map((task) => ({ key: task.key, reason: `Weil: ${task.title}.` }));
    const sorted = applySort(tasks, [{ key: 'made-up', reason: 'x' }, ...reversed.slice(0, 2), reversed[0]!]);
    expect(sorted).toHaveLength(tasks.length);
    expect(sorted[0]!.key).toBe(tasks[tasks.length - 1]!.key);
    expect(sorted[0]!.reason).toBe(`Weil: ${tasks[tasks.length - 1]!.title}.`);
    // Tasks the AI left out follow in their base order, with their own reason.
    expect(keys(sorted.slice(2))).toEqual(keys(tasks.slice(0, tasks.length - 2)));
    expect(sorted[2]!.reason).toBe(tasks[0]!.reason);
    expect(new Set(keys(sorted)).size).toBe(tasks.length);
  });

  it('the fingerprint is the same for the same list and budget, and different otherwise', () => {
    const hash = listHash(tasks, 30);
    expect(listHash(buildTasks(inputs()), 30)).toBe(hash);
    expect(listHash(tasks, 60)).not.toBe(hash);
    expect(listHash(tasks.slice(1), 30)).not.toBe(hash);
    expect(hash.length).toBeLessThanOrEqual(80);
  });

  it('a stored order is used only for its day, budget and list; the newest wins', () => {
    const row = (patch: Partial<TaskSortRow>): TaskSortRow => ({
      ...base, id: uuid(600), gardenId: GARDEN, day: '2026-07-20', budgetMin: 30, inputHash: 'h', items: [], createdByUserId: USER_A, ...patch,
    });
    const rows = [row({}), row({ id: uuid(601), createdAt: '2026-07-20T10:00:00.000Z' }), row({ id: uuid(602), deletedAt: AT, createdAt: '2026-07-20T11:00:00.000Z' })];
    expect(findSort(rows, '2026-07-20', 30, 'h')?.id).toBe(uuid(601));
    expect(findSort(rows, '2026-07-21', 30, 'h')).toBeNull();
    expect(findSort(rows, '2026-07-20', null, 'h')).toBeNull();
    expect(findSort(rows, '2026-07-20', 30, 'other')).toBeNull();
  });
});

// ── Through the repo ─────────────────────────────────────────────────────────

describe('storing: tick-offs, own tasks, orders, forecast', () => {
  const task = buildTasks(inputs()).find((entry) => entry.key === 'season:water')!;

  it('a tick-off is stored for the garden and queued for the partner; undo takes it back', async () => {
    const row = await checkTask(task, '2026-07-20');
    expect(row).toMatchObject({ taskKey: 'season:water', doneOn: '2026-07-20', hideUntil: '2026-07-20', doneByUserId: USER_A });
    let data = await loadTaskData(GARDEN);
    expect(splitDone([task], data.done, '2026-07-20').doneToday).toHaveLength(1);
    expect((await mockStorage.listOutboxEntries()).map((e) => e.entity)).toEqual(['task_done']);

    expect(await uncheckTask(row!)).toBe(true);
    data = await loadTaskData(GARDEN);
    expect(splitDone([task], data.done, '2026-07-20').open).toHaveLength(1);
  });

  it('an own task is checked, saved, changed and deleted', async () => {
    expect(checkOwnTask({ title: '  ', whereText: null, durationMin: 10, intervalDays: null, dueOn: '2026-07-20' })).toBeNull();
    expect(checkOwnTask({ title: 'x', whereText: null, durationMin: 0, intervalDays: null, dueOn: '2026-07-20' })).toBeNull();
    expect(checkOwnTask({ title: 'x', whereText: null, durationMin: 10, intervalDays: 400, dueOn: '2026-07-20' })).toBeNull();
    expect(checkOwnTask({ title: 'x', whereText: null, durationMin: 10, intervalDays: null, dueOn: '31.12.2026' })).toBeNull();
    expect(await saveOwnTask({ title: '', whereText: null, durationMin: 10, intervalDays: null, dueOn: '2026-07-20' })).toBeNull();

    const saved = await saveOwnTask({ title: ' Regentonne leeren ', whereText: ' an der Laube ', durationMin: 20, intervalDays: 14, dueOn: '2026-07-20' });
    expect(saved).toMatchObject({ title: 'Regentonne leeren', whereText: 'an der Laube', intervalDays: 14, gardenId: GARDEN, createdByUserId: USER_A });
    const changed = await saveOwnTask({ id: saved!.id, title: 'Regentonne leeren', whereText: null, durationMin: 30, intervalDays: null, dueOn: '2026-07-22' });
    expect(changed).toMatchObject({ id: saved!.id, durationMin: 30, intervalDays: null, whereText: null, createdAt: saved!.createdAt });
    expect((await loadTaskData(GARDEN)).ownTasks).toHaveLength(1);

    expect(await deleteOwnTask(changed!)).toBe(true);
    expect((await loadTaskData(GARDEN)).ownTasks).toHaveLength(0);
  });

  it('the AI is asked once per day, budget and list; the second time the stored order is used (TASK-09)', async () => {
    const tasks = buildTasks(inputs());
    mockCallAi.mockResolvedValue({
      ok: true,
      text: '',
      data: { items: [{ ref: 'T2', reason: 'Zuerst das.' }, { ref: 'T1', reason: 'Dann das.' }, { ref: 'T99', reason: 'Gibt es nicht.' }] },
      costUsd: 0.01,
      limitUsd: 100,
      spentUsd: 1,
    });

    const first = await sortWithAi(tasks, '2026-07-20', 30, 'Heute 14 °C bis 31 °C, kaum Regen in Berlin.');
    expect(first).toMatchObject({ ok: true, fromCache: false, costUsd: 0.01 });
    const [feature, sent] = mockCallAi.mock.calls[0]! as [string, { tasks: { ref: string; title: string }[]; budgetMin: number; month: number; weather: string }];
    expect(feature).toBe('task_sort');
    expect(sent.tasks.map((entry) => entry.ref)).toEqual(tasks.map((_, i) => `T${i + 1}`));
    expect(JSON.stringify(sent)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/); // no keys with ids
    expect(sent).toMatchObject({ budgetMin: 30, month: 7 });
    expect(first.ok && first.sort.items).toEqual([
      { key: tasks[1]!.key, reason: 'Zuerst das.' },
      { key: tasks[0]!.key, reason: 'Dann das.' },
    ]);

    const second = await sortWithAi(tasks, '2026-07-20', 30, 'Heute 15 °C bis 30 °C, kaum Regen in Berlin.');
    expect(second).toMatchObject({ ok: true, fromCache: true, costUsd: 0 });
    expect(mockCallAi).toHaveBeenCalledTimes(1);
    const data = await loadTaskData(GARDEN);
    expect(storedSort(data.sorts, tasks, '2026-07-20', 30)?.id).toBe(first.ok ? first.sort.id : '');
    // Another budget or another day is another question.
    expect(storedSort(data.sorts, tasks, '2026-07-20', 60)).toBeNull();
    expect(storedSort(data.sorts, tasks, '2026-07-21', 30)).toBeNull();
  });

  it('when the AI does not answer, the base list stays and nothing is stored', async () => {
    const tasks = buildTasks(inputs());
    mockCallAi.mockResolvedValue({ ok: false, code: 'budget_exhausted', retryable: false, limitUsd: 100, spentUsd: 100 });
    expect(await sortWithAi(tasks, '2026-07-20', null, null)).toEqual({ ok: false, code: 'budget_exhausted', retryable: false });
    mockCallAi.mockResolvedValue({ ok: true, text: '', data: { items: [{ ref: 'T77', reason: 'x' }] }, costUsd: 0.01, limitUsd: null, spentUsd: null });
    expect(await sortWithAi(tasks, '2026-07-20', null, null)).toMatchObject({ ok: false, code: 'service_error' });
    expect(await sortWithAi(tasks.slice(0, 1), '2026-07-20', null, null)).toMatchObject({ ok: false, code: 'too_few' });
    expect((await loadTaskData(GARDEN)).sorts).toHaveLength(0);
  });

  it('the forecast is fetched from the weather function and kept for times without a network (TASK-07)', async () => {
    const days = [{ date: '2026-07-20', tMin: 14, tMax: 31, rainMm: 0 }];
    mockInvoke.mockResolvedValue({ data: { ok: true, place: 'Berlin', fetchedAt: '2026-07-20T06:00:00.000Z', days, stale: false }, error: null });
    const fresh = await loadForecast(GARDEN);
    expect(fresh).toEqual({ status: 'fresh', forecast: { fetchedAt: '2026-07-20T06:00:00.000Z', place: 'Berlin', days } });
    expect(mockInvoke).toHaveBeenCalledWith('weather', { body: { gardenId: GARDEN } });
    expect(await cachedForecast(GARDEN)).toEqual(fresh.status === 'fresh' ? fresh.forecast : null);

    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
    expect(await loadForecast(GARDEN)).toMatchObject({ status: 'cached', forecast: { place: 'Berlin' } });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('no postcode, an unknown postcode and a service that is down are told apart', async () => {
    const httpError = (code: string) => ({ data: null, error: { context: { json: () => Promise.resolve({ ok: false, code }) } } });
    mockInvoke.mockResolvedValue(httpError('no_plz'));
    expect(await loadForecast(GARDEN)).toEqual({ status: 'none', reason: 'no_plz' });
    mockInvoke.mockResolvedValue(httpError('plz_unknown'));
    expect(await loadForecast(GARDEN)).toEqual({ status: 'none', reason: 'plz_unknown' });
    mockInvoke.mockResolvedValue(httpError('unavailable'));
    expect(await loadForecast(GARDEN)).toEqual({ status: 'none', reason: 'unavailable' });
    mockInvoke.mockRejectedValue(new Error('network'));
    expect(await loadForecast(GARDEN)).toEqual({ status: 'none', reason: 'unavailable' });
    mockInvoke.mockResolvedValue({ data: { ok: true, fetchedAt: 'x', days: [{ date: 'morgen', tMin: 1, tMax: 2, rainMm: 0 }] }, error: null });
    expect(await loadForecast(GARDEN)).toEqual({ status: 'none', reason: 'unavailable' });
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
    expect(await loadForecast(GARDEN)).toEqual({ status: 'none', reason: 'offline' });
  });

  it('without a sign-in nothing is written', async () => {
    mockAuth = { userId: null, activeGardenId: null, mode: 'local' };
    expect(await checkTask(task, '2026-07-20')).toBeNull();
    expect(await saveOwnTask({ title: 'x', whereText: null, durationMin: 10, intervalDays: null, dueOn: '2026-07-20' })).toBeNull();
    expect(await sortWithAi(buildTasks(inputs()), '2026-07-20', null, null)).toMatchObject({ ok: false, code: 'not_authenticated' });
    expect(await mockStorage.listOutboxEntries()).toHaveLength(0);
  });
});

// ── Two devices ──────────────────────────────────────────────────────────────

describe('the partner sees tick-offs, own tasks and the AI\'s order (TASK-05, TASK-06, TASK-09)', () => {
  it('what one device ticks off is off the list on the other, and comes back when it is undone', async () => {
    const server = new FakeServer();
    const serverMs = Math.floor(server.clock / 1000);
    jest.useFakeTimers({
      now: serverMs + 1000,
      doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'performance', 'hrtime'],
    });
    const later = (seconds: number): void => {
      jest.setSystemTime(serverMs + 1000 + seconds * 1000);
    };
    server.table('gardens').set(GARDEN, {
      id: GARDEN, name: 'Garten', created_at: server.nowIso(), updated_at: server.nowIso(),
      updated_by_user_id: USER_A, deleted_at: null, server_updated_at: server.stamp(),
    });
    server.addMember(GARDEN, USER_A, 'owner');
    server.addMember(GARDEN, USER_B, 'member');
    const worker = (userId: string, storage: IndexedDbAdapter): SyncWorker =>
      new SyncWorker({
        storage,
        supabase: server.client(userId) as never,
        sentry: { addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn() } as never,
        now: () => Math.floor(server.clock / 1000),
      });
    const storageA = mockStorage;
    const storageB = await freshStorage();
    const workerA = worker(USER_A, storageA);
    const workerB = worker(USER_B, storageB);
    const today = todayString(new Date(serverMs));
    const water = buildTasks(inputs({ today: '2026-07-20' })).find((entry) => entry.key === 'season:water')!;

    // A ticks off watering, adds an own task, and the AI sorts.
    const done = await checkTask(water, today);
    const own = await saveOwnTask({ title: 'Zaun streichen', whereText: null, durationMin: 60, intervalDays: null, dueOn: today });
    mockCallAi.mockResolvedValue({ ok: true, text: '', data: { items: [{ ref: 'T1', reason: 'Zuerst.' }] }, costUsd: 0.01, limitUsd: null, spentUsd: null });
    const list = buildTasks(inputs({ today: '2026-07-20' }));
    await sortWithAi(list, today, 30, null);
    await workerA.push();

    later(20);
    mockAuth = { userId: USER_B, activeGardenId: GARDEN, mode: 'account' };
    await workerB.pullAll();
    mockStorage = storageB;
    let dataB = await loadTaskData(GARDEN);
    expect(splitDone([water], dataB.done, today)).toMatchObject({ open: [], doneToday: [{ done: { doneByUserId: USER_A } }] });
    expect(dataB.ownTasks.map((entry) => entry.title)).toEqual(['Zaun streichen']);
    // B gets the stored order without asking the AI again.
    const again = await sortWithAi(list, today, 30, null);
    expect(again).toMatchObject({ ok: true, fromCache: true });
    expect(mockCallAi).toHaveBeenCalledTimes(1);

    // B takes the tick back and deletes the own task; A sees both.
    later(40);
    await uncheckTask(dataB.done.find((row) => row.id === done!.id)!);
    await deleteOwnTask(dataB.ownTasks.find((row) => row.id === own!.id)!);
    await workerB.push();
    later(60);
    mockAuth = { userId: USER_A, activeGardenId: GARDEN, mode: 'account' };
    await workerA.pullAll();
    mockStorage = storageA;
    const dataA = await loadTaskData(GARDEN);
    expect(splitDone([water], dataA.done, today).open).toEqual([water]);
    expect(dataA.ownTasks).toHaveLength(0);
    dataB = dataA;
  });
});
