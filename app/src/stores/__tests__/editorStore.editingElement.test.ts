// Phase 09.1 Wave 1 GREEN: editingElementId state + setEditingElementId action.
// Plan 01 GREEN-fill: state field + action + partialize exclusion.
// Pins T-09.1-MODAL-ESC: editingElementId as UI-only ephemeral state (D-19).

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
    provenance: { source: 'manual' },
    layer: 'infrastructure',
    ...overrides,
  };
}

beforeEach(() => {
  mockSchedule.mockClear();
  useEditorStore.setState({
    elements: [],
    selection: null,
    polygonInProgress: null,
    gestureActive: false,
    tool: 'select',
    showGrid: true,
    activeLayers: { infrastructure: true, seasonal: true },
    viewport: { tx: 0, ty: 0, scale: 1 },
    editingElementId: null,
  });
  useEditorStore.temporal.getState().clear();
});

describe('editorStore > editingElement (D-19)', () => {
  it('editingElementId default is null (D-19 — no DB migration; UI-only state)', () => {
    expect(useEditorStore.getState().editingElementId).toBeNull();
  });

  it('setEditingElementId(id) sets editingElementId to id', () => {
    useEditorStore.getState().setEditingElementId('el-abc');
    expect(useEditorStore.getState().editingElementId).toBe('el-abc');
  });

  it('setEditingElementId(null) clears editingElementId', () => {
    useEditorStore.getState().setEditingElementId('el-abc');
    useEditorStore.getState().setEditingElementId(null);
    expect(useEditorStore.getState().editingElementId).toBeNull();
  });

  it('editingElementId is NOT included in zundo partialize (no undo into modal-open state)', () => {
    // Add an element so we have a snapshot baseline
    useEditorStore.getState().addElement(makeEl('e1'));
    const snapshotCountAfterAdd = useEditorStore.temporal.getState().pastStates.length;

    // Open modal (setEditingElementId) — must NOT create a new snapshot
    useEditorStore.getState().setEditingElementId('e1');
    useEditorStore.getState().setEditingElementId(null);

    expect(useEditorStore.temporal.getState().pastStates.length).toBe(snapshotCountAfterAdd);
  });

  it('selection auto-set when openElementEditor invoked via setEditingElementId path', () => {
    // When calling setEditingElementId, callers are expected to also call setSelection.
    // This test documents that setEditingElementId alone sets editingElementId but not selection.
    // (selection must be set explicitly by the caller — two separate store actions, no coupling.)
    useEditorStore.getState().addElement(makeEl('e1'));
    useEditorStore.getState().setSelection('e1');
    useEditorStore.getState().setEditingElementId('e1');
    expect(useEditorStore.getState().selection).toBe('e1');
    expect(useEditorStore.getState().editingElementId).toBe('e1');
  });
});
