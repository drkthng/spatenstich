// LargeSecureStore unit tests.
// Verifies AES-CTR encryption round-trip + that plaintext never reaches AsyncStorage.
// Mocks: expo-secure-store (in-memory Map) + @react-native-async-storage/async-storage (in-memory Map).
// Note: react-native-get-random-values is a no-op at runtime; Node's global `crypto` polyfills it.
import { LargeSecureStore } from '../largeSecureStore';
import SecureStore from '../../__mocks__/expo-secure-store';
import AsyncStorage from '../../__mocks__/async-storage';

// Polyfill global.crypto for Node (ts-jest) if missing.
// Newer Node versions (>= 19) expose crypto globally; older ones need webcrypto.
if (typeof (globalThis as any).crypto === 'undefined' || !(globalThis as any).crypto.getRandomValues) {
  const nodeCrypto = require('crypto');
  (globalThis as any).crypto = nodeCrypto.webcrypto;
}

describe('LargeSecureStore', () => {
  beforeEach(() => {
    SecureStore.__resetSecureStore();
    (AsyncStorage as any).__reset();
  });

  it('setItem then getItem round-trips the value', async () => {
    const store = new LargeSecureStore();
    await store.setItem('k', 'value');
    const result = await store.getItem('k');
    expect(result).toBe('value');
  });

  it('getItem on unknown key returns null', async () => {
    const store = new LargeSecureStore();
    const result = await store.getItem('does-not-exist');
    expect(result).toBeNull();
  });

  it('setItem stores ciphertext (NOT plaintext) in AsyncStorage', async () => {
    const store = new LargeSecureStore();
    await store.setItem('session-key', 'secret-plaintext-payload');
    const raw = await AsyncStorage.getItem('session-key');
    expect(raw).toBeTruthy();
    expect(raw).not.toBe('secret-plaintext-payload');
    // Hex-encoded ciphertext — must not contain raw plaintext.
    expect(raw).not.toContain('secret-plaintext-payload');
  });

  it('setItem stores encryption key in SecureStore', async () => {
    const store = new LargeSecureStore();
    await store.setItem('session-key', 'anything');
    const keyInSecureStore = await SecureStore.getItemAsync('session-key');
    expect(keyInSecureStore).toBeTruthy();
    // AES-256 key = 32 bytes = 64 hex chars
    expect(keyInSecureStore!.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(keyInSecureStore!)).toBe(true);
  });

  it('removeItem clears both AsyncStorage and SecureStore', async () => {
    const store = new LargeSecureStore();
    await store.setItem('k', 'v');
    await store.removeItem('k');
    expect(await AsyncStorage.getItem('k')).toBeNull();
    expect(await SecureStore.getItemAsync('k')).toBeNull();
  });
});
