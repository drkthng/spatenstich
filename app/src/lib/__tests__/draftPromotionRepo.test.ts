// Phase 6.5 Plan 03: draftPromotionRepo core behavior tests.
// Pattern: gardenPlanRepo.test.ts (mock storage + authStore + SyncTriggers).
//
// Covers:
//   Crit-3 (promote -> plan_element + provenance)
//   Crit-4 (dismiss -> deletedAt)
//   Pitfall-3 (observation_drafts MUST NOT write plan_elements)
//   DRAFT-01, DRAFT-02 (importedFrom provenance on promoted plan_elements)

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

// ── Mocks ───────────────────────────────────────────────────────────────
const mockStorageWriteWithOutbox = jest.fn();
const mockStorageGetRowsByGarden = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    writeWithOutbox: (...a: unknown[]) => mockStorageWriteWithOutbox(...a),
    getRowsByGarden: (...a: unknown[]) => mockStorageGetRowsByGarden(...a),
  },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ mode: 'account', userId: 'user-001' }),
  },
}));

const mockScheduleWriteDebounced = jest.fn();
jest.mock('../sync/SyncTriggers', () => ({
  scheduleWriteDebounced: () => mockScheduleWriteDebounced(),
}));

// Lazy import AFTER mocks
import {
  promoteBedDraft,
  promotePlantDraft,
  promoteObservationDraft,
  dismissDraft,
} from '../draftPromotionRepo';
import type {
  BedDraftRow,
  PlantDraftRow,
  ObservationDraftRow,
  PlanElementRow,
  GardenDimensionsRow,
} from '@spatenstich/shared';

const fixtureDims: GardenDimensionsRow = {
  id: 'dim-1',
  gardenId: 'g-1',
  widthM: 10,
  heightM: 8,
  shape: 'rectangle',
  extraDims: null,
  createdAt: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
  updatedByUserId: 'user-001',
  deletedAt: null,
};

const fixtureBedDraft: BedDraftRow = {
  id: 'bd-1',
  gardenId: 'g-1',
  importItemId: 'item-1',
  label: 'Hochbeet',
  lengthCm: 200,
  widthCm: 100,
  sunExposure: 'sun',
  soilNotes: 'lehmig',
  confidence: 0.9,
  status: 'pending',
  promotedAt: null,
  createdAt: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
  updatedByUserId: 'user-001',
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStorageWriteWithOutbox.mockResolvedValue(undefined);
  mockStorageGetRowsByGarden.mockResolvedValue([]);
});

// ── promoteBedDraft ────────────────────────────────────────────────────
describe('draftPromotionRepo > promoteBedDraft', () => {
  it('throws when mode !== account (drafts are account-only)', async () => {
    await expect(
      promoteBedDraft('local' as any, fixtureBedDraft, fixtureDims, [], 'item-1'),
    ).rejects.toThrow('drafts are account-only');
  });

  it('writes plan_elements insert with importedFrom = importItemId', async () => {
    await promoteBedDraft('account', fixtureBedDraft, fixtureDims, [], 'item-1');
    const planCalls = mockStorageWriteWithOutbox.mock.calls.filter(
      ([entity, _row, ob]: any[]) => entity === 'plan_elements' && ob.operation === 'insert',
    );
    expect(planCalls).toHaveLength(1);
    const [, element] = planCalls[0];
    expect(element.importedFrom).toBe('item-1');
    expect(element.elementType).toBe('Beet');
  });

  it('maps confidence band correctly (>=0.8 -> high, >=0.6 -> medium, <0.6 -> low)', async () => {
    await promoteBedDraft(
      'account',
      { ...fixtureBedDraft, confidence: 0.9 },
      fixtureDims,
      [],
      'item-1',
    );
    const callHigh = mockStorageWriteWithOutbox.mock.calls.find(
      ([e, , ob]: any[]) => e === 'plan_elements' && ob.operation === 'insert',
    );
    expect(callHigh).toBeDefined();
    expect(callHigh![1].confidence).toBe('high');

    jest.clearAllMocks();
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await promoteBedDraft(
      'account',
      { ...fixtureBedDraft, id: 'bd-2', confidence: 0.65 },
      fixtureDims,
      [],
      'item-2',
    );
    const callMed = mockStorageWriteWithOutbox.mock.calls.find(
      ([e, , ob]: any[]) => e === 'plan_elements' && ob.operation === 'insert',
    );
    expect(callMed).toBeDefined();
    expect(callMed![1].confidence).toBe('medium');

    jest.clearAllMocks();
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await promoteBedDraft(
      'account',
      { ...fixtureBedDraft, id: 'bd-3', confidence: 0.3 },
      fixtureDims,
      [],
      'item-3',
    );
    const callLow = mockStorageWriteWithOutbox.mock.calls.find(
      ([e, , ob]: any[]) => e === 'plan_elements' && ob.operation === 'insert',
    );
    expect(callLow).toBeDefined();
    expect(callLow![1].confidence).toBe('low');
  });

  it('writes bed_drafts update with status=promoted + promotedAt', async () => {
    await promoteBedDraft('account', fixtureBedDraft, fixtureDims, [], 'item-1');
    const draftUpdate = mockStorageWriteWithOutbox.mock.calls.find(
      ([entity, _row, ob]: any[]) => entity === 'bed_drafts' && ob.operation === 'update',
    );
    expect(draftUpdate).toBeDefined();
    const [, row] = draftUpdate!;
    expect(row.status).toBe('promoted');
    expect(row.promotedAt).not.toBeNull();
  });

  it('calls scheduleWriteDebounced exactly once after both writes', async () => {
    await promoteBedDraft('account', fixtureBedDraft, fixtureDims, [], 'item-1');
    expect(mockScheduleWriteDebounced).toHaveBeenCalledTimes(1);
  });
});

// ── promotePlantDraft ────────────────────────────────────────────────────
describe('draftPromotionRepo > promotePlantDraft', () => {
  const fixturePlantDraft: PlantDraftRow = {
    id: 'pd-1',
    gardenId: 'g-1',
    importItemId: 'item-p1',
    bedDraftId: null,
    commonNameDe: 'Tomate',
    scientificName: 'Solanum lycopersicum',
    stageEstimate: 'vegetative',
    healthNotes: null,
    confidence: 0.85,
    status: 'pending',
    promotedAt: null,
    createdAt: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T00:00:00.000Z',
    updatedByUserId: 'user-001',
    deletedAt: null,
  };

  const fixtureBedElement: PlanElementRow = {
    id: 'el-bed-1',
    gardenId: 'g-1',
    elementType: 'Beet',
    label: 'Hochbeet',
    xM: 2,
    yM: 1,
    widthM: 2,
    heightM: 1,
    confidence: 'high',
    isAccepted: true,
    createdAt: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T00:00:00.000Z',
    updatedByUserId: 'user-001',
    deletedAt: null,
    importedFrom: 'item-bed-1',
    provenance: null,
    layer: 'infrastructure',
  };

  it('links to parent bed via provenance.parentBedId when parentBedElement provided', async () => {
    await promotePlantDraft('account', fixturePlantDraft, fixtureBedElement, 'item-p1');
    const planInsert = mockStorageWriteWithOutbox.mock.calls.find(
      ([e, , ob]: any[]) => e === 'plan_elements' && ob.operation === 'insert',
    );
    expect(planInsert).toBeDefined();
    const [, element] = planInsert!;
    expect(element.provenance.parentBedId).toBe('el-bed-1');
  });

  it('creates plan_element with elementType = Pflanze', async () => {
    await promotePlantDraft('account', fixturePlantDraft, null, 'item-p1');
    const planInsert = mockStorageWriteWithOutbox.mock.calls.find(
      ([e, , ob]: any[]) => e === 'plan_elements' && ob.operation === 'insert',
    );
    expect(planInsert).toBeDefined();
    const [, element] = planInsert!;
    expect(element.elementType).toBe('Pflanze');
  });
});

// ── promoteObservationDraft (Pitfall-3) ──────────────────────────────────
describe('draftPromotionRepo > promoteObservationDraft (Pitfall-3)', () => {
  const fixtureObs: ObservationDraftRow = {
    id: 'od-1',
    gardenId: 'g-1',
    importItemId: 'item-o1',
    bedRefLocalId: null,
    kind: 'pest',
    summary: 'Schnecken im Hochbeet',
    suggestedActions: ['Kupferband'],
    confidence: 0.7,
    status: 'pending',
    promotedAt: null,
    createdAt: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T00:00:00.000Z',
    updatedByUserId: 'user-001',
    deletedAt: null,
  };

  it('does NOT write plan_elements - only updates observation_drafts to status=promoted', async () => {
    await promoteObservationDraft('account', fixtureObs, 'item-o1');
    const planInserts = mockStorageWriteWithOutbox.mock.calls.filter(
      ([entity]: any[]) => entity === 'plan_elements',
    );
    expect(planInserts).toHaveLength(0);

    const obsUpdate = mockStorageWriteWithOutbox.mock.calls.find(
      ([entity, _row, ob]: any[]) => entity === 'observation_drafts' && ob.operation === 'update',
    );
    expect(obsUpdate).toBeDefined();
    const [, row] = obsUpdate!;
    expect(row.status).toBe('promoted');
    expect(row.promotedAt).not.toBeNull();
  });
});

// ── dismissDraft (Crit-4) ────────────────────────────────────────────────
describe('draftPromotionRepo > dismissDraft (Crit-4)', () => {
  it('writes update with deletedAt for bed_drafts', async () => {
    await dismissDraft('account', 'bed_drafts', fixtureBedDraft);
    const call = mockStorageWriteWithOutbox.mock.calls.find(
      ([entity, _row, ob]: any[]) => entity === 'bed_drafts' && ob.operation === 'update',
    );
    expect(call).toBeDefined();
    const [, row] = call!;
    expect(row.deletedAt).not.toBeNull();
  });

  it('writes update with deletedAt for plant_drafts', async () => {
    const pd: PlantDraftRow = {
      id: 'pd-x',
      gardenId: 'g-1',
      importItemId: 'item-px',
      bedDraftId: null,
      commonNameDe: 'Karotte',
      scientificName: null,
      stageEstimate: null,
      healthNotes: null,
      confidence: 0.5,
      status: 'pending',
      promotedAt: null,
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      updatedByUserId: 'user-001',
      deletedAt: null,
    };
    await dismissDraft('account', 'plant_drafts', pd);
    const call = mockStorageWriteWithOutbox.mock.calls.find(
      ([entity]: any[]) => entity === 'plant_drafts',
    );
    expect(call).toBeDefined();
    expect((call![1] as any).deletedAt).not.toBeNull();
  });

  it('writes update with deletedAt for observation_drafts', async () => {
    const od: ObservationDraftRow = {
      id: 'od-x',
      gardenId: 'g-1',
      importItemId: 'item-ox',
      bedRefLocalId: null,
      kind: 'pest',
      summary: 'Test',
      suggestedActions: null,
      confidence: null,
      status: 'pending',
      promotedAt: null,
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      updatedByUserId: 'user-001',
      deletedAt: null,
    };
    await dismissDraft('account', 'observation_drafts', od);
    const call = mockStorageWriteWithOutbox.mock.calls.find(
      ([entity]: any[]) => entity === 'observation_drafts',
    );
    expect(call).toBeDefined();
    expect((call![1] as any).deletedAt).not.toBeNull();
  });

  it('throws when mode !== account', async () => {
    await expect(
      dismissDraft('local' as any, 'bed_drafts', fixtureBedDraft),
    ).rejects.toThrow('drafts are account-only');
  });
});
