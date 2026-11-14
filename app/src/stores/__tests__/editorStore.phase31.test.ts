// Phase 31 (EDIT3-10, EDIT3-11, EDIT3-18; Masterplan WP 21.3): saving and undo in the editor
// store. Loading a plan writes nothing and leaves no undo step; a drag is one undo step;
// an undone add is stored as deleted; delete, restore, duplicate and layer order.

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
    provenance: { source: 'manual' },
    layer: 'infrastructure',
    ...overrides,
  };
}

const store = () => useEditorStore.getState();
const history = () => useEditorStore.temporal.getState();
const savedIds = () => mockSchedule.mock.calls.map((c) => (c[1] as PlanElementRow).id);
const GARDEN = { widthM: 12, heightM: 13 };

beforeEach(() => {
  store().hydrate([]);
  useEditorStore.setState({ gestureActive: false, editingElementId: null });
  mockSchedule.mockClear();
});

describe('hydrate (loading a plan)', () => {
  it('writes nothing', () => {
    store().hydrate([makeEl('a'), makeEl('b')]);
    expect(store().elements.map((e) => e.id)).toEqual(['a', 'b']);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('leaves no undo step: the first undo does not empty the plan', () => {
    store().hydrate([makeEl('a'), makeEl('b')]);
    expect(history().pastStates.length).toBe(0);
    history().undo();
    expect(store().elements.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('replacing one plan by another does not mark the old elements as deleted', () => {
    store().hydrate([makeEl('a')]);
    store().hydrate([makeEl('b')]);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('clears selection and forgets earlier history', () => {
    store().hydrate([makeEl('a')]);
    store().updateElement('a', { xM: 2 });
    store().setSelection('a');
    store().hydrate([makeEl('a')]);
    expect(store().selection).toBeNull();
    expect(store().selectedIds).toEqual([]);
    expect(history().pastStates.length).toBe(0);
  });
});

describe('undo and redo are stored (EDIT3-11)', () => {
  it('an undone add is written as deleted, so a reload does not bring it back', () => {
    store().hydrate([makeEl('a')]);
    store().addElement(makeEl('new'));
    mockSchedule.mockClear();
    history().undo();
    expect(store().elements.map((e) => e.id)).toEqual(['a']);
    const call = mockSchedule.mock.calls.find((c) => (c[1] as PlanElementRow).id === 'new');
    expect(call).toBeDefined();
    expect((call![1] as PlanElementRow).deletedAt).not.toBeNull();
    expect(call![2]).toBe(0);
  });

  it('redo writes the element again, not deleted', () => {
    store().hydrate([makeEl('a')]);
    store().addElement(makeEl('new'));
    history().undo();
    mockSchedule.mockClear();
    history().redo();
    const call = mockSchedule.mock.calls.find((c) => (c[1] as PlanElementRow).id === 'new');
    expect(call).toBeDefined();
    expect((call![1] as PlanElementRow).deletedAt).toBeNull();
  });

  it('undoing a move writes the old position', () => {
    store().hydrate([makeEl('a')]);
    store().updateElement('a', { xM: 5 });
    mockSchedule.mockClear();
    history().undo();
    expect(store().elements[0].xM).toBe(1);
    expect(mockSchedule).toHaveBeenCalledWith('account', expect.objectContaining({ id: 'a', xM: 1 }), 0);
  });
});

describe('history steps', () => {
  it('a drag is one undo step that restores the state before it', () => {
    store().hydrate([makeEl('a')]);
    store().setGestureActive(true);
    for (let i = 1; i <= 20; i++) store().updateElement('a', { xM: 1 + i * 0.05 });
    store().setGestureActive(false);
    expect(history().pastStates.length).toBe(1);
    history().undo();
    expect(store().elements[0].xM).toBe(1);
    history().redo();
    expect(store().elements[0].xM).toBeCloseTo(2, 5);
  });

  it('a gesture that changes nothing leaves no undo step', () => {
    store().hydrate([makeEl('a')]);
    store().setGestureActive(true);
    store().setGestureActive(false);
    expect(history().pastStates.length).toBe(0);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('typing in a field is one undo step, written with a short delay', () => {
    store().hydrate([makeEl('a')]);
    store().beginHistoryStep();
    store().updateElement('a', { label: 'T' });
    store().updateElement('a', { label: 'To' });
    store().updateElement('a', { label: 'Tom' });
    store().endHistoryStep();
    expect(history().pastStates.length).toBe(1);
    expect(mockSchedule.mock.calls.every((c) => (c[2] as number) > 0)).toBe(true);
    history().undo();
    expect(store().elements[0].label).toBe('a');
  });

  it('a new change after an undo drops the redo steps', () => {
    store().hydrate([makeEl('a')]);
    store().updateElement('a', { xM: 2 });
    history().undo();
    store().setGestureActive(true);
    store().updateElement('a', { xM: 3 });
    store().setGestureActive(false);
    expect(history().futureStates.length).toBe(0);
  });
});

describe('delete with a way back (EDIT3-10)', () => {
  it('deleteSelected soft-deletes all selected elements as one undo step and clears the selection', () => {
    store().hydrate([makeEl('a'), makeEl('b'), makeEl('c')]);
    store().setSelectedIds(['a', 'b']);
    mockSchedule.mockClear();
    const ids = store().deleteSelected();
    expect(ids).toEqual(['a', 'b']);
    expect(store().elements.filter((e) => e.deletedAt === null).map((e) => e.id)).toEqual(['c']);
    expect(store().selectedIds).toEqual([]);
    expect(history().pastStates.length).toBe(1);
    expect(savedIds().sort()).toEqual(['a', 'b']);
  });

  it('restoreElements brings them back and writes them', () => {
    store().hydrate([makeEl('a'), makeEl('b')]);
    store().setSelectedIds(['a']);
    const ids = store().deleteSelected();
    mockSchedule.mockClear();
    store().restoreElements(ids);
    expect(store().elements.every((e) => e.deletedAt === null)).toBe(true);
    expect(mockSchedule).toHaveBeenCalledWith('account', expect.objectContaining({ id: 'a', deletedAt: null }), 0);
  });

  it('deleteSelected with nothing selected does nothing', () => {
    store().hydrate([makeEl('a')]);
    expect(store().deleteSelected()).toEqual([]);
    expect(history().pastStates.length).toBe(0);
  });
});

describe('duplicate and layer order (EDIT3-10)', () => {
  it('duplicateSelected copies with new ids, offset, on top, and selects the copies', () => {
    store().hydrate([
      makeEl('a', { provenance: { zOrder: 3, rotateDeg: 30 } }),
      makeEl('b', { provenance: { zOrder: 7 } }),
    ]);
    store().setSelectedIds(['a']);
    let n = 0;
    store().duplicateSelected(() => `copy-${(n += 1)}`, GARDEN);
    const copy = store().elements.find((e) => e.id === 'copy-1')!;
    expect(copy).toBeDefined();
    expect(copy.xM).toBeCloseTo(1.5, 5);
    expect(copy.yM).toBeCloseTo(1.5, 5);
    expect(copy.provenance).toMatchObject({ rotateDeg: 30, zOrder: 8 });
    expect(store().selectedIds).toEqual(['copy-1']);
    expect(store().elements.find((e) => e.id === 'a')!.xM).toBe(1);
    expect(history().pastStates.length).toBe(1);
  });

  it('a copy never leaves the parcel', () => {
    store().hydrate([makeEl('a', { xM: 11.9, yM: 12.9 })]);
    store().setSelectedIds(['a']);
    store().duplicateSelected(() => 'copy', GARDEN);
    const copy = store().elements.find((e) => e.id === 'copy')!;
    expect(copy.xM).toBe(12);
    expect(copy.yM).toBe(13);
  });

  it('reorderSelected moves the selection above or below everything else', () => {
    const z = (id: string) => (store().elements.find((e) => e.id === id)!.provenance as { zOrder: number }).zOrder;
    store().hydrate([
      makeEl('a', { provenance: { zOrder: 1 } }),
      makeEl('b', { provenance: { zOrder: 2 } }),
      makeEl('c', { provenance: { zOrder: 3 } }),
    ]);
    store().setSelectedIds(['a']);
    store().reorderSelected('front');
    expect(z('a')).toBeGreaterThan(z('c'));
    store().setSelectedIds(['a', 'c']);
    store().reorderSelected('back');
    expect(z('a')).toBeLessThan(z('b'));
    expect(z('c')).toBeLessThan(z('b'));
    // Their order among themselves is kept.
    expect(z('c')).toBeLessThan(z('a'));
  });
});
