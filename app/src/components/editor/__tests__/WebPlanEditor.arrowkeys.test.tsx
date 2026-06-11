// quick-260611-ln5: Pfeiltasten-Move im Web-Plan-Editor.
// Selektiertes Element per ←↑→↓ verschieben (kleiner Schritt 0,1m / Shift 0,5m).
// Persistenz über Burst-Gesture-Wrapping → l5y-Gesture-End-Flush.
// TDD RED: alle 7 Behaviors zuerst als failing tests.

import * as React from 'react';
import { render } from '@testing-library/react-native';

const mockSetEditingElementId = jest.fn();
const mockSetSelection = jest.fn();
const mockSetGestureActive = jest.fn();
const mockUpdateElement = jest.fn();
const mockDeleteElement = jest.fn();

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
};

jest.mock('@/src/stores/editorStore', () => {
  const useEditorStore = Object.assign(
    (sel?: any) => (sel ? sel(editorState) : editorState),
    { getState: () => editorState },
  );
  return { useEditorStore };
});

// Mock react-native-svg für testability
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name: string) =>
    React.forwardRef(
      ({ children, testID, onDoubleClick, onMouseDown, transform, ...props }: any, ref: any) =>
        React.createElement(
          View,
          { testID, ref, onDoubleClick, onMouseDown, transform, ...props },
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
  placingKind: null,
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
  editorState.elements = [makeEl('e-target')];
  editorState.selection = 'e-target';
});

// Hilfsfunktion: keydown auf window feuern
function fireArrowKey(key: string, shiftKey = false) {
  const evt = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  window.dispatchEvent(evt);
  return evt;
}

describe('WebPlanEditor > Pfeiltasten-Move (quick-260611-ln5)', () => {
  // Test 1: Kleiner Schritt (Pfeil ohne Modifier)
  it('Test 1 – ArrowRight verschiebt Element um +0,1m in xM (kleiner Schritt)', () => {
    render(<WebPlanEditor {...defaultProps} />);
    const el = editorState.elements.find((e: any) => e.id === 'e-target');
    const startXM = el.xM; // 5

    fireArrowKey('ArrowRight');

    expect(mockUpdateElement).toHaveBeenCalledTimes(1);
    const [id, patch] = mockUpdateElement.mock.calls[0];
    expect(id).toBe('e-target');
    expect(patch.xM).toBeCloseTo(startXM + 0.1);
    expect(patch.yM).toBeCloseTo(el.yM);
  });

  it('Test 1a – ArrowLeft verschiebt Element um -0,1m in xM', () => {
    render(<WebPlanEditor {...defaultProps} />);
    const el = editorState.elements.find((e: any) => e.id === 'e-target');
    const startXM = el.xM; // 5

    fireArrowKey('ArrowLeft');

    expect(mockUpdateElement).toHaveBeenCalledTimes(1);
    const [id, patch] = mockUpdateElement.mock.calls[0];
    expect(id).toBe('e-target');
    expect(patch.xM).toBeCloseTo(startXM - 0.1);
    expect(patch.yM).toBeCloseTo(el.yM);
  });

  it('Test 1b – ArrowDown verschiebt Element um +0,1m in yM (Y wächst nach unten)', () => {
    render(<WebPlanEditor {...defaultProps} />);
    const el = editorState.elements.find((e: any) => e.id === 'e-target');
    const startYM = el.yM; // 5

    fireArrowKey('ArrowDown');

    expect(mockUpdateElement).toHaveBeenCalledTimes(1);
    const [id, patch] = mockUpdateElement.mock.calls[0];
    expect(id).toBe('e-target');
    expect(patch.yM).toBeCloseTo(startYM + 0.1);
    expect(patch.xM).toBeCloseTo(el.xM);
  });

  it('Test 1c – ArrowUp verschiebt Element um -0,1m in yM', () => {
    render(<WebPlanEditor {...defaultProps} />);
    const el = editorState.elements.find((e: any) => e.id === 'e-target');
    const startYM = el.yM; // 5

    fireArrowKey('ArrowUp');

    expect(mockUpdateElement).toHaveBeenCalledTimes(1);
    const [id, patch] = mockUpdateElement.mock.calls[0];
    expect(id).toBe('e-target');
    expect(patch.yM).toBeCloseTo(startYM - 0.1);
    expect(patch.xM).toBeCloseTo(el.xM);
  });

  // Test 2: Großer Schritt (Shift+Pfeil)
  it('Test 2 – Shift+ArrowRight verschiebt um +0,5m (großer Schritt)', () => {
    render(<WebPlanEditor {...defaultProps} />);
    const el = editorState.elements.find((e: any) => e.id === 'e-target');
    const startXM = el.xM; // 5

    fireArrowKey('ArrowRight', true);

    expect(mockUpdateElement).toHaveBeenCalledTimes(1);
    const [id, patch] = mockUpdateElement.mock.calls[0];
    expect(id).toBe('e-target');
    expect(patch.xM).toBeCloseTo(startXM + 0.5);
  });

  // Test 3: Selektions-Guard
  it('Test 3 – ohne Selektion (selection=null) wird updateElement NICHT aufgerufen', () => {
    editorState.selection = null;
    render(<WebPlanEditor {...defaultProps} />);

    fireArrowKey('ArrowRight');

    expect(mockUpdateElement).not.toHaveBeenCalled();
  });

  // Test 4: Fokus-Guard (INPUT-Element)
  it('Test 4 – bei INPUT als activeElement wird updateElement NICHT aufgerufen und preventDefault nicht aufgerufen', () => {
    render(<WebPlanEditor {...defaultProps} />);

    // Ein INPUT-Element in jsdom als activeElement setzen
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const evt = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = jest.spyOn(evt, 'preventDefault');
    window.dispatchEvent(evt);

    expect(mockUpdateElement).not.toHaveBeenCalled();
    expect(preventDefaultSpy).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  // Test 5: Clamping an der rechten Kante
  it('Test 5 – Element an der rechten Kante wird auf widthM/2 vom Rand geclampt (kein Ausbruch)', () => {
    // xM = 9.5 (widthM=2, also rechte Kante bei xM + 1 = 10.5 > 10)
    // Erwarteter geclamenter Wert: widthM=10 - elWidth/2=1 = 9.0
    editorState.elements = [makeEl('e-target', { xM: 9.5, yM: 5 })];
    render(<WebPlanEditor {...defaultProps} />);

    fireArrowKey('ArrowRight');

    expect(mockUpdateElement).toHaveBeenCalledTimes(1);
    const [id, patch] = mockUpdateElement.mock.calls[0];
    expect(id).toBe('e-target');
    // 9.5 + 0.1 = 9.6 — liegt innerhalb von [1, 9] (widthM/2=1, gartenBreite-widthM/2=9)
    // Erwarte Clamp: max(1, min(9, 9.6)) = 9 → da 9.5+0.1=9.6 > 9 → geclampt auf 9
    expect(patch.xM).toBeCloseTo(9.0);
  });

  // Test 6: Persistenz-Pfad (setGestureActive true→false nach Debounce)
  it('Test 6 – erster ArrowRight ruft setGestureActive(true) auf; nach ARROW_COMMIT_DEBOUNCE_MS wird setGestureActive(false) aufgerufen', () => {
    jest.useFakeTimers();
    try {
      render(<WebPlanEditor {...defaultProps} />);

      fireArrowKey('ArrowRight');

      // Erster Pfeil: gestureActive=true muss gesetzt sein
      expect(mockSetGestureActive).toHaveBeenCalledWith(true);

      // Debounce-Fenster noch offen — false noch nicht aufgerufen
      const trueCallCount = mockSetGestureActive.mock.calls.filter((c) => c[0] === true).length;
      expect(trueCallCount).toBeGreaterThanOrEqual(1);

      // Debounce abwarten (ARROW_COMMIT_DEBOUNCE_MS = 400ms)
      jest.advanceTimersByTime(400);

      // Nach Debounce: setGestureActive(false) muss aufgerufen worden sein
      expect(mockSetGestureActive).toHaveBeenCalledWith(false);
    } finally {
      jest.useRealTimers();
    }
  });

  // Test 7: Key-Repeat — ein Burst = ein setGestureActive(true)-Aufruf
  it('Test 7 – drei aufeinanderfolgende ArrowRight (Burst ohne Debounce-Ablauf) → setGestureActive(true) exakt EINMAL aufgerufen', () => {
    jest.useFakeTimers();
    try {
      render(<WebPlanEditor {...defaultProps} />);

      // Drei Pfeiltasten schnell hintereinander (vor Debounce-Ablauf)
      fireArrowKey('ArrowRight');
      fireArrowKey('ArrowRight');
      fireArrowKey('ArrowRight');

      // updateElement dreimal aufgerufen (eine pro Tastendruck)
      expect(mockUpdateElement).toHaveBeenCalledTimes(3);

      // setGestureActive(true) nur EINMAL (beim ersten Pfeil des Bursts)
      const trueCalls = mockSetGestureActive.mock.calls.filter((c) => c[0] === true);
      expect(trueCalls).toHaveLength(1);

      // Debounce abwarten → setGestureActive(false) einmal
      jest.advanceTimersByTime(400);
      const falseCalls = mockSetGestureActive.mock.calls.filter((c) => c[0] === false);
      expect(falseCalls).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
