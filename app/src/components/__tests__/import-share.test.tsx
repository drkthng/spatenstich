// Phase 20 Plan 03 Task 3 (DEPLOY-04) — RED: Import-Seite mit ?from=share.
// Framework: jest components project (jsdom env). Prüft, dass ein geteilter
// Payload GENAU denselben Validierungspfad wie der Einfüge-Weg durchläuft
// (ASVS V5, T-20-03-02): kein Sonderpfad, dieselbe Fehlermeldung, dieselbe
// Navigation bei Erfolg.
import * as React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import de from '@spatenstich/shared/i18n/de';
import minimalPayload from '../../../../schemas/examples/minimal.json';

const mockPush = jest.fn();
let mockSearchParams: { from?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockSearchParams,
  Stack: { Screen: () => null },
}));

const mockReadAndClear = jest.fn();
jest.mock('@/src/lib/shareInbox', () => ({
  readAndClear: (...args: unknown[]) => mockReadAndClear(...args),
}));

// Native modules the screen imports but these tests never exercise (fileUri /
// file-picker paths) — real ESM builds aren't transformed under jsdom here.
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
}));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

import ImportEntryScreen from '../../../app/(app)/import/index';
import { useImportStore } from '@/src/stores/importStore';

describe('ImportEntryScreen — Web Share Target (?from=share)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { from: 'share' };
    useImportStore.getState().reset();
  });

  it('liest die Inbox, validiert wie der Einfüge-Weg und navigiert bei gültigem Payload zur Vorschau', async () => {
    mockReadAndClear.mockResolvedValue({
      text: JSON.stringify(minimalPayload),
      receivedAt: Date.now(),
    });

    render(<ImportEntryScreen />);

    await waitFor(() => expect(mockReadAndClear).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/(app)/import/preview'),
    );
    expect(useImportStore.getState().payload).not.toBeNull();
  });

  it('ungültiger geteilter Payload erzeugt dieselbe Fehlermeldung wie ein ungültiger eingefügter Payload — keine Navigation', async () => {
    mockReadAndClear.mockResolvedValue({
      text: 'das ist kein json{{{',
      receivedAt: Date.now(),
    });

    const { findByText } = render(<ImportEntryScreen />);

    await findByText(de.import.errorJsonSyntax);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('ohne from=share wird die Inbox nicht gelesen', async () => {
    mockSearchParams = {};
    render(<ImportEntryScreen />);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReadAndClear).not.toHaveBeenCalled();
  });
});
