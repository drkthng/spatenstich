// Phase 7 Plan 03 (Wave 2 GREEN): editorStore drag-drop assertions (EDIT-03, Pitfall-5).
// Per RESEARCH Pattern 3 + Pitfall 5: drop-only commit (no interim coord persistence during gesture).

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

function makeEl(
  id: string,
  overrides: Partial<PlanElementRow> = {},
): PlanElementRow {
  const base: PlanElementRow = {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: id,
    xM: 1,
    yM: 2,
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
  return { ...base, ...overrides };
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

describe('editorStore > addElement (drop commit)', () => {
  it('addElement appends a new PlanElementRow with elementType="Beet" and the dropped coords', () => {
    useEditorStore.getState().addElement(makeEl('e1', { xM: 3.5, yM: 4.2 }));
    const elements = useEditorStore.getState().elements;
    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({ id: 'e1', elementType: 'Beet', xM: 3.5, yM: 4.2 });
  });

  it('addElement preserves layer="infrastructure" for non-plant kinds', () => {
    useEditorStore.getState().addElement(makeEl('bed-1', { elementType: 'Beet' }));
    expect(useEditorStore.getState().elements[0].layer).toBe('infrastructure');
  });

  it('addElement preserves layer="seasonal" when caller supplies kind="Pflanze"', () => {
    useEditorStore
      .getState()
      .addElement(makeEl('p-1', { elementType: 'Pflanze', layer: 'seasonal' }));
    expect(useEditorStore.getState().elements[0].layer).toBe('seasonal');
  });

  it('addElement preserves provenance={ source: "manual" } for editor-created elements', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    expect(useEditorStore.getState().elements[0].provenance).toEqual({ source: 'manual' });
  });

  it('addElement preserves isAccepted=true and confidence=null (manual elements have no AI confidence)', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    const el = useEditorStore.getState().elements[0];
    expect(el.isAccepted).toBe(true);
    expect(el.confidence).toBeNull();
  });
});

describe('editorStore > updateElement (drag-in-progress vs commit) — Pitfall-5', () => {
  it('updateElement during active gesture flag does NOT schedule a save', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    mockSchedule.mockClear();
    useEditorStore.setState({ gestureActive: true });
    useEditorStore.getState().updateElement('e1', { xM: 5.5 });
    expect(useEditorStore.getState().elements[0].xM).toBe(5.5);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('updateElement on gesture end (gestureActive=false) commits to store AND schedules a save', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    mockSchedule.mockClear();
    useEditorStore.setState({ gestureActive: false });
    useEditorStore.getState().updateElement('e1', { xM: 7 });
    expect(useEditorStore.getState().elements[0].xM).toBe(7);
    expect(mockSchedule).toHaveBeenCalled();
    expect(mockSchedule).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({ id: 'e1', xM: 7 }),
    );
  });

  it('updateElement preserves all fields not in the patch', () => {
    useEditorStore.getState().addElement(makeEl('e1', { widthM: 2, heightM: 3 }));
    useEditorStore.getState().updateElement('e1', { xM: 99 });
    const after = useEditorStore.getState().elements[0];
    expect(after.widthM).toBe(2);
    expect(after.heightM).toBe(3);
    expect(after.label).toBe('e1');
    expect(after.xM).toBe(99);
  });
});

describe('editorStore > deleteElement (soft-delete)', () => {
  it('deleteElement sets deletedAt timestamp; element is NOT removed from the array', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    useEditorStore.getState().deleteElement('e1');
    const elements = useEditorStore.getState().elements;
    expect(elements).toHaveLength(1);
    expect(elements[0].deletedAt).not.toBeNull();
    expect(typeof elements[0].deletedAt).toBe('string');
  });

  it('deleteElement leaves other elements untouched', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    useEditorStore.getState().addElement(makeEl('e2'));
    useEditorStore.getState().deleteElement('e1');
    const elements = useEditorStore.getState().elements;
    expect(elements.find((e) => e.id === 'e1')?.deletedAt).not.toBeNull();
    expect(elements.find((e) => e.id === 'e2')?.deletedAt).toBeNull();
  });

  it('deleted elements remain in the array but have a non-null deletedAt (caller filters at render time)', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    useEditorStore.getState().addElement(makeEl('e2'));
    useEditorStore.getState().deleteElement('e1');
    const live = useEditorStore.getState().elements.filter((e) => e.deletedAt === null);
    expect(live.map((e) => e.id)).toEqual(['e2']);
  });
});
