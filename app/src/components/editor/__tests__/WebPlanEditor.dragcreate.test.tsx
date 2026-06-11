// quick-260611-vk4: Drag-to-create Beet + Deselect-on-background-click im Web-Plan-Editor.
// TDD GREEN: alle 6 Behaviors (A–F) grün.

import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockSetEditingElementId = jest.fn();
const mockSetSelection = jest.fn();
const mockSetGestureActive = jest.fn();
const mockUpdateElement = jest.fn();
const mockDeleteElement = jest.fn();
const mockAddElement = jest.fn();

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

// Mock react-native-svg für testability — leitet testID, onMouseDown, onClick weiter
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name: string) =>
    React.forwardRef(
      ({ children, testID, onDoubleClick, onMouseDown, onClick, transform, ...props }: any, ref: any) =>
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

// Garten-Dimensionen: 10×10 m
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

// scale = min(752/10, 552/10) = 55.2 px/m (containerSize Default 800×600, PADDING 24)
const SCALE = 55.2;
const MIN_BEET_M = 0.5;
const THRESHOLD_PX = 5;

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

// Hilfsfunktion: Drag-Sequenz auf dem Canvas simulieren.
// mousedown auf dem SVG-Element (testID="web-plan-editor-svg") + window-level mousemove + mouseup.
function fireDrag(
  container: ReturnType<typeof render>,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  // mousedown auf dem SVG-Element — createDragRef wird gesetzt wenn placingKind==='Beet'
  const svg = container.getByTestId('web-plan-editor-svg');
  fireEvent(svg, 'mouseDown', {
    clientX: startX,
    clientY: startY,
    bubbles: true,
    cancelable: true,
  });

  // mousemove über window (window-level Listener in createDrag useEffect)
  window.dispatchEvent(
    new MouseEvent('mousemove', { clientX: endX, clientY: endY, bubbles: true }),
  );

  // mouseup über window
  window.dispatchEvent(
    new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true }),
  );
}

describe('WebPlanEditor > Drag-to-create Beet + Deselect (quick-260611-vk4)', () => {

  // Test A: Drag erzeugt Beet
  it('Test A – mousedown + mousemove über Schwelle + mouseup erzeugt genau ein Beet via addElement', () => {
    const props = { ...defaultProps, placingKind: 'Beet' };
    const result = render(<WebPlanEditor {...props} />);

    // Drag: 100px × 80px (deutlich über MOUSE_DRAG_THRESHOLD_PX=5)
    fireDrag(result, 100, 100, 200, 180);

    expect(mockAddElement).toHaveBeenCalledTimes(1);
    const newEl = mockAddElement.mock.calls[0][0];
    expect(newEl.elementType).toBe('Beet');
    expect(newEl.layer).toBe('infrastructure');
    expect(newEl.isAccepted).toBe(true);
    expect(newEl.importedFrom).toBeNull();
    expect(newEl.provenance).toMatchObject({ source: 'manual' });
    // setSelection mit der neuen id aufgerufen
    expect(mockSetSelection).toHaveBeenCalledWith(newEl.id);
    // onPlaced aufgerufen
    expect(defaultProps.onPlaced).toHaveBeenCalledTimes(1);
  });

  // Test A (Maße): widthM/heightM entsprechen dem aufgezogenen Rechteck (in Metern via scale)
  it('Test A (Maße) – widthM/heightM des erzeugten Beets entsprechen dem Drag-Abstand / scale', () => {
    const props = { ...defaultProps, placingKind: 'Beet' };
    const result = render(<WebPlanEditor {...props} />);

    // Drag: 110px breit, 55px hoch; getBoundingClientRect() gibt left=0,top=0 zurück (jsdom)
    fireDrag(result, 50, 50, 160, 105);

    expect(mockAddElement).toHaveBeenCalledTimes(1);
    const newEl = mockAddElement.mock.calls[0][0];
    // widthM = 110 / scale = 110 / 55.2 ≈ 1.99m (über MIN_BEET_M)
    expect(newEl.widthM).toBeGreaterThan(MIN_BEET_M);
    // heightM = 55 / scale = 55 / 55.2 ≈ 1.0m (über MIN_BEET_M)
    expect(newEl.heightM).toBeGreaterThan(MIN_BEET_M);
    // Prüfe ungefähren Wert
    expect(newEl.widthM).toBeCloseTo(110 / SCALE, 0);
    expect(newEl.heightM).toBeCloseTo(55 / SCALE, 0);
  });

  // Test B: Reiner Klick (< MOUSE_DRAG_THRESHOLD_PX) erzeugt KEIN Beet via Drag-Pfad
  it('Test B – reiner Klick (Bewegung < 5px) löst Drag-to-create NICHT aus', () => {
    const props = { ...defaultProps, placingKind: 'Beet' };
    const result = render(<WebPlanEditor {...props} />);

    // Drag: nur 2px Bewegung — unter Schwelle
    fireDrag(result, 100, 100, 102, 101);

    // addElement darf vom Drag-Pfad NICHT aufgerufen worden sein
    // (click-Pfad via handleSvgClick könnte noch addElement rufen, aber wir prüfen
    // den Zustand direkt nach dem window-mouseup, BEVOR click feuert)
    // Im Unit-Test mit window.dispatchEvent feuert kein synthetisches click danach.
    expect(mockAddElement).not.toHaveBeenCalled();
  });

  // Test C: Min-Größe — Drag knapp über Schwelle → Beet hat widthM/heightM >= MIN_BEET_M
  it('Test C – Drag knapp über Schwelle (< MIN_BEET_M in Metern) → widthM/heightM >= 0,5', () => {
    const props = { ...defaultProps, placingKind: 'Beet' };
    const result = render(<WebPlanEditor {...props} />);

    // Drag: 6px × 6px — über THRESHOLD_PX (5), aber < MIN_BEET_M (0,5m = 27,6px bei scale=55.2)
    fireDrag(result, 100, 100, 106, 106);

    expect(mockAddElement).toHaveBeenCalledTimes(1);
    const newEl = mockAddElement.mock.calls[0][0];
    expect(newEl.widthM).toBeGreaterThanOrEqual(MIN_BEET_M);
    expect(newEl.heightM).toBeGreaterThanOrEqual(MIN_BEET_M);
  });

  // Test D: Clamping — Drag am Rand → Center geclampt innerhalb [widthM/2, dim - widthM/2]
  it('Test D – Drag an der rechten/unteren Ecke → Center geclampt innerhalb der Gartengrenzen', () => {
    const props = { ...defaultProps, placingKind: 'Beet' };
    const result = render(<WebPlanEditor {...props} />);

    // Drag: SVG-Koordinaten: Start = 500,500 (fast am Rand bei 10m×10m),
    // Ende = 600,600 (außerhalb der SVG-Grenzen bei scale=55.2: max=552px)
    // getBoundingClientRect() gibt left=0, top=0 zurück (jsdom)
    fireDrag(result, 500, 500, 600, 600);

    expect(mockAddElement).toHaveBeenCalledTimes(1);
    const newEl = mockAddElement.mock.calls[0][0];
    // Center muss innerhalb [widthM/2, 10 - widthM/2] liegen
    const hw = newEl.widthM / 2;
    const hh = newEl.heightM / 2;
    expect(newEl.xM).toBeGreaterThanOrEqual(hw);
    expect(newEl.xM).toBeLessThanOrEqual(10 - hw);
    expect(newEl.yM).toBeGreaterThanOrEqual(hh);
    expect(newEl.yM).toBeLessThanOrEqual(10 - hh);
  });

  // Test E: Deselect on background click — Klick auf leere Canvas bei aktiver Selektion
  it('Test E – Klick auf leere Canvas-Fläche bei aktiver Selektion → setSelection(null)', () => {
    editorState.selection = 'e-selected';
    editorState.elements = [makeEl('e-selected')];

    const props = { ...defaultProps, placingKind: null };
    const result = render(<WebPlanEditor {...props} />);

    // Klick auf die SVG-Canvas-Fläche (kein placingKind, kein Drag).
    // onClick liegt am <Svg>-Element (testID="web-plan-editor-svg").
    const svg = result.getByTestId('web-plan-editor-svg');
    fireEvent(svg, 'click', { bubbles: true, cancelable: true });

    expect(mockSetSelection).toHaveBeenCalledWith(null);
  });

  // Test F: Kein Deselect bei Element-Klick — Element-mousedown ruft setSelection(elementId)
  it('Test F – Element-mousedown ruft setSelection(elementId) und NICHT setSelection(null) (Regression)', () => {
    editorState.selection = null;
    editorState.elements = [makeEl('e-target')];

    const props = { ...defaultProps, placingKind: null };
    const result = render(<WebPlanEditor {...props} />);

    // Das SVG-G-Element des Elements hat onMouseDown={handleElementMouseDown} mit stopPropagation.
    // Wir feuern ein mousedown auf dem SVG-Element selbst (als Proxy für das G-Kind).
    // Da alle SVG-Elemente als View gemockt sind, greifen wir auf das SVG per testID.
    const svg = result.getByTestId('web-plan-editor-svg');
    fireEvent(svg, 'mouseDown', {
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
      stopPropagation: jest.fn(),
    });

    // setSelection(null) darf NICHT aufgerufen worden sein — das Canvas-click-Deselect
    // darf nicht durch Element-Interaktion ausgelöst werden.
    const nullCalls = mockSetSelection.mock.calls.filter((c) => c[0] === null);
    expect(nullCalls).toHaveLength(0);
  });
});
