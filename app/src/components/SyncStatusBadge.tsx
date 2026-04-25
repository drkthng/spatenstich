// SyncStatusBadge — Plan 03-06 Task 03
// Global header badge showing 4 sync states: synced / syncing / degraded / offline
// Tap → /settings/sync detail screen.
// Rendered in app/(app)/_layout.tsx headerRight — visible on all authenticated routes.

import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSyncStatus, type SyncStatusValue } from '../hooks/useSyncStatus';
import de from '@spatenstich/shared/i18n/de';
import { syncBadgeClasses } from './SyncStatusBadge.styles';

// Type-assert de.json to access sync keys
const t = de as any;

const ICON: Record<SyncStatusValue, string> = {
  synced: '✓',
  syncing: '⇄',
  degraded: '⚠',
  offline: '⊘',
};

function formatPendingCount(n: number): string {
  return (t.sync.badge.pendingCount as string).replace('{n}', String(n));
}

function formatFailedCount(n: number): string {
  return (t.sync.badge.failedCount as string).replace('{n}', String(n));
}

export function SyncStatusBadge(): React.JSX.Element {
  const router = useRouter();
  const { status, pendingCount, failedCount } = useSyncStatus();

  const label: string = t.sync.badge[status];

  const suffix: string | null =
    status === 'degraded' && failedCount > 0
      ? formatFailedCount(failedCount)
      : status === 'syncing' && pendingCount > 0
      ? formatPendingCount(pendingCount)
      : null;

  const accessibilityLabel = suffix ? `${label} — ${suffix}` : label;

  return (
    <Pressable
      testID="sync-status-badge"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => router.push('/settings/sync' as any)}
      className="flex-row items-center px-2 py-1"
    >
      <Text
        testID="sync-status-icon"
        className={`text-sm mr-1 ${syncBadgeClasses[status]}`}
      >
        {ICON[status]}
      </Text>
      <Text
        testID="sync-status-label"
        className={`text-sm ${syncBadgeClasses[status]}`}
      >
        {label}
      </Text>
      {suffix ? (
        <Text
          testID="sync-status-count"
          className={`text-xs ml-1 ${syncBadgeClasses[status]}`}
        >
          {suffix}
        </Text>
      ) : null}
    </Pressable>
  );
}
