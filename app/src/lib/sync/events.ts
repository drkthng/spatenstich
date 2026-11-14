import type { OutboxEntry } from '@spatenstich/shared';
import { ConflictError } from '../errors';

export type SyncEvent =
  | { type: 'push_start'; entry: OutboxEntry }
  | { type: 'push_success'; entry: OutboxEntry }
  | { type: 'push_retry'; entry: OutboxEntry; nextAttempt: number; nextDelayMs: number }
  | { type: 'push_conflict'; entry: OutboxEntry; error: ConflictError }
  | { type: 'push_permanent_failure'; entry: OutboxEntry; lastError: string }
  | { type: 'pull_start'; entity: string }
  /** changedIds: rows whose stored version changed; foreignUserIds: other people whose edits arrived. */
  | { type: 'pull_success'; entity: string; rowsFetched: number; changedIds: string[]; foreignUserIds: string[] }
  /** A local edit lost against a later one on the server; that one is now stored locally. */
  | { type: 'conflict_resolved'; entity: string; rowId: string; winnerUserId: string | null }
  /** The signed-in user is no longer a member of the active garden. */
  | { type: 'membership_lost'; gardenId: string }
  /** The live connection came up or went away. */
  | { type: 'realtime_status'; connected: boolean }
  | { type: 'pull_failure'; entity: string; error: string }
  | { type: 'status_change'; status: 'idle' | 'syncing' | 'offline' | 'degraded' };

type Listener = (event: SyncEvent) => void;

const listeners = new Set<Listener>();

export const syncEvents = {
  on(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit(event: SyncEvent): void {
    for (const l of listeners) {
      try {
        l(event);
      } catch (e) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.error('[syncEvents] listener threw', e);
      }
    }
  },
  _reset(): void {
    listeners.clear();
  },
};
