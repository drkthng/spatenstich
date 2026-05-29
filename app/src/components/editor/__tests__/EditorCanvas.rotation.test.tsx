// Phase 09.1 Plan 04 GREEN: zOrder-Sort + Rotation-Transform render coverage. D-13/D-14/D-15/D-20.
// Fills Wave-0 it.todo() pins. Tests Skia Group transform array + zOrder sort applied to EditorCanvas layers.
//
// NOTE: Skia renders to a mocked React element tree in jsdom — we test React element structure,
// not actual pixel output. Group transform array is assertable via toJSON() traversal.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

// Inline full mocks — this test file overrides setup.ts mocks for sortByZOrder spy
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

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const mkGesture = () => {
    const g: any = {
      onBegin: () => g, onUpdate: () => g, onStart: () => g, onEnd: () => g,
      onChange: () => g, onTouchesMove: () => g,
      minDuration: () => g, maxDistance: () => g, manualActivation: () => g,
    };
    return g;
  };
  return {
    Gesture: {
      Pan: mkGesture, Pinch: mkGesture, Tap: mkGesture, LongPress: mkGesture, Rotation: mkGesture,
      Race: (..._args: any[]) => mkGesture(),
      Exclusive: (..._args: any[]) => mkGesture(),
      Simultaneous: (..._args: any[]) => mkGesture(),
    },
    GestureDetector: ({ children }: any) => children,
    GestureHandlerRootView: ({ children }: any) => children,
  };
});

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (v: any) => ({ value: v }),
  useDerivedValue: (fn: any) => ({ value: fn() }),
  runOnJS: (fn: any) => fn,
  useFrameCallback: () => {},
}));

// Spy on sortByZOrder — wrap the real implementation to track calls
jest.mock('@/src/lib/editor/zOrder', () => {
  const actual = jest.requireActual('@/src/lib/editor/zOrder');
  return {
    ...actual,
    sortByZOrder: jest.fn(actual.sortByZOrder),
  };
});

const mockSetEditingElementId = jest.fn();
const mockSetSelection = jest.fn();
const mockSetGestureActive = jest.fn();
const mockUpdateElement = jest.fn();
const mockPolygonAddPoint = jest.fn();

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
  updateElement: mockUpdateElement,
  polygonAddPoint: mockPolygonAddPoint,
};

jest.mock('@/src/stores/editorStore', () => {
  const useEditorStore = Object.assign(
    (sel?: any) => (sel ? sel(editorState) : editorState),
    { getState: () => editorState },
  );
  return { useEditorStore };
});

jest.mock('@/src/lib/editor/hitTest', () => ({
  findElementAtPoint: jest.fn(),
}));

jest.mock('@/src/lib/geometry/viewMatrix', () => ({
  screenToGarden: (_xPx: number, _yPx: number, _vm: any) => ({ xM: 1, yM: 1 }),
}));

import * as React from 'react';
import { render } from '@testing-library/react-native';
import { EditorCanvas } from '../EditorCanvas';
import { sortByZOrder } from '@/src/lib/editor/zOrder';
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

function makeEl(overrides: Record<string, any> = {}) {
  return {
    id: 'el-1',
    gardenId: 'g-1',
    elementType: 'Beet',
    label: 'Test Beet',
    xM: 2.0,
    yM: 2.0,
    widthM: 1.0,
    heightM: 1.0,
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

beforeEach(() => {
  mockSetEditingElementId.mockClear();
  mockSetSelection.mockClear();
  mockSetGestureActive.mockClear();
  mockUpdateElement.mockClear();
  editorState.elements = [];
  editorState.selection = null;
  // Reset sortByZOrder mock call count between tests
  (sortByZOrder as jest.Mock).mockClear();
});

/**
 * Walk the rendered JSON tree to find a node matching a predicate.
 * jsdom-EditorCanvas helper — Skia primitives render as named React elements.
 */
function findInTree(node: any, predicate: (n: any) => boolean): any {
  if (!node) return null;
  if (predicate(node)) return node;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findInTree(child, predicate);
      if (found) return found;
    }
  }
  return null;
}

describe('EditorCanvas > rotation rendering (ROTATE-VIS)', () => {
  it('wraps element in Skia Group with rotation transform array [translate,rotate,translate] when provenance.rotateDeg=90', () => {
    editorState.elements = [makeEl({ id: 'el-1', xM: 2, yM: 2, provenance: { rotateDeg: 90 } })];
    const { toJSON } = render(<EditorCanvas dimensions={dims} />);
    const tree = toJSON();

    // Find Group node with a 5-element transform array containing a rotate entry ≈ π/2
    const groupNode = findInTree(tree, (n) => {
      if (n?.type !== 'Group') return false;
      const t = n?.props?.transform;
      if (!Array.isArray(t) || t.length !== 5) return false;
      const rotateEntry = t.find((entry: any) => typeof entry?.rotate === 'number');
      if (!rotateEntry) return false;
      // rotateDeg=90 → rotateRad = π/2 ≈ 1.5708
      return Math.abs(rotateEntry.rotate - Math.PI / 2) < 0.0001;
    });

    expect(groupNode).toBeTruthy();
    const transform = groupNode.props.transform as any[];
    expect(transform).toHaveLength(5);
    // Assert the 5-matrix stack structure: translateX(cx), translateY(cy), rotate(rad), translateX(-cx), translateY(-cy)
    expect(transform).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rotate: expect.closeTo(Math.PI / 2, 4) }),
      ]),
    );
    // First two entries are translations, last two are negative translations
    expect(typeof transform[0].translateX).toBe('number');
    expect(typeof transform[1].translateY).toBe('number');
    expect(typeof transform[3].translateX).toBe('number');
    expect(typeof transform[4].translateY).toBe('number');
  });

  it('sortByZOrder applied to infrastructure and seasonal layers before map renders', () => {
    editorState.elements = [
      makeEl({ id: 'el-1', layer: 'infrastructure', provenance: { zOrder: 2 } }),
      makeEl({ id: 'el-2', layer: 'infrastructure', createdAt: '2026-01-02T00:00:00.000Z', provenance: { zOrder: 0 } }),
      makeEl({ id: 'el-3', layer: 'seasonal', provenance: { zOrder: 1 } }),
    ];
    render(<EditorCanvas dimensions={dims} />);
    // sortByZOrder should have been called at least twice (infrastructure + seasonal)
    expect(sortByZOrder).toHaveBeenCalled();
    expect((sortByZOrder as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('uses widthM and heightM from dedicated columns, not provenance (D-20)', () => {
    // Element with widthM=2.0 as dedicated column AND provenance.widthM=99 (irrelevant)
    editorState.elements = [makeEl({
      id: 'el-1',
      widthM: 2.0,
      heightM: 1.5,
      provenance: { widthM: 99, heightM: 99 },
    })];
    const { toJSON } = render(<EditorCanvas dimensions={dims} />);
    const tree = toJSON();

    // Find a Rect node with width=2.0 (dedicated column value)
    const rectWithCorrectWidth = findInTree(tree, (n) => n?.type === 'Rect' && n?.props?.width === 2.0);
    expect(rectWithCorrectWidth).toBeTruthy();

    // Ensure no Rect has width=99 (provenance value must be ignored)
    const rectWithProvWidth = findInTree(tree, (n) => n?.type === 'Rect' && n?.props?.width === 99);
    expect(rectWithProvWidth).toBeNull();
  });

  it('rotateDeg=0 results in identity rotation (rotate=0 in transform array)', () => {
    editorState.elements = [makeEl({ id: 'el-1', provenance: {} })];
    const { toJSON } = render(<EditorCanvas dimensions={dims} />);
    const tree = toJSON();

    const groupNode = findInTree(tree, (n) => {
      if (n?.type !== 'Group') return false;
      const t = n?.props?.transform;
      if (!Array.isArray(t) || t.length !== 5) return false;
      const rotateEntry = t.find((entry: any) => typeof entry?.rotate === 'number');
      return rotateEntry !== undefined;
    });

    expect(groupNode).toBeTruthy();
    const transform = groupNode.props.transform as any[];
    const rotateEntry = transform.find((entry: any) => typeof entry?.rotate === 'number');
    expect(rotateEntry.rotate).toBeCloseTo(0, 4);
  });

  it('ignores non-finite rotateDeg (NaN) — falls back to rotate=0 (T-09.1-NAN-ROTATION)', () => {
    editorState.elements = [makeEl({ id: 'el-1', provenance: { rotateDeg: NaN } })];
    const { toJSON } = render(<EditorCanvas dimensions={dims} />);
    const tree = toJSON();

    // Find Group with 5-element transform
    const groupNode = findInTree(tree, (n) => {
      if (n?.type !== 'Group') return false;
      const t = n?.props?.transform;
      return Array.isArray(t) && t.length === 5;
    });

    expect(groupNode).toBeTruthy();
    const transform = groupNode.props.transform as any[];
    const rotateEntry = transform.find((entry: any) => typeof entry?.rotate === 'number');
    expect(rotateEntry).toBeTruthy();
    // NaN should be replaced by 0
    expect(rotateEntry.rotate).toBeCloseTo(0, 4);
  });
});
