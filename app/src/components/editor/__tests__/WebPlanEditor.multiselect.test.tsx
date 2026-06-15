// quick-260615-utj: Mehrfach-Selektion im Web-Plan-Editor — Component-Tests (TDD RED).
// Testet: Ctrl/Cmd-Klick, Marquee, Gruppen-Drag, Gruppen-Pfeiltasten, Gruppen-Delete, Multi-Outline-Rendering.

import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

const mockSetEditingElementId = jest.fn();
const mockSetSelection = jest.fn();
const mockToggleSelection = jest.fn();
const mockSetSelectedIds = jest.fn();
const mockClearSelection = jest.fn();
const mockMoveSelectedBy = jest.fn();
const mockSetGestureActive = jest.fn();
const mockUpdateElement = jest.fn();
const mockDeleteElement = jest.fn();
const mockAddElement = jest.fn();

const editorState: any = {
  elements: [],
  selection: null,
  selectedIds: [],
  showGrid: false,
  activeLayers: { infrastructure: true, seasonal: true },
  setEditingElementId: mockSetEditingElementId,
  setSelection: mockSetSelection,
  toggleSelection: mockToggleSelection,
  setSelectedIds: mockSetSelectedIds,
  clearSelection: mockClearSelection,
  moveSelectedBy: mockMoveSelectedBy,
  setGestureActive: mockSetGestureActive,
  updateElement: mockUpdateElement,
  deleteElement: mockDeleteElement,
  addElement: mockAddElement,
};

jest.mock('@/src/stores/editorStore', () => {
  const useEditorStore = Object.assign(
    (sel?: any) => (sel ? sel(editorState) : editorState),
    { getState: () => editorState },
  );
  return { useEditorStore };
});

// Mock react-native-svg — G und Rect bekommen testID weitergeleitet
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name: string) =>
    React.forwardRef(
      ({
        children,
        testID,
        onDoubleClick,
        onMouseDown,
        onClick,
        transform,
        strokeDasharray,
        fill,
        stroke,
        strokeWidth,
        pointerEvents,
        ...props
      }: any, ref: any) =>
        React.createElement(
          View,
          { testID, ref, onDoubleClick, onMouseDown, onClick, transform, strokeDasharray, fill, stroke, strokeWidth, ...props },
          children,
        ),
    );
  return {
    __esModule: true,
    default: stub('Svg'),
    Svg: stub('Svg'),
    Rect: stub('Rect'),
    Line: stub('Line'),
    Circle: stub('Circle'),
    Text: stub('Text'),
    G: stub('G'),
    Polygon: stub('Polygon'),
  };
});

jest.mock('../web/WebPaletteBar', () => ({
  WebPaletteBar: () => null,
}));

import { WebPlanEditor } from '../web/WebPlanEditor';

const dims = {
  id: 'd-1',
  gardenId: 'g-1',
  shape: 'rectangle' as const,
  widthM: 10,
  heightM: 10,
  extraDims: null,
  createdAt: '2026-06-15T10:00:00.000Z',
  updatedAt: '2026-06-15T10:00:00.000Z',
  updatedByUserId: 'u-1',
  deletedAt: null,
};

function makeEl(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: 'Test Beet',
    xM: 5,
    yM: 5,
    widthM: 2,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: 'infrastructure' as const,
    ...overrides,
  };
}

const defaultProps = {
  dimensions: dims,
  gardenId: 'g-1',
  userId: 'u-1',
  placingKind: null as string | null,
  plantMeta: null,
  onPlaced: jest.fn(),
  conflictElementIds: new Set<string>(),
};

// Hilfsfunktion: Element-G aus den gerenderten Views finden
// Das Element-G hat onMouseDown UND onDoubleClick (der Hintergrund-SVG hat nur onMouseDown)
const findElementGs = (views: any[]) =>
  views.filter((v: any) => v.props.onMouseDown && v.props.onDoubleClick);

// Hilfsfunktion: keydown auf window feuern
function fireArrowKey(key: string, shiftKey = false) {
  const evt = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  window.dispatchEvent(evt);
  return evt;
}

beforeEach(() => {
  mockSetEditingElementId.mockClear();
  mockSetSelection.mockClear();
  mockToggleSelection.mockClear();
  mockSetSelectedIds.mockClear();
  mockClearSelection.mockClear();
  mockMoveSelectedBy.mockClear();
  mockSetGestureActive.mockClear();
  mockUpdateElement.mockClear();
  mockDeleteElement.mockClear();
  mockAddElement.mockClear();
  editorState.elements = [];
  editorState.selection = null;
  editorState.selectedIds = [];
  (defaultProps.onPlaced as jest.Mock).mockClear();
});

describe('WebPlanEditor > Mehrfach-Selektion (quick-260615-utj)', () => {
  /**
   * T-utj-web-01: Ctrl-Klick auf zweites Element ruft toggleSelection(id) (nicht setSelection).
   */
  it('T-utj-web-01: Ctrl-Klick auf Element ruft toggleSelection(id) statt setSelection', () => {
    editorState.elements = [makeEl('e-1'), makeEl('e-2', { xM: 2, yM: 2 })];
    editorState.selection = 'e-1';
    editorState.selectedIds = ['e-1'];

    const { UNSAFE_getAllByType } = render(<WebPlanEditor {...defaultProps} />);
    const { View } = require('react-native');
    const gs = findElementGs(UNSAFE_getAllByType(View));
    expect(gs.length).toBeGreaterThanOrEqual(2);

    // Zweites Element mit Ctrl-Klick
    const secondG = gs[1];
    fireEvent(secondG, 'mouseDown', {
      clientX: 20,
      clientY: 20,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      stopPropagation: jest.fn(),
    });

    expect(mockToggleSelection).toHaveBeenCalledWith('e-2');
    expect(mockSetSelection).not.toHaveBeenCalledWith('e-2');
  });

  /**
   * T-utj-web-02: Cmd-Klick (metaKey) verhält sich wie Ctrl-Klick → toggleSelection.
   */
  it('T-utj-web-02: Cmd-Klick (metaKey) ruft ebenfalls toggleSelection(id)', () => {
    editorState.elements = [makeEl('e-1'), makeEl('e-2', { xM: 2, yM: 2 })];
    editorState.selection = 'e-1';
    editorState.selectedIds = ['e-1'];

    const { UNSAFE_getAllByType } = render(<WebPlanEditor {...defaultProps} />);
    const { View } = require('react-native');
    const gs = findElementGs(UNSAFE_getAllByType(View));
    const secondG = gs[1];

    fireEvent(secondG, 'mouseDown', {
      clientX: 20,
      clientY: 20,
      metaKey: true,
      bubbles: true,
      cancelable: true,
      stopPropagation: jest.fn(),
    });

    expect(mockToggleSelection).toHaveBeenCalledWith('e-2');
    expect(mockSetSelection).not.toHaveBeenCalledWith('e-2');
  });

  /**
   * T-utj-web-03: Normaler Klick (kein Modifier) ruft weiter setSelection(id) (Single, keine Regression).
   */
  it('T-utj-web-03: Normaler Klick ruft setSelection(id) — keine Regression', () => {
    editorState.elements = [makeEl('e-1')];
    editorState.selection = null;
    editorState.selectedIds = [];

    const { UNSAFE_getAllByType } = render(<WebPlanEditor {...defaultProps} />);
    const { View } = require('react-native');
    const gs = findElementGs(UNSAFE_getAllByType(View));
    const elementG = gs[0];

    fireEvent(elementG, 'mouseDown', {
      clientX: 50,
      clientY: 50,
      ctrlKey: false,
      metaKey: false,
      bubbles: true,
      cancelable: true,
      stopPropagation: jest.fn(),
    });

    expect(mockSetSelection).toHaveBeenCalledWith('e-1');
    expect(mockToggleSelection).not.toHaveBeenCalled();
  });

  /**
   * T-utj-web-04: Pfeiltaste bei selectedIds.length>1 ruft moveSelectedBy (nicht updateElement-Einzel).
   */
  it('T-utj-web-04: Pfeiltaste bei selectedIds.length>1 ruft moveSelectedBy statt updateElement', () => {
    editorState.elements = [
      makeEl('e-1', { xM: 3, yM: 3 }),
      makeEl('e-2', { xM: 6, yM: 6 }),
    ];
    editorState.selection = 'e-2';
    editorState.selectedIds = ['e-1', 'e-2'];

    render(<WebPlanEditor {...defaultProps} />);

    fireArrowKey('ArrowRight');

    expect(mockMoveSelectedBy).toHaveBeenCalled();
    // updateElement darf NICHT für Einzel-Move aufgerufen werden
    expect(mockUpdateElement).not.toHaveBeenCalled();
  });

  /**
   * T-utj-web-05: Pfeiltaste bei selectedIds.length===1 ruft updateElement-Einzelpfad (keine Regression).
   */
  it('T-utj-web-05: Pfeiltaste bei selectedIds.length===1 ruft updateElement (Einzel-Pfad, keine Regression)', () => {
    editorState.elements = [makeEl('e-1', { xM: 5, yM: 5 })];
    editorState.selection = 'e-1';
    editorState.selectedIds = ['e-1'];

    render(<WebPlanEditor {...defaultProps} />);

    fireArrowKey('ArrowRight');

    expect(mockUpdateElement).toHaveBeenCalled();
    expect(mockMoveSelectedBy).not.toHaveBeenCalled();
  });

  /**
   * T-utj-web-06: Drag bei Mehrfach-Selektion ruft moveSelectedBy (nicht updateElement-Einzel).
   * Verwendet act() um React-State-Updates zwischen den Mausereignissen zu flushen.
   */
  it('T-utj-web-06: Drag auf Gruppen-Element ruft moveSelectedBy für Gruppen-Move', async () => {
    editorState.elements = [
      makeEl('e-1', { xM: 3, yM: 3 }),
      makeEl('e-2', { xM: 6, yM: 6 }),
    ];
    editorState.selection = 'e-1';
    editorState.selectedIds = ['e-1', 'e-2'];

    const { UNSAFE_getAllByType } = render(<WebPlanEditor {...defaultProps} />);
    const { View } = require('react-native');
    const gs = findElementGs(UNSAFE_getAllByType(View));
    const firstG = gs[0]; // e-1 (id 'e-1' ist in selectedIds)

    // mousedown auf Element (kein Modifier, aber e-1 ist IN der Gruppe)
    fireEvent(firstG, 'mouseDown', {
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      metaKey: false,
      bubbles: true,
      cancelable: true,
      stopPropagation: jest.fn(),
    });

    // mousemove > 5px → Drag-Promotion: setDrag() wird aufgerufen (async State-Update)
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 115,
        clientY: 115,
        bubbles: true,
      }));
    });

    // setGestureActive(true) muss aufgerufen worden sein
    expect(mockSetGestureActive).toHaveBeenCalledWith(true);

    // Weiteres mousemove — nach act() ist der Drag-Effekt registriert und bewegt die Gruppe
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 120,
        clientY: 120,
        bubbles: true,
      }));
    });

    // moveSelectedBy muss aufgerufen worden sein
    expect(mockMoveSelectedBy).toHaveBeenCalled();
    // updateElement darf NICHT für Einzel-Move aufgerufen worden sein
    expect(mockUpdateElement).not.toHaveBeenCalled();
  });

  /**
   * T-utj-web-07: Marquee — mousedown auf Hintergrund + mousemove>5px + mouseup ruft setSelectedIds
   * mit den überschnittenen Element-IDs.
   */
  it('T-utj-web-07: Marquee ruft setSelectedIds mit überschnittenen Element-IDs', () => {
    // Elemente an bekannten Positionen (scale ~80px/m für 10m in 800px)
    editorState.elements = [
      makeEl('e-inside', { xM: 3, yM: 3, widthM: 1, heightM: 1 }),
      makeEl('e-outside', { xM: 9, yM: 9, widthM: 1, heightM: 1 }),
    ];
    editorState.selection = null;
    editorState.selectedIds = [];

    const { getByTestId } = render(<WebPlanEditor {...defaultProps} />);
    const svg = getByTestId('web-plan-editor-svg');

    // mousedown auf Hintergrund-SVG (kein placingKind)
    fireEvent(svg, 'mouseDown', {
      clientX: 0,
      clientY: 0,
      bubbles: true,
      cancelable: true,
      stopPropagation: jest.fn(),
    });

    // mousemove weit genug um Threshold zu überschreiten
    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 400, // weit genug, um e-inside (xM=3→~240px) zu überschneiden
      clientY: 400,
      bubbles: true,
    }));

    // mouseup — beendet Marquee
    window.dispatchEvent(new MouseEvent('mouseup', {
      clientX: 400,
      clientY: 400,
      bubbles: true,
    }));

    // setSelectedIds muss aufgerufen worden sein
    expect(mockSetSelectedIds).toHaveBeenCalled();
    const ids: string[] = mockSetSelectedIds.mock.calls[0][0];
    expect(ids).toContain('e-inside');
    expect(ids).not.toContain('e-outside');
  });

  /**
   * T-utj-web-08: Marquee löst NICHT aus wenn placingKind!==null.
   */
  it('T-utj-web-08: Marquee löst NICHT aus wenn placingKind gesetzt ist', () => {
    editorState.elements = [makeEl('e-1', { xM: 3, yM: 3 })];

    const props = { ...defaultProps, placingKind: 'Beet' };
    const { getByTestId } = render(<WebPlanEditor {...props} />);
    const svg = getByTestId('web-plan-editor-svg');

    fireEvent(svg, 'mouseDown', {
      clientX: 0,
      clientY: 0,
      bubbles: true,
      cancelable: true,
      stopPropagation: jest.fn(),
    });

    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 400,
      clientY: 400,
      bubbles: true,
    }));

    window.dispatchEvent(new MouseEvent('mouseup', {
      clientX: 400,
      clientY: 400,
      bubbles: true,
    }));

    // setSelectedIds darf NICHT aufgerufen worden sein (Beet-Drag-to-create läuft stattdessen)
    expect(mockSetSelectedIds).not.toHaveBeenCalled();
  });

  /**
   * T-utj-web-09: Delete bei selectedIds=[a,b] ruft deleteElement(a)+deleteElement(b)+clearSelection.
   */
  it('T-utj-web-09: Delete bei mehrfach-selektierten Elementen löscht alle und ruft clearSelection', () => {
    editorState.elements = [makeEl('e-a'), makeEl('e-b', { xM: 7, yM: 7 })];
    editorState.selection = 'e-b';
    editorState.selectedIds = ['e-a', 'e-b'];

    render(<WebPlanEditor {...defaultProps} />);

    const evt = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(evt);

    expect(mockDeleteElement).toHaveBeenCalledWith('e-a');
    expect(mockDeleteElement).toHaveBeenCalledWith('e-b');
    expect(mockClearSelection).toHaveBeenCalled();
  });

  /**
   * T-utj-web-10: Rendering — alle selectedIds-Elemente erhalten Selection-Outline
   * (Anzahl Outline-Rects === selectedIds.length).
   */
  it('T-utj-web-10: Rendering — alle selectedIds-Elemente erhalten Auswahl-Outline', () => {
    editorState.elements = [
      makeEl('e-1', { xM: 2, yM: 2 }),
      makeEl('e-2', { xM: 5, yM: 5 }),
      makeEl('e-3', { xM: 8, yM: 8 }),
    ];
    editorState.selection = 'e-3';
    editorState.selectedIds = ['e-1', 'e-2', 'e-3'];

    const { UNSAFE_getAllByType } = render(<WebPlanEditor {...defaultProps} />);
    const { View } = require('react-native');
    const allViews = UNSAFE_getAllByType(View);

    // Auswahl-Outline: gestrichelter Rahmen (strokeDasharray gesetzt, fill="none")
    const outlineRects = allViews.filter(
      (v: any) =>
        v.props.strokeDasharray &&
        v.props.fill === 'none' &&
        v.props.stroke === '#0EA5E9',
    );

    // 3 Elemente selektiert → 3 Outline-Rects
    expect(outlineRects).toHaveLength(3);
  });
});
