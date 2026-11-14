// Phase 33 (SYNC3-04): changes from another device arrive in the open editor.
// They are taken without being written back, the echo of this device's own save is
// ignored, rows this device is busy with are left alone, and the undo history is
// cleared so an undo cannot silently overwrite someone else's change.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

const mockSchedule = jest.fn();
jest.mock('../../lib/editor/saveDebounce', () => ({
  scheduleSaveElement: (...a: unknown[]) => mockSchedule(...a),
}));

jest.mock('../authStore', () => ({
  useAuthStore: {
    getState: () => ({ mode: 'account', userId: 'u-1' }),
  },
}));

import { useEditorStore } from '../editorStore';
import type { PlanElementRow } from '@spatenstich/shared';

function makeEl(id: string, overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: id,
    xM: 1,
    yM: 1,
    widthM: 1,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual', rotateDeg: 0 },
    layer: 'infrastructure',
    ...overrides,
  };
}

const store = () => useEditorStore.getState();
const history = () => useEditorStore.temporal.getState();
const byId = (id: string) => store().elements.find((el) => el.id === id);

beforeEach(() => {
  store().hydrate([makeEl('a'), makeEl('b')]);
  useEditorStore.setState({ gestureActive: false, editingElementId: null });
  mockSchedule.mockClear();
});

describe('mergeRemote', () => {
  it('takes a moved element and writes nothing', () => {
    const taken = store().mergeRemote([
      makeEl('a', { xM: 5, updatedAt: '2026-11-14T10:05:00+00:00', updatedByUserId: 'u-2' }),
    ]);
    expect(taken).toBe(1);
    expect(byId('a')?.xM).toBe(5);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('adds an element the partner made and removes one the partner deleted', () => {
    const taken = store().mergeRemote([
      makeEl('c', { updatedByUserId: 'u-2' }),
      makeEl('b', { deletedAt: '2026-11-14T10:05:00+00:00', updatedAt: '2026-11-14T10:05:00+00:00' }),
    ]);
    expect(taken).toBe(2);
    expect(store().elements.map((el) => el.id).sort()).toEqual(['a', 'c']);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('ignores the echo of its own save: same content, only bookkeeping differs', () => {
    store().updateElement('a', { xM: 3 });
    expect(history().pastStates.length).toBeGreaterThan(0);
    const echo = {
      ...byId('a')!,
      updatedAt: byId('a')!.updatedAt.replace('Z', '+00:00'),
      serverUpdatedAt: '2026-11-14T10:00:02.123456+00:00',
    };
    expect(store().mergeRemote([echo])).toBe(0);
    // The undo history survives, so the move can still be undone.
    expect(history().pastStates.length).toBeGreaterThan(0);
  });

  it('a change inside nested data counts as a change', () => {
    const turned = makeEl('a', {
      provenance: { source: 'manual', rotateDeg: 45 },
      updatedAt: '2026-11-14T10:05:00+00:00',
    });
    expect(store().mergeRemote([turned])).toBe(1);
    expect(byId('a')?.provenance).toMatchObject({ rotateDeg: 45 });
  });

  it('keeps a row that was edited here later than the incoming version', () => {
    store().mergeRemote([makeEl('a', { xM: 9, updatedAt: '2026-11-14T09:00:00+00:00' })]);
    expect(byId('a')?.xM).toBe(1);
  });

  it('leaves rows alone that still have a save on its way', () => {
    const taken = store().mergeRemote(
      [makeEl('a', { xM: 7, updatedAt: '2026-11-14T10:05:00+00:00' })],
      (id) => id === 'a',
    );
    expect(taken).toBe(0);
    expect(byId('a')?.xM).toBe(1);
  });

  it('leaves the element alone that is being dragged right now', () => {
    store().setSelection('a');
    useEditorStore.setState({ gestureActive: true });
    const taken = store().mergeRemote([
      makeEl('a', { xM: 7, updatedAt: '2026-11-14T10:05:00+00:00' }),
      makeEl('b', { xM: 8, updatedAt: '2026-11-14T10:05:00+00:00' }),
    ]);
    useEditorStore.setState({ gestureActive: false });
    expect(taken).toBe(1);
    expect(byId('a')?.xM).toBe(1);
    expect(byId('b')?.xM).toBe(8);
  });

  it('clears the undo history, so an undo cannot overwrite the partner', () => {
    store().updateElement('b', { xM: 4 });
    expect(history().pastStates.length).toBeGreaterThan(0);
    store().mergeRemote([makeEl('a', { xM: 5, updatedAt: '2026-11-14T10:05:00+00:00' })]);
    expect(history().pastStates).toHaveLength(0);
    history().undo();
    expect(byId('a')?.xM).toBe(5);
    expect(byId('b')?.xM).toBe(4);
  });

  it('drops a deleted element from the selection', () => {
    store().setSelection('b');
    store().mergeRemote([makeEl('b', { deletedAt: '2026-11-14T10:05:00+00:00', updatedAt: '2026-11-14T10:05:00+00:00' })]);
    expect(store().selectedIds).toEqual([]);
    expect(store().selection).toBeNull();
  });
});
