// Quick 260616-mh4: Neuer "Garten anlegen"-Screen — Tests.
// Framework: jest components project (jsdom env). Setup: ./setup.ts (NativeWind + lucide mocks).
//
// Deckt ab:
//   1. Account + Default-Werte: saveDimensions-Aufruf + Navigation nach Erfolg
//   2. Ungültige Eingabe: saveDimensions NICHT aufgerufen; Inline-Fehler sichtbar
//   3. Lokal-Modus: saveDimensions NICHT aufgerufen; account-required-hint sichtbar
//   4. Navigation erst nach saveDimensions-Resolve (analog preview-navigation.test.tsx)
import * as React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
  Stack: { Screen: () => null },
}));

const mockSaveDimensions = jest.fn();
jest.mock('@/src/lib/gardenPlanRepo', () => ({
  saveDimensions: (...a: unknown[]) => mockSaveDimensions(...a),
  loadDimensions: jest.fn(),
  loadAcceptedElements: jest.fn(),
}));

let mockMode: string = 'account';
let mockGardenId: string | null = 'g-1';
jest.mock('@/src/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ mode: mockMode, activeGardenId: mockGardenId }),
}));

import NewGardenScreen from '../../../app/(app)/plan/new';

describe('plan-new-screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMode = 'account';
    mockGardenId = 'g-1';
    mockSaveDimensions.mockResolvedValue({});
  });

  it('1. Account + Default-Werte: saveDimensions mit geparsten Dims aufgerufen + Navigation nach Erfolg', async () => {
    const { findByTestId } = render(<NewGardenScreen />);
    const submitBtn = await findByTestId('create-garden-submit');
    fireEvent.press(submitBtn);
    await waitFor(() =>
      expect(mockSaveDimensions).toHaveBeenCalledWith('account', 'g-1', {
        shape: 'rectangle',
        widthM: 10,
        heightM: 5,
        extraDims: null,
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)/plan'));
  });

  it('2. Ungültige Eingabe (Breite 0): saveDimensions NICHT aufgerufen; Inline-Fehler sichtbar', async () => {
    const { findByTestId, queryByTestId } = render(<NewGardenScreen />);
    const widthInput = await findByTestId('garden-width-input');
    fireEvent.changeText(widthInput, '0');
    const submitBtn = await findByTestId('create-garden-submit');
    fireEvent.press(submitBtn);
    await waitFor(() => expect(queryByTestId('garden-dims-error')).not.toBeNull());
    expect(mockSaveDimensions).not.toHaveBeenCalled();
  });

  it('3. Lokal-Modus: saveDimensions NICHT aufgerufen; account-required-hint sichtbar', async () => {
    mockMode = 'local';
    const { findByTestId } = render(<NewGardenScreen />);
    const submitBtn = await findByTestId('create-garden-submit');
    fireEvent.press(submitBtn);
    await waitFor(() => expect(mockSaveDimensions).not.toHaveBeenCalled());
    const hint = await findByTestId('account-required-hint');
    expect(hint).toBeTruthy();
  });

  it('4. Navigation erst nach saveDimensions-Resolve', async () => {
    let resolveSave: (() => void) | null = null;
    mockSaveDimensions.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );
    const { findByTestId } = render(<NewGardenScreen />);
    const submitBtn = await findByTestId('create-garden-submit');
    fireEvent.press(submitBtn);
    // Vor Resolve darf mockReplace NICHT aufgerufen worden sein
    expect(mockReplace).not.toHaveBeenCalled();
    resolveSave!();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)/plan'));
  });
});
