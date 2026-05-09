// Set Supabase env BEFORE any import that transitively pulls in supabase.ts
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import {
  registerSyncTriggers,
  scheduleWriteDebounced,
  _resetSyncTriggers,
  WRITE_DEBOUNCE_MS,
} from '../SyncTriggers';
import * as SyncWorkerModule from '../SyncWorker';

jest.mock('@react-native-community/netinfo');
jest.mock('../SyncWorker', () => {
  const actual = jest.requireActual('../SyncWorker');
  const workerMock = {
    push: jest.fn().mockResolvedValue(undefined),
    pull: jest.fn().mockResolvedValue(undefined),
    pullAll: jest.fn().mockResolvedValue(undefined),
    syncAll: jest.fn().mockResolvedValue(undefined),
    retryOp: jest.fn().mockResolvedValue(undefined),
    discardOp: jest.fn().mockResolvedValue(undefined),
  };
  return {
    ...actual,
    getSyncWorker: jest.fn(() => workerMock),
    __workerMock: workerMock,
  };
});

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ userId: 'user-a', activeGardenId: 'garden-a', mode: 'account' }),
  },
}));

describe('SyncTriggers', () => {
  let netInfoListener: (state: any) => void;
  let appStateListener: (state: string) => void;
  const workerMock = (SyncWorkerModule as any).__workerMock;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetSyncTriggers();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      netInfoListener = cb;
      return () => {};
    });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_ev: any, cb: any) => {
      appStateListener = cb;
      return { remove: jest.fn() } as any;
    });
  });

  it('ruft worker.syncAll() bei offline→online', async () => {
    registerSyncTriggers();
    netInfoListener({ isConnected: false });
    netInfoListener({ isConnected: true, isInternetReachable: true });
    expect(workerMock.syncAll).toHaveBeenCalled();
  });

  it('ruft worker.syncAll() bei background→active', async () => {
    registerSyncTriggers();
    appStateListener('background');
    appStateListener('active');
    expect(workerMock.syncAll).toHaveBeenCalled();
  });

  it('D-16/D-26: Debounce 500ms — bei 499ms noch kein push, bei 500ms genau 1 push', async () => {
    jest.useFakeTimers();
    scheduleWriteDebounced();
    jest.advanceTimersByTime(499);
    expect(workerMock.push).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1); // jetzt insgesamt 500ms
    // setTimeout-callback ist async via Promise — microtask-flush nötig
    await Promise.resolve();
    expect(workerMock.push).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('scheduleWriteDebounced 5× → push nur 1×', async () => {
    jest.useFakeTimers();
    for (let i = 0; i < 5; i++) scheduleWriteDebounced();
    jest.advanceTimersByTime(WRITE_DEBOUNCE_MS + 1);
    await Promise.resolve();
    expect(workerMock.push).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('unregister cleanup klappt', () => {
    const unregister = registerSyncTriggers();
    expect(() => unregister()).not.toThrow();
  });

  it('WRITE_DEBOUNCE_MS ist 500 (D-16/D-26)', () => {
    expect(WRITE_DEBOUNCE_MS).toBe(500);
  });
});
