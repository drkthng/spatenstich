// Phase 6.5 Plan 03: Pitfall-2 layout tests for nextFreeBedSlot pure helper
// and the default-geometry path through promoteBedDraft.

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

import { nextFreeBedSlot, promoteBedDraft } from '../draftPromotionRepo';
import type {
  BedDraftRow,
  PlanElementRow,
  GardenDimensionsRow,
} from '@spatenstich/shared';

const dims: GardenDimensionsRow = {
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

const bedAt = (
  id: string,
  xM: number,
  yM: number,
  widthM: number,
  heightM: number,
): PlanElementRow => ({
  id,
  gardenId: 'g-1',
  elementType: 'Beet',
  label: id,
  xM,
  yM,
  widthM,
  heightM,
  confidence: 'high',
  isAccepted: true,
  createdAt: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
  updatedByUserId: 'user-001',
  deletedAt: null,
  importedFrom: null,
  provenance: null,
  layer: 'infrastructure',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStorageWriteWithOutbox.mockResolvedValue(undefined);
  mockStorageGetRowsByGarden.mockResolvedValue([]);
});

describe('draftPromotionRepo layout > nextFreeBedSlot', () => {
  it('places first bed near (1, 1)', () => {
    const slot = nextFreeBedSlot([], dims, { widthM: 2, heightM: 1 });
    expect(slot.xM).toBe(1);
    expect(slot.yM).toBe(1);
  });

  it('does not overlap a previously placed bed', () => {
    const existing = [bedAt('e1', 1, 1, 2, 1)];
    const slot = nextFreeBedSlot(existing, dims, { widthM: 2, heightM: 1 });
    // Second slot should be past the first bed's right edge + gap.
    expect(slot.xM).toBeGreaterThan(1 + 2);
  });

  it('wraps to a new row when garden width is exhausted', () => {
    // Pack the row with 2m-wide beds. After three beds the cursor is far enough
    // along that a fourth 2m bed would exceed the garden width minus the 1m margin.
    const beds = [
      bedAt('e1', 1, 1, 2, 1),
      bedAt('e2', 3.5, 1, 2, 1),
      bedAt('e3', 6.0, 1, 2, 1),
    ];
    const slot = nextFreeBedSlot(beds, dims, { widthM: 2, heightM: 1 });
    expect(slot.yM).toBeGreaterThan(1);
  });

  it('uses default 1.5m x 1.0m when draft dimensions are null (verified via promoteBedDraft)', async () => {
    const draftNoDims: BedDraftRow = {
      id: 'bd-null',
      gardenId: 'g-1',
      importItemId: 'item-null',
      label: 'Hochbeet',
      lengthCm: null,
      widthCm: null,
      sunExposure: null,
      soilNotes: null,
      confidence: 0.9,
      status: 'pending',
      promotedAt: null,
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      updatedByUserId: 'user-001',
      deletedAt: null,
    };
    await promoteBedDraft('account', draftNoDims, dims, [], 'item-null');
    const planInsert = mockStorageWriteWithOutbox.mock.calls.find(
      ([e, , ob]: any[]) => e === 'plan_elements' && ob.operation === 'insert',
    );
    expect(planInsert).toBeDefined();
    const [, element] = planInsert!;
    expect(element.widthM).toBe(1.5);
    expect(element.heightM).toBe(1.0);
  });

  it('ignores soft-deleted beds when computing slot', () => {
    const beds = [bedAt('e-deleted', 1, 1, 5, 1)];
    beds[0].deletedAt = '2026-05-12T01:00:00.000Z';
    const slot = nextFreeBedSlot(beds, dims, { widthM: 1, heightM: 1 });
    expect(slot.xM).toBe(1);
    expect(slot.yM).toBe(1);
  });
});
