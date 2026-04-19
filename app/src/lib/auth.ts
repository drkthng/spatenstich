// Phase 2 Auth foundation:
//  - getOrCreateLocalUUID: persistent local UUID for lokal-mode users (no Supabase account)
//  - AuthProvider + useAuth: React context exposing identity + loading state + signOut
// Pattern source: 02-RESEARCH.md §"Pattern 3: Lokale UUID-Identität" + 02-PATTERNS.md §"auth.ts"
import 'react-native-get-random-values';
import * as React from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const LOCAL_UUID_KEY = 'spatenstich_local_uuid';

// ── Local UUID helpers ───────────────────────────────────────────────
// Web fallback: SecureStore is iOS/Android only. Use localStorage on web —
// UUID is not a secret (just an identifier), so localStorage is acceptable.
async function readLocalUuid(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(LOCAL_UUID_KEY);
  }
  return SecureStore.getItemAsync(LOCAL_UUID_KEY);
}

async function writeLocalUuid(uuid: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCAL_UUID_KEY, uuid);
    return;
  }
  await SecureStore.setItemAsync(LOCAL_UUID_KEY, uuid);
}

async function deleteLocalUuid(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LOCAL_UUID_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(LOCAL_UUID_KEY);
}

export async function getOrCreateLocalUUID(): Promise<string> {
  const existing = await readLocalUuid();
  if (existing) return existing;
  const uuid = crypto.randomUUID();
  await writeLocalUuid(uuid);
  return uuid;
}

export async function clearLocalUUID(): Promise<void> {
  await deleteLocalUuid();
}

// ── AuthProvider + useAuth ───────────────────────────────────────────
export type Identity =
  | { type: 'account'; userId: string }
  | { type: 'local'; userId: string }
  | null;

export interface AuthContextValue {
  identity: Identity;
  isLoading: boolean;
  signOut: () => Promise<void>;
  switchToLocal: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = React.useState<Identity>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // In parallel: check Supabase session AND local UUID.
      const [sessionResult, localUuid] = await Promise.all([
        supabase.auth.getSession(),
        readLocalUuid(),
      ]);
      if (cancelled) return;

      const session = sessionResult.data.session;
      // Precedence: account > local > null
      if (session?.user?.id) {
        setIdentity({ type: 'account', userId: session.user.id });
      } else if (localUuid) {
        setIdentity({ type: 'local', userId: localUuid });
      } else {
        setIdentity(null);
      }
      setIsLoading(false);
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user?.id) {
        setIdentity({ type: 'account', userId: session.user.id });
      } else {
        // Supabase session gone — fall back to local UUID if present, else null.
        readLocalUuid().then((uuid) => {
          if (cancelled) return;
          setIdentity(uuid ? { type: 'local', userId: uuid } : null);
        });
      }
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    await deleteLocalUuid();
    setIdentity(null);
  }, []);

  const switchToLocal = React.useCallback(async () => {
    const uuid = await getOrCreateLocalUUID();
    setIdentity({ type: 'local', userId: uuid });
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ identity, isLoading, signOut, switchToLocal }),
    [identity, isLoading, signOut, switchToLocal]
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
