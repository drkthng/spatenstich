// Phase 7 Plan 03 (Wave 2 GREEN): editorStore rotation + scale action test scaffold (EDIT-04).
// Per CONTEXT D-04: rotation stored as provenance.rotateDeg (no schema column — Open Q 3, A11).

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
  });
  useEditorStore.temporal.getState().clear();
});

describe('editorStore > rotation (EDIT-04)', () => {
  it('updateElement with patch.provenance.rotateDeg writes the new angle to that element', () => {
    const el = makeEl('e1');
    useEditorStore.getState().addElement(el);
    useEditorStore
      .getState()
      .updateElement('e1', { provenance: { source: 'manual', rotateDeg: 45 } });
    const after = useEditorStore.getState().elements.find((e) => e.id === 'e1');
    expect(after?.provenance).toEqual({ source: 'manual', rotateDeg: 45 });
  });

  it('rotation persists 0..359 degrees (caller normalizes via modulo before writing)', () => {
    const el = makeEl('e1');
    useEditorStore.getState().addElement(el);
    for (const deg of [0, 90, 180, 270, 359]) {
      useEditorStore
        .getState()
        .updateElement('e1', { provenance: { source: 'manual', rotateDeg: deg } });
      const after = useEditorStore.getState().elements.find((e) => e.id === 'e1');
      expect((after?.provenance as Record<string, unknown>).rotateDeg).toBe(deg);
    }
  });

  it('rotation snapshot is captured by zundo (undoable)', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    useEditorStore
      .getState()
      .updateElement('e1', { provenance: { source: 'manual', rotateDeg: 90 } });
    const before = useEditorStore.getState().elements[0].provenance;
    expect(before).toEqual({ source: 'manual', rotateDeg: 90 });
    useEditorStore.temporal.getState().undo();
    const afterUndo = useEditorStore.getState().elements[0].provenance;
    expect(afterUndo).toEqual({ source: 'manual' });
  });
});

describe('editorStore > scale (EDIT-04)', () => {
  it('updateElement with patch.widthM/heightM writes new dimensions', () => {
    useEditorStore.getState().addElement(makeEl('e1', { widthM: 1, heightM: 1 }));
    useEditorStore.getState().updateElement('e1', { widthM: 2.5, heightM: 1.7 });
    const after = useEditorStore.getState().elements.find((e) => e.id === 'e1');
    expect(after?.widthM).toBe(2.5);
    expect(after?.heightM).toBe(1.7);
  });

  it('scale preserves provenance.rotateDeg if previously set', () => {
    useEditorStore
      .getState()
      .addElement(makeEl('e1', { provenance: { source: 'manual', rotateDeg: 45 } }));
    useEditorStore.getState().updateElement('e1', { widthM: 3 });
    const after = useEditorStore.getState().elements.find((e) => e.id === 'e1');
    expect(after?.widthM).toBe(3);
    expect((after?.provenance as Record<string, unknown>).rotateDeg).toBe(45);
  });

  it('scale snapshot is captured by zundo (undoable)', () => {
    useEditorStore.getState().addElement(makeEl('e1', { widthM: 1, heightM: 1 }));
    useEditorStore.getState().updateElement('e1', { widthM: 5, heightM: 5 });
    expect(useEditorStore.getState().elements[0].widthM).toBe(5);
    useEditorStore.temporal.getState().undo();
    expect(useEditorStore.getState().elements[0].widthM).toBe(1);
    expect(useEditorStore.getState().elements[0].heightM).toBe(1);
  });
});
