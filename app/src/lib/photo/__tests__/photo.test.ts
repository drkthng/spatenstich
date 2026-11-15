// Phase 35: photo check. What is sent, what is stored, what accepting changes, and
// that nothing changes without it. Local storage is a real IndexedDbAdapter (on
// fake-indexeddb); the AI and the image downscaler are stand-ins.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import type {
  AiResult,
  GardenDimensionsRow,
  GardenPlantRow,
  PhotoCheckInput,
  PhotoCheckResult,
  PhotoCloseupInput,
  PhotoFindingResult,
  PhotoFindingRow,
  PlanElementRow,
  PlantRow,
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
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: { getState: () => mockAuth },
}));

let mockStorage: IndexedDbAdapter;
jest.mock('../../../storage', () => ({
  get storage() {
    return mockStorage;
  },
}));

const mockCallAi = jest.fn<Promise<AiResult>, [string, unknown]>();
jest.mock('../../ai/aiClient', () => ({
  callAi: (feature: string, input: unknown) => mockCallAi(feature, input),
}));

const mockDownscale = jest.fn(async (file: Blob) => {
  const name = (file as unknown as { name?: string }).name ?? 'photo';
  if (name.startsWith('broken')) throw new Error('not an image');
  return { base64: `/9j/BASE64-OF-${name}`, mediaType: 'image/jpeg', bytes: 1000, width: 100, height: 100 };
});
jest.mock('../../ai/imageResize', () => ({
  downscaleImage: (file: Blob) => mockDownscale(file),
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

import {
  canAccept,
  confidenceBand,
  findingMark,
  findingRowsFromResult,
  isUncertain,
  mergeCloseup,
  planAcceptance,
  type AcceptContext,
  type FindingContext,
} from '../findings';
import {
  doyToMonth,
  findPlantByName,
  gardenPlantFromProposal,
  gardenPlantToPlantRow,
  mergeCatalog,
  monthWindowToDoy,
  slugify,
  uniqueSlug,
} from '../gardenPlants';
import { buildPlanSummary, catalogNames, MAX_PLAN_ELEMENTS } from '../planSummary';
import {
  acceptFinding,
  dismissFinding,
  loadFindings,
  loadGardenPlants,
  runCloseup,
  runPhotoCheck,
  saveGardenPlant,
  updateProposal,
} from '../photoRepo';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const BED = uuid(1);
const TOMATO = uuid(2);
const PATH = uuid(3);
const NOW = '2026-11-15T10:00:00.000Z';

function element(id: string, patch: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
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
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    updatedByUserId: USER_A,
    deletedAt: null,
    ...patch,
  };
}

const PLAN: PlanElementRow[] = [
  element(BED),
  element(TOMATO, {
    elementType: 'Pflanze',
    label: 'Tomate',
    xM: 3.5,
    yM: 4.2,
    widthM: 0.4,
    heightM: 0.4,
    layer: 'seasonal',
    provenance: { plantSlug: 'tomate', parentBedId: BED },
    createdAt: '2026-11-02T09:00:00.000Z',
  }),
  element(PATH, { elementType: 'Weg', label: 'Hauptweg', xM: 5, yM: 10, widthM: 0.6, heightM: 8, createdAt: '2026-11-03T09:00:00.000Z' }),
];

const DIMS: GardenDimensionsRow = {
  id: uuid(90),
  gardenId: GARDEN,
  shape: 'rectangle',
  widthM: 10,
  heightM: 20,
  extraDims: null,
  createdAt: NOW,
  updatedAt: NOW,
  updatedByUserId: USER_A,
  deletedAt: null,
};

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
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

const CATALOG: PlantRow[] = [plant('tomate', 'Tomate', { nameAltDe: ['Paradeiser'] }), plant('moehre', 'Möhre')];

function result(patch: Partial<PhotoFindingResult> = {}): PhotoFindingResult {
  return {
    kind: 'rename',
    ref: 'E1',
    title: 'Im Tomatenbeet wachsen Kartoffeln',
    detail: 'Auf dem zweiten Foto ist Kartoffellaub zu sehen.',
    confidence: 0.85,
    closeupOf: null,
    label: 'Kartoffelbeet',
    elementType: null,
    xM: null,
    yM: null,
    widthM: null,
    heightM: null,
    plantName: null,
    catalog: null,
    action: null,
    ...patch,
  };
}

const YACON = {
  nameDe: 'Yacon',
  nameBotanical: 'Smallanthus sonchifolius',
  family: 'Korbblütler',
  category: 'Gemüse' as const,
  sowStartMonth: null,
  sowEndMonth: null,
  plantStartMonth: 5,
  plantEndMonth: 6,
  harvestStartMonth: 10,
  harvestEndMonth: 11,
  spacingCm: 80,
};

let idCounter = 100;
const newId = (): string => uuid(idCounter++);

function findingCtx(elements: PlanElementRow[] = PLAN): FindingContext {
  return {
    gardenId: GARDEN,
    userId: USER_A,
    checkId: uuid(50),
    now: NOW,
    refToId: buildPlanSummary(elements).refToId,
    newId,
  };
}

function acceptCtx(patch: Partial<AcceptContext> = {}): AcceptContext {
  return { elements: PLAN, dims: DIMS, plants: CATALOG, userId: USER_A, now: NOW, newId, ...patch };
}

function finding(patch: Partial<PhotoFindingResult> = {}, elements: PlanElementRow[] = PLAN): PhotoFindingRow {
  return findingRowsFromResult({ findings: [result(patch)], summary: '' }, findingCtx(elements))[0]!;
}

const ok = (data: PhotoCheckResult): AiResult => ({ ok: true, text: '', data, costUsd: 0.12, limitUsd: 100, spentUsd: 3 });
const photo = (name: string): Blob => ({ name }) as unknown as Blob;

async function freshStorage(): Promise<IndexedDbAdapter> {
  const adapter = new IndexedDbAdapter(`photo-${Date.now()}-${idCounter++}`);
  await runMigrations(adapter);
  return adapter;
}

async function seed(adapter: IndexedDbAdapter, elements: PlanElementRow[] = PLAN, dims: GardenDimensionsRow | null = DIMS) {
  await adapter.upsertRowsFromServer('plan_elements', elements);
  if (dims) await adapter.upsertRowsFromServer('garden_dimensions', [dims]);
}

afterEach(() => {
  jest.useRealTimers();
});

beforeEach(async () => {
  mockAuth = { userId: USER_A, activeGardenId: GARDEN, mode: 'account' };
  mockCallAi.mockReset();
  mockDownscale.mockClear();
  mockStorage = await freshStorage();
});

// ── The plan as the check sees it ────────────────────────────────────────────

describe('plan summary', () => {
  it('gives every element a short reference and never sends a real id', () => {
    const summary = buildPlanSummary(PLAN);
    expect(summary.elements.map((e) => e.ref)).toEqual(['E1', 'E2', 'E3']);
    // Fixed things first, plants after.
    expect(summary.elements.map((e) => e.type)).toEqual(['Beet', 'Weg', 'Pflanze']);
    expect(summary.refToId.get('E1')).toBe(BED);
    expect(JSON.stringify(summary.elements)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it('names the bed a plant stands in by its reference', () => {
    const summary = buildPlanSummary(PLAN);
    const tomato = summary.elements.find((e) => e.label === 'Tomate')!;
    expect(tomato.bedRef).toBe(summary.idToRef.get(BED));
  });

  it('leaves out deleted elements and carries the rotation', () => {
    const summary = buildPlanSummary([
      element(BED, { provenance: { rotateDeg: 30 } }),
      element(PATH, { deletedAt: NOW }),
    ]);
    expect(summary.elements).toHaveLength(1);
    expect(summary.elements[0]!.rotationDeg).toBe(30);
  });

  it('cuts a very large plan to what the check accepts, plants last', () => {
    const many = Array.from({ length: MAX_PLAN_ELEMENTS + 20 }, (_, i) =>
      element(uuid(1000 + i), { elementType: i < 5 ? 'Beet' : 'Pflanze', createdAt: `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}.000Z` }),
    );
    const summary = buildPlanSummary(many);
    expect(summary.elements).toHaveLength(MAX_PLAN_ELEMENTS);
    expect(summary.elements.slice(0, 5).every((e) => e.type === 'Beet')).toBe(true);
  });

  it('lists the catalog names once each', () => {
    expect(catalogNames([...CATALOG, plant('tomate-2', 'Tomate')])).toEqual(['Möhre', 'Tomate']);
  });
});

// ── Garden-own catalog entries ───────────────────────────────────────────────

describe('catalog entries of a garden (PHOTO-05)', () => {
  it('turns month windows into days of the year and back', () => {
    expect(monthWindowToDoy(5, 6)).toEqual({ start: 121, end: 181 });
    expect(monthWindowToDoy(1, 12)).toEqual({ start: 1, end: 365 });
    expect(monthWindowToDoy(5, null)).toEqual({ start: null, end: null });
    expect(monthWindowToDoy(0, 13)).toEqual({ start: null, end: null });
    expect(doyToMonth(121)).toBe(5);
    expect(doyToMonth(181)).toBe(6);
    expect(doyToMonth(365)).toBe(12);
    expect(doyToMonth(null)).toBeNull();
  });

  it('makes slugs the database accepts, and a free one when the name is taken', () => {
    expect(slugify('Süßkartoffel „Beauregard"')).toBe('suesskartoffel-beauregard');
    expect(slugify('   ')).toBe('pflanze');
    expect(slugify('Yacón')).toBe('yacon');
    expect(uniqueSlug('Tomate', ['tomate', 'tomate-2'])).toBe('tomate-3');
    expect(uniqueSlug('Yacon', ['tomate'])).toBe('yacon');
    expect(slugify('x'.repeat(200))).toMatch(/^[a-z0-9][a-z0-9-]{0,79}$/);
  });

  it('builds an entry from a proposal: names, family, windows, spacing', () => {
    const row = gardenPlantFromProposal(YACON, { id: uuid(7), gardenId: GARDEN, userId: USER_A, now: NOW, takenSlugs: ['tomate'] });
    expect(row).toMatchObject({
      slug: 'yacon',
      nameDe: 'Yacon',
      nameBotanical: 'Smallanthus sonchifolius',
      family: 'Korbblütler',
      minSpacingCm: 80,
      sowOutdoorDoyStart: null,
      plantDoyStart: 121,
      plantDoyEnd: 181,
      harvestDoyStart: 274,
      harvestDoyEnd: 334,
      source: 'photo',
      gardenId: GARDEN,
    });
  });

  it('shows up in the catalog next to the shared entries, in the shape palette and calendar use', () => {
    const own = gardenPlantFromProposal(YACON, { id: uuid(7), gardenId: GARDEN, userId: USER_A, now: NOW, takenSlugs: [] });
    const merged = mergeCatalog(CATALOG, [own]);
    expect(merged.map((p) => p.nameDe)).toEqual(['Möhre', 'Tomate', 'Yacon']);
    const asPlant = gardenPlantToPlantRow(own);
    expect(asPlant.slug).toBe('yacon');
    expect(asPlant.plantDoyStart).toBe(121);
    expect(asPlant.minSpacingCm).toBe(80);
  });

  it('a deleted own entry is gone, and an own entry never hides a shared one', () => {
    const own = gardenPlantFromProposal(YACON, { id: uuid(7), gardenId: GARDEN, userId: USER_A, now: NOW, takenSlugs: [] });
    expect(mergeCatalog(CATALOG, [{ ...own, deletedAt: NOW }])).toBe(CATALOG);
    const clash = { ...own, slug: 'tomate', nameDe: 'Tomate (eigene)' };
    expect(mergeCatalog(CATALOG, [clash]).filter((p) => p.slug === 'tomate')).toHaveLength(1);
    expect(mergeCatalog(CATALOG, [])).toBe(CATALOG);
  });

  it('finds a plant by its name or an alternative name, whatever the case', () => {
    expect(findPlantByName(CATALOG, 'tomate')?.slug).toBe('tomate');
    expect(findPlantByName(CATALOG, ' Paradeiser ')?.slug).toBe('tomate');
    expect(findPlantByName(CATALOG, 'Yacon')).toBeNull();
    expect(findPlantByName(CATALOG, '')).toBeNull();
  });
});

// ── Findings ─────────────────────────────────────────────────────────────────

describe('findings from a check', () => {
  it('stores a finding as an open proposal that points at the real element (PHOTO-03, PHOTO-08)', () => {
    const row = finding();
    expect(row).toMatchObject({
      kind: 'rename',
      targetElementId: BED,
      status: 'open',
      proposal: { label: 'Kartoffelbeet' },
      confidence: 0.85,
      gardenId: GARDEN,
      createdByUserId: USER_A,
      taskRequested: false,
    });
  });

  it('drops a change to an element the plan does not have', () => {
    const rows = findingRowsFromResult(
      { findings: [result({ ref: 'E99' }), result({ kind: 'remove', ref: null, label: null })], summary: '' },
      findingCtx(),
    );
    expect(rows).toHaveLength(0);
  });

  it('keeps only the values its kind needs', () => {
    expect(finding({ kind: 'resize', label: 'x', widthM: 3, heightM: 1.5, xM: 9 }).proposal).toEqual({ widthM: 3, heightM: 1.5 });
    expect(finding({ kind: 'move', label: 'x', xM: 4, yM: 6 }).proposal).toEqual({ xM: 4, yM: 6 });
    expect(finding({ kind: 'remove', label: 'x' }).proposal).toEqual({});
    expect(finding({ kind: 'pest', ref: 'E3', label: null, plantName: 'Tomate', action: 'Absammeln.' }).proposal).toEqual({
      plantName: 'Tomate',
      action: 'Absammeln.',
    });
  });

  it('marks low confidence and close-up requests as uncertain (PHOTO-11)', () => {
    expect(isUncertain(finding({ confidence: 0.9 }))).toBe(false);
    expect(isUncertain(finding({ confidence: 0.59 }))).toBe(true);
    expect(isUncertain(finding({ confidence: 0.9, closeupOf: 'die Blattunterseite' }))).toBe(true);
    expect(isUncertain(finding({ kind: 'unclear', ref: null, label: null, closeupOf: 'das Schild am Beet', confidence: 0.9 }))).toBe(true);
    expect([confidenceBand(0.9), confidenceBand(0.7), confidenceBand(0.3)]).toEqual(['high', 'medium', 'low']);
  });

  it('an unclear finding cannot be accepted, only followed up or dismissed (PHOTO-06)', () => {
    const unclear = finding({ kind: 'unclear', ref: null, label: null, closeupOf: 'das Schild am Beet' });
    expect(canAccept(unclear)).toBe(false);
    expect(planAcceptance(unclear, acceptCtx())).toEqual({ ok: false, problem: 'needs_closeup' });
    expect(canAccept(finding())).toBe(true);
  });
});

describe('where a finding points on the plan (PHOTO-08)', () => {
  it('an element, with the proposed size or place when there is one', () => {
    expect(findingMark(finding(), PLAN)).toEqual({ type: 'element', elementId: BED, proposed: null });
    expect(findingMark(finding({ kind: 'resize', label: null, widthM: 3, heightM: 2 }), PLAN)).toEqual({
      type: 'element',
      elementId: BED,
      proposed: { xM: 3, yM: 4, widthM: 3, heightM: 2 },
    });
    expect(findingMark(finding({ kind: 'move', label: null, xM: 6, yM: 7 }), PLAN)).toMatchObject({
      proposed: { xM: 6, yM: 7, widthM: 2, heightM: 1 },
    });
  });

  it('a box for something new, a spot for a new plant, the bed when only the bed is known', () => {
    expect(
      findingMark(finding({ kind: 'add_element', ref: null, label: 'Kompost', elementType: 'Kompost', xM: 8, yM: 2, widthM: 1, heightM: 1 }), PLAN),
    ).toEqual({ type: 'box', xM: 8, yM: 2, widthM: 1, heightM: 1 });
    expect(findingMark(finding({ kind: 'add_plant', ref: 'E1', label: null, plantName: 'Zucchini', xM: 3.2, yM: 4.1 }), PLAN)).toEqual({
      type: 'spot',
      xM: 3.2,
      yM: 4.1,
    });
    expect(findingMark(finding({ kind: 'add_plant', ref: 'E1', label: null, plantName: 'Zucchini' }), PLAN)).toMatchObject({
      type: 'element',
      elementId: BED,
    });
    expect(findingMark(finding({ kind: 'catalog_plant', ref: null, label: null, catalog: YACON }), PLAN)).toEqual({ type: 'none' });
  });
});

// ── Accepting ────────────────────────────────────────────────────────────────

describe('what accepting a finding changes', () => {
  it('rename: the element gets the new name, nothing else', () => {
    const plan = planAcceptance(finding(), acceptCtx());
    expect(plan.ok && plan.elements).toEqual([expect.objectContaining({ id: BED, label: 'Kartoffelbeet', xM: 3, widthM: 2 })]);
  });

  it('resize: the bed changes size and its plants keep their place in it', () => {
    const plan = planAcceptance(finding({ kind: 'resize', label: null, widthM: 4, heightM: 1 }), acceptCtx());
    if (!plan.ok) throw new Error('refused');
    const bed = plan.elements.find((e) => e.id === BED)!;
    const tomato = plan.elements.find((e) => e.id === TOMATO)!;
    expect([bed.widthM, bed.heightM]).toEqual([4, 1]);
    // 0.5 m right of the centre in a 2 m bed is 1 m right of it in a 4 m bed.
    expect(tomato.xM).toBeCloseTo(4, 5);
    expect(plan.elements.every((e) => e.updatedByUserId === USER_A && e.updatedAt === NOW)).toBe(true);
  });

  it('move: the element goes to the new place, kept inside the parcel', () => {
    const inside = planAcceptance(finding({ kind: 'move', label: null, xM: 6, yM: 7 }), acceptCtx());
    expect(inside.ok && inside.elements.find((e) => e.id === BED)).toMatchObject({ xM: 6, yM: 7 });
    const outside = planAcceptance(finding({ kind: 'move', label: null, xM: 40, yM: -3 }), acceptCtx());
    expect(outside.ok && outside.elements.find((e) => e.id === BED)).toMatchObject({ xM: 9, yM: 0.5 });
  });

  it('remove: the element is deleted', () => {
    const plan = planAcceptance(finding({ kind: 'remove', ref: 'E2', label: null }), acceptCtx());
    expect(plan.ok && plan.elements).toEqual([expect.objectContaining({ id: PATH, deletedAt: NOW })]);
  });

  it('add_element: a new element of the proposed kind, size and place (PHOTO-04)', () => {
    const plan = planAcceptance(
      finding({ kind: 'add_element', ref: null, label: 'Komposter', elementType: 'Kompost', xM: 8, yM: 2, widthM: 1.2, heightM: 1 }),
      acceptCtx(),
    );
    expect(plan.ok && plan.elements).toEqual([
      expect.objectContaining({ elementType: 'Kompost', label: 'Komposter', xM: 8, yM: 2, widthM: 1.2, heightM: 1, layer: 'infrastructure', deletedAt: null }),
    ]);
  });

  it('add_element without a place finds a free one; an unknown kind is refused', () => {
    const plan = planAcceptance(
      finding({ kind: 'add_element', ref: null, label: 'Beet 2', elementType: 'Beet', widthM: 2, heightM: 1 }),
      acceptCtx(),
    );
    if (!plan.ok) throw new Error('refused');
    const added = plan.elements[0]!;
    expect(added.xM).toBeGreaterThan(0);
    expect(added.xM + added.widthM / 2).toBeLessThanOrEqual(DIMS.widthM);
    const row = finding({ kind: 'add_element', ref: null, label: 'Teich', elementType: 'Beet', widthM: 2, heightM: 1 });
    expect(planAcceptance({ ...row, proposal: { ...row.proposal, elementType: 'Teich' } }, acceptCtx())).toEqual({
      ok: false,
      problem: 'incomplete',
    });
  });

  it('add_plant: a plant of the catalog, in the bed it lies in (PHOTO-04)', () => {
    const plan = planAcceptance(finding({ kind: 'add_plant', ref: 'E1', label: null, plantName: 'möhre' }), acceptCtx());
    if (!plan.ok) throw new Error('refused');
    expect(plan.elements).toHaveLength(1);
    expect(plan.elements[0]).toMatchObject({
      elementType: 'Pflanze',
      label: 'Möhre',
      xM: 3,
      yM: 4,
      layer: 'seasonal',
      provenance: expect.objectContaining({ plantSlug: 'moehre', parentBedId: BED, source: 'photo' }),
    });
  });

  it('add_plant with a plant the catalog does not know keeps the name and has no catalog link', () => {
    const plan = planAcceptance(finding({ kind: 'add_plant', ref: null, label: null, plantName: 'Yacon', xM: 8, yM: 15 }), acceptCtx());
    if (!plan.ok) throw new Error('refused');
    expect(plan.elements[0]!.label).toBe('Yacon');
    expect((plan.elements[0]!.provenance as Record<string, unknown>).plantSlug).toBeUndefined();
    expect((plan.elements[0]!.provenance as Record<string, unknown>).parentBedId).toBeUndefined();
  });

  it('catalog_plant: a new entry for the garden; plants of that name on the plan get linked (PHOTO-05)', () => {
    const yaconOnPlan = element(uuid(9), { elementType: 'Pflanze', label: 'yacon', layer: 'seasonal', provenance: { source: 'photo' } });
    const plan = planAcceptance(
      finding({ kind: 'catalog_plant', ref: null, label: null, catalog: YACON }),
      acceptCtx({ elements: [...PLAN, yaconOnPlan] }),
    );
    if (!plan.ok) throw new Error('refused');
    expect(plan.gardenPlant).toMatchObject({ slug: 'yacon', nameDe: 'Yacon', plantDoyStart: 121 });
    expect(plan.elements).toEqual([
      expect.objectContaining({ id: uuid(9), provenance: expect.objectContaining({ plantSlug: 'yacon' }) }),
    ]);
  });

  it('catalog_plant is refused when the catalog has the plant by now', () => {
    const row = finding({ kind: 'catalog_plant', ref: null, label: null, catalog: { ...YACON, nameDe: 'Tomate' } });
    expect(planAcceptance(row, acceptCtx())).toEqual({ ok: false, problem: 'already_in_catalog' });
  });

  it('pests, diseases and stage change nothing in the plan and ask for a task (PHOTO-09)', () => {
    for (const kind of ['pest', 'disease', 'stage'] as const) {
      const plan = planAcceptance(finding({ kind, ref: 'E3', label: null, plantName: 'Tomate', action: 'Befallene Blätter entfernen.' }), acceptCtx());
      expect(plan).toEqual({ ok: true, elements: [], gardenPlant: null, task: true });
    }
  });

  it('refuses when the element is gone, the finding is not open, or a value is missing', () => {
    const row = finding();
    expect(planAcceptance(row, acceptCtx({ elements: [element(BED, { deletedAt: NOW })] }))).toEqual({ ok: false, problem: 'target_missing' });
    expect(planAcceptance({ ...row, status: 'dismissed' }, acceptCtx())).toEqual({ ok: false, problem: 'not_open' });
    expect(planAcceptance({ ...row, proposal: { label: '  ' } }, acceptCtx())).toEqual({ ok: false, problem: 'incomplete' });
    const resize = finding({ kind: 'resize', label: null, widthM: 3, heightM: 2 });
    expect(planAcceptance({ ...resize, proposal: { widthM: 3, heightM: 0 } }, acceptCtx())).toEqual({ ok: false, problem: 'incomplete' });
  });
});

describe('a close-up replaces the finding that asked for it (PHOTO-06)', () => {
  it('keeps the id and the element, takes the new content, adds what else came back', () => {
    const original = finding({ kind: 'unclear', ref: 'E3', label: null, closeupOf: 'die Blattunterseite', confidence: 0.3 });
    const merged = mergeCloseup(
      original,
      {
        findings: [
          result({ kind: 'disease', ref: null, label: null, title: 'Kraut- und Braunfäule an der Tomate', plantName: 'Tomate', action: 'Befallene Blätter entfernen.', confidence: 0.9 }),
          result({ kind: 'catalog_plant', ref: null, label: null, catalog: YACON }),
        ],
        summary: '',
      },
      { ...findingCtx(), now: '2026-11-15T11:00:00.000Z' },
    );
    expect(merged.replaced).toMatchObject({
      id: original.id,
      checkId: original.checkId,
      kind: 'disease',
      targetElementId: TOMATO,
      closeupOf: null,
      confidence: 0.9,
      status: 'open',
      createdAt: original.createdAt,
      updatedAt: '2026-11-15T11:00:00.000Z',
    });
    expect(merged.added).toHaveLength(1);
    expect(merged.added[0]).toMatchObject({ kind: 'catalog_plant', checkId: original.checkId });
    expect(mergeCloseup(original, { findings: [], summary: '' }, findingCtx())).toEqual({ replaced: null, added: [] });
  });
});

// ── Through the repo, with local storage ─────────────────────────────────────

const planRows = () => mockStorage.getRowsByGarden<PlanElementRow>('plan_elements', GARDEN, { includeDeleted: true });
const stored = (id: string) => mockStorage.getRow<PhotoFindingRow>('photo_findings', id);

describe('running a check', () => {
  it('sends the downscaled photos with the plan and stores the findings; the plan is untouched (PHOTO-02, PHOTO-07)', async () => {
    await seed(mockStorage);
    mockCallAi.mockResolvedValue(ok({ findings: [result(), result({ kind: 'remove', ref: 'E2', label: null, title: 'Der Hauptweg fehlt' })], summary: 'Zwei Abweichungen.' }));
    const before = JSON.stringify(await planRows());

    const outcome = await runPhotoCheck([photo('a'), photo('b')], CATALOG);

    expect(outcome).toMatchObject({ ok: true, summary: 'Zwei Abweichungen.', costUsd: 0.12 });
    const [feature, input] = mockCallAi.mock.calls[0]! as [string, PhotoCheckInput];
    expect(feature).toBe('photo_check');
    expect(input.photos).toEqual(['/9j/BASE64-OF-a', '/9j/BASE64-OF-b']);
    expect(input.garden).toEqual({ widthM: 10, heightM: 20 });
    expect(input.elements.map((e) => e.ref)).toEqual(['E1', 'E2', 'E3']);
    expect(input.catalog).toEqual(['Möhre', 'Tomate']);
    expect(JSON.stringify(input.elements)).not.toContain(BED);

    const open = await loadFindings(GARDEN);
    expect(open.map((f) => f.kind).sort()).toEqual(['remove', 'rename']);
    expect(open.find((f) => f.kind === 'remove')!.targetElementId).toBe(PATH);
    expect(JSON.stringify(await planRows())).toBe(before);
  });

  it('keeps no photo: not in the findings, not in the outbox, not in any other store (PHOTO-10)', async () => {
    await seed(mockStorage);
    mockCallAi.mockResolvedValue(ok({ findings: [result()], summary: '' }));
    await runPhotoCheck([photo('a')], CATALOG);
    const everything = JSON.stringify([
      await mockStorage.getRowsByGarden('photo_findings', GARDEN, { includeDeleted: true }),
      await mockStorage.listOutboxEntries(),
      await planRows(),
      await mockStorage.list(),
    ]);
    expect(everything).not.toContain('/9j/');
    expect(everything).not.toContain('BASE64');
  });

  it('queues the findings for the partner (PHOTO-10)', async () => {
    await seed(mockStorage);
    mockCallAi.mockResolvedValue(ok({ findings: [result()], summary: '' }));
    await runPhotoCheck([photo('a')], CATALOG);
    const outbox = await mockStorage.listOutboxEntries();
    expect(outbox.map((e) => e.entity)).toEqual(['photo_findings']);
    expect(outbox[0]!.operation).toBe('insert');
  });

  it('a check that finds nothing stores nothing and says so', async () => {
    await seed(mockStorage);
    mockCallAi.mockResolvedValue(ok({ findings: [], summary: 'Alles stimmt mit dem Plan überein.' }));
    const outcome = await runPhotoCheck([photo('a')], CATALOG);
    expect(outcome).toMatchObject({ ok: true, findings: [], summary: 'Alles stimmt mit dem Plan überein.' });
    expect(await loadFindings(GARDEN)).toEqual([]);
  });

  it('stops before sending: no photos, too many, an unreadable file, no garden, not signed in', async () => {
    await seed(mockStorage);
    expect(await runPhotoCheck([], CATALOG)).toMatchObject({ ok: false, code: 'no_photos' });
    expect(await runPhotoCheck(Array(7).fill(photo('a')), CATALOG)).toMatchObject({ ok: false, code: 'too_many_photos' });
    expect(await runPhotoCheck([photo('a'), photo('broken')], CATALOG)).toMatchObject({ ok: false, code: 'photo_unreadable' });
    mockAuth = { userId: null, activeGardenId: null, mode: 'local' };
    expect(await runPhotoCheck([photo('a')], CATALOG)).toMatchObject({ ok: false, code: 'not_authenticated' });
    mockAuth = { userId: USER_A, activeGardenId: GARDEN, mode: 'account' };
    mockStorage = await freshStorage(); // a garden without a size
    expect(await runPhotoCheck([photo('a')], CATALOG)).toMatchObject({ ok: false, code: 'no_garden' });
    expect(mockCallAi).not.toHaveBeenCalled();
  });

  it('passes on why the AI did not answer, and whether trying again can help', async () => {
    await seed(mockStorage);
    mockCallAi.mockResolvedValue({ ok: false, code: 'budget_exhausted', retryable: false, limitUsd: 100, spentUsd: 100 });
    expect(await runPhotoCheck([photo('a')], CATALOG)).toEqual({ ok: false, code: 'budget_exhausted', retryable: false });
    mockCallAi.mockResolvedValue({ ok: false, code: 'overloaded', retryable: true, limitUsd: null, spentUsd: null });
    expect(await runPhotoCheck([photo('a')], CATALOG)).toEqual({ ok: false, code: 'overloaded', retryable: true });
    mockCallAi.mockResolvedValue({ ok: true, text: 'kein JSON', costUsd: 0.1, limitUsd: null, spentUsd: null });
    expect(await runPhotoCheck([photo('a')], CATALOG)).toMatchObject({ ok: false, code: 'service_error' });
    expect(await loadFindings(GARDEN)).toEqual([]);
  });
});

describe('accepting, editing and dismissing', () => {
  async function check(findings: PhotoFindingResult[]): Promise<PhotoFindingRow[]> {
    await seed(mockStorage);
    mockCallAi.mockResolvedValue(ok({ findings, summary: '' }));
    const outcome = await runPhotoCheck([photo('a')], CATALOG);
    if (!outcome.ok) throw new Error(outcome.code);
    return outcome.findings;
  }

  it('accepting writes the change to the plan and closes the finding (PHOTO-07)', async () => {
    const [row] = await check([result()]);
    const outcome = await acceptFinding(row!, CATALOG);
    expect(outcome).toMatchObject({ ok: true, changedElements: 1 });
    expect((await mockStorage.getRow<PlanElementRow>('plan_elements', BED))!.label).toBe('Kartoffelbeet');
    expect(await stored(row!.id)).toMatchObject({ status: 'accepted', taskRequested: false });
    expect(await loadFindings(GARDEN)).toEqual([]);
    const entities = (await mockStorage.listOutboxEntries()).map((e) => e.entity).sort();
    expect(entities).toEqual(['photo_findings', 'plan_elements']);
  });

  it('dismissing closes the finding and leaves the plan alone', async () => {
    const [row] = await check([result()]);
    const before = JSON.stringify(await planRows());
    expect(await dismissFinding(row!)).toBe(true);
    expect(await stored(row!.id)).toMatchObject({ status: 'dismissed' });
    expect(JSON.stringify(await planRows())).toBe(before);
  });

  it('an edited proposal is what gets accepted (PHOTO-07)', async () => {
    const [row] = await check([result({ kind: 'resize', label: null, widthM: 4, heightM: 1 })]);
    const edited = await updateProposal(row!, { widthM: 3 });
    expect(edited!.proposal).toEqual({ widthM: 3, heightM: 1 });
    expect(edited!.status).toBe('open');
    // Accepting with the stale row from the screen still uses the stored edit.
    await acceptFinding(row!, CATALOG);
    expect((await mockStorage.getRow<PlanElementRow>('plan_elements', BED))!.widthM).toBe(3);
  });

  it('a finding cannot be accepted twice', async () => {
    const [row] = await check([result({ kind: 'add_element', ref: null, label: 'Kompost', elementType: 'Kompost', xM: 8, yM: 2, widthM: 1, heightM: 1 })]);
    expect((await acceptFinding(row!, CATALOG)).ok).toBe(true);
    expect(await acceptFinding(row!, CATALOG)).toEqual({ ok: false, problem: 'not_open' });
    expect((await planRows()).filter((e) => e.elementType === 'Kompost')).toHaveLength(1);
  });

  it('accepting a catalog proposal adds the plant to the garden catalog; it can be edited afterwards (PHOTO-05)', async () => {
    const [row] = await check([result({ kind: 'catalog_plant', ref: null, label: null, catalog: YACON })]);
    const outcome = await acceptFinding(row!, CATALOG);
    expect(outcome.ok && outcome.gardenPlant).toMatchObject({ slug: 'yacon' });
    const own = await loadGardenPlants(GARDEN);
    expect(own).toHaveLength(1);
    expect(mergeCatalog(CATALOG, own).map((p) => p.nameDe)).toContain('Yacon');

    const saved = await saveGardenPlant({ ...own[0]!, minSpacingCm: 100, notesDe: 'Knollen frostfrei lagern.' });
    expect(saved!.minSpacingCm).toBe(100);
    expect((await loadGardenPlants(GARDEN))[0]).toMatchObject({ minSpacingCm: 100, notesDe: 'Knollen frostfrei lagern.' });
  });

  it('accepting a pest finding notes a task and changes no plan element (PHOTO-09)', async () => {
    const [row] = await check([result({ kind: 'pest', ref: 'E3', label: null, title: 'Blattläuse an der Tomate', plantName: 'Tomate', action: 'Mit Wasser abspritzen.' })]);
    const before = JSON.stringify(await planRows());
    expect(await acceptFinding(row!, CATALOG)).toMatchObject({ ok: true, changedElements: 0, task: true });
    expect(await stored(row!.id)).toMatchObject({ status: 'accepted', taskRequested: true });
    expect(JSON.stringify(await planRows())).toBe(before);
  });

  it('a close-up sends the earlier finding along and replaces it with the answer (PHOTO-06)', async () => {
    const [row] = await check([result({ kind: 'unclear', ref: 'E3', label: null, title: 'Flecken auf den Tomatenblättern', closeupOf: 'die Blattunterseite', confidence: 0.3 })]);
    mockCallAi.mockResolvedValue(
      ok({ findings: [result({ kind: 'disease', ref: 'E3', label: null, title: 'Kraut- und Braunfäule', plantName: 'Tomate', action: 'Befallene Blätter entfernen.', confidence: 0.9 })], summary: '' }),
    );

    const outcome = await runCloseup(row!, [photo('nah')], CATALOG);

    expect(outcome.ok).toBe(true);
    const [feature, input] = mockCallAi.mock.calls[1]! as [string, PhotoCloseupInput];
    expect(feature).toBe('photo_closeup');
    expect(input.photos).toEqual(['/9j/BASE64-OF-nah']);
    expect(input.finding).toMatchObject({ kind: 'unclear', closeupOf: 'die Blattunterseite', ref: 'E3' });
    const open = await loadFindings(GARDEN);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ id: row!.id, kind: 'disease', title: 'Kraut- und Braunfäule', closeupOf: null });
  });

  it('a close-up that fails leaves the finding as it was', async () => {
    const [row] = await check([result({ kind: 'unclear', ref: null, label: null, closeupOf: 'das Schild', confidence: 0.2 })]);
    mockCallAi.mockResolvedValue({ ok: false, code: 'unavailable', retryable: true, limitUsd: null, spentUsd: null });
    expect(await runCloseup(row!, [photo('nah')], CATALOG)).toEqual({ ok: false, code: 'unavailable', retryable: true });
    expect(await runCloseup(row!, Array(4).fill(photo('nah')), CATALOG)).toMatchObject({ ok: false, code: 'too_many_photos' });
    expect(await stored(row!.id)).toMatchObject({ kind: 'unclear', closeupOf: 'das Schild', status: 'open' });
  });
});

// ── Two devices ──────────────────────────────────────────────────────────────

describe('the partner sees findings and catalog entries (PHOTO-05, PHOTO-10)', () => {
  function device(server: FakeServer, userId: string, storage: IndexedDbAdapter): SyncWorker {
    return new SyncWorker({
      storage,
      supabase: server.client(userId) as any,
      sentry: { addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn() } as any,
      now: () => Math.floor(server.clock / 1000),
    });
  }

  it('open findings, an accepted catalog entry and the plan change arrive on the other device', async () => {
    const server = new FakeServer();
    // The devices' clocks follow the server's, a little ahead and moving on between
    // steps. (With the real clock every edit would lie a year after the fake server's
    // time, and the server corrects edit times from the future.) Timers stay real:
    // the storage needs them.
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

    const storageA = mockStorage;
    const storageB = await freshStorage();
    const workerA = device(server, USER_A, storageA);
    const workerB = device(server, USER_B, storageB);

    // Device A: plan on the server, then a check with two findings.
    const at = server.nowIso();
    const plan = PLAN.map((e) => ({ ...e, createdAt: at, updatedAt: at }));
    for (const el of plan) {
      await storageA.writeWithOutbox('plan_elements', el, { entity: 'plan_elements', rowId: el.id, operation: 'insert', payload: el as unknown as Record<string, unknown> });
    }
    await storageA.upsertRowsFromServer('garden_dimensions', [DIMS]);
    await workerA.push();
    mockCallAi.mockResolvedValue(ok({ findings: [result(), result({ kind: 'catalog_plant', ref: null, label: null, catalog: YACON })], summary: '' }));
    const outcome = await runPhotoCheck([photo('a')], CATALOG);
    if (!outcome.ok) throw new Error(outcome.code);
    await workerA.push();

    // Device B sees both findings as open.
    later(30);
    mockAuth = { userId: USER_B, activeGardenId: GARDEN, mode: 'account' };
    await workerB.pullAll();
    mockStorage = storageB;
    const seenByB = await loadFindings(GARDEN);
    expect(seenByB.map((f) => f.kind).sort()).toEqual(['catalog_plant', 'rename']);
    expect(seenByB.find((f) => f.kind === 'catalog_plant')!.proposal.catalog).toMatchObject({ nameDe: 'Yacon', plantStartMonth: 5 });

    // B accepts both; A gets the renamed bed, the catalog entry and the closed findings.
    for (const row of seenByB) expect((await acceptFinding(row, CATALOG)).ok).toBe(true);
    await workerB.push();
    expect(server.table('garden_plants').size).toBe(1);

    later(60);
    mockAuth = { userId: USER_A, activeGardenId: GARDEN, mode: 'account' };
    await workerA.pullAll();
    mockStorage = storageA;
    expect(await loadFindings(GARDEN)).toEqual([]);
    expect((await storageA.getRow<PlanElementRow>('plan_elements', BED))!.label).toBe('Kartoffelbeet');
    const ownOnA = await storageA.getRowsByGarden<GardenPlantRow>('garden_plants', GARDEN);
    expect(ownOnA.map((p) => p.slug)).toEqual(['yacon']);
    expect(ownOnA[0]!.updatedByUserId).toBe(USER_B);
  });
});

// ── The picture of the plan ──────────────────────────────────────────────────

describe('which part of the garden the picture shows (PHOTO-08)', () => {
  // Imported here so the mocks above are in place first.
  const { viewFor } = require('../markView') as typeof import('../markView');
  const garden = { widthM: 10, heightM: 20 };

  it('zooms in on the element, with room around it, inside the parcel', () => {
    const view = viewFor({ type: 'element', elementId: BED, proposed: null }, PLAN, garden);
    // The bed (2 x 1 m at 3,4) is fully inside the view, and the view is much smaller than the garden.
    expect(view.x).toBeLessThanOrEqual(2);
    expect(view.x + view.width).toBeGreaterThanOrEqual(4);
    expect(view.y).toBeLessThanOrEqual(3.5);
    expect(view.y + view.height).toBeGreaterThanOrEqual(4.5);
    expect(view.height).toBeLessThan(10);
    expect(view.x).toBeGreaterThanOrEqual(0);
    expect(view.y).toBeGreaterThanOrEqual(0);
    expect(view.x + view.width).toBeLessThanOrEqual(10);
  });

  it('includes a proposed size or place', () => {
    const view = viewFor({ type: 'element', elementId: BED, proposed: { xM: 7, yM: 15, widthM: 2, heightM: 1 } }, PLAN, garden);
    expect(view.y).toBeLessThanOrEqual(3.5);
    expect(view.y + view.height).toBeGreaterThanOrEqual(15.5);
    expect(view.x + view.width).toBeGreaterThanOrEqual(8);
  });

  it('a spot near the corner stays inside the parcel; a small garden is shown whole', () => {
    const corner = viewFor({ type: 'spot', xM: 9.8, yM: 19.9 }, PLAN, garden);
    expect(corner.x + corner.width).toBeLessThanOrEqual(10);
    expect(corner.y + corner.height).toBeLessThanOrEqual(20);
    expect(corner.width).toBeGreaterThanOrEqual(6);
    expect(viewFor({ type: 'spot', xM: 2, yM: 2 }, PLAN, { widthM: 4, heightM: 5 })).toEqual({ x: 0, y: 0, width: 4, height: 5 });
    expect(viewFor({ type: 'none' }, PLAN, garden)).toEqual({ x: 0, y: 0, width: 10, height: 20 });
  });
});
