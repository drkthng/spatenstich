// auth.ts unit tests — focus on getOrCreateLocalUUID persistence + clear.
// Mocks: expo-secure-store (in-memory) + react-native.Platform (default 'ios').
// We don't test AuthProvider here — that's an integration concern (Phase 2-02).

// Set env BEFORE any import that transitively pulls in supabase.ts
// (auth.ts re-imports supabase, which validates env at module-load time).
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'http://localhost:54321';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import { getOrCreateLocalUUID, clearLocalUUID } from '../auth';
import SecureStore from '../../__mocks__/expo-secure-store';

// Polyfill global.crypto for Node.
if (typeof (globalThis as any).crypto === 'undefined' || !(globalThis as any).crypto.randomUUID) {
  const nodeCrypto = require('crypto');
  (globalThis as any).crypto = nodeCrypto.webcrypto;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('auth — local UUID', () => {
  beforeEach(() => {
    SecureStore.__resetSecureStore();
  });

  it('getOrCreateLocalUUID returns a valid UUID string', async () => {
    const uuid = await getOrCreateLocalUUID();
    expect(typeof uuid).toBe('string');
    expect(UUID_REGEX.test(uuid)).toBe(true);
  });

  it('two consecutive calls return the same UUID (persistence)', async () => {
    const u1 = await getOrCreateLocalUUID();
    const u2 = await getOrCreateLocalUUID();
    expect(u1).toBe(u2);
  });

  it('clearLocalUUID() then getOrCreateLocalUUID() returns a different UUID', async () => {
    const u1 = await getOrCreateLocalUUID();
    await clearLocalUUID();
    const u2 = await getOrCreateLocalUUID();
    expect(u2).not.toBe(u1);
    expect(UUID_REGEX.test(u2)).toBe(true);
  });

  it('persisted UUID stored under the canonical key name', async () => {
    const uuid = await getOrCreateLocalUUID();
    const stored = await SecureStore.getItemAsync('spatenstich_local_uuid');
    expect(stored).toBe(uuid);
  });
});
