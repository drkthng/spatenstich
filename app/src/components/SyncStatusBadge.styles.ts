// SyncStatusBadge NativeWind color classes — Plan 03-06 Task 03
import type { SyncStatusValue } from '../hooks/useSyncStatus';

export const syncBadgeClasses: Record<SyncStatusValue, string> = {
  synced: 'text-green-600 dark:text-green-400',
  syncing: 'text-blue-600 dark:text-blue-400',
  degraded: 'text-amber-600 dark:text-amber-400',
  offline: 'text-gray-500 dark:text-gray-400 opacity-70',
} as const;
