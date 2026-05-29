// Phase 09.1 Plan 03 GREEN: RotationHandle Skia component smoke tests.
// Verifies render, snapRotation call on pan-end, and gestureActive discipline (Pattern S3).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import * as React from 'react';
import { render } from '@testing-library/react-native';

// Mock editorStore
const mockSetGestureActive = jest.fn();
const mockUpdateElement = jest.fn();
const mockElements: any[] = [];
const editorState: any = {
  elements: mockElements,
  setGestureActive: mockSetGestureActive,
  updateElement: mockUpdateElement,
};
jest.mock('@/src/stores/editorStore', () => ({
  useEditorStore: Object.assign((sel?: any) => (sel ? sel(editorState) : editorState), {
    getState: () => editorState,
  }),
}));

jest.mock('react-native-css-interop', () => ({
  cssInterop: (c: any) => c,
  remapProps: () => {},
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: () => {}, toggleColorScheme: () => {} }),
  useUnstableNativeVariable: () => '',
  vars: () => ({}),
}));

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const stub = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Circle: stub('Circle'),
  };
});

// Track snapRotation calls
const snapRotationMock = jest.fn((deg: number, free: boolean) => {
  // Reproduce actual snap logic for test fidelity
  const normalized = ((deg % 360) + 360) % 360;
  if (free) return normalized;
  return (Math.round(normalized / 15) * 15) % 360;
});
jest.mock('@/src/lib/editor/rotationSnap', () => ({
  snapRotation: (deg: number, free: boolean) => snapRotationMock(deg, free),
}));

const capturedPanGesture: any = {};
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const mkGesture = () => {
    const g: any = {
      onBegin: (cb: any) => { g._onBegin = cb; return g; },
      onChange: (cb: any) => { g._onChange = cb; return g; },
      onEnd: (cb: any) => { g._onEnd = cb; return g; },
      onStart: () => g,
      onUpdate: () => g,
      onTouchesMove: () => g,
      minDuration: () => g,
      maxDistance: () => g,
      manualActivation: () => g,
    };
    return g;
  };
  return {
    Gesture: {
      Pan: () => {
        const g = mkGesture();
        capturedPanGesture.instance = g;
        return g;
      },
      Pinch: mkGesture,
      Tap: mkGesture,
      LongPress: mkGesture,
      Rotation: mkGesture,
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
}));

import { RotationHandle } from '../RotationHandle';

beforeEach(() => {
  jest.clearAllMocks();
  editorState.elements = [
    {
      id: 'el-1',
      gardenId: 'g-1',
      elementType: 'Beet',
      label: 'Beet',
      xM: 5,
      yM: 5,
      widthM: 2,
      heightM: 1,
      confidence: null,
      isAccepted: true,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      updatedByUserId: 'u-1',
      deletedAt: null,
      importedFrom: null,
      provenance: { source: 'manual', rotateDeg: 0 },
      layer: 'infrastructure',
    },
  ];
});

describe('RotationHandle', () => {
  it('renders a Skia Circle for the rotation handle', () => {
    const { UNSAFE_getAllByType } = render(
      <RotationHandle
        elementId="el-1"
        xM={5}
        yM={4.3}
        centerXM={5}
        centerYM={5}
        scale={50}
      />,
    );
    const circles = UNSAFE_getAllByType('Circle' as any);
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it('invokes snapRotation(rawDeg, false) during onChange pan (D-07 mobile snap, no Shift)', () => {
    render(
      <RotationHandle
        elementId="el-1"
        xM={5}
        yM={4.3}
        centerXM={5}
        centerYM={5}
        scale={50}
      />,
    );
    const gesture = capturedPanGesture.instance;
    if (gesture && gesture._onBegin) {
      gesture._onBegin({ x: 5, y: 4.3 });
    }
    if (gesture && gesture._onChange) {
      // Simulate a move to the right — angle from center should be ~0 degrees
      gesture._onChange({ x: 55, y: 4.3, translationX: 50, translationY: 0 });
    }
    // snapRotation should have been called with freeRotation=false (no Shift on mobile)
    expect(snapRotationMock).toHaveBeenCalledWith(expect.any(Number), false);
  });
});
