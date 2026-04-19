// vereinsregelnRepo unit tests — Plan 02-04 Task 2-04-01.
// Mirrors the mode-aware pattern from profileRepo (D-11):
//   mode === 'account' → supabase.from('vereinsregeln')
//   mode === 'local'   → storage key 'vereinsregeln' (single JSON blob, Pitfall 6)
// RULES-04 server-side guard: saveVereinsregeln REJECTS any input where istBKleingG && !aktiv.

// Set Supabase env BEFORE any import that transitively pulls in ./supabase.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import type { VereinsRegel } from '@spatenstich/shared';

// ── Mock the supabase client ────────────────────────────────────────────
// The chained API `supabase.from('vereinsregeln').upsert(...)` must be mockable.
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

// ── Mock the storage adapter (default-mode persistence) ────────────────
const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageDelete = jest.fn();

jest.mock('../../storage', () => ({
  storage: {
    get: (...a: unknown[]) => mockStorageGet(...a),
    set: (...a: unknown[]) => mockStorageSet(...a),
    delete: (...a: unknown[]) => mockStorageDelete(...a),
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
});

describe('vereinsregelnRepo (account mode)', () => {
  it('Test 1: saveVereinsregeln upserts BKleingG seed + user rules in a single call', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    await saveVereinsregeln([USER_RULE, USER_RULE_2], 'account', USER_ID);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [rows] = mockUpsert.mock.calls[0]!;
    const typed = rows as VereinsRegel[];
    // Expect BKleingG seeds prepended + user rules preserved (3 + 2 = 5 when seed has 3 entries)
    expect(typed.length).toBeGreaterThanOrEqual(5);
    const bkCount = typed.filter((r) => r.istBKleingG).length;
    expect(bkCount).toBeGreaterThanOrEqual(2);
    // user rules present
    expect(typed.some((r) => r.id === 'u-1')).toBe(true);
    expect(typed.some((r) => r.id === 'u-2')).toBe(true);
    // Local storage must NOT be touched in account mode
    expect(mockStorageSet).not.toHaveBeenCalled();
  });

  it('Test 3: loadVereinsregeln selects by user_id and returns rows', async () => {
    const serverRows = [
      { ...USER_RULE, id: 'srv-1' },
      { ...USER_RULE_2, id: 'srv-2' },
    ];
    mockEq.mockResolvedValue({ data: serverRows, error: null });

    const rules = await loadVereinsregeln('account', USER_ID);

    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(rules).toEqual(serverRows);
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
  });

  it('Test 5b: deleteVereinsregel throws when ruleId begins with "bk-"', async () => {
    await expect(
      deleteVereinsregel('bk-user-0', 'account', USER_ID),
    ).rejects.toThrow(/cannot delete BKleingG rule/);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockStorageDelete).not.toHaveBeenCalled();
  });
});
