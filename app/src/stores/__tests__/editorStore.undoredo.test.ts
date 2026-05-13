// Phase 7 Plan 03 (Wave 2 GREEN): editorStore zundo temporal middleware assertions
// (EDIT-11, Pitfall-3). limit=20, partialize={elements}, equality shallow ref dedup.

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

function makeEl(id: string): PlanElementRow {
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
  });
  useEditorStore.temporal.getState().clear();
});

describe('editorStore.temporal > undo/redo basics (EDIT-11)', () => {
  it('addElement then undo() removes the element', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    expect(useEditorStore.getState().elements).toHaveLength(1);
    useEditorStore.temporal.getState().undo();
    expect(useEditorStore.getState().elements).toHaveLength(0);
  });

  it('addElement then undo() then redo() restores the element', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    useEditorStore.temporal.getState().undo();
    useEditorStore.temporal.getState().redo();
    expect(useEditorStore.getState().elements).toHaveLength(1);
    expect(useEditorStore.getState().elements[0].id).toBe('e1');
  });

  it('undo when pastStates is empty is a no-op (does not throw)', () => {
    expect(() => useEditorStore.temporal.getState().undo()).not.toThrow();
    expect(useEditorStore.getState().elements).toEqual([]);
  });

  it('redo when futureStates is empty is a no-op (does not throw)', () => {
    expect(() => useEditorStore.temporal.getState().redo()).not.toThrow();
    expect(useEditorStore.getState().elements).toEqual([]);
  });
});

describe('editorStore.temporal > 20-step limit (EDIT-11)', () => {
  it('after 25 addElement mutations, pastStates.length === 20 (oldest 5 are dropped)', () => {
    for (let i = 1; i <= 25; i += 1) {
      useEditorStore.getState().addElement(makeEl(`e${i}`));
    }
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(20);
  });

  it('after 25 mutations and 20 undos, restored state matches state after mutation 5 (not mutation 0)', () => {
    for (let i = 1; i <= 25; i += 1) {
      useEditorStore.getState().addElement(makeEl(`e${i}`));
    }
    // Undo all 20 available snapshots. We end up at the state captured when the oldest
    // remaining past-snapshot was taken — which corresponds to the state after mutation 5.
    for (let i = 0; i < 20; i += 1) {
      useEditorStore.temporal.getState().undo();
    }
    const ids = useEditorStore.getState().elements.map((e) => e.id);
    expect(ids).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
  });
});

describe('editorStore.temporal > partialize excludes selection/viewport/tool (Pitfall-3)', () => {
  it('changing selection does NOT add a snapshot to pastStates', () => {
    const before = useEditorStore.temporal.getState().pastStates.length;
    useEditorStore.getState().setSelection('e1');
    useEditorStore.getState().setSelection(null);
    const after = useEditorStore.temporal.getState().pastStates.length;
    expect(after).toBe(before);
  });

  it('changing viewport (pan/zoom) does NOT add a snapshot', () => {
    const before = useEditorStore.temporal.getState().pastStates.length;
    useEditorStore.setState({ viewport: { tx: 50, ty: 30, scale: 2 } });
    const after = useEditorStore.temporal.getState().pastStates.length;
    expect(after).toBe(before);
  });

  it('changing tool does NOT add a snapshot', () => {
    const before = useEditorStore.temporal.getState().pastStates.length;
    useEditorStore.getState().setTool('polygon');
    useEditorStore.getState().setTool('select');
    const after = useEditorStore.temporal.getState().pastStates.length;
    expect(after).toBe(before);
  });

  it('snapshot equality function uses reference check (a.elements === b.elements) to dedup', () => {
    // setSelection does not touch `elements`, so the new partialized state has the same
    // array reference as the previous one — equality returns true, no snapshot pushed.
    useEditorStore.getState().addElement(makeEl('e1'));
    const afterAdd = useEditorStore.temporal.getState().pastStates.length;
    useEditorStore.getState().setSelection('e1');
    useEditorStore.getState().setSelection(null);
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(afterAdd);
  });
});

describe('editorStore.temporal > selection cleared on undo (Open Q 4)', () => {
  it('after undo, selection is reset to null (avoid stale pointer to deleted element)', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    useEditorStore.getState().setSelection('e1');
    expect(useEditorStore.getState().selection).toBe('e1');
    useEditorStore.temporal.getState().undo();
    expect(useEditorStore.getState().selection).toBeNull();
  });

  it('after redo, selection stays null (user reselects explicitly)', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    useEditorStore.getState().setSelection('e1');
    useEditorStore.temporal.getState().undo();
    useEditorStore.getState().setSelection('something-stale');
    useEditorStore.temporal.getState().redo();
    expect(useEditorStore.getState().selection).toBeNull();
  });
});
