// gardenPlanRepo unit tests — Phase 4 Plan 04-01 Task 02.
// Pattern: gardenRepo.test.ts — jest.mock storage + authStore.
// Phase 5 Plan 05-02: saveElements + PlanElementCandidate entfernt (M07 Pivot).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

// ── Mocks ───────────────────────────────────────────────────────────────
const mockStorageGetRowsByGarden = jest.fn();
const mockStorageWriteWithOutbox = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    getRowsByGarden: (...a: unknown[]) => mockStorageGetRowsByGarden(...a),
    writeWithOutbox: (...a: unknown[]) => mockStorageWriteWithOutbox(...a),
  },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      mode: 'account',
      userId: 'user-001',
    }),
  },
}));

const mockScheduleWriteDebounced = jest.fn();
jest.mock('../sync/SyncTriggers', () => ({
  scheduleWriteDebounced: () => mockScheduleWriteDebounced(),
}));

// Lazy import AFTER mocks
import {
  saveDimensions,
  loadDimensions,
  loadAcceptedElements,
} from '../gardenPlanRepo';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';

describe('gardenPlanRepo', () => {
  const gardenId = 'garden-001';

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);
    mockStorageGetRowsByGarden.mockResolvedValue([]);
  });

  describe('saveDimensions', () => {
    it('writes to storage with entity garden_dimensions and schedules sync', async () => {
      await saveDimensions('account', gardenId, {
        shape: 'rectangle',
        widthM: 12,
        heightM: 8.5,
        extraDims: null,
      });

      expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);
      const [entity, row, outbox] = mockStorageWriteWithOutbox.mock.calls[0];
      expect(entity).toBe('garden_dimensions');
      expect(row.gardenId).toBe(gardenId);
      expect(row.shape).toBe('rectangle');
      expect(row.widthM).toBe(12);
      expect(row.heightM).toBe(8.5);
      expect(outbox.entity).toBe('garden_dimensions');
      expect(outbox.operation).toBe('insert');
      expect(mockScheduleWriteDebounced).toHaveBeenCalledTimes(1);
    });

    it('throws when mode is not account', async () => {
      await expect(
        saveDimensions('local' as any, gardenId, {
          shape: 'rectangle',
          widthM: 10,
          heightM: 10,
          extraDims: null,
        }),
      ).rejects.toThrow('gardens are account-only');
    });
  });

  describe('loadDimensions', () => {
    it('returns null when no dimensions exist for garden', async () => {
      mockStorageGetRowsByGarden.mockResolvedValue([]);

      const result = await loadDimensions(gardenId);
      expect(result).toBeNull();
      expect(mockStorageGetRowsByGarden).toHaveBeenCalledWith('garden_dimensions', gardenId);
    });

    it('returns first dimension row when exists', async () => {
      const dim: GardenDimensionsRow = {
        id: 'dim-001',
        gardenId,
        shape: 'l_shape',
        widthM: 15,
        heightM: 10,
        extraDims: { cutoutLength: 5, cutoutWidth: 3 },
        createdAt: '2026-05-03T00:00:00Z',
        updatedAt: '2026-05-03T00:00:00Z',
        updatedByUserId: 'user-001',
        deletedAt: null,
      };
      mockStorageGetRowsByGarden.mockResolvedValue([dim]);

      const result = await loadDimensions(gardenId);
      expect(result).toEqual(dim);
    });
  });

  describe('loadAcceptedElements', () => {
    it('returns only rows with isAccepted=true and deletedAt=null', async () => {
      const elements: PlanElementRow[] = [
        {
          id: 'el-001', gardenId, elementType: 'Beet',
          label: 'Hochbeet', xM: 2, yM: 3, widthM: 2, heightM: 1,
          confidence: 'high', isAccepted: true,
          createdAt: '2026-05-03T00:00:00Z', updatedAt: '2026-05-03T00:00:00Z',
          updatedByUserId: 'user-001', deletedAt: null,
        },
        {
          id: 'el-002', gardenId, elementType: 'Laube',
          label: 'Gartenlaube', xM: 8, yM: 6, widthM: 3, heightM: 4,
          confidence: 'low', isAccepted: false,
          createdAt: '2026-05-03T00:00:00Z', updatedAt: '2026-05-03T00:00:00Z',
          updatedByUserId: 'user-001', deletedAt: null,
        },
        {
          id: 'el-003', gardenId, elementType: 'Kompost',
          label: 'Kompostplatz', xM: 10, yM: 2, widthM: 1.5, heightM: 1.5,
          confidence: 'medium', isAccepted: true,
          createdAt: '2026-05-03T00:00:00Z', updatedAt: '2026-05-03T00:00:00Z',
          updatedByUserId: 'user-001', deletedAt: '2026-05-03T01:00:00Z',
        },
      ];
      mockStorageGetRowsByGarden.mockResolvedValue(elements);

      const result = await loadAcceptedElements(gardenId);

      // Only el-001 passes: isAccepted=true AND deletedAt=null
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('el-001');
    });
  });
});
