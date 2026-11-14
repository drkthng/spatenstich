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
  // Positions are centres (Phase 33): a 2 m x 1 m bed whose edges sit 1 m from the
  // boundary has its centre at (2, 1.5).
  it('places the first bed 1 m from the boundary and returns its centre', () => {
    const slot = nextFreeBedSlot([], dims, { widthM: 2, heightM: 1 });
    expect(slot).toEqual({ xM: 2, yM: 1.5 });
  });

  it('does not overlap a previously placed bed', () => {
    const existing = [bedAt('e1', 2, 1.5, 2, 1)];
    const slot = nextFreeBedSlot(existing, dims, { widthM: 2, heightM: 1 });
    // The new bed's left edge lies past the first bed's right edge (3 m) plus the gap.
    expect(slot.xM - 1).toBeGreaterThanOrEqual(3 + 0.5);
    expect(slot.yM).toBe(1.5);
  });

  it('wraps to a new row when garden width is exhausted', () => {
    // Pack the row with 2m-wide beds. After three beds the cursor is far enough
    // along that a fourth 2m bed would exceed the garden width minus the 1m margin.
    const beds = [
      bedAt('e1', 2, 1.5, 2, 1),
      bedAt('e2', 4.5, 1.5, 2, 1),
      bedAt('e3', 7.0, 1.5, 2, 1),
    ];
    const slot = nextFreeBedSlot(beds, dims, { widthM: 2, heightM: 1 });
    expect(slot.yM).toBeGreaterThan(1.5);
    // and it stays inside the parcel
    expect(slot.xM + 1).toBeLessThanOrEqual(dims.widthM);
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
    expect(slot).toEqual({ xM: 1.5, yM: 1.5 });
  });
});
