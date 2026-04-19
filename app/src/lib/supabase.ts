import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@spatenstich/shared';
import { LargeSecureStore } from './largeSecureStore';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
if (!url || !anonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// D-05: app/ has its own Supabase client — not shared with Edge Functions
// (Deno vs React Native incompatibility precludes a shared client)
// Phase 2: native uses LargeSecureStore (AES-256-CTR + SecureStore key) — circumvents
// the 2048-byte SecureStore limit (Supabase sessions exceed it).
// Web path: storage = undefined → Supabase falls back to localStorage (acceptable for web).
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: Platform.OS !== 'web' ? new LargeSecureStore() : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
