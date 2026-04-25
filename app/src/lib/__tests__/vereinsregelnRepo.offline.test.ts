// vereinsregelnRepo offline tests — Plan 03-03 Task 02.
// TDD RED: written BEFORE repo refactor exists.
// Tests cover account-mode offline reads + writes via Row-Table + Outbox.

// Set Supabase env BEFORE any import that transitively pulls in ./supabase.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import type { VereinsregelnRow, VereinsRegel } from '@spatenstich/shared';

// ── Mocks ────────────────────────────────────────────────────────────────

const mockStorageGetRow = jest.fn();
const mockStorageWriteWithOutbox = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageGet = jest.fn();
const mockStorageUpsertRowFromServer = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    getRow: (...a: unknown[]) => mockStorageGetRow(...a),
    writeWithOutbox: (...a: unknown[]) => mockStorageWriteWithOutbox(...a),
    set: (...a: unknown[]) => mockStorageSet(...a),
    get: (...a: unknown[]) => mockStorageGet(...a),
    upsertRowFromServer: (...a: unknown[]) => mockStorageUpsertRowFromServer(...a),
  },
}));

jest.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockGetState = jest.fn();
jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}));

const GARDEN_ID = 'g-1';
const USER_ID = 'u-1';

const RULES: VereinsRegel[] = [
  {
    id: 'r-1',
    titel: 'Heckenhöhe max 120cm',
    wert: 120,
    einheit: 'cm',
    istBKleingG: false,
    aktiv: true,
    source: 'manual',
  },
];

const VEREINSREGELN_ROW: VereinsregelnRow = {
  id: GARDEN_ID,
  gardenId: GARDEN_ID,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-04-24T10:00:00Z',
  updatedByUserId: USER_ID,
  deletedAt: null,
  rules: { list: RULES },
};

// Lazy import AFTER mocks
import * as repo from '../vereinsregelnRepo';
import { OutboxEnqueueError } from '../errors';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetState.mockReturnValue({
    activeGardenId: GARDEN_ID,
    userId: USER_ID,
    mode: 'account',
  });
});

// ── Test 4: loadVereinsregeln reads from local Row-Table ──────────────────
describe('vereinsregelnRepo.loadVereinsregeln (account-mode, offline-first)', () => {
  it('returns rules from local VereinsregelnRow (no Supabase call)', async () => {
    mockStorageGetRow.mockResolvedValue(VEREINSREGELN_ROW);

    const rules = await repo.loadVereinsregeln('account', USER_ID);

    expect(Array.isArray(rules)).toBe(true);
    expect(rules.some((r) => r.id === 'r-1')).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('falls back to Supabase and upserts when no local row', async () => {
    mockStorageGetRow.mockResolvedValue(null);
    const eq = jest.fn().mockResolvedValue({ data: [], error: null });
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const rules = await repo.loadVereinsregeln('account', USER_ID);

    expect(Array.isArray(rules)).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('vereinsregeln');
  });

  it('returns local-mode rules from KV storage (non-account mode)', async () => {
    mockStorageGet.mockResolvedValue(JSON.stringify(RULES));

    const rules = await repo.loadVereinsregeln('local', USER_ID);

    expect(rules.some((r) => r.id === 'r-1')).toBe(true);
    expect(mockStorageGetRow).not.toHaveBeenCalled();
  });
});

// ── Test 5: saveVereinsregeln writes local + Outbox ───────────────────────
describe('vereinsregelnRepo.saveVereinsregeln (account-mode, offline write)', () => {
  it('writes row to local storage + creates Outbox entry', async () => {
    mockStorageGetRow.mockResolvedValue(VEREINSREGELN_ROW);
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await repo.saveVereinsregeln(RULES, 'account', USER_ID);

    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);
    const [entity, row, outbox] = mockStorageWriteWithOutbox.mock.calls[0] as [
      string,
      VereinsregelnRow,
      { entity: string; rowId: string; operation: string; payload: unknown },
    ];
    expect(entity).toBe('vereinsregeln');
    expect(row.gardenId).toBe(GARDEN_ID);
    expect(outbox.entity).toBe('vereinsregeln');
    expect(outbox.rowId).toBe(GARDEN_ID);
    expect(outbox.operation).toBe('update');
    // No direct Supabase call
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('saves to KV in local mode (unverändert)', async () => {
    await repo.saveVereinsregeln(RULES, 'local', USER_ID);
    expect(mockStorageSet).toHaveBeenCalled();
    expect(mockStorageWriteWithOutbox).not.toHaveBeenCalled();
  });
});

// ── Test 6: deleteVereinsregel removes rule and updates Outbox ────────────
describe('vereinsregelnRepo.deleteVereinsregel (account-mode)', () => {
  it('removes rule from list and writes updated row to Outbox', async () => {
    const multiRulesRow: VereinsregelnRow = {
      ...VEREINSREGELN_ROW,
      rules: {
        list: [
          ...RULES,
          {
            id: 'r-2',
            titel: 'Kompostpflicht',
            istBKleingG: false,
            aktiv: true,
            source: 'manual',
          },
        ],
      },
    };
    mockStorageGetRow.mockResolvedValue(multiRulesRow);
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await repo.deleteVereinsregel('r-1', 'account', USER_ID);

    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);
    const [, row] = mockStorageWriteWithOutbox.mock.calls[0] as [
      string,
      VereinsregelnRow,
    ];
    // r-1 should be removed
    const payload = row.rules as { list?: VereinsRegel[] };
    const ids = (payload.list ?? []).map((r) => r.id);
    expect(ids).not.toContain('r-1');
    expect(ids).toContain('r-2');
    // operation must be 'update' (not 'delete' for the Row — only the rule is removed)
    const outbox = mockStorageWriteWithOutbox.mock.calls[0]![2] as { operation: string };
    expect(outbox.operation).toBe('update');
  });

  it('throws when trying to delete BKleingG rule', async () => {
    await expect(
      repo.deleteVereinsregel('bk-u-1-0', 'account', USER_ID),
    ).rejects.toThrow('cannot delete BKleingG rule');
    expect(mockStorageWriteWithOutbox).not.toHaveBeenCalled();
  });
});

// ── Test 11: local-mode paths unchanged ───────────────────────────────────
describe('vereinsregelnRepo local-mode (Regressionstest)', () => {
  it('deleteVereinsregel in local mode filters KV blob', async () => {
    mockStorageGet.mockResolvedValue(
      JSON.stringify([
        { id: 'r-1', titel: 'T1', istBKleingG: false, aktiv: true, source: 'manual' },
        { id: 'r-2', titel: 'T2', istBKleingG: false, aktiv: true, source: 'manual' },
      ]),
    );

    await repo.deleteVereinsregel('r-1', 'local', USER_ID);

    expect(mockStorageSet).toHaveBeenCalledTimes(1);
    const [, jsonStr] = mockStorageSet.mock.calls[0] as [string, string];
    const saved = JSON.parse(jsonStr) as Array<{ id: string }>;
    expect(saved.map((r) => r.id)).not.toContain('r-1');
  });
});
