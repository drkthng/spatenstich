// Phase 7 Plan 01 Wave 0: jest setup for editor project.
// Mocks Skia/gesture-handler/reanimated for jsdom env (no native modules).
// Mirrors app/src/components/__tests__/setup.ts NativeWind + lucide mocks verbatim, adds 3 native libs.

// 1. NativeWind (verbatim from components/__tests__/setup.ts:3-16)
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

// 2. lucide (verbatim from components/__tests__/setup.ts:23-32)
jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: () => (_p: unknown) => React.createElement('Icon', null) });
});

// 3. NEW: Skia — return primitive components for Canvas/Group/Rect/Path/Circle/Line/Skia
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

// 4. NEW: gesture-handler — passthrough Gesture.* + GestureDetector passes children
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const mkGesture = () => {
    const g: any = {
      onBegin: () => g, onUpdate: () => g, onStart: () => g, onEnd: () => g,
      onChange: () => g, onTouchesMove: () => g,
      minDuration: () => g, manualActivation: () => g,
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

// 5. NEW: reanimated — useSharedValue returns plain ref-like; runOnJS calls inline
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (v: any) => ({ value: v }),
  useDerivedValue: (fn: any) => ({ value: fn() }),
  runOnJS: (fn: any) => fn,
  useFrameCallback: () => {},
}));
