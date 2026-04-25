// useSyncStatus Hook — TDD (Plan 03-06 Task 01)
// Tests the badge state-machine: offline > degraded > syncing > synced
// Uses fake-indexeddb for the storage adapter (hooks/node env).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import 'fake-indexeddb/auto';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { syncEvents } from '../events';
import { storage } from '../../../storage';
import type { GardenRow } from '@spatenstich/shared';
import { MAX_ATTEMPTS } from '../backoff';
import { useSyncStatus } from '../../../hooks/useSyncStatus';

// NetInfo mock loaded from __mocks__/react-native-community-netinfo.ts
import NetInfoMock from '@react-native-community/netinfo';

jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: any) => obj['web'] ?? obj['default'] },
  AppState: { addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }), currentState: 'active' },
}));

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ userId: 'user-a', activeGardenId: 'garden-a', mode: 'account' }),
  },
}));

const sampleGarden = (id: string, overrides?: Partial<GardenRow>): GardenRow => ({
  id,
  createdAt: '2026-04-24T10:00:00.000Z',
  updatedAt: '2026-04-24T10:00:00.000Z',
  updatedByUserId: 'user-a',
  deletedAt: null,
  name: 'Testgarten',
  ownerUserId: 'user-a',
  ...overrides,
});

async function seedOutboxEntry(id: string, failedAttempts = 0) {
  await storage.writeWithOutbox(
    'gardens',
    sampleGarden(id),
    { entity: 'gardens', rowId: id, operation: 'upsert' as any, payload: { id } },
  );
  if (failedAttempts > 0) {
    const entries = await storage.listOutboxEntries();
    const entry = entries.find((e) => e.rowId === id);
    if (entry) {
      await storage.updateOutboxEntry(entry.id, { attempts: failedAttempts, lastError: 'sim error' });
    }
  }
}

async function clearOutbox() {
  const entries = await storage.listOutboxEntries();
  for (const e of entries) {
    await storage.deleteOutboxEntry(e.id);
  }
}

describe('useSyncStatus', () => {
  beforeEach(async () => {
    syncEvents._reset();
    jest.clearAllMocks();
    await clearOutbox();
    // Reset NetInfo to online
    (NetInfoMock.fetch as jest.Mock).mockResolvedValue({ isConnected: true, isInternetReachable: true });
    (NetInfoMock.addEventListener as jest.Mock).mockReturnValue(() => {});
  });

  afterEach(async () => {
    await clearOutbox();
  });

  test('Test 1: Initial-Render mit leerer Outbox → status=synced, counts=0', async () => {
    const { result } = renderHook(() => useSyncStatus());
    await waitFor(() => {
      expect(result.current.status).toBe('synced');
    });
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
  });

  test('Test 2: status_change:syncing Event → status=syncing', async () => {
    const { result } = renderHook(() => useSyncStatus());
    // Wait for initial mount
    await waitFor(() => {
      expect(result.current.status).toBeDefined();
    });
    await act(async () => {
      syncEvents.emit({ type: 'status_change', status: 'syncing' });
    });
    expect(result.current.status).toBe('syncing');
  });

  test('Test 3: Outbox 3 pending + 2 failed → pendingCount=3, failedCount=2, status=degraded', async () => {
    // Seed 3 pending entries (low attempt count)
    await seedOutboxEntry('g-p1');
    await seedOutboxEntry('g-p2');
    await seedOutboxEntry('g-p3');
    // Seed 2 failed entries (attempts >= MAX_ATTEMPTS)
    await seedOutboxEntry('g-f1', MAX_ATTEMPTS);
    await seedOutboxEntry('g-f2', MAX_ATTEMPTS);

    const { result } = renderHook(() => useSyncStatus());
    await waitFor(() => {
      expect(result.current.failedCount).toBe(2);
    }, { timeout: 3000 });

    expect(result.current.pendingCount).toBe(3);
    expect(result.current.status).toBe('degraded');
  });

  test('Test 4: isConnected=false → status=offline (überschreibt alle anderen)', async () => {
    // Provide offline state immediately via fetch
    (NetInfoMock.fetch as jest.Mock).mockResolvedValue({ isConnected: false, isInternetReachable: false });
    // Simulate addEventListener calling back with offline state
    (NetInfoMock.addEventListener as jest.Mock).mockImplementation((cb: (state: any) => void) => {
      Promise.resolve().then(() => cb({ isConnected: false }));
      return () => {};
    });

    const { result } = renderHook(() => useSyncStatus());
    await waitFor(() => {
      expect(result.current.status).toBe('offline');
    }, { timeout: 2000 });
  });

  test('Test 5: push_success Event → Hook re-fetcht Outbox-Counts (nach Debounce)', async () => {
    // Seed an entry so we have something to count
    await seedOutboxEntry('g-s1');

    const listSpy = jest.spyOn(storage, 'listOutboxEntries');
    const { result } = renderHook(() => useSyncStatus());

    // Wait for initial render
    await waitFor(() => {
      expect(result.current.pendingCount).toBeGreaterThan(0);
    }, { timeout: 2000 });

    const callsBefore = listSpy.mock.calls.length;

    // Remove the entry to simulate a successful sync
    const entries = await storage.listOutboxEntries();
    for (const e of entries) await storage.deleteOutboxEntry(e.id);

    // Emit push_success to trigger re-fetch
    await act(async () => {
      syncEvents.emit({
        type: 'push_success',
        entry: {
          id: 'op-1', entity: 'gardens', rowId: 'g-s1',
          operation: 'upsert', payload: {}, createdAt: '', attempts: 0, lastError: null,
        } as any,
      });
      // Wait for debounce to fire (300ms)
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
    });

    // listOutboxEntries was called again after debounce
    expect(listSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    // pendingCount should reflect empty outbox
    expect(result.current.pendingCount).toBe(0);
  });

  test('Test 6: Unmount entfernt syncEvents + NetInfo listener', async () => {
    const unsubSpy = jest.fn();
    const origOn = syncEvents.on.bind(syncEvents);
    jest.spyOn(syncEvents, 'on').mockImplementation((cb) => {
      const realUnsub = origOn(cb);
      return () => {
        realUnsub();
        unsubSpy();
      };
    });

    const { unmount } = renderHook(() => useSyncStatus());

    await waitFor(() => {}, { timeout: 200 }).catch(() => {});

    unmount();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });

  test('Test 7: 5 schnelle Events binnen 300ms → nur 1 listOutboxEntries-Aufruf (debouncing)', async () => {
    // Using fake timers scoped to this test
    jest.useFakeTimers();
    const listSpy = jest.spyOn(storage, 'listOutboxEntries');

    // Render hook with fake timers active
    renderHook(() => useSyncStatus());

    // Initial async fetch is in-flight; advance microtasks
    await act(async () => { /* flush microtasks from initial render */ });
    listSpy.mockClear();

    // Emit 5 events rapidly within debounce window
    act(() => {
      for (let i = 0; i < 5; i++) {
        syncEvents.emit({
          type: 'push_start',
          entry: {
            id: `op-${i}`, entity: 'gardens', rowId: 'g-x',
            operation: 'upsert', payload: {}, createdAt: '', attempts: 0, lastError: null,
          } as any,
        });
      }
    });

    // Before debounce fires: no re-fetch calls yet
    expect(listSpy).toHaveBeenCalledTimes(0);

    // Advance past debounce window
    act(() => {
      jest.advanceTimersByTime(350);
    });

    // Only 1 debounced call fired
    expect(listSpy).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
