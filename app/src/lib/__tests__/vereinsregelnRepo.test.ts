// vereinsregelnRepo unit tests — Plan 02-04 Task 2-04-01, updated in Plan 02.5-03 Task 03.
// Phase 3 Plan 03-03: account-mode tests updated for offline-first (storage-first, writeWithOutbox).
// RULES-04 server-side guard: saveVereinsregeln REJECTS any input where istBKleingG && !aktiv.
//
// Phase 2.5 updates:
//   - Column rename: user_id → created_by_user_id + new updated_by_user_id + new garden_id
//   - Account-mode load/save/delete use StorageAdapter Row-Table (not direct Supabase)

// Set Supabase env BEFORE any import that transitively pulls in ./supabase.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import type { VereinsRegel, VereinsregelnRow } from '@spatenstich/shared';

// Concrete rules payload shape used in test assertions
type VereinsregelnRowTyped = Omit<VereinsregelnRow, 'rules'> & {
  rules: { list: VereinsRegel[] };
};

// ── Mock the supabase client ────────────────────────────────────────────
// Still needed for Supabase-fallback path in loadVereinsregeln (when no local row)
const mockUpsert = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockDelete = jest.fn();
const mockDeleteEq1 = jest.fn();
const mockDeleteEq2 = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: (...args: unknown[]) => mockUpsert(...args),
      insert: (...args: unknown[]) => mockInsert(...args),
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return { eq: (...a: unknown[]) => mockEq(...a) };
      },
      delete: () => {
        mockDelete();
        return {
          eq: (...a1: unknown[]) => {
            mockDeleteEq1(...a1);
            return { eq: (...a2: unknown[]) => mockDeleteEq2(...a2) };
          },
        };
      },
    })),
  },
}));

// ── Mock the storage adapter ───────────────────────────────────────────
const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageDelete = jest.fn();
const mockStorageGetRow = jest.fn();
const mockStorageWriteWithOutbox = jest.fn();
const mockStorageUpsertRowFromServer = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    get: (...a: unknown[]) => mockStorageGet(...a),
    set: (...a: unknown[]) => mockStorageSet(...a),
    delete: (...a: unknown[]) => mockStorageDelete(...a),
    getRow: (...a: unknown[]) => mockStorageGetRow(...a),
    writeWithOutbox: (...a: unknown[]) => mockStorageWriteWithOutbox(...a),
    upsertRowFromServer: (...a: unknown[]) => mockStorageUpsertRowFromServer(...a),
  },
}));

// ── Mock authStore (Phase 2.5: activeGardenId pulled via getState) ─────
const GARDEN_ID = 'g-test-42';
jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ activeGardenId: 'g-test-42' }),
  },
}));

// Lazily import AFTER mocks are registered.
import {
  loadVereinsregeln,
  saveVereinsregeln,
  deleteVereinsregel,
} from '../vereinsregelnRepo';

const USER_ID = 'user-abc';

const USER_RULE: VereinsRegel = {
  id: 'u-1',
  titel: 'Heckenhöhe',
  wert: 120,
  einheit: 'cm',
  istBKleingG: false,
  aktiv: true,
  source: 'checklist',
};

const USER_RULE_2: VereinsRegel = {
  id: 'u-2',
  titel: 'Wasseranschluss-Pflicht',
  istBKleingG: false,
  aktiv: true,
  source: 'checklist',
};

beforeEach(() => {
  mockUpsert.mockReset();
  mockInsert.mockReset();
  mockSelect.mockReset();
  mockEq.mockReset();
  mockDelete.mockReset();
  mockDeleteEq1.mockReset();
  mockDeleteEq2.mockReset();
  mockStorageGet.mockReset();
  mockStorageSet.mockReset();
  mockStorageDelete.mockReset();
  mockStorageGetRow.mockReset();
  mockStorageWriteWithOutbox.mockReset();
  mockStorageUpsertRowFromServer.mockReset();
});

describe('vereinsregelnRepo (account mode)', () => {
  it('Test 1: saveVereinsregeln writes to local Row-Table via writeWithOutbox', async () => {
    // No existing local row → insert operation
    mockStorageGetRow.mockResolvedValue(null);
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await saveVereinsregeln([USER_RULE, USER_RULE_2], 'account', USER_ID);

    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);
    const [entity, row, outbox] = mockStorageWriteWithOutbox.mock.calls[0] as [
      string,
      VereinsregelnRowTyped,
      { entity: string; rowId: string; operation: string; payload: unknown },
    ];
    expect(entity).toBe('vereinsregeln');
    expect(outbox.entity).toBe('vereinsregeln');
    expect(outbox.rowId).toBe(GARDEN_ID);
    expect(outbox.operation).toBe('insert'); // no existing row
    // Row contains the rules (BKleingG seeds + user rules)
    expect(row.rules.list.length).toBeGreaterThanOrEqual(2);
    expect(row.rules.list.some((r) => r.id === 'u-1')).toBe(true);
    expect(row.rules.list.some((r) => r.id === 'u-2')).toBe(true);
    // Local storage KV must NOT be touched in account mode
    expect(mockStorageSet).not.toHaveBeenCalled();
    // Supabase must NOT be called directly
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('Test 1b: saveVereinsregeln uses operation=update when row already exists', async () => {
    const existingRow: VereinsregelnRow = {
      id: GARDEN_ID,
      gardenId: GARDEN_ID,
      createdAt: '2026-04-20T00:00:00Z',
      updatedAt: '2026-04-20T00:00:00Z',
      updatedByUserId: USER_ID,
      deletedAt: null,
      rules: { list: [USER_RULE] },
    };
    mockStorageGetRow.mockResolvedValue(existingRow);
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await saveVereinsregeln([USER_RULE, USER_RULE_2], 'account', USER_ID);

    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);
    const [, , outbox] = mockStorageWriteWithOutbox.mock.calls[0] as [
      string,
      VereinsregelnRow,
      { operation: string },
    ];
    expect(outbox.operation).toBe('update');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('Test 3: loadVereinsregeln returns local row when available (no Supabase call)', async () => {
    const localRow: VereinsregelnRow = {
      id: GARDEN_ID,
      gardenId: GARDEN_ID,
      createdAt: '2026-04-20T00:00:00Z',
      updatedAt: '2026-04-20T00:00:00Z',
      updatedByUserId: USER_ID,
      deletedAt: null,
      rules: { list: [USER_RULE, USER_RULE_2] },
    };
    mockStorageGetRow.mockResolvedValue(localRow);

    const rules = await loadVereinsregeln('account', USER_ID);

    expect(mockStorageGetRow).toHaveBeenCalledWith('vereinsregeln', GARDEN_ID);
    expect(rules).toHaveLength(2);
    expect(rules[0]!.id).toBe('u-1');
    expect(rules[0]!.istBKleingG).toBe(false);
    // Supabase must NOT be called when local row present
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('Test 3b: loadVereinsregeln falls back to Supabase when no local row', async () => {
    mockStorageGetRow.mockResolvedValue(null);
    mockStorageUpsertRowFromServer.mockResolvedValue(undefined);

    const serverRows = [
      {
        id: 'srv-1',
        titel: USER_RULE.titel,
        wert: USER_RULE.wert ?? null,
        einheit: USER_RULE.einheit ?? null,
        ist_bkleingg: false,
        aktiv: true,
        source: USER_RULE.source,
        created_by_user_id: USER_ID,
        updated_by_user_id: USER_ID,
        garden_id: GARDEN_ID,
        erstellt_am: '2026-04-20T00:00:00Z',
      },
    ];
    mockEq.mockResolvedValue({ data: serverRows, error: null });

    const rules = await loadVereinsregeln('account', USER_ID);

    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('garden_id', GARDEN_ID);
    // upserted into local store
    expect(mockStorageUpsertRowFromServer).toHaveBeenCalledTimes(1);
    // Returns rules (may include BKleingG seeds if aggregation returns 0 user rules)
    expect(Array.isArray(rules)).toBe(true);
  });

  it('Test 3c: deleteVereinsregel removes rule from local row via writeWithOutbox', async () => {
    const existingRow: VereinsregelnRow = {
      id: GARDEN_ID,
      gardenId: GARDEN_ID,
      createdAt: '2026-04-20T00:00:00Z',
      updatedAt: '2026-04-20T00:00:00Z',
      updatedByUserId: USER_ID,
      deletedAt: null,
      rules: { list: [USER_RULE, USER_RULE_2] },
    };
    mockStorageGetRow.mockResolvedValue(existingRow);
    mockStorageWriteWithOutbox.mockResolvedValue(undefined);

    await deleteVereinsregel('u-1', 'account', USER_ID);

    expect(mockStorageWriteWithOutbox).toHaveBeenCalledTimes(1);
    const [entity, row, outbox] = mockStorageWriteWithOutbox.mock.calls[0] as [
      string,
      VereinsregelnRowTyped,
      { operation: string },
    ];
    expect(entity).toBe('vereinsregeln');
    // rule u-1 removed, u-2 remains
    expect(row.rules.list.some((r) => r.id === 'u-1')).toBe(false);
    expect(row.rules.list.some((r) => r.id === 'u-2')).toBe(true);
    expect(outbox.operation).toBe('update');
    // Supabase delete must NOT be called
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('vereinsregelnRepo (local mode)', () => {
  it('Test 2: saveVereinsregeln writes JSON to storage, no supabase call', async () => {
    mockStorageSet.mockResolvedValue(undefined);

    await saveVereinsregeln([USER_RULE, USER_RULE_2], 'local', USER_ID);

    expect(mockStorageSet).toHaveBeenCalledTimes(1);
    const [key, value] = mockStorageSet.mock.calls[0]!;
    expect(key).toBe('vereinsregeln');
    const parsed = JSON.parse(value as string) as VereinsRegel[];
    expect(parsed.some((r) => r.id === 'u-1')).toBe(true);
    expect(parsed.some((r) => r.istBKleingG)).toBe(true);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('Test 4a: loadVereinsregeln returns parsed JSON from storage', async () => {
    mockStorageGet.mockResolvedValue(JSON.stringify([USER_RULE]));

    const rules = await loadVereinsregeln('local', USER_ID);

    expect(mockStorageGet).toHaveBeenCalledWith('vereinsregeln');
    expect(rules).toEqual([USER_RULE]);
  });

  it('Test 4b: loadVereinsregeln returns BKleingG seed when storage key missing', async () => {
    mockStorageGet.mockResolvedValue(null);

    const rules = await loadVereinsregeln('local', USER_ID);

    expect(rules.length).toBeGreaterThanOrEqual(2);
    expect(rules.every((r) => r.istBKleingG)).toBe(true);
  });
});

describe('vereinsregelnRepo (RULES-04 server-side guard)', () => {
  it('Test 5: saveVereinsregeln throws when a BKleingG rule is marked aktiv=false', async () => {
    const violator: VereinsRegel = {
      id: 'bk-x',
      titel: 'Forbidden toggle-off',
      istBKleingG: true,
      aktiv: false,
      source: 'manual',
    };

    await expect(
      saveVereinsregeln([violator], 'account', USER_ID),
    ).rejects.toThrow(/cannot disable BKleingG rule/);

    // No mutation side-effects on violation
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockStorageSet).not.toHaveBeenCalled();
    expect(mockStorageWriteWithOutbox).not.toHaveBeenCalled();
  });

  it('Test 5b: deleteVereinsregel throws when ruleId begins with "bk-"', async () => {
    await expect(
      deleteVereinsregel('bk-user-0', 'account', USER_ID),
    ).rejects.toThrow(/cannot delete BKleingG rule/);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockStorageDelete).not.toHaveBeenCalled();
    expect(mockStorageWriteWithOutbox).not.toHaveBeenCalled();
  });
});
