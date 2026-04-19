// authStore unit tests.
// Verifies state transitions + AsyncStorage persistence via Zustand persist middleware.
import { useAuthStore } from '../authStore';
import AsyncStorage from '../../__mocks__/async-storage';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    (AsyncStorage as any).__reset();
  });

  it('initial state is { mode: null, userId: null }', () => {
    const state = useAuthStore.getState();
    expect(state.mode).toBeNull();
    expect(state.userId).toBeNull();
  });

  it('setAccountMode sets mode=account and userId', () => {
    useAuthStore.getState().setAccountMode('uid-1');
    const state = useAuthStore.getState();
    expect(state.mode).toBe('account');
    expect(state.userId).toBe('uid-1');
  });

  it('setLocalMode sets mode=local and userId', () => {
    useAuthStore.getState().setLocalMode('uuid-2');
    const state = useAuthStore.getState();
    expect(state.mode).toBe('local');
    expect(state.userId).toBe('uuid-2');
  });

  it('clearAuth resets to initial state', () => {
    useAuthStore.getState().setAccountMode('uid-x');
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.mode).toBeNull();
    expect(state.userId).toBeNull();
  });

  it('persist middleware writes to AsyncStorage under name "spatenstich-auth"', async () => {
    useAuthStore.getState().setAccountMode('persist-test');
    // Zustand persist is async — poll briefly.
    await new Promise((r) => setTimeout(r, 10));
    const raw = await AsyncStorage.getItem('spatenstich-auth');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    // Zustand persist envelope: { state: {...}, version: ... }
    expect(parsed.state.mode).toBe('account');
    expect(parsed.state.userId).toBe('persist-test');
  });
});
