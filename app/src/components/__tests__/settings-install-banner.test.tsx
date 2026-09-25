// Phase 20 Plan 03 Task 4 (DEPLOY-04) — RED: Installations-Banner in den
// Einstellungen. Deckt PLAN.md Task 4 Action 8's dritten Fall ab:
// "das Installations-Banner erscheint nicht im Standalone-Modus".
import * as React from 'react';
import { render } from '@testing-library/react-native';
import de from '@spatenstich/shared/i18n/de';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Link: ({ children }: any) => children,
}));

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      signOut: jest.fn(),
    },
  },
}));
jest.mock('@/src/lib/auth', () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));
jest.mock('@/src/lib/migrateLocalToAccount', () => ({
  migrateLocalToAccount: jest.fn(),
}));

let mockMode: 'account' | 'local' | null = 'account';
let mockInstallPromptEvent: unknown = null;
const mockClearInstallPrompt = jest.fn();
jest.mock('@/src/stores/authStore', () => {
  function hookFn(sel: any) {
    return sel({
      mode: mockMode,
      installPromptEvent: mockInstallPromptEvent,
      clearInstallPrompt: mockClearInstallPrompt,
    });
  }
  hookFn.getState = () => ({ mode: mockMode, clearAuth: jest.fn() });
  return { useAuthStore: hookFn };
});

import SettingsScreen from '../../../app/(app)/settings';

function mockMatchMedia(standalone: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: standalone && query === '(display-mode: standalone)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

describe('SettingsScreen — Installations-Banner (DEPLOY-04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMode = 'account';
    mockInstallPromptEvent = { prompt: jest.fn(), userChoice: Promise.resolve() };
  });

  it('zeigt das Installations-Banner, wenn ein Installationsereignis vorliegt und die App NICHT im Standalone-Modus laeuft', async () => {
    mockMatchMedia(false);
    const { findByText } = render(<SettingsScreen />);
    await findByText(de.pwa.installBanner);
  });

  it('zeigt das Installations-Banner NICHT im Standalone-Modus, auch wenn ein Installationsereignis vorliegt', async () => {
    mockMatchMedia(true);
    const { queryByText, findByTestId } = render(<SettingsScreen />);
    // warte, bis der Standalone-Check (useEffect) gelaufen ist
    await findByTestId('settings-email').catch(() => {});
    expect(queryByText(de.pwa.installBanner)).toBeNull();
  });

  it('zeigt das Installations-Banner NICHT ohne Installationsereignis', async () => {
    mockInstallPromptEvent = null;
    mockMatchMedia(false);
    const { queryByText } = render(<SettingsScreen />);
    await new Promise((r) => setTimeout(r, 0));
    expect(queryByText(de.pwa.installBanner)).toBeNull();
  });
});
