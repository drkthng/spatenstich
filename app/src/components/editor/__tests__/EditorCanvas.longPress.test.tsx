// Phase 09.1 Wave 2 GREEN: EditorCanvas LongPress gesture composition + hit-test dispatch.
// Pins D-01/D-02 (Skia Long-Press, 500ms, maxDistance 10px, findElementAtPoint).

// Capture gesture factory calls so we can inspect chained builder calls.
const capturedLongPressBuilders: Record<string, any> = {};

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const mkGesture = (name?: string) => {
    const g: any = {
      _name: name,
      _onStartCb: undefined as any,
      onBegin: () => g,
      onUpdate: () => g,
      onStart: (cb: any) => { g._onStartCb = cb; return g; },
      onEnd: () => g,
      onChange: () => g,
      onTouchesMove: () => g,
      minDuration: (ms: number) => { g._minDuration = ms; return g; },
      maxDistance: (px: number) => { g._maxDistance = px; return g; },
      manualActivation: () => g,
    };
    return g;
  };
  // Override LongPress to capture the instance
  const LongPressFactory = () => {
    const g = mkGesture('LongPress');
    // Store reference so tests can inspect it
    (global as any).__lastLongPressGesture = g;
    return g;
  };
  return {
    Gesture: {
      Pan: mkGesture,
      Pinch: mkGesture,
      Tap: mkGesture,
      LongPress: LongPressFactory,
      Rotation: mkGesture,
      Race: (..._args: any[]) => mkGesture(),
      Exclusive: (..._args: any[]) => mkGesture(),
      Simultaneous: (..._args: any[]) => mkGesture(),
    },
    GestureDetector: ({ children }: any) => children,
    GestureHandlerRootView: ({ children }: any) => children,
  };
});

jest.mock('react-native-css-interop', () => ({
  cssInterop: (component: any) => component,
  remapProps: () => {},
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: () => {}, toggleColorScheme: () => {} }),
  useUnstableNativeVariable: () => '',
  vars: () => ({}),
}));
jest.mock('react-native-css-interop/jsx-runtime', () => ({
  jsx: require('react').createElement,
  jsxs: require('react').createElement,
  Fragment: require('react').Fragment,
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: () => (_p: unknown) => React.createElement('Icon', null) });
});

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const stub = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Canvas: stub('Canvas'),
    Group: stub('Group'),
    Rect: stub('Rect'),
    Path: stub('Path'),
    Circle: stub('Circle'),
    Line: stub('Line'),
    DashPathEffect: stub('DashPathEffect'),
    Skia: { Path: { Make: () => ({ moveTo: jest.fn(), lineTo: jest.fn(), close: jest.fn() }) } },
  };
});

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (v: any) => ({ value: v }),
  useDerivedValue: (fn: any) => ({ value: fn() }),
  runOnJS: (fn: any) => fn,
  useFrameCallback: () => {},
}));

const mockSetEditingElementId = jest.fn();
const mockSetSelection = jest.fn();
const mockSetGestureActive = jest.fn();

const editorState: any = {
  elements: [],
  selection: null,
  showGrid: false,
  activeLayers: { infrastructure: true, seasonal: true },
  tool: 'select',
  polygonInProgress: null,
  setEditingElementId: mockSetEditingElementId,
  setSelection: mockSetSelection,
  setGestureActive: mockSetGestureActive,
  updateElement: jest.fn(),
  polygonAddPoint: jest.fn(),
};

jest.mock('@/src/stores/editorStore', () => {
  const useEditorStore = Object.assign(
    (sel?: any) => (sel ? sel(editorState) : editorState),
    { getState: () => editorState },
  );
  return { useEditorStore };
});

// Mock hitTest to control what findElementAtPoint returns
const mockFindElementAtPoint = jest.fn();
jest.mock('@/src/lib/editor/hitTest', () => ({
  findElementAtPoint: (...args: any[]) => mockFindElementAtPoint(...args),
}));

// Mock screenToGarden to return deterministic garden coords from pixel coords
jest.mock('@/src/lib/geometry/viewMatrix', () => ({
  screenToGarden: (_xPx: number, _yPx: number, _vm: any) => ({ xM: 2, yM: 2 }),
}));

import * as React from 'react';
import { render } from '@testing-library/react-native';
import { EditorCanvas } from '../EditorCanvas';
import type { GardenDimensionsRow } from '@spatenstich/shared';

const dims: GardenDimensionsRow = {
  id: 'd-1',
  gardenId: 'g-1',
  shape: 'rectangle',
  widthM: 10,
  heightM: 10,
  extraDims: null,
  createdAt: '2026-05-13T10:00:00.000Z',
  updatedAt: '2026-05-13T10:00:00.000Z',
  updatedByUserId: 'u-1',
  deletedAt: null,
};

function makeEl(id: string) {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: 'Test Beet',
    xM: 2,
    yM: 2,
    widthM: 2,
    heightM: 2,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-05-13T10:00:00.000Z',
    updatedAt: '2026-05-13T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: 'infrastructure' as const,
  };
}

beforeEach(() => {
  mockSetEditingElementId.mockClear();
  mockSetSelection.mockClear();
  mockSetGestureActive.mockClear();
  mockFindElementAtPoint.mockReset();
  editorState.elements = [makeEl('e-target')];
  editorState.selection = null;
  (global as any).__lastLongPressGesture = undefined;
});

describe('EditorCanvas > longPress (D-01/D-02)', () => {
  it('Gesture.LongPress minDuration is 500ms (D-02)', () => {
    render(<EditorCanvas dimensions={dims} />);
    const lp = (global as any).__lastLongPressGesture;
    expect(lp).toBeDefined();
    expect(lp._minDuration).toBe(500);
  });

  it('Gesture.LongPress maxDistance is 10px — cancels on drag intent (D-02)', () => {
    render(<EditorCanvas dimensions={dims} />);
    const lp = (global as any).__lastLongPressGesture;
    expect(lp).toBeDefined();
    expect(lp._maxDistance).toBe(10);
  });

  it('longPress onStart hit-test calls setEditingElementId(hit.id) when element underneath', () => {
    const target = makeEl('e-target');
    mockFindElementAtPoint.mockReturnValue(target);
    render(<EditorCanvas dimensions={dims} />);
    const lp = (global as any).__lastLongPressGesture;
    expect(lp).toBeDefined();
    expect(lp._onStartCb).toBeDefined();
    // Invoke the captured onStart callback with synthetic event coords
    // runOnJS is mocked to call fn() directly (identity pass-through)
    lp._onStartCb({ x: 100, y: 100 });
    expect(mockFindElementAtPoint).toHaveBeenCalled();
    expect(mockSetEditingElementId).toHaveBeenCalledWith('e-target');
    expect(mockSetSelection).toHaveBeenCalledWith('e-target');
  });
});
