// Phase 7 Plan 03 (Wave 2 GREEN): editorStore polygon-tool assertions (EDIT-05).
// Per CONTEXT D-09: tap-corner mode + explicit "Beet abschliessen" commit, mind. 3 points.

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

describe('editorStore > polygonAddPoint', () => {
  it('first tap initializes polygonInProgress with one point', () => {
    useEditorStore.getState().polygonAddPoint(1, 2, 'g-1');
    const p = useEditorStore.getState().polygonInProgress;
    expect(p).not.toBeNull();
    expect(p!.gardenId).toBe('g-1');
    expect(p!.pointsM).toEqual([{ x: 1, y: 2 }]);
  });

  it('subsequent taps append points to polygonInProgress.pointsM', () => {
    useEditorStore.getState().polygonAddPoint(0, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(2, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(1, 2, 'g-1');
    const p = useEditorStore.getState().polygonInProgress;
    expect(p!.pointsM).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
  });

  it('polygonAddPoint does NOT commit to elements (only on polygonCommit)', () => {
    useEditorStore.getState().polygonAddPoint(0, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(2, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(1, 2, 'g-1');
    expect(useEditorStore.getState().elements).toEqual([]);
  });
});

describe('editorStore > polygonCommit', () => {
  it('throws when polygonInProgress is null', () => {
    expect(() =>
      useEditorStore.getState().polygonCommit('Beet 1', 'g-1', 'u-1'),
    ).toThrow('no polygon in progress');
  });

  it('throws when polygonInProgress.pointsM.length < 3 with message "polygon needs at least 3 points"', () => {
    useEditorStore.getState().polygonAddPoint(0, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(1, 0, 'g-1');
    expect(() =>
      useEditorStore.getState().polygonCommit('Beet', 'g-1', 'u-1'),
    ).toThrow('polygon needs at least 3 points');
  });

  it('commits a new Beet element with xM/yM = bbox centroid (via geometry.bedLayout.polygonToBbox)', () => {
    useEditorStore.getState().polygonAddPoint(0, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(2, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(1, 2, 'g-1');
    useEditorStore.getState().polygonCommit('Hochbeet', 'g-1', 'u-1');
    const els = useEditorStore.getState().elements;
    expect(els).toHaveLength(1);
    expect(els[0]).toMatchObject({
      elementType: 'Beet',
      label: 'Hochbeet',
      xM: 1,
      yM: 1,
    });
  });

  it('commits with widthM/heightM = bbox width/height', () => {
    useEditorStore.getState().polygonAddPoint(0, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(4, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(2, 3, 'g-1');
    useEditorStore.getState().polygonCommit('Bed', 'g-1', 'u-1');
    const el = useEditorStore.getState().elements[0];
    expect(el.widthM).toBe(4);
    expect(el.heightM).toBe(3);
  });

  it('commits with provenance.polygonPointsM = original tap coords (preserve polygon shape)', () => {
    useEditorStore.getState().polygonAddPoint(0, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(2, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(1, 2, 'g-1');
    useEditorStore.getState().polygonCommit('Bed', 'g-1', 'u-1');
    const provenance = useEditorStore.getState().elements[0].provenance as Record<string, unknown>;
    expect(provenance.source).toBe('manual');
    expect(provenance.polygonPointsM).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
  });

  it('commits with layer="infrastructure" (Beete are infrastructure)', () => {
    useEditorStore.getState().polygonAddPoint(0, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(2, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(1, 2, 'g-1');
    useEditorStore.getState().polygonCommit('Bed', 'g-1', 'u-1');
    expect(useEditorStore.getState().elements[0].layer).toBe('infrastructure');
  });

  it('clears polygonInProgress and sets tool back to "select" after commit', () => {
    useEditorStore.setState({ tool: 'polygon' });
    useEditorStore.getState().polygonAddPoint(0, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(2, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(1, 2, 'g-1');
    useEditorStore.getState().polygonCommit('Bed', 'g-1', 'u-1');
    expect(useEditorStore.getState().polygonInProgress).toBeNull();
    expect(useEditorStore.getState().tool).toBe('select');
  });
});

describe('editorStore > polygonCancel', () => {
  it('clears polygonInProgress without committing', () => {
    useEditorStore.getState().polygonAddPoint(0, 0, 'g-1');
    useEditorStore.getState().polygonAddPoint(2, 0, 'g-1');
    useEditorStore.getState().polygonCancel();
    expect(useEditorStore.getState().polygonInProgress).toBeNull();
    expect(useEditorStore.getState().elements).toEqual([]);
  });

  it('sets tool back to "select"', () => {
    useEditorStore.setState({ tool: 'polygon' });
    useEditorStore.getState().polygonCancel();
    expect(useEditorStore.getState().tool).toBe('select');
  });
});
