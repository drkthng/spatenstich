// Bug C fix tests: UUID generation + repairNonUuidElementIds
// Validates that:
//   1. randomId() (via isValidUuid helper) always produces valid UUIDs.
//   2. repairNonUuidElementIds re-enqueues elements with non-UUID ids and
//      rewrites provenance.parentBedId references consistently.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

const mockStorageGetRowsByGarden = jest.fn();
const mockStorageWriteWithOutbox = jest.fn();
const mockStorageUpsertRowFromServer = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    getRowsByGarden: (...a: unknown[]) => mockStorageGetRowsByGarden(...a),
    writeWithOutbox: (...a: unknown[]) => mockStorageWriteWithOutbox(...a),
    upsertRowFromServer: (...a: unknown[]) => mockStorageUpsertRowFromServer(...a),
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

import { isValidUuid, repairNonUuidElementIds } from '../gardenPlanRepo';
import type { PlanElementRow } from '@spatenstich/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeElement(overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id: 'el-abc123',
    gardenId: 'garden-001',
    elementType: 'Beet',
    label: 'Testbeet',
    xM: 2,
    yM: 2,
    widthM: 1,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-06-14T00:00:00.000Z',
    updatedAt: '2026-06-14T00:00:00.000Z',
    updatedByUserId: 'user-001',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: 'infrastructure',
    ...overrides,
  };
}

describe('isValidUuid', () => {
  it('returns true for a valid UUID v4', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for crypto.randomUUID() output', () => {
    // crypto is available in Node test environment
    const id = crypto.randomUUID();
    expect(UUID_REGEX.test(id)).toBe(true);
    expect(isValidUuid(id)).toBe(true);
  });

  it('returns false for el-style ids (the legacy pattern from Bug C)', () => {
    expect(isValidUuid('el-qz9a01bz')).toBe(false);
    expect(isValidUuid('el-abc123')).toBe(false);
    expect(isValidUuid('el-' + Math.random().toString(36).slice(2, 10))).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('returns false for timestamp-based fallback ids', () => {
    expect(isValidUuid('1718318400000-abc12345')).toBe(false);
  });
});

describe('repairNonUuidElementIds', () => {
  const gardenId = 'garden-001';

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);
    mockStorageUpsertRowFromServer.mockResolvedValue(undefined);
  });

  it('returns 0 and does nothing in local mode', async () => {
    mockStorageGetRowsByGarden.mockResolvedValue([]);
    const count = await repairNonUuidElementIds('local' as any, gardenId);
    expect(count).toBe(0);
    expect(mockStorageWriteWithOutbox).not.toHaveBeenCalled();
  });

  it('returns 0 when all elements already have valid UUID ids', async () => {
    const validId = crypto.randomUUID();
    mockStorageGetRowsByGarden.mockResolvedValue([makeElement({ id: validId })]);
    const count = await repairNonUuidElementIds('account', gardenId);
    expect(count).toBe(0);
    expect(mockStorageWriteWithOutbox).not.toHaveBeenCalled();
  });

  it('returns 0 when there are no elements', async () => {
    mockStorageGetRowsByGarden.mockResolvedValue([]);
    const count = await repairNonUuidElementIds('account', gardenId);
    expect(count).toBe(0);
  });

  it('re-enqueues elements with non-UUID ids using a valid UUID', async () => {
    const legacyEl = makeElement({ id: 'el-qz9a01bz' });
    mockStorageGetRowsByGarden.mockResolvedValue([legacyEl]);

    const count = await repairNonUuidElementIds('account', gardenId);
    expect(count).toBe(1);
    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);

    const [entity, row, outbox] = mockStorageWriteWithOutbox.mock.calls[0];
    expect(entity).toBe('plan_elements');
    // New id must be a valid UUID
    expect(UUID_REGEX.test(row.id)).toBe(true);
    // Old id is gone
    expect(row.id).not.toBe('el-qz9a01bz');
    // Operation must be insert (old id was never on the server)
    expect(outbox.operation).toBe('insert');
    expect(outbox.rowId).toBe(row.id);
    expect(mockScheduleWriteDebounced).toHaveBeenCalledTimes(1);

    // The stale legacy row must be soft-deleted locally (no duplicate on device A),
    // via upsertRowFromServer (no outbox — old el- id was never on the server).
    expect(mockStorageUpsertRowFromServer).toHaveBeenCalledTimes(1);
    const [staleEntity, staleRow] = mockStorageUpsertRowFromServer.mock.calls[0];
    expect(staleEntity).toBe('plan_elements');
    expect(staleRow.id).toBe('el-qz9a01bz');
    expect(staleRow.deletedAt).not.toBeNull();
  });

  it('soft-deletes only the re-identified row, not a provenance-only update', async () => {
    // Bed has a legacy non-UUID id; plant already has a valid UUID but its
    // parentBedId points to the old bed id (provenance-only rewrite).
    const validPlantId = crypto.randomUUID();
    const bedEl = makeElement({ id: 'el-bed-legacy', elementType: 'Beet' });
    const plantEl = makeElement({
      id: validPlantId,
      elementType: 'Pflanze',
      layer: 'seasonal',
      provenance: { source: 'manual', parentBedId: 'el-bed-legacy' },
    });
    mockStorageGetRowsByGarden.mockResolvedValue([bedEl, plantEl]);

    const count = await repairNonUuidElementIds('account', gardenId);
    expect(count).toBe(2); // bed re-id + plant provenance rewrite

    // Only the bed (id changed) is soft-deleted; the plant keeps its id (update in place).
    expect(mockStorageUpsertRowFromServer).toHaveBeenCalledTimes(1);
    const [, staleRow] = mockStorageUpsertRowFromServer.mock.calls[0];
    expect(staleRow.id).toBe('el-bed-legacy');
    expect(staleRow.deletedAt).not.toBeNull();
  });

  it('rewrites provenance.parentBedId when it points to a remapped id', async () => {
    const bedEl = makeElement({ id: 'el-bed-001', elementType: 'Beet' });
    const plantEl = makeElement({
      id: 'el-plant-001',
      elementType: 'Pflanze',
      layer: 'seasonal',
      provenance: { source: 'manual', parentBedId: 'el-bed-001' },
    });
    mockStorageGetRowsByGarden.mockResolvedValue([bedEl, plantEl]);

    const count = await repairNonUuidElementIds('account', gardenId);
    expect(count).toBe(2);
    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(2);

    const calls = mockStorageWriteWithOutbox.mock.calls;
    // Find the repaired bed row
    const bedCall = calls.find(([, row]) => row.elementType === 'Beet');
    const plantCall = calls.find(([, row]) => row.elementType === 'Pflanze');

    expect(bedCall).toBeDefined();
    expect(plantCall).toBeDefined();

    const newBedId: string = bedCall![1].id;
    expect(UUID_REGEX.test(newBedId)).toBe(true);

    // Plant's parentBedId must be updated to the bed's new UUID
    const plantProv = plantCall![1].provenance as Record<string, unknown>;
    expect(plantProv.parentBedId).toBe(newBedId);
  });

  it('does not touch elements that already have valid UUIDs (idempotent)', async () => {
    const validBedId = crypto.randomUUID();
    const validPlantId = crypto.randomUUID();
    const bedEl = makeElement({ id: validBedId, elementType: 'Beet' });
    const plantEl = makeElement({
      id: validPlantId,
      elementType: 'Pflanze',
      layer: 'seasonal',
      provenance: { source: 'manual', parentBedId: validBedId },
    });
    mockStorageGetRowsByGarden.mockResolvedValue([bedEl, plantEl]);

    const count = await repairNonUuidElementIds('account', gardenId);
    expect(count).toBe(0);
    expect(mockStorageWriteWithOutbox).not.toHaveBeenCalled();
  });

  it('preserves parentBedId that already is a valid UUID even when the plant id is non-UUID', async () => {
    const validBedId = crypto.randomUUID();
    const plantEl = makeElement({
      id: 'el-plant-legacy',
      elementType: 'Pflanze',
      layer: 'seasonal',
      provenance: { source: 'manual', parentBedId: validBedId },
    });
    mockStorageGetRowsByGarden.mockResolvedValue([plantEl]);

    const count = await repairNonUuidElementIds('account', gardenId);
    expect(count).toBe(1);

    const [, row] = mockStorageWriteWithOutbox.mock.calls[0];
    // parentBedId already valid — should remain unchanged
    const prov = row.provenance as Record<string, unknown>;
    expect(prov.parentBedId).toBe(validBedId);
  });
});
