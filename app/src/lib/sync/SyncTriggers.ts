// Subscribt auf 3 Event-Quellen und ruft Worker-Methoden:
//   - NetInfo offline→online: worker.syncAll()
//   - AppState background→active: worker.syncAll()
//   - scheduleWriteDebounced(): worker.push() nach 500ms (D-16/D-26)
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { getSyncWorker } from './SyncWorker';
import { uploadPending } from '../photos/PhotoUploader';

// NetInfoSubscription is the return type of addEventListener (unsubscribe function).
// We use ReturnType to avoid importing from the internal types namespace.
type NetInfoUnsubscribe = ReturnType<typeof NetInfo.addEventListener>;

export const WRITE_DEBOUNCE_MS = 500; // D-16 / D-26

let writeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced push() — 500ms nach letztem Write (D-16/D-26). */
export function scheduleWriteDebounced(): void {
  if (writeDebounceTimer) clearTimeout(writeDebounceTimer);
  writeDebounceTimer = setTimeout(() => {
    writeDebounceTimer = null;
    getSyncWorker().push().catch((e) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[SyncTriggers] debounced push failed', e);
    });
  }, WRITE_DEBOUNCE_MS);
}

/** Test-utility: reset debounce timer zwischen Tests. */
export function _resetSyncTriggers(): void {
  if (writeDebounceTimer) {
    clearTimeout(writeDebounceTimer);
    writeDebounceTimer = null;
  }
}

/**
 * Registriert NetInfo + AppState Subscriptions.
 * Gibt unregister-Funktion zurück (call bei unmount / logout).
 */
export function registerSyncTriggers(): () => void {
  let wasOffline = false;
  const netInfoUnsub: NetInfoUnsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = state.isConnected === true && state.isInternetReachable !== false;
    if (!isConnected) {
      wasOffline = true;
      return;
    }
    if (wasOffline && isConnected) {
      wasOffline = false;
      getSyncWorker().syncAll().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[SyncTriggers] reconnect syncAll failed', e);
      });
      uploadPending().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[SyncTriggers] reconnect uploadPending failed', e);
      });
    }
  });

  let lastState: AppStateStatus = AppState.currentState;
  const appStateUnsub = AppState.addEventListener('change', (state) => {
    if (lastState !== 'active' && state === 'active') {
      getSyncWorker().syncAll().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[SyncTriggers] foreground syncAll failed', e);
      });
      uploadPending().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[SyncTriggers] foreground uploadPending failed', e);
      });
    }
    lastState = state;
  });

  return () => {
    netInfoUnsub();
    appStateUnsub.remove();
    _resetSyncTriggers();
  };
}
