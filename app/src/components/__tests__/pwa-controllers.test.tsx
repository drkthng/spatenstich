/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://spatenstich.pages.dev/"}
 */
// Phase 20 Plan 03 Task 4 (DEPLOY-04) — RED: Update-Hinweis + Speicher-Warnung.
// Deckt die drei in der PLAN.md Task 4 Action 8 genannten Verhalten ab:
//   1. Update-Hinweis erscheint bei einem gefundenen Update.
//   2. Die Aktion laedt NICHT neu, solange ungesicherte Aenderungen anstehen.
//   3. (siehe settings-install-banner.test.tsx) Installations-Banner im
//      Standalone-Modus NICHT sichtbar.
import * as React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import de from '@spatenstich/shared/i18n/de';

const mockHasPendingSaves = jest.fn().mockReturnValue(false);
jest.mock('@/src/lib/editor/saveDebounce', () => ({
  hasPendingSaves: () => mockHasPendingSaves(),
}));

// StorageController (same module) uses useAuth() from @/src/lib/auth, which
// imports ./supabase — that throws at import time without real env vars.
// Not exercised by these tests (ServiceWorkerController only); mock it out.
jest.mock('@/src/lib/auth', () => ({
  useAuth: () => ({ identity: null }),
}));

import { ServiceWorkerController } from '../pwa/PwaControllers';

describe('ServiceWorkerController — Update-Hinweis (DEPLOY-03/04)', () => {
  let fakeInstalling: EventTarget & { state: string };
  let fakeRegistration: EventTarget & {
    installing: EventTarget & { state: string };
    waiting: { postMessage: jest.Mock } | null;
  };
  let fakeServiceWorkerContainer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPendingSaves.mockReturnValue(false);

    fakeInstalling = Object.assign(new EventTarget(), { state: 'installing' });
    fakeRegistration = Object.assign(new EventTarget(), {
      installing: fakeInstalling,
      waiting: { postMessage: jest.fn() },
    });

    fakeServiceWorkerContainer = {
      register: jest.fn().mockResolvedValue(fakeRegistration),
      controller: {}, // truthy → kein Erstinstall, ein Update ist moeglich
      addEventListener: jest.fn(),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: fakeServiceWorkerContainer,
      configurable: true,
    });
  });

  it('registriert /sw.js und zeigt den Update-Hinweis, sobald eine neue Version installiert ist', async () => {
    const { findByText } = render(<ServiceWorkerController />);

    await waitFor(() =>
      expect(fakeServiceWorkerContainer.register).toHaveBeenCalledWith('/sw.js'),
    );

    // simuliere 'updatefound' -> installing-worker wird 'statechange'-beobachtet
    act(() => {
      fakeRegistration.dispatchEvent(new Event('updatefound'));
      fakeInstalling.state = 'installed';
      fakeInstalling.dispatchEvent(new Event('statechange'));
    });

    await findByText(de.pwa.updateAvailable);
  });

  it('die Update-Aktion sendet SKIP_WAITING NUR ohne ungesicherte Aenderungen', async () => {
    const { findByText } = render(<ServiceWorkerController />);
    await waitFor(() =>
      expect(fakeServiceWorkerContainer.register).toHaveBeenCalledWith('/sw.js'),
    );
    act(() => {
      fakeRegistration.dispatchEvent(new Event('updatefound'));
      fakeInstalling.state = 'installed';
      fakeInstalling.dispatchEvent(new Event('statechange'));
    });

    const actionText = await findByText(de.pwa.updateAction);

    // Ungesicherte Aenderungen stehen an -> Aktion darf NICHT SKIP_WAITING senden.
    mockHasPendingSaves.mockReturnValue(true);
    fireEvent.press(actionText);
    expect(fakeRegistration.waiting!.postMessage).not.toHaveBeenCalled();

    // Keine ungesicherten Aenderungen mehr -> Aktion sendet SKIP_WAITING.
    mockHasPendingSaves.mockReturnValue(false);
    fireEvent.press(actionText);
    expect(fakeRegistration.waiting!.postMessage).toHaveBeenCalledWith('SKIP_WAITING');
  });
});
