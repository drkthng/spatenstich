// Phase 6.5 Plan 03: Pitfall-1 idempotency tests.
// Re-promoting a draft whose import_items row already has a non-deleted plan_element
// returns the existing element without writing.

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

import { promoteBedDraft } from '../draftPromotionRepo';
import type {
  BedDraftRow,
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
  soilNotes: null,
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

describe('draftPromotionRepo idempotency', () => {
  it('returns existing plan_element when one already exists with importedFrom === importItemId and deletedAt === null', async () => {
    const existing: PlanElementRow = {
      id: 'el-existing',
      gardenId: 'g-1',
      elementType: 'Beet',
      label: 'Hochbeet',
      xM: 1,
      yM: 1,
      widthM: 2,
      heightM: 1,
      confidence: 'high',
      isAccepted: true,
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      updatedByUserId: 'user-001',
      deletedAt: null,
      importedFrom: 'item-1',
      provenance: null,
    };
    const result = await promoteBedDraft(
      'account',
      fixtureBedDraft,
      fixtureDims,
      [existing],
      'item-1',
    );
    expect(result.id).toBe('el-existing');
  });

  it('does NOT call writeWithOutbox for plan_elements insert when duplicate detected', async () => {
    const existing: PlanElementRow = {
      id: 'el-existing',
      gardenId: 'g-1',
      elementType: 'Beet',
      label: 'x',
      xM: 0,
      yM: 0,
      widthM: 1,
      heightM: 1,
      confidence: 'high',
      isAccepted: true,
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      updatedByUserId: 'user-001',
      deletedAt: null,
      importedFrom: 'item-1',
      provenance: null,
    };
    await promoteBedDraft('account', fixtureBedDraft, fixtureDims, [existing], 'item-1');
    const planInserts = mockStorageWriteWithOutbox.mock.calls.filter(
      ([entity, _row, ob]: any[]) => entity === 'plan_elements' && ob.operation === 'insert',
    );
    expect(planInserts).toHaveLength(0);
  });

  it('does NOT call writeWithOutbox for bed_drafts update when duplicate detected', async () => {
    const existing: PlanElementRow = {
      id: 'el-existing',
      gardenId: 'g-1',
      elementType: 'Beet',
      label: 'x',
      xM: 0,
      yM: 0,
      widthM: 1,
      heightM: 1,
      confidence: 'high',
      isAccepted: true,
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      updatedByUserId: 'user-001',
      deletedAt: null,
      importedFrom: 'item-1',
      provenance: null,
    };
    await promoteBedDraft('account', fixtureBedDraft, fixtureDims, [existing], 'item-1');
    const bedUpdates = mockStorageWriteWithOutbox.mock.calls.filter(
      ([entity]: any[]) => entity === 'bed_drafts',
    );
    expect(bedUpdates).toHaveLength(0);
  });

  it('still promotes when existing element has importedFrom but is soft-deleted', async () => {
    const deleted: PlanElementRow = {
      id: 'el-deleted',
      gardenId: 'g-1',
      elementType: 'Beet',
      label: 'x',
      xM: 0,
      yM: 0,
      widthM: 1,
      heightM: 1,
      confidence: 'high',
      isAccepted: true,
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      updatedByUserId: 'user-001',
      deletedAt: '2026-05-12T01:00:00.000Z',
      importedFrom: 'item-1',
      provenance: null,
    };
    await promoteBedDraft('account', fixtureBedDraft, fixtureDims, [deleted], 'item-1');
    const planInserts = mockStorageWriteWithOutbox.mock.calls.filter(
      ([entity, _row, ob]: any[]) => entity === 'plan_elements' && ob.operation === 'insert',
    );
    expect(planInserts).toHaveLength(1);
  });
});
