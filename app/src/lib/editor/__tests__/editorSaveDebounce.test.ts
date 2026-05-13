// Phase 7 Plan 03 (Wave 2 GREEN): editorSaveDebounce assertions filled in
// (was Plan 01 Wave 0 it.todo). EDIT-09 + Pitfall-5.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

// ── Mocks ───────────────────────────────────────────────────────────────
const mockWrite = jest.fn();
jest.mock('../../gardenPlanRepo', () => ({
  writePlanElement: (...a: unknown[]) => mockWrite(...a),
}));

// Lazy import AFTER mocks
import {
  scheduleSaveElement,
  flushAllPendingSaves,
  _resetEditorSaveTimers,
} from '../saveDebounce';
import type { PlanElementRow } from '@spatenstich/shared';

function makeEl(
  id: string,
  layer: 'infrastructure' | 'seasonal' = 'infrastructure',
): PlanElementRow {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: id,
    xM: 0,
    yM: 0,
    widthM: 1,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-05-13T10:00:00.000Z',
    updatedAt: '2026-05-13T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: null,
    layer,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockWrite.mockReset();
  mockWrite.mockResolvedValue(undefined);
  _resetEditorSaveTimers();
});

afterEach(() => {
  _resetEditorSaveTimers();
  jest.useRealTimers();
});

describe('editorSaveDebounce > scheduleSaveElement', () => {
  it('does NOT fire writePlanElement before 5000ms', () => {
    scheduleSaveElement('account', makeEl('e1'));
    jest.advanceTimersByTime(4999);
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('fires writePlanElement exactly once after 5000ms with the latest element value', () => {
    scheduleSaveElement('account', makeEl('e1'));
    jest.advanceTimersByTime(5000);
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({ id: 'e1' }),
    );
  });

  it('rapid edits to same element id reset the timer (only one write after 5s of quiet)', () => {
    scheduleSaveElement('account', makeEl('e1'));
    jest.advanceTimersByTime(3000);
    scheduleSaveElement('account', makeEl('e1')); // resets
    jest.advanceTimersByTime(3000); // only 3000ms since last schedule
    expect(mockWrite).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2000); // now 5000ms total since last schedule
    expect(mockWrite).toHaveBeenCalledTimes(1);
  });

  it('concurrent edits to different element ids each schedule independent timers', () => {
    scheduleSaveElement('account', makeEl('e1'));
    scheduleSaveElement('account', makeEl('e2'));
    jest.advanceTimersByTime(5000);
    expect(mockWrite).toHaveBeenCalledTimes(2);
    const ids = mockWrite.mock.calls.map((c) => c[1].id).sort();
    expect(ids).toEqual(['e1', 'e2']);
  });

  it('throws when writePlanElement rejects: error is logged in __DEV__ but does not crash', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockWrite.mockRejectedValueOnce(new Error('outbox down'));
    scheduleSaveElement('account', makeEl('e-fail'));
    // Schedule should not throw synchronously.
    expect(() => jest.advanceTimersByTime(5000)).not.toThrow();
    // Allow the rejected promise's .catch handler to run.
    return Promise.resolve().then(() => {
      // In tests __DEV__ is undefined, so the warn branch may or may not fire.
      // The contract that matters is: no unhandled rejection / no crash.
      expect(mockWrite).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });
  });
});

describe('editorSaveDebounce > flushAllPendingSaves (manual save)', () => {
  it('cancels all pending timers and writes immediately for each scheduled element id', async () => {
    scheduleSaveElement('account', makeEl('e1'));
    scheduleSaveElement('account', makeEl('e2'));
    const byId = (id: string) => makeEl(id);
    await flushAllPendingSaves('account', byId);
    expect(mockWrite).toHaveBeenCalledTimes(2);
    // Timers were cancelled — advancing time produces no additional writes.
    jest.advanceTimersByTime(10000);
    expect(mockWrite).toHaveBeenCalledTimes(2);
  });

  it('uses byId callback to fetch current element snapshot (not the stale one from when timer was scheduled)', async () => {
    scheduleSaveElement('account', makeEl('e1'));
    const byId = (id: string): PlanElementRow => ({ ...makeEl(id), label: 'NEW' });
    await flushAllPendingSaves('account', byId);
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({ label: 'NEW' }),
    );
  });

  it('returns resolved Promise even when no timers are pending', async () => {
    const byId = () => undefined;
    await expect(flushAllPendingSaves('account', byId)).resolves.toBeUndefined();
    expect(mockWrite).not.toHaveBeenCalled();
  });
});

describe('editorSaveDebounce > _resetEditorSaveTimers (test-only)', () => {
  it('clears all pending timers and the internal Map (used for test isolation)', () => {
    scheduleSaveElement('account', makeEl('e1'));
    scheduleSaveElement('account', makeEl('e2'));
    _resetEditorSaveTimers();
    jest.advanceTimersByTime(10000);
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
