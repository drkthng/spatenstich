// SyncStatusBadge NativeWind color classes — Plan 03-06 Task 03
import type { SyncStatusValue } from '../hooks/useSyncStatus';

export const syncBadgeClasses: Record<SyncStatusValue, string> = {
  synced: 'text-primary',
  syncing: 'text-primary',
  degraded: 'text-warn',
  offline: 'text-ink-muted opacity-70',
} as const;
