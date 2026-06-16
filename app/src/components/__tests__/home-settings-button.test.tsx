// Quick 260616-iuu: Zahnrad-Button im Home-Header — Render- und Navigations-Test.
// Deckt beide Render-Branches (Plan-View und Empty-State) und beide Modi (account + local) ab.
// Framework: jest components project (jsdom env). Setup: ./setup.ts (NativeWind + lucide mocks).
import * as React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  Stack: { Screen: () => null },
}));

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));

// react-native-svg ships as CommonJS but its Touchable internals reference
// a 'Touchable' export from RN that is undefined in jsdom env.
// Mock the whole module so GardenPlanView (transitively imported by HomeScreen)
// can render without crashing.
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

jest.mock('@/src/lib/gardenPlanRepo', () => ({
  loadDimensions: jest.fn(),
  loadAcceptedElements: jest.fn(),
}));

let mockMode = 'account';
jest.mock('@/src/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ mode: mockMode, activeGardenId: null }),
}));

import HomeScreen from '../../../app/(app)/index';

describe('home-settings-button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMode = 'account';
  });

  it('rendert home-settings-button im Account-Modus (Empty-State) und navigiert zu /(app)/settings', async () => {
    const { findByTestId } = render(<HomeScreen />);
    const btn = await findByTestId('home-settings-button');
    fireEvent.press(btn);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(app)/settings'));
  });

  it('rendert home-settings-button im Lokal-Modus (Empty-State) und navigiert zu /(app)/settings', async () => {
    mockMode = 'local';
    const { findByTestId } = render(<HomeScreen />);
    const btn = await findByTestId('home-settings-button');
    fireEvent.press(btn);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(app)/settings'));
  });

  it('home-profile-button bleibt vorhanden und navigiert weiterhin zu /(app)/profile (Regressions-Schutz)', async () => {
    const { findByTestId } = render(<HomeScreen />);
    const profileBtn = await findByTestId('home-profile-button');
    fireEvent.press(profileBtn);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(app)/profile'));
  });
});
