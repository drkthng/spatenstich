// SyncStatusBadge Component Tests — Plan 03-06 Task 03 (TDD)
// Tests 4 badge states + tap navigation + accessibility + testID.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import de from '@spatenstich/shared/i18n/de';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  Link: ({ children, href, asChild }: any) =>
    asChild
      ? React.cloneElement(children, { onPress: () => mockPush(href) })
      : React.createElement('View', null, children),
  Stack: { Screen: () => null },
}));

// Mock useSyncStatus — fully controlled per test
const mockUseSyncStatus = jest.fn();
jest.mock('../../../hooks/useSyncStatus', () => ({
  useSyncStatus: (...args: any[]) => mockUseSyncStatus(...args),
}));

import { SyncStatusBadge } from '../../../components/SyncStatusBadge';

// Type cast for JSON i18n
const i18n = de as any;

describe('SyncStatusBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Test 1: status=synced → rendert Badge mit Label "Synchronisiert"', () => {
    mockUseSyncStatus.mockReturnValue({
      status: 'synced', pendingCount: 0, failedCount: 0, activelySyncing: false,
    });
    const { getByTestId, queryByText } = render(<SyncStatusBadge />);
    expect(getByTestId('sync-status-badge')).toBeTruthy();
    expect(queryByText(i18n.sync.badge.synced)).toBeTruthy();
  });

  test('Test 2: status=syncing + pendingCount=3 → Label "Synchronisiere …" + "3 ausstehend"', () => {
    mockUseSyncStatus.mockReturnValue({
      status: 'syncing', pendingCount: 3, failedCount: 0, activelySyncing: true,
    });
    const { queryByText } = render(<SyncStatusBadge />);
    expect(queryByText(i18n.sync.badge.syncing)).toBeTruthy();
    expect(queryByText('3 ausstehend')).toBeTruthy();
  });

  test('Test 3: status=degraded + failedCount=2 → Label "Probleme..." + "2 fehlgeschlagen"', () => {
    mockUseSyncStatus.mockReturnValue({
      status: 'degraded', pendingCount: 0, failedCount: 2, activelySyncing: false,
    });
    const { queryByText } = render(<SyncStatusBadge />);
    expect(queryByText(i18n.sync.badge.degraded)).toBeTruthy();
    expect(queryByText('2 fehlgeschlagen')).toBeTruthy();
  });

  test('Test 4: status=offline → Label "Offline"', () => {
    mockUseSyncStatus.mockReturnValue({
      status: 'offline', pendingCount: 0, failedCount: 0, activelySyncing: false,
    });
    const { queryByText } = render(<SyncStatusBadge />);
    expect(queryByText(i18n.sync.badge.offline)).toBeTruthy();
  });

  test('Test 5: Tap auf Badge → router.push("/settings/sync")', () => {
    mockUseSyncStatus.mockReturnValue({
      status: 'synced', pendingCount: 0, failedCount: 0, activelySyncing: false,
    });
    const { getByTestId } = render(<SyncStatusBadge />);
    fireEvent.press(getByTestId('sync-status-badge'));
    expect(mockPush).toHaveBeenCalledWith('/settings/sync');
  });

  test('Test 6: accessibilityLabel enthält Status-Label + Count-Suffix', () => {
    mockUseSyncStatus.mockReturnValue({
      status: 'degraded', pendingCount: 0, failedCount: 2, activelySyncing: false,
    });
    const { getByTestId } = render(<SyncStatusBadge />);
    const badge = getByTestId('sync-status-badge');
    const label = badge.props.accessibilityLabel as string;
    expect(label).toContain(i18n.sync.badge.degraded);
    expect(label).toContain('2');
  });

  test('Test 7: testID="sync-status-badge" gesetzt', () => {
    mockUseSyncStatus.mockReturnValue({
      status: 'synced', pendingCount: 0, failedCount: 0, activelySyncing: false,
    });
    const { getByTestId } = render(<SyncStatusBadge />);
    expect(getByTestId('sync-status-badge')).toBeTruthy();
  });
});
