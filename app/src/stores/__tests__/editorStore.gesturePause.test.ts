// Phase 09.1 Wave 1 GREEN: zundo pause/resume during gestureActive (D-22, RESEARCH §Pattern 11).
// Plan 01 GREEN-fill: subscription pauses zundo on gestureActive=true, resumes on false.
// Pins T-09.1-Z-INTEGRITY: one snapshot per drag gesture end.

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

describe('editorStore > gesturePause (D-22, Pattern 11)', () => {
  it('drag operations during gestureActive do NOT spam zundo history (Pattern 11)', () => {
    useEditorStore.getState().addElement(makeEl('e1'));
    const before = useEditorStore.temporal.getState().pastStates.length;
    useEditorStore.getState().setGestureActive(true);
    for (let i = 0; i < 30; i++) {
      useEditorStore.getState().updateElement('e1', { xM: i * 0.1 });
    }
    useEditorStore.getState().setGestureActive(false);
    useEditorStore.getState().updateElement('e1', { xM: 3 });
    const after = useEditorStore.temporal.getState().pastStates.length;
    expect(after - before).toBe(1);
  });

  it('zundo.temporal.getState().pause is invoked on gestureActive=true', () => {
    const pauseSpy = jest.spyOn(useEditorStore.temporal.getState(), 'pause');
    useEditorStore.getState().setGestureActive(true);
    expect(pauseSpy).toHaveBeenCalled();
    pauseSpy.mockRestore();
    // Cleanup: resume so store is in clean state
    useEditorStore.getState().setGestureActive(false);
  });

  it('zundo.temporal.getState().resume is invoked on gestureActive=false', () => {
    // First set active so transition false→true is clean
    useEditorStore.getState().setGestureActive(true);
    const resumeSpy = jest.spyOn(useEditorStore.temporal.getState(), 'resume');
    useEditorStore.getState().setGestureActive(false);
    expect(resumeSpy).toHaveBeenCalled();
    resumeSpy.mockRestore();
  });

  it('one final updateElement after gesture end captures exactly one snapshot (D-22)', () => {
    useEditorStore.getState().addElement(makeEl('e1'));

    // Bring into a clean post-gesture state: gestureActive was false (from beforeEach),
    // updateElement should produce exactly 1 snapshot here.
    const before = useEditorStore.temporal.getState().pastStates.length;
    useEditorStore.getState().updateElement('e1', { xM: 5 });
    const after = useEditorStore.temporal.getState().pastStates.length;

    // One updateElement outside gestureActive must append exactly 1 snapshot
    expect(after - before).toBe(1);
  });
});
