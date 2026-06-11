// Quick 260611-l5y: Regression test for gesture-end move persistence (RED).
// Verifies: setGestureActive(false) after updateElement-during-gesture triggers scheduleSaveElement.
// Root Cause: Autosave subscription bails early (gestureActive=true during move, elements unchanged on release).
// Must FAIL before the fix in editorStore.ts (Task 2 GREEN).

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
    elementType: 'Pflanze',
    label: id,
    xM: 1,
    yM: 1,
    widthM: 1,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-06-11T10:00:00.000Z',
    updatedAt: '2026-06-11T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: 'seasonal',
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
    editingElementId: null,
  });
  useEditorStore.temporal.getState().clear();
});

describe('editorStore > gestureCommitPersist — Move/Resize/Rotate → persist on gesture end', () => {
  // Test 1: Core roundtrip — real drag-release sequence
  // updateElement runs DURING gesture (gestureActive=true), release is ONLY setGestureActive(false).
  // This is the exact sequence from WebPlanEditor.tsx onMove + onUp.
  it('setGestureActive(false) after drag flushes moved element to scheduleSaveElement (real drag-release sequence)', () => {
    const { addElement, setGestureActive, updateElement } = useEditorStore.getState();

    // Place element at center (as addPlantToPlan does via useKalenderData)
    addElement(makeEl('e1', { xM: 1, yM: 1 }));
    mockSchedule.mockClear();

    // Gesture begins (WebPlanEditor threshold-promotion)
    setGestureActive(true);

    // Move DURING gesture — no save expected (Pitfall-5)
    updateElement('e1', { xM: 5, yM: 4 });
    expect(mockSchedule).not.toHaveBeenCalled(); // Pitfall-5 still intact

    // Release — ONLY setGestureActive(false), as WebPlanEditor.tsx onUp does
    setGestureActive(false);

    // Fix required: scheduleSaveElement must be called with the final position
    expect(mockSchedule).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({ id: 'e1', xM: 5, yM: 4 }),
    );

    // In-memory state also correct
    const el = useEditorStore.getState().elements[0];
    expect(el.xM).toBe(5);
    expect(el.yM).toBe(4);
  });

  // Test 2: Resize/Rotate — same transition pattern
  it('setGestureActive(false) after resize+rotate flushes final snapshot to scheduleSaveElement', () => {
    const { addElement, setGestureActive, updateElement } = useEditorStore.getState();

    addElement(makeEl('e2'));
    mockSchedule.mockClear();

    setGestureActive(true);
    updateElement('e2', { widthM: 3, heightM: 2 });
    updateElement('e2', { provenance: { source: 'manual', rotateDeg: 45 } });

    setGestureActive(false);

    expect(mockSchedule).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({
        id: 'e2',
        widthM: 3,
        heightM: 2,
        provenance: expect.objectContaining({ rotateDeg: 45 }),
      }),
    );
  });

  // Test 3: No false-positive save when no element was changed during gesture
  it('setGestureActive(true→false) without updateElement does NOT trigger scheduleSaveElement', () => {
    const { addElement, setGestureActive } = useEditorStore.getState();

    addElement(makeEl('e3'));
    mockSchedule.mockClear();

    // Gesture start/end with no element changes in between
    setGestureActive(true);
    setGestureActive(false);

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  // Test 4: Multiple elements changed in the same gesture → all flushed
  it('multiple elements updated during one gesture are all flushed on setGestureActive(false)', () => {
    const { addElement, setGestureActive, updateElement } = useEditorStore.getState();

    addElement(makeEl('a', { xM: 0, yM: 0 }));
    addElement(makeEl('b', { xM: 0, yM: 0 }));
    mockSchedule.mockClear();

    setGestureActive(true);
    updateElement('a', { xM: 9 });
    updateElement('b', { yM: 8 });
    setGestureActive(false);

    const calledIds = mockSchedule.mock.calls.map((c) => (c[1] as PlanElementRow).id);
    expect(calledIds).toContain('a');
    expect(calledIds).toContain('b');

    const callA = mockSchedule.mock.calls.find((c) => (c[1] as PlanElementRow).id === 'a');
    const callB = mockSchedule.mock.calls.find((c) => (c[1] as PlanElementRow).id === 'b');
    expect(callA?.[1]).toMatchObject({ id: 'a', xM: 9 });
    expect(callB?.[1]).toMatchObject({ id: 'b', yM: 8 });
  });
});
