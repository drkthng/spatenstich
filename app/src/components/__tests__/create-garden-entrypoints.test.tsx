// Quick 260616-mh4: Einstiegspunkte für "Garten anlegen" — Tests.
// Framework: jest components project (jsdom env). Setup: ./setup.ts (NativeWind + lucide mocks).
//
// Deckt ab:
//   1. Home Empty-State (Account, loadDimensions=null): home-create-garden-button-empty → /(app)/plan/new
//   2. Home Empty-State (Lokal): home-create-garden-button-empty NICHT vorhanden
//   3. Editor Web ohne Dims: web-create-garden-cta → /(app)/plan/new; web-empty-review-cta weiterhin vorhanden
//   4. Editor Native ohne Dims: native-create-garden-cta → /(app)/plan/new
import * as React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  Stack: { Screen: () => null },
}));

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));

// react-native-svg — stub so GardenPlanView renders in jsdom
jest.mock('react-native-svg', () => {
  const React = require('react');
  const noop = (props: any) => React.createElement('svg-element', props, props.children);
  return {
    __esModule: true,
    default: noop,
    Svg: noop,
    Rect: noop,
    Line: noop,
    Circle: noop,
    Text: noop,
    G: noop,
    Path: noop,
    Polygon: noop,
    Polyline: noop,
    Ellipse: noop,
    Defs: noop,
    ClipPath: noop,
    Stop: noop,
    LinearGradient: noop,
  };
});

const mockLoadDimensions = jest.fn();
const mockLoadAcceptedElements = jest.fn();
jest.mock('@/src/lib/gardenPlanRepo', () => ({
  loadDimensions: (...a: unknown[]) => mockLoadDimensions(...a),
  loadAcceptedElements: (...a: unknown[]) => mockLoadAcceptedElements(...a),
  saveDimensions: jest.fn(),
}));

let mockMode = 'account';
let mockActiveGardenId: string | null = 'g-1';
jest.mock('@/src/stores/authStore', () => ({
  useAuthStore: (sel: any) =>
    sel({ mode: mockMode, activeGardenId: mockActiveGardenId }),
}));

// --- Editor screen deps --- all the heavy modules that plan/index.tsx imports
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: { Value: jest.fn(), event: jest.fn() },
    useSharedValue: (v: any) => ({ value: v }),
    useDerivedValue: (fn: any) => ({ value: fn() }),
    useAnimatedStyle: () => ({}),
    runOnJS: (fn: any) => fn,
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    interpolate: jest.fn(),
    Extrapolation: {},
    Extrapolate: {},
    Animated: {
      View: (props: any) => React.createElement('View', props, props.children),
      Text: (props: any) => React.createElement('Text', props, props.children),
      ScrollView: (props: any) => React.createElement('ScrollView', props, props.children),
    },
    View: (props: any) => React.createElement('View', props, props.children),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const GestureDetector = (props: any) =>
    React.createElement('View', null, props.children);
  const Gesture = {
    Pan: () => ({
      activateAfterLongPress: () => ({
        onEnd: () => ({}),
      }),
      onEnd: () => ({}),
    }),
    LongPress: () => ({
      onStart: () => ({}),
    }),
    Tap: () => ({
      onEnd: () => ({}),
    }),
    Simultaneous: (...g: any[]) => g[0],
    Exclusive: (...g: any[]) => g[0],
  };
  return {
    __esModule: true,
    GestureDetector,
    Gesture,
    GestureHandlerRootView: (props: any) =>
      React.createElement('View', props, props.children),
  };
});

// Mock all editor sub-components (not rendered in no-dimensions branches)
jest.mock('@/src/components/editor/EditorCanvas', () => ({
  EditorCanvas: () => null,
}));
jest.mock('@/src/components/editor/EditorToolbar', () => ({
  EditorToolbar: () => null,
}));
jest.mock('@/src/components/editor/ElementPalette', () => ({
  ElementPalette: () => null,
}));
jest.mock('@/src/components/editor/DraftsTrayBottomSheet', () => ({
  DraftsTrayBottomSheet: () => null,
}));
jest.mock('@/src/components/editor/web/WebPlanEditor', () => ({
  WebPlanEditor: () => null,
}));
jest.mock('@/src/components/editor/web/WebPaletteBar', () => ({
  WebPaletteBar: () => null,
}));
jest.mock('@/src/components/editor/web/WebEditorToolbar', () => ({
  WebEditorToolbar: () => null,
}));
jest.mock('@/src/components/editor/CompanionToast', () => ({
  CompanionToast: () => null,
}));
jest.mock('@/src/components/editor/ElementEditorModal', () => ({
  ElementEditorModal: () => null,
}));
jest.mock('@/src/components/GardenPlanView', () => ({
  GardenPlanView: () => null,
}));
jest.mock('@/src/hooks/useCompanionDetection', () => ({
  useCompanionDetection: () => ({
    conflictElementIds: [],
    toastState: null,
    dismissToast: jest.fn(),
  }),
}));
jest.mock('@/src/lib/draftPromotionRepo', () => ({
  promoteBedDraft: jest.fn(),
}));
jest.mock('@/src/lib/importRepo', () => ({
  loadPendingDraftsWithImportedAt: jest.fn().mockResolvedValue({ beds: [], plants: [], observations: [] }),
}));
jest.mock('@/src/lib/geometry/viewMatrix', () => ({
  screenToGarden: jest.fn().mockReturnValue({ xM: 0, yM: 0 }),
}));
jest.mock('@/src/lib/editor/saveDebounce', () => ({
  flushOnLeave: jest.fn(),
  hasPendingSaves: jest.fn().mockReturnValue(false),
}));
jest.mock('@/src/stores/editorStore', () => {
  const listeners: Array<() => void> = [];
  const state = {
    elements: [],
    editingElementId: null,
    setEditingElementId: jest.fn(),
    updateElement: jest.fn(),
    deleteElement: jest.fn(),
  };
  const useEditorStore = (sel: any) => (sel ? sel(state) : state);
  useEditorStore.getState = () => state;
  useEditorStore.setState = (patch: any) => Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  useEditorStore.subscribe = (fn: any) => {
    listeners.push(fn);
    return () => {};
  };
  useEditorStore.temporal = {
    getState: () => ({ pastStates: [], futureStates: [] }),
    subscribe: () => () => {},
  };
  return { useEditorStore };
});

import HomeScreen from '../../../app/(app)/index';
import PlanScreen from '../../../app/(app)/plan/index';

describe('create-garden-entrypoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMode = 'account';
    mockActiveGardenId = 'g-1';
    mockLoadDimensions.mockResolvedValue(null);
    mockLoadAcceptedElements.mockResolvedValue([]);
  });

  it('1. Home Empty-State (Account, loadDimensions=null): home-create-garden-button-empty navigiert zu /(app)/plan/new', async () => {
    const { findByTestId } = render(<HomeScreen />);
    const btn = await findByTestId('home-create-garden-button-empty');
    fireEvent.press(btn);
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/(app)/plan/new'),
    );
  });

  it('2. Home Empty-State (Lokal): home-create-garden-button-empty NICHT vorhanden', async () => {
    mockMode = 'local';
    const { queryByTestId, findByTestId } = render(<HomeScreen />);
    // warte bis der Empty-State gerendert ist (ein anderer testID der immer da ist)
    await findByTestId('home-import-button-empty');
    expect(queryByTestId('home-create-garden-button-empty')).toBeNull();
  });

  it('3. Editor Web ohne Dims: web-create-garden-cta → /(app)/plan/new; web-empty-review-cta weiterhin vorhanden', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const { findByTestId } = render(<PlanScreen />);
    const ctaBtn = await findByTestId('web-create-garden-cta');
    fireEvent.press(ctaBtn);
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/(app)/plan/new'),
    );
    // Regression: Import-CTA bleibt erhalten
    const reviewCta = await findByTestId('web-empty-review-cta');
    expect(reviewCta).toBeTruthy();
  });

  it('4. Editor Native ohne Dims: native-create-garden-cta → /(app)/plan/new', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { findByTestId } = render(<PlanScreen />);
    const ctaBtn = await findByTestId('native-create-garden-cta');
    fireEvent.press(ctaBtn);
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/(app)/plan/new'),
    );
  });
});
