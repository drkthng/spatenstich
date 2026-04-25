// SyncEventChannel — lightweight event bus for sync status updates.
// Used by SyncWorker and PhotoUploader to emit status changes.
// UI subscribers (Plan 03-06 SyncStatusBadge) listen here.

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'synced';

export interface SyncStatusChangeEvent {
  type: 'status_change';
  status: SyncStatus;
}

export interface SyncConflictEvent {
  type: 'conflict';
  entity: string;
  rowId: string;
}

export type SyncEvent = SyncStatusChangeEvent | SyncConflictEvent;

type Listener = (event: SyncEvent) => void;

class SyncEventChannel {
  private listeners: Set<Listener> = new Set();

  emit(event: SyncEvent): void {
    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch {
        // listener errors must not crash the worker
      }
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Singleton event channel for sync subsystem. */
export const syncEvents = new SyncEventChannel();
