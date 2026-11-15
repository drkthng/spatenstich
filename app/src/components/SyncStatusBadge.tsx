// SyncStatusBadge — Plan 03-06 Task 03
// Global header badge showing 4 sync states: synced / syncing / degraded / offline
// Tap → /settings/sync detail screen.
// Rendered in app/(app)/_layout.tsx headerRight — visible on all authenticated routes.
// Phase 38 (DESIGN3-04, DESIGN3-06): the state is shown by an icon from the app's icon set
// next to its words, and the badge is a full-size touch target.

import * as React from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, RefreshCw, TriangleAlert, WifiOff } from 'lucide-react-native';
import { useSyncStatus, type SyncStatusValue } from '../hooks/useSyncStatus';
import { syncBadgeClasses } from './SyncStatusBadge.styles';
import { tokens } from '../theme/tokens';
import { t } from '../lib/i18n';

const ICON: Record<SyncStatusValue, typeof Check> = {
  synced: Check,
  syncing: RefreshCw,
  degraded: TriangleAlert,
  offline: WifiOff,
};

const ICON_COLOR: Record<SyncStatusValue, string> = {
  synced: tokens.color.primary,
  syncing: tokens.color.primary,
  degraded: tokens.color.warn,
  offline: tokens.color.inkMuted,
};

export function SyncStatusBadge(): React.JSX.Element {
  const router = useRouter();
  const { status, pendingCount, failedCount } = useSyncStatus();

  const label = t(`sync.badge.${status}`);

  const suffix: string | null =
    status === 'degraded' && failedCount > 0
      ? t('sync.badge.failedCount', { n: failedCount })
      : status === 'syncing' && pendingCount > 0
      ? t('sync.badge.pendingCount', { n: pendingCount })
      : null;

  const accessibilityLabel = suffix ? `${label} — ${suffix}` : label;
  const Icon = ICON[status];

  return (
    <Pressable
      testID="sync-status-badge"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => router.push('/settings/sync' as any)}
      className="flex-row items-center px-2"
      style={{ minHeight: 48 }}
    >
      <Icon size={16} color={ICON_COLOR[status]} strokeWidth={2.2} />
      <Text
        testID="sync-status-label"
        className={`text-sm ml-1 ${syncBadgeClasses[status]}`}
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
