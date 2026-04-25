// SyncTriggers — Plan 03-04.
// Registers NetInfo + AppState event listeners to trigger sync.
// Also provides scheduleWriteDebounced() used by repos after each local write (D-16).
//
// Reentrancy guard (S-6): module-scoped `initialized` flag prevents double-registration.
// Hot-reload cleanup via module.hot.dispose (Dev mode only).

import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { syncEvents } from './events';

// Injected at registration time (lazy to avoid circular import with SyncWorker singleton)
type SyncAllFn = () => Promise<void>;
type UploadPendingFn = () => Promise<void>;

let initialized = false;
let syncAll: SyncAllFn = async () => {};
let uploadPendingPhotos: UploadPendingFn = async () => {};

// Debounce state for writeDebounced (D-16: 500ms after outbox insert)
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

/**
 * Schedules a sync push 500ms after the last local write (outbox insert).
 * Multiple calls within the window collapse into one sync trigger.
 * Called by repos (vereinsregelnRepo, gardenRepo, photoQueueRepo) after writeWithOutbox.
 */
export function scheduleWriteDebounced(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    syncAll().catch((e) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[SyncTriggers] writeDebounced syncAll failed', e);
      }
    });
  }, DEBOUNCE_MS);
}

/**
 * Registers NetInfo + AppState event listeners that trigger sync.
 * Idempotent — safe to call multiple times (only registers once).
 *
 * @param syncAllFn - Function that runs push() + pullAll()
 * @param uploadFn - Function that runs PhotoUploader.uploadPending()
 */
export function registerSyncTriggers(
  syncAllFn: SyncAllFn,
  uploadFn: UploadPendingFn,
): void {
  if (initialized) return;
  initialized = true;

  syncAll = syncAllFn;
  uploadPendingPhotos = uploadFn;

  let wasOffline = false;

  const unsubNet = NetInfo.addEventListener((state) => {
    const isConnected = !!state.isConnected && state.isInternetReachable !== false;
    if (wasOffline && isConnected) {
      wasOffline = false;
      syncAll().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[SyncTriggers] reconnect syncAll failed', e);
        }
      });
      uploadPendingPhotos().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[SyncTriggers] reconnect uploadPending failed', e);
        }
      });
      syncEvents.emit({ type: 'status_change', status: 'syncing' });
    }
    if (!isConnected) {
      wasOffline = true;
    }
  });

  let lastState = AppState.currentState;
  const subAppState = AppState.addEventListener('change', (state) => {
    if (lastState !== 'active' && state === 'active') {
      syncAll().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[SyncTriggers] foreground syncAll failed', e);
        }
      });
      uploadPendingPhotos().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[SyncTriggers] foreground uploadPending failed', e);
        }
      });
    }
    lastState = state;
  });

  // Hot-reload cleanup (Dev mode only)
  if (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    typeof module !== 'undefined' &&
    (module as any).hot
  ) {
    (module as any).hot.dispose(() => {
      unsubNet();
      subAppState.remove();
      initialized = false;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    });
  }
}

/** Reset function for tests — clears initialization state. */
export function _resetSyncTriggers(): void {
  initialized = false;
  syncAll = async () => {};
  uploadPendingPhotos = async () => {};
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
