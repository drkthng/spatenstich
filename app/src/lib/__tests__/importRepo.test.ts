// importRepo unit tests — Phase 6 Plan 06-02 Task 02.
// Pattern: gardenPlanRepo.test.ts — jest.mock storage + authStore.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

// ── Mocks ───────────────────────────────────────────────────────────────────
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
import { saveImport, loadPendingDrafts } from '../importRepo';
import type { ImportPayload, BedDraftRow, PlantDraftRow } from '@spatenstich/shared';

const gardenId = 'garden-001';

const minimalPayload: ImportPayload = {
  schemaVersion: 'spatenstich-import.v1',
  capture: { timestamp: '2026-05-09T10:00:00Z' },
};

const fullPayload: ImportPayload = {
  schemaVersion: 'spatenstich-import.v1',
  capture: {
    timestamp: '2026-05-09T10:00:00Z',
    chatReference: 'https://claude.ai/chat/abc123',
  },
  beds: [
    { localId: 'bed-a', label: 'Hochbeet', sunExposure: 'half', confidence: 0.8 },
  ],
  plants: [
    { localId: 'plant-1', bedRef: 'bed-a', commonNameDe: 'Tomate', confidence: 0.9 },
  ],
  observations: [
    {
      localId: 'obs-1',
      kind: 'pest',
      summary: 'Schnecken aktiv',
      suggestedActions: ['Bierfalle'],
    },
  ],
};

describe('importRepo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);
    mockStorageGetRowsByGarden.mockResolvedValue([]);
  });

  describe('saveImport', () => {
    it('writes import header row with entity "imports"', async () => {
      await saveImport('account', gardenId, minimalPayload);

      const importCall = mockStorageWriteWithOutbox.mock.calls.find(
        ([entity]: [string]) => entity === 'imports',
      );
      expect(importCall).toBeDefined();
      const [, importRow, outbox] = importCall as [string, Record<string, unknown>, Record<string, unknown>];
      expect(importRow).toMatchObject({
        gardenId,
        source: 'claude-ai-project',
        payloadSchemaVersion: 'spatenstich-import.v1',
      });
      expect(outbox).toMatchObject({
        entity: 'imports',
        operation: 'insert',
      });
    });

    it('writes bed_drafts rows for each bed in payload', async () => {
      await saveImport('account', gardenId, fullPayload);

      const bedDraftCalls = mockStorageWriteWithOutbox.mock.calls.filter(
        ([entity]: [string]) => entity === 'bed_drafts',
      );
      expect(bedDraftCalls).toHaveLength(1);
      const [, bedDraft] = bedDraftCalls[0] as [string, BedDraftRow];
      expect(bedDraft.label).toBe('Hochbeet');
      expect(bedDraft.gardenId).toBe(gardenId);
      expect(bedDraft.status).toBe('pending');
      expect(bedDraft.sunExposure).toBe('half');
    });

    it('writes plant_drafts rows for each plant in payload', async () => {
      await saveImport('account', gardenId, fullPayload);

      const plantDraftCalls = mockStorageWriteWithOutbox.mock.calls.filter(
        ([entity]: [string]) => entity === 'plant_drafts',
      );
      expect(plantDraftCalls).toHaveLength(1);
      const [, plantDraft] = plantDraftCalls[0] as [string, PlantDraftRow];
      expect(plantDraft.commonNameDe).toBe('Tomate');
      expect(plantDraft.status).toBe('pending');
    });

    it('writes observation_drafts rows for each observation in payload', async () => {
      await saveImport('account', gardenId, fullPayload);

      const obsCalls = mockStorageWriteWithOutbox.mock.calls.filter(
        ([entity]: [string]) => entity === 'observation_drafts',
      );
      expect(obsCalls).toHaveLength(1);
      const [, obsDraft] = obsCalls[0] as [string, Record<string, unknown>];
      expect(obsDraft['summary']).toBe('Schnecken aktiv');
      expect(obsDraft['status']).toBe('pending');
    });

    it('calls scheduleWriteDebounced exactly once at end', async () => {
      await saveImport('account', gardenId, fullPayload);
      expect(mockScheduleWriteDebounced).toHaveBeenCalledTimes(1);
    });

    it('respects selectedLocalIds filter — only writes selected items', async () => {
      const selected = new Set(['bed-a']); // only bed, not plant or obs
      await saveImport('account', gardenId, fullPayload, selected);

      const bedCalls = mockStorageWriteWithOutbox.mock.calls.filter(
        ([entity]: [string]) => entity === 'bed_drafts',
      );
      const plantCalls = mockStorageWriteWithOutbox.mock.calls.filter(
        ([entity]: [string]) => entity === 'plant_drafts',
      );
      const obsCalls = mockStorageWriteWithOutbox.mock.calls.filter(
        ([entity]: [string]) => entity === 'observation_drafts',
      );

      expect(bedCalls).toHaveLength(1);
      expect(plantCalls).toHaveLength(0);
      expect(obsCalls).toHaveLength(0);
    });

    it('throws when mode is not account', async () => {
      await expect(
        saveImport('local' as any, gardenId, minimalPayload),
      ).rejects.toThrow('imports are account-only');
    });

    it('returns the import header row', async () => {
      const result = await saveImport('account', gardenId, minimalPayload);
      expect(result.gardenId).toBe(gardenId);
      expect(result.source).toBe('claude-ai-project');
      expect(result.payloadSchemaVersion).toBe('spatenstich-import.v1');
    });
  });

  describe('loadPendingDrafts', () => {
    it('returns only pending, non-deleted drafts', async () => {
      const pendingBed: BedDraftRow = {
        id: 'bd-001',
        importItemId: 'ii-001',
        gardenId,
        label: 'Hochbeet',
        lengthCm: null,
        widthCm: null,
        sunExposure: null,
        soilNotes: null,
        confidence: null,
        status: 'pending',
        promotedAt: null,
        createdAt: '2026-05-09T10:00:00Z',
        updatedAt: '2026-05-09T10:00:00Z',
        updatedByUserId: 'user-001',
        deletedAt: null,
      };
      const promotedBed: BedDraftRow = { ...pendingBed, id: 'bd-002', status: 'promoted' };
      const deletedBed: BedDraftRow = { ...pendingBed, id: 'bd-003', deletedAt: '2026-05-09T11:00:00Z' };

      mockStorageGetRowsByGarden
        .mockResolvedValueOnce([pendingBed, promotedBed, deletedBed]) // bed_drafts
        .mockResolvedValueOnce([]) // plant_drafts
        .mockResolvedValueOnce([]); // observation_drafts

      const result = await loadPendingDrafts(gardenId);
      expect(result.beds).toHaveLength(1);
      expect(result.beds[0].id).toBe('bd-001');
      expect(result.plants).toHaveLength(0);
      expect(result.observations).toHaveLength(0);
    });
  });
});
