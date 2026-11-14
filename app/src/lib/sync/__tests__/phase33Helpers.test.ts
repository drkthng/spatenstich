// Phase 33: the small pure pieces. When may a server row replace a local one, when did a
// row really change, what the save status says, and the reload signal for screens.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import type { AnyRow, OutboxEntry } from '@spatenstich/shared';
import { shouldApplyServerRow, toMs, sameRows } from '../../../storage/serverMerge';
import { sameContent, stableStringify } from '../../sameContent';
import { describeEntry, describeFailure, isFailedEntry, summarize } from '../outboxWording';
import { MAX_ATTEMPTS } from '../backoff';
import { bumpDataVersion, getDataVersion, _resetDataVersion } from '../dataVersion';
import { isNetworkError } from '../SyncWorker';

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: { getState: () => ({ userId: 'u', activeGardenId: 'g', mode: 'account' }) },
}));
jest.mock('../../supabase', () => ({ supabase: {} }));
jest.mock('../../../storage', () => ({ storage: {} }));

const row = (patch: Record<string, unknown> = {}): AnyRow =>
  ({
    id: 'r1',
    createdAt: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T10:00:00.000Z',
    updatedByUserId: 'u',
    deletedAt: null,
    name: 'x',
    ownerUserId: 'u',
    ...patch,
  }) as AnyRow;

describe('shouldApplyServerRow', () => {
  it('takes a row that is not stored yet', () => {
    expect(shouldApplyServerRow(null, row(), false)).toBe(true);
  });
  it('never touches a row with a waiting local change, not even when forced', () => {
    expect(shouldApplyServerRow(row(), row({ updatedAt: '2026-11-14T11:00:00.000Z' }), true, true)).toBe(false);
  });
  it('takes an equally old or newer edit', () => {
    expect(shouldApplyServerRow(row(), row({ updatedAt: '2026-11-14T10:00:00+00:00' }), false)).toBe(true);
    expect(shouldApplyServerRow(row(), row({ updatedAt: '2026-11-14T10:00:01+00:00' }), false)).toBe(true);
  });
  it('refuses an older edit unless forced', () => {
    const older = row({ updatedAt: '2026-11-14T09:59:59+00:00' });
    expect(shouldApplyServerRow(row(), older, false)).toBe(false);
    expect(shouldApplyServerRow(row(), older, false, true)).toBe(true);
  });
  it('skips the version that is already stored', () => {
    const stamp = '2026-11-14T10:00:02.123456+00:00';
    expect(shouldApplyServerRow(row({ serverUpdatedAt: stamp }), row({ serverUpdatedAt: stamp }), false, true)).toBe(false);
  });
  it('reads both timestamp notations as the same instant', () => {
    expect(toMs('2026-11-14T10:00:00.000Z')).toBe(toMs('2026-11-14T10:00:00+00:00'));
    expect(toMs(null)).toBe(0);
  });
});

describe('sameContent', () => {
  it('ignores edit time, editor and server stamp', () => {
    expect(
      sameContent(row(), row({ updatedAt: 'later', updatedByUserId: 'other', serverUpdatedAt: 'stamp' })),
    ).toBe(true);
  });
  it('sees a change deep inside nested data', () => {
    const a = row({ provenance: { outline: [{ u: 0, v: 0 }], rotateDeg: 0 } });
    const b = row({ provenance: { rotateDeg: 0, outline: [{ u: 0, v: 0.1 }] } });
    expect(sameContent(a, b)).toBe(false);
  });
  it('does not care about key order', () => {
    expect(stableStringify({ a: 1, b: { c: 2, d: 3 } })).toBe(stableStringify({ b: { d: 3, c: 2 }, a: 1 }));
  });
  it('sameRows compares lists whatever their order', () => {
    expect(sameRows([row({ id: 'a' }), row({ id: 'b' })], [row({ id: 'b' }), row({ id: 'a' })])).toBe(true);
    expect(sameRows([row({ id: 'a' })], [row({ id: 'a', name: 'y' })])).toBe(false);
  });
});

describe('save status wording', () => {
  const entry = (patch: Partial<OutboxEntry> = {}): OutboxEntry => ({
    id: 'o1',
    entity: 'plan_elements',
    rowId: 'r1',
    operation: 'update',
    payload: { label: 'Hochbeet 1', deletedAt: null },
    createdAt: 'x',
    attempts: 0,
    lastError: null,
    ...patch,
  });

  it('names what is waiting', () => {
    expect(describeEntry(entry())).toBe('Element im Plan: Hochbeet 1');
    expect(describeEntry(entry({ payload: { label: 'Kompost', deletedAt: '2026-11-14T10:00:00Z' } }))).toBe(
      'Element im Plan gelöscht: Kompost',
    );
    expect(describeEntry(entry({ entity: 'garden_dimensions', payload: {} }))).toBe('Größe der Parzelle');
  });
  it('explains a failure without jargon', () => {
    expect(describeFailure('42501: new row violates row-level security policy')).toBe(
      'Du darfst in diesem Garten nichts mehr ändern.',
    );
    expect(describeFailure('23514: check')).toBe('Der Server nimmt diesen Eintrag in dieser Form nicht an.');
    expect(describeFailure('TypeError: Failed to fetch')).toBe(
      'Der Server war nicht erreichbar oder hat einen Fehler gemeldet.',
    );
  });
  it('sums up in one sentence', () => {
    expect(summarize(0, 0)).toBe('Alles ist gespeichert und abgeglichen.');
    expect(summarize(1, 0)).toBe('Eine Änderung wartet auf den Abgleich.');
    expect(summarize(3, 2)).toBe(
      '3 Änderungen warten auf den Abgleich. 2 Änderungen konnten nicht abgeglichen werden.',
    );
  });
  it('an entry counts as failed once it is out of attempts', () => {
    expect(isFailedEntry(entry({ attempts: MAX_ATTEMPTS, lastError: 'x' }))).toBe(true);
    expect(isFailedEntry(entry({ attempts: 3, lastError: 'x' }))).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('tells "no answer" from an answer with an error code', () => {
    expect(isNetworkError({ code: '', message: 'TypeError: Failed to fetch' })).toBe(true);
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkError({ code: '23505', message: 'duplicate key' })).toBe(false);
    expect(isNetworkError({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
  });
});

describe('data version', () => {
  beforeEach(() => _resetDataVersion());
  it('rises for the entity that changed', () => {
    expect(getDataVersion(['plan_elements'])).toBe(0);
    bumpDataVersion('plan_elements');
    bumpDataVersion('gardens');
    expect(getDataVersion(['plan_elements'])).toBe(1);
    expect(getDataVersion(['plan_elements', 'gardens'])).toBe(2);
    expect(getDataVersion(['bed_drafts'])).toBe(0);
  });
});
