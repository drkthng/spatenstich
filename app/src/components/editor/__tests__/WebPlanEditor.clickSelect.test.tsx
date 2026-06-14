// Bug A fix test: click-to-select regression (web editor).
//
// Root cause: clicking an element selects it on mousedown, but the click event that
// immediately follows bubbles up to the wrapping <div>'s handleDivClick, which calls
// setSelection(null) — instantly deselecting. The earlier attempts failed: onClick +
// stopProp on the <G> (react-native-svg/web strips onClick in prepare()), then a
// setTimeout(0)-reset flag (the timer fires between mousedown and click in a real
// browser, so the flag was already cleared at click time → still deselected).
//
// Real fix (timing-independent): pointerDownOnElementRef latches whether the last
// mousedown hit an element (handleElementMouseDown → true) or the background
// (handleCanvasMouseDown → false). handleDivClick deselects only when it was the
// background. No timers.
//
// Test approach (models reality — RNTL fireEvent bubbles to ancestor handlers, so a
// click on the element reaches the <div>'s handleDivClick just like the DOM does):
//   T-bugA-01: mousedown on element G sets selection.
//   T-bugA-02: mousedown THEN click on the element does NOT deselect (the regression).
//   T-bugA-03: background mousedown resets the latch → following click deselects.
//   T-bugA-04: drag-to-move still works (gestureActive lifecycle).

import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockSetEditingElementId = jest.fn();
const mockSetSelection = jest.fn();
const mockSetGestureActive = jest.fn();
const mockUpdateElement = jest.fn();
const mockDeleteElement = jest.fn();
const mockAddElement = jest.fn();

// Concrete element we'll use in tests
const TARGET_EL_ID = 'e-target-clickselect';

const editorState: any = {
  elements: [],
  selection: null,
  showGrid: false,
  activeLayers: { infrastructure: true, seasonal: true },
  setEditingElementId: mockSetEditingElementId,
  setSelection: mockSetSelection,
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

// Mock react-native-svg — G gets testID forwarded so we can query it
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
        ...props
      }: any, ref: any) =>
        React.createElement(
          View,
          { testID, ref, onDoubleClick, onMouseDown, onClick, transform, ...props },
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
  createdAt: '2026-05-13T10:00:00.000Z',
  updatedAt: '2026-05-13T10:00:00.000Z',
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
    createdAt: '2026-05-13T10:00:00.000Z',
    updatedAt: '2026-05-13T10:00:00.000Z',
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

beforeEach(() => {
  mockSetEditingElementId.mockClear();
  mockSetSelection.mockClear();
  mockSetGestureActive.mockClear();
  mockUpdateElement.mockClear();
  mockDeleteElement.mockClear();
  mockAddElement.mockClear();
  editorState.elements = [];
  editorState.selection = null;
  (defaultProps.onPlaced as jest.Mock).mockClear();
});

describe('WebPlanEditor > click-to-select regression (Bug A fix)', () => {
  /**
   * T-bugA-01: mousedown on an element G sets selection to element's id.
   * Fires mousedown on the rendered G element using its key-based testID.
   * The mock SVG renders G as a View with onMouseDown forwarded.
   */
  // The element <G> is uniquely identifiable: it has onMouseDown AND onDoubleClick.
  // The background <Svg> has onMouseDown only (handleCanvasMouseDown), no onDoubleClick.
  const findElementG = (views: any[]) =>
    views.find((v: any) => v.props.onMouseDown && v.props.onDoubleClick)!;

  it('T-bugA-01: mousedown auf Element-G setzt Selektion auf Element-ID', () => {
    editorState.elements = [makeEl(TARGET_EL_ID)];
    editorState.selection = null;

    const { UNSAFE_getAllByType } = render(<WebPlanEditor {...defaultProps} />);
    const { View } = require('react-native');
    const elementG = findElementG(UNSAFE_getAllByType(View));
    expect(elementG).toBeTruthy();

    const stopPropSpy = jest.fn();
    fireEvent(elementG, 'mouseDown', {
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
      stopPropagation: stopPropSpy,
    });

    // handleElementMouseDown calls setSelection(el.id)
    expect(mockSetSelection).toHaveBeenCalledWith(TARGET_EL_ID);
    // stopPropagation was called on the mousedown event
    expect(stopPropSpy).toHaveBeenCalled();
  });

  /**
   * T-bugA-02: THE regression. After selecting on mousedown, the click that bubbles
   * to the <div>'s handleDivClick must NOT deselect. RNTL fireEvent bubbles to ancestor
   * handlers, so firing 'click' on the element reaches handleDivClick exactly like the DOM.
   */
  it('T-bugA-02: mousedown + folgender Klick deselektiert NICHT (Kern-Regression)', () => {
    editorState.elements = [makeEl(TARGET_EL_ID)];
    editorState.selection = null;

    const { UNSAFE_getAllByType } = render(<WebPlanEditor {...defaultProps} />);
    const { View } = require('react-native');
    const elementG = findElementG(UNSAFE_getAllByType(View));
    expect(elementG).toBeTruthy();

    // 1. mousedown selects + arms justSelectedRef
    fireEvent(elementG, 'mouseDown', {
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
      stopPropagation: jest.fn(),
    });
    expect(mockSetSelection).toHaveBeenCalledWith(TARGET_EL_ID);

    // 2. the click that follows bubbles up to handleDivClick — must be suppressed
    fireEvent(elementG, 'click', { bubbles: true, cancelable: true });

    // setSelection(null) must NOT have been called → selection survives
    const nullCalls = mockSetSelection.mock.calls.filter((c: any[]) => c[0] === null);
    expect(nullCalls).toHaveLength(0);
  });

  /**
   * T-bugA-03: A background mousedown resets the latch even after an element was just
   * selected, so the following background click deselects. Verifies the latch is reset
   * by handleCanvasMouseDown (not stuck true after a prior element selection).
   */
  it('T-bugA-03: Hintergrund-mousedown setzt Latch zurück → folgender Klick deselektiert', () => {
    editorState.elements = [makeEl(TARGET_EL_ID)];
    editorState.selection = TARGET_EL_ID;

    const result = render(<WebPlanEditor {...defaultProps} />);
    const { View } = require('react-native');
    const elementG = findElementG(result.UNSAFE_getAllByType(View));

    // 1. select an element on mousedown → latch true
    fireEvent(elementG, 'mouseDown', {
      clientX: 100, clientY: 100, bubbles: true, cancelable: true, stopPropagation: jest.fn(),
    });

    // 2. mousedown on the SVG background → handleCanvasMouseDown resets latch to false
    const svg = result.getByTestId('web-plan-editor-svg');
    fireEvent(svg, 'mouseDown', {
      clientX: 5, clientY: 5, bubbles: true, cancelable: true, stopPropagation: jest.fn(),
    });

    // 3. the click that follows now deselects
    fireEvent(svg, 'click', { bubbles: true, cancelable: true });

    expect(mockSetSelection).toHaveBeenCalledWith(null);
  });

  /**
   * T-bugA-04: Drag-to-move still works after the click stopPropagation fix.
   * mousedown on element G + mousemove > 5px starts drag (setGestureActive(true)).
   * The onClick stopPropagation fix must not interfere with drag-to-move.
   */
  it('T-bugA-04: Drag-to-move löst setGestureActive(true) aus nach Threshold', () => {
    editorState.elements = [makeEl(TARGET_EL_ID, { xM: 5, yM: 5 })];
    editorState.selection = null;

    const { UNSAFE_getAllByType } = render(<WebPlanEditor {...defaultProps} />);
    const { View } = require('react-native');
    const elementG = findElementG(UNSAFE_getAllByType(View));
    expect(elementG).toBeTruthy();

    // mousedown starts pendingDrag (selection is set, stopPropagation required by handler)
    fireEvent(elementG, 'mouseDown', {
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
      stopPropagation: jest.fn(),
    });

    // Selection should be set from mousedown
    expect(mockSetSelection).toHaveBeenCalledWith(TARGET_EL_ID);

    // mousemove > 5px promotes pendingDrag to active drag
    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 115,
      clientY: 115,
      bubbles: true,
    }));

    // setGestureActive(true) confirms drag started — the onClick fix did not break drag
    expect(mockSetGestureActive).toHaveBeenCalledWith(true);
  });
});
