// useSyncStatus — Plan 03-06 Task 01
// Badge state-machine: offline > degraded > syncing > synced
// Subscribed to syncEvents + storage.listOutboxEntries (debounced 300ms)
// Determines "failed" entries by attempts >= MAX_ATTEMPTS with a lastError.

import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { storage } from '../storage';
import { syncEvents, type SyncEvent } from '../lib/sync/events';
import { MAX_ATTEMPTS } from '../lib/sync/backoff';
import type { OutboxEntry } from '@spatenstich/shared';

export type SyncStatusValue = 'synced' | 'syncing' | 'degraded' | 'offline';

export interface SyncStatus {
  status: SyncStatusValue;
  pendingCount: number;
  failedCount: number;
  /** True while a push/pull is actively running (from status_change event). */
  activelySyncing: boolean;
}

const DEBOUNCE_MS = 300;

/** An outbox entry is considered "failed" when max attempts have been exhausted and there is a lastError. */
function isFailed(e: OutboxEntry): boolean {
  return e.attempts >= MAX_ATTEMPTS && e.lastError !== null;
}

export function useSyncStatus(): SyncStatus {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [activelySyncing, setActivelySyncing] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NetInfo subscription
  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected === true);
    });
    const unsub = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected === true);
    });
    return () => unsub();
  }, []);

  // Debounced outbox count refresh
  const refreshCounts = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const entries = await storage.listOutboxEntries();
        const failed = entries.filter(isFailed).length;
        const pending = entries.length - failed;
        setPendingCount(pending);
        setFailedCount(failed);
      } catch {
        // Adapter error — UI shows only status_change state
      }
    }, DEBOUNCE_MS);
  };

  // Sync events subscription + initial count fetch
  useEffect(() => {
    // Initial fetch (no debounce)
    (async () => {
      try {
        const entries = await storage.listOutboxEntries();
        const failed = entries.filter(isFailed).length;
        setPendingCount(entries.length - failed);
        setFailedCount(failed);
      } catch {
        /* noop */
      }
    })();

    const unsub = syncEvents.on((evt: SyncEvent) => {
      if (evt.type === 'status_change') {
        setActivelySyncing(evt.status === 'syncing');
      }
      // Every event triggers a debounced re-count
      refreshCounts();
    });

    return () => {
      unsub();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive status with priority: offline > degraded > syncing > synced
  let status: SyncStatusValue;
  if (!isConnected) {
    status = 'offline';
  } else if (failedCount > 0) {
    status = 'degraded';
  } else if (activelySyncing || pendingCount > 0) {
    status = 'syncing';
  } else {
    status = 'synced';
  }

  return { status, pendingCount, failedCount, activelySyncing };
}
