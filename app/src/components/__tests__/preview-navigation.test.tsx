// Phase 6.5 Plan 05: preview.tsx redirect to /import/review verification (Crit-1).
// Framework: jest components project (jsdom env). Setup: ./setup.ts (NativeWind mock).
//
// Covers:
//   Crit-1 (preview confirm navigates to /(app)/import/review, not /(app);
//   navigation only after saveImport resolves; banner on saveImport rejection).
import * as React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  Stack: { Screen: () => null },
}));

const mockSaveImport = jest.fn();
const mockResetImport = jest.fn();
jest.mock('@/src/lib/importRepo', () => ({
  saveImport: (...a: unknown[]) => mockSaveImport(...a),
}));
// Stable references — Pitfall: returning a fresh object on every selector call
// makes useEffect([payload]) loop and triggers React's "Maximum update depth" guard.
const stablePayload = {
  version: 'spatenstich-import.v1',
  source: 'claude-ai-project',
  capture: { timestamp: '2026-05-12T10:00:00.000Z' },
  beds: [{ localId: 'b1', label: 'Hochbeet', confidence: 0.9 }],
  plants: [],
  observations: [],
};
const stableStoreState = {
  payload: stablePayload,
  reset: mockResetImport,
};
jest.mock('@/src/stores/importStore', () => ({
  useImportStore: (sel: any) => sel(stableStoreState),
}));
jest.mock('@/src/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ mode: 'account', activeGardenId: 'g-1' }),
}));

import PreviewScreen from '../../../app/(app)/import/preview';

describe('preview navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveImport.mockResolvedValue(undefined);
  });

  it('clicking import.confirmButton calls router.replace with /(app)/import/review (NOT /(app))', async () => {
    const { findByTestId } = render(<PreviewScreen />);
    const confirmBtn = await findByTestId('import-confirm-button');
    fireEvent.press(confirmBtn);
    await waitFor(() => expect(mockSaveImport).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockReplace).toHaveBeenCalledWith('/(app)/import/review');
    // Negative assertion: never called with the old destination
    const calls = mockReplace.mock.calls;
    expect(calls.every((c: any[]) => c[0] !== '/(app)')).toBe(true);
  });

  it('navigation only fires after saveImport resolves successfully', async () => {
    let resolveSave: (() => void) | null = null;
    mockSaveImport.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );
    const { findByTestId } = render(<PreviewScreen />);
    const confirmBtn = await findByTestId('import-confirm-button');
    fireEvent.press(confirmBtn);
    // Before saveImport resolves, replace must NOT have been called
    expect(mockReplace).not.toHaveBeenCalled();
    resolveSave!();
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  });

  it('navigation does NOT fire when saveImport rejects (saveError banner shown instead)', async () => {
    mockSaveImport.mockRejectedValueOnce(new Error('outbox enqueue failed'));
    const { findByTestId } = render(<PreviewScreen />);
    const confirmBtn = await findByTestId('import-confirm-button');
    fireEvent.press(confirmBtn);
    await waitFor(() => expect(mockSaveImport).toHaveBeenCalled());
    // Give the catch block time to run
    await new Promise((r) => setTimeout(r, 50));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
