// quick-260615-utj: Mehrfach-Selektion im Web-Plan-Editor — Store-Tests (TDD RED).
// Testet selectedIds Multi-Select-State + Actions (toggle/setMany/clear/group-move).

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
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
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
    selectedIds: [],
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

describe('editorStore > Multi-Select-State (quick-260615-utj)', () => {
  // T-utj-store-01: setSelection synchronisiert selectedIds
  it('T-utj-store-01: setSelection(id) setzt selectedIds=[id]; setSelection(null) leert beide', () => {
    useEditorStore.getState().setSelection('e-1');
    expect(useEditorStore.getState().selection).toBe('e-1');
    expect(useEditorStore.getState().selectedIds).toEqual(['e-1']);

    useEditorStore.getState().setSelection(null);
    expect(useEditorStore.getState().selection).toBeNull();
    expect(useEditorStore.getState().selectedIds).toEqual([]);
  });

  // T-utj-store-02: toggleSelection fügt zweites Element additiv hinzu
  it('T-utj-store-02: toggleSelection fügt zweites Element additiv hinzu (selectedIds.length===2)', () => {
    useEditorStore.getState().setSelection('e-1');
    useEditorStore.getState().toggleSelection('e-2');
    const state = useEditorStore.getState();
    expect(state.selectedIds).toHaveLength(2);
    expect(state.selectedIds).toContain('e-1');
    expect(state.selectedIds).toContain('e-2');
    // selection = zuletzt hinzugefügtes Element
    expect(state.selection).toBe('e-2');
  });

  // T-utj-store-03: toggleSelection auf bereits selektiertes entfernt es
  it('T-utj-store-03: toggleSelection auf bereits selektiertes entfernt es; selection fällt auf verbleibendes/null', () => {
    useEditorStore.getState().setSelection('e-1');
    useEditorStore.getState().toggleSelection('e-2');
    // Jetzt beide selektiert: ['e-1','e-2'], selection='e-2'
    useEditorStore.getState().toggleSelection('e-2');
    const state = useEditorStore.getState();
    expect(state.selectedIds).toEqual(['e-1']);
    expect(state.selection).toBe('e-1');

    // Auch das letzte Element entfernen
    useEditorStore.getState().toggleSelection('e-1');
    const state2 = useEditorStore.getState();
    expect(state2.selectedIds).toEqual([]);
    expect(state2.selection).toBeNull();
  });

  // T-utj-store-04: setSelectedIds setzt selection auf letztes Element
  it('T-utj-store-04: setSelectedIds([a,b,c]) setzt selection=c', () => {
    useEditorStore.getState().setSelectedIds(['e-a', 'e-b', 'e-c']);
    const state = useEditorStore.getState();
    expect(state.selectedIds).toEqual(['e-a', 'e-b', 'e-c']);
    expect(state.selection).toBe('e-c');
  });

  // T-utj-store-04b: setSelectedIds([]) leert beide
  it('T-utj-store-04b: setSelectedIds([]) leert selectedIds und selection', () => {
    useEditorStore.getState().setSelectedIds(['e-a', 'e-b']);
    useEditorStore.getState().setSelectedIds([]);
    const state = useEditorStore.getState();
    expect(state.selectedIds).toEqual([]);
    expect(state.selection).toBeNull();
  });

  // T-utj-store-05: clearSelection leert selectedIds + selection
  it('T-utj-store-05: clearSelection leert selectedIds + selection', () => {
    useEditorStore.getState().setSelectedIds(['e-a', 'e-b', 'e-c']);
    useEditorStore.getState().clearSelection();
    const state = useEditorStore.getState();
    expect(state.selectedIds).toEqual([]);
    expect(state.selection).toBeNull();
  });

  // T-utj-store-06: moveSelectedBy verschiebt alle selektierten Elemente
  it('T-utj-store-06: moveSelectedBy(dx,dy) verschiebt alle selektierten Elemente um den Delta-Wert', () => {
    const elA = makeEl('e-a', { xM: 2, yM: 3 });
    const elB = makeEl('e-b', { xM: 5, yM: 1 });
    useEditorStore.getState().addElement(elA);
    useEditorStore.getState().addElement(elB);
    useEditorStore.getState().setSelectedIds(['e-a', 'e-b']);

    useEditorStore.getState().moveSelectedBy(1.0, 0.5);

    const elements = useEditorStore.getState().elements;
    const a = elements.find((e) => e.id === 'e-a')!;
    const b = elements.find((e) => e.id === 'e-b')!;
    expect(a.xM).toBeCloseTo(3.0);
    expect(a.yM).toBeCloseTo(3.5);
    expect(b.xM).toBeCloseTo(6.0);
    expect(b.yM).toBeCloseTo(1.5);
  });

  // T-utj-store-07: moveSelectedBy ignoriert deletedAt!==null und tut nichts bei leerem selectedIds
  it('T-utj-store-07: moveSelectedBy ignoriert deletedAt!==null Elemente und tut nichts bei leerem selectedIds', () => {
    const elA = makeEl('e-a', { xM: 2, yM: 2, deletedAt: '2026-06-15T10:00:00.000Z' });
    const elB = makeEl('e-b', { xM: 3, yM: 3 });
    useEditorStore.getState().addElement(elA);
    useEditorStore.getState().addElement(elB);

    // Test 1: selectedIds leer → nichts passiert
    useEditorStore.getState().clearSelection();
    useEditorStore.getState().moveSelectedBy(1.0, 1.0);
    const elementsAfterEmpty = useEditorStore.getState().elements;
    const aAfterEmpty = elementsAfterEmpty.find((e) => e.id === 'e-a')!;
    expect(aAfterEmpty.xM).toBeCloseTo(2.0); // unverändert

    // Test 2: gelöschtes Element in selectedIds → wird ignoriert
    useEditorStore.getState().setSelectedIds(['e-a', 'e-b']);
    useEditorStore.getState().moveSelectedBy(1.0, 1.0);
    const elements = useEditorStore.getState().elements;
    const aAfter = elements.find((e) => e.id === 'e-a')!;
    const bAfter = elements.find((e) => e.id === 'e-b')!;
    expect(aAfter.xM).toBeCloseTo(2.0); // gelöscht — unverändert
    expect(bAfter.xM).toBeCloseTo(4.0); // verschoben
  });

  // T-utj-store-08: Persistenz — gestureActive-Flush ruft scheduleSaveElement für jedes bewegte Element
  it('T-utj-store-08: Persistenz: setGestureActive(true) → moveSelectedBy → setGestureActive(false) ruft scheduleSaveElement für jedes bewegte Element', () => {
    const elA = makeEl('e-a', { xM: 2, yM: 2 });
    const elB = makeEl('e-b', { xM: 5, yM: 5 });
    useEditorStore.getState().addElement(elA);
    useEditorStore.getState().addElement(elB);
    useEditorStore.getState().setSelectedIds(['e-a', 'e-b']);

    useEditorStore.getState().setGestureActive(true);
    useEditorStore.getState().moveSelectedBy(0.5, 0.5);
    mockSchedule.mockClear(); // Gesturestart-Calls ignorieren
    useEditorStore.getState().setGestureActive(false);

    // Flush: scheduleSaveElement muss für beide Elemente aufgerufen worden sein
    const calledIds = mockSchedule.mock.calls.map((c: unknown[]) => (c[1] as { id: string }).id);
    expect(calledIds).toContain('e-a');
    expect(calledIds).toContain('e-b');
  });
});
