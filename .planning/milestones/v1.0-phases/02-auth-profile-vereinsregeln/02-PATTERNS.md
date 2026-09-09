# Phase 2: Auth, Profile & Vereinsregeln — Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 22 new/modified files
**Analogs found:** 18 / 22

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20260419000002_profiles.sql` | migration | CRUD | `supabase/migrations/20260416000001_foundation.sql` | exact |
| `supabase/functions/extract-vereinsregeln/deno.json` | config | — | `supabase/functions/ai-job-consumer/deno.json` | exact |
| `supabase/functions/extract-vereinsregeln/index.ts` | edge function | request-response | `supabase/functions/ai-job-consumer/index.ts` | role-match |
| `app/src/lib/supabase.ts` (modify) | config/lib | — | `app/src/lib/supabase.ts` | self |
| `app/src/lib/auth.ts` (new) | utility/provider | request-response | `app/src/hooks/useFlag.ts` + `app/src/lib/supabase.ts` | role-match |
| `app/src/stores/authStore.ts` | store | event-driven | no existing Zustand store | no analog |
| `app/src/stores/profileStore.ts` | store | CRUD | no existing Zustand store | no analog |
| `app/src/hooks/useProfile.ts` | hook | request-response | `app/src/hooks/useFlag.ts` | role-match |
| `app/app/_layout.tsx` (modify) | provider/layout | event-driven | `app/app/_layout.tsx` | self |
| `app/app/(auth)/_layout.tsx` | layout | — | `app/app/_layout.tsx` | role-match |
| `app/app/(auth)/index.tsx` | component/screen | request-response | `app/app/index.tsx` | role-match |
| `app/app/(auth)/register.tsx` | component/screen | request-response | `app/app/index.tsx` | role-match |
| `app/app/(auth)/login.tsx` | component/screen | request-response | `app/app/index.tsx` | role-match |
| `app/app/(app)/_layout.tsx` | layout | — | `app/app/_layout.tsx` | role-match |
| `app/app/(app)/index.tsx` | component/screen | — | `app/app/index.tsx` | exact |
| `app/app/(app)/profile/index.tsx` | component/screen | CRUD | `app/app/index.tsx` | role-match |
| `app/app/(app)/profile/plz.tsx` | component/screen | transform | `app/app/index.tsx` | role-match |
| `app/app/(app)/profile/archetype.tsx` | component/screen | CRUD | `app/app/index.tsx` | role-match |
| `app/app/(app)/profile/vereinsregeln/index.tsx` | component/screen | request-response | `app/app/index.tsx` | role-match |
| `app/app/(app)/profile/vereinsregeln/upload.tsx` | component/screen | file-I/O | `app/src/lib/enqueueAiJob.ts` | partial |
| `app/app/(app)/profile/vereinsregeln/confirm.tsx` | component/screen | CRUD | `app/app/index.tsx` | role-match |
| `app/app/(app)/profile/vereinsregeln/checklist.tsx` | component/screen | CRUD | `app/app/index.tsx` | role-match |
| `app/app/(app)/settings/index.tsx` | component/screen | request-response | `app/src/lib/enqueueAiJob.ts` | partial |
| `app/src/components/InlineBanner.tsx` | component | — | no analog | no analog |
| `app/src/components/AuthChoiceCard.tsx` | component | — | no analog | no analog |
| `app/src/components/ArchetypeCard.tsx` | component | — | no analog | no analog |
| `app/src/components/TrafficLightBadge.tsx` | component | — | no analog | no analog |
| `app/src/components/VereinsregelRow.tsx` | component | — | no analog | no analog |
| `app/src/components/ExtractionLoader.tsx` | component | — | no analog | no analog |
| `app/src/storage/migrations.ts` (modify) | migration | — | `app/src/storage/migrations.ts` | self |
| `packages/shared/src/types/domain.ts` (modify) | types | — | `packages/shared/src/types/storage.ts` | role-match |
| `packages/shared/src/constants/klimazonen.ts` (modify) | constants | transform | `packages/shared/src/constants/archetypes.ts` | role-match |
| `packages/shared/src/constants/vereinsregeln.ts` (new) | constants | — | `packages/shared/src/constants/archetypes.ts` | role-match |
| `packages/shared/src/i18n/de.json` (modify) | i18n | — | `packages/shared/src/i18n/de.json` | self |
| Test files (7 new) | test | — | `app/src/hooks/__tests__/useFlag.test.ts` + `app/src/storage/__tests__/StorageAdapter.test.ts` | role-match |

---

## Pattern Assignments

### `supabase/migrations/20260419000002_profiles.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260416000001_foundation.sql`

**Header convention** (lines 1–4):
```sql
-- Phase 2 / Migration 002 — Auth, Profile & Vereinsregeln
-- D-11: profiles nur für Account-Mode-User (auth.users FK). Lokal-Mode → StorageAdapter.
-- D-02: RLS auf allen neuen Tabellen. user_id = auth.uid() auf allen Policies.
```

**Table + RLS pattern** (lines 8–28 from foundation.sql):
```sql
create table public.<table_name> (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- ... columns
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index <table>_user_idx on public.<table_name>(user_id);
alter table public.<table_name> enable row level security;
create policy "<table>_read_own" on public.<table_name>
  for select using (auth.uid() = user_id);
create policy "<table>_insert_own" on public.<table_name>
  for insert with check (auth.uid() = user_id);
create policy "<table>_update_own" on public.<table_name>
  for update using (auth.uid() = user_id);
```

**updated_at trigger reuse** (lines 92–95 from foundation.sql):
```sql
-- tg_set_updated_at() already defined in Migration 001 — do NOT redefine.
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();
```

**profiles special case** — `id` is the PK AND references `auth.users`, so no separate `user_id` column:
```sql
-- For profiles: id IS the user_id (1:1 with auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ...
);
CREATE POLICY "profiles_own" ON public.profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**Storage bucket** — follows the `INSERT INTO storage.buckets` pattern from RESEARCH.md §Schema (no existing analog in foundation.sql).

---

### `supabase/functions/extract-vereinsregeln/deno.json` (config)

**Analog:** `supabase/functions/ai-job-consumer/deno.json` (lines 1–5):
```json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.103.2"
  }
}
```
Add `@anthropic-ai/sdk` import alias:
```json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.103.2",
    "@anthropic-ai/sdk": "npm:@anthropic-ai/sdk"
  }
}
```

---

### `supabase/functions/extract-vereinsregeln/index.ts` (edge function, request-response)

**Analog:** `supabase/functions/ai-job-consumer/index.ts`

**Imports + secrets pattern** (lines 1–15 from ai-job-consumer/index.ts):
```typescript
// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.103.2';

// FOUND-06: Alle Secrets ausschließlich aus Deno.env. Kein Fallback.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLAUDE_KEY = Deno.env.get('CLAUDE_API_KEY')!;

if (!SUPABASE_URL || !SERVICE_ROLE || !CLAUDE_KEY) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
```

**Deno.serve handler pattern** (lines 25–32 from ai-job-consumer/index.ts):
```typescript
Deno.serve(async (req) => {
  // Parse body
  const { storagePath, userId } = await req.json();

  try {
    // ... business logic
    return new Response(JSON.stringify({ rules }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('extract-vereinsregeln failed:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
```

**Error response pattern** (lines 33–35 from ai-job-consumer/index.ts):
```typescript
if (readErr) {
  return new Response(JSON.stringify({ error: readErr.message }), { status: 400 });
}
```

**Key difference from analog:** This function is synchronous (no pgmq), uses Anthropic SDK with Files API beta header. See RESEARCH.md Pattern 5 for the full Claude Files API call sequence.

---

### `app/src/lib/supabase.ts` (modify — add LargeSecureStore)

**Self-analog** (current file, lines 1–19):
```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@spatenstich/shared';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
if (!url || !anonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
```

**Modification:** Add `Platform` import and LargeSecureStore class before `createClient`. Replace the `auth:` block with:
```typescript
auth: {
  storage: Platform.OS !== 'web' ? new LargeSecureStore() : undefined,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
},
```

The full LargeSecureStore class is defined verbatim in RESEARCH.md Pattern 2 (lines 292–333). Copy that class exactly as-is — it is the official Supabase Expo pattern.

---

### `app/src/lib/auth.ts` (new — AuthContext + useAuth hook + getOrCreateLocalUUID)

**Analog:** `app/src/hooks/useFlag.ts` (hook structure) + `app/src/lib/supabase.ts` (supabase import)

**Import pattern** (from useFlag.ts lines 1–3):
```typescript
import { supabase } from './supabase';
// Pattern: import supabase directly from lib/supabase — not from a barrel
```

**Hook export pattern** (from useFlag.ts lines 16–31):
```typescript
// Pattern: named export, no default export
// Pattern: useQuery-based data fetching with error-silent fallback
export function useAuth(): AuthState {
  // ...
}
```

**Context + Provider pattern** (from RESEARCH.md Pattern 1 — no existing codebase analog):
```typescript
// Create context at module level, export hook for consumption
const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ... state initialization
  return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Local UUID utility** (from RESEARCH.md Pattern 3):
```typescript
// app/src/lib/auth.ts — co-locate getOrCreateLocalUUID with AuthProvider
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';

const LOCAL_UUID_KEY = 'spatenstich_local_uuid';

export async function getOrCreateLocalUUID(): Promise<string> {
  let uuid = await SecureStore.getItemAsync(LOCAL_UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    await SecureStore.setItemAsync(LOCAL_UUID_KEY, uuid);
  }
  return uuid;
}
```

---

### `app/src/stores/authStore.ts` (new — Zustand store)

**No existing Zustand store analog in codebase.** Copy pattern from RESEARCH.md Pattern 6:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthMode = 'account' | 'local' | null;

interface AuthState {
  mode: AuthMode;
  userId: string | null;
  setAccountMode: (userId: string) => void;
  setLocalMode: (uuid: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      mode: null,
      userId: null,
      setAccountMode: (userId) => set({ mode: 'account', userId }),
      setLocalMode: (uuid) => set({ mode: 'local', userId: uuid }),
      clearAuth: () => set({ mode: null, userId: null }),
    }),
    {
      name: 'spatenstich-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Key rule (D-11):** `profileStore` does NOT use persist middleware — local-mode profile data is persisted via `storage` (StorageAdapter), not Zustand middleware. Account-mode data comes from Supabase. Zustand holds only in-memory state.

---

### `app/src/stores/profileStore.ts` (new — Zustand store)

**No existing analog.** Follow same Zustand pattern as authStore but WITHOUT persist:

```typescript
// No persist middleware here — D-11
import { create } from 'zustand';
import type { Klimazone, Archetype, VereinsRegel } from '@spatenstich/shared';

interface ProfileState {
  plz: string | null;
  klimazone: Klimazone | null;
  archetype: Archetype | null;
  vereinsregeln: VereinsRegel[];
  setPlz: (plz: string, klimazone: Klimazone) => void;
  setArchetype: (archetype: Archetype) => void;
  setVereinsregeln: (rules: VereinsRegel[]) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>()((set) => ({
  plz: null,
  klimazone: null,
  archetype: null,
  vereinsregeln: [],
  setPlz: (plz, klimazone) => set({ plz, klimazone }),
  setArchetype: (archetype) => set({ archetype }),
  setVereinsregeln: (vereinsregeln) => set({ vereinsregeln }),
  reset: () => set({ plz: null, klimazone: null, archetype: null, vereinsregeln: [] }),
}));
```

---

### `app/src/hooks/useProfile.ts` (new — hook)

**Analog:** `app/src/hooks/useFlag.ts` (lines 1–31) — same hook export pattern.

**Import pattern** (copy from useFlag.ts lines 1–3):
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
// Pattern: named export, typed return, error-silent fallback
```

**Hook structure pattern** (from useFlag.ts lines 16–31):
```typescript
// Pattern: export named function (not default), typed return
// Pattern: useQuery with queryKey array + staleTime
// Pattern: return data ?? fallback (no throws to caller)
export function useProfile(): ProfileState {
  const store = useProfileStore();
  // For account mode: add useQuery to sync from Supabase
  // For local mode: reads are already in store (loaded via useEffect on app start)
  return store;
}
```

---

### `app/app/_layout.tsx` (modify — add AuthProvider + Stack.Protected)

**Self-analog** (current file, lines 1–15):
```typescript
import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.ENVIRONMENT ?? 'dev',
  tracesSampleRate: 1.0,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default Sentry.wrap(RootLayout);
```

**Modification pattern** — keep Sentry.init and Sentry.wrap. Replace RootLayout body with AuthProvider + Stack.Protected:
```typescript
// Keep Sentry.init at top level (lines 3-9 unchanged)

function SplashController() {
  const { isLoading } = useAuth();
  if (!isLoading) SplashScreen.hide();
  return null;
}

function RootLayout() {
  const { identity } = useAuth();
  return (
    <AuthProvider>
      <SplashController />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={identity === null}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={identity !== null}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
```

Add `SplashScreen.preventAutoHideAsync()` call at module level (before component definitions) to prevent flash-of-protected-content.

---

### `app/app/(auth)/_layout.tsx` and `app/app/(app)/_layout.tsx` (new layouts)

**Analog:** `app/app/_layout.tsx` (lines 11–13):
```typescript
// Minimal layout pattern — just a Stack with headerShown: false
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`(auth)/_layout.tsx` has no guard (auth screens are always accessible).
`(app)/_layout.tsx` can add tab navigation in Phase 4 — for Phase 2, a plain Stack is sufficient.

---

### `app/app/(auth)/index.tsx`, `register.tsx`, `login.tsx` and `app/app/(auth)/verify-email.tsx` (new screens)

**Analog:** `app/app/index.tsx` (lines 1–8):
```typescript
import { Text, View } from 'react-native';
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Spatenstich — Phase 1 Foundation</Text>
    </View>
  );
}
```

**Pattern to follow:**
- Default export function named after the screen (e.g., `AuthChoiceScreen`)
- No named re-exports from screen files
- NativeWind `className` on View/Text (not `style` object) — see Design System in UI-SPEC.md
- Supabase calls via `supabase.auth.signUp` / `signInWithPassword` — patterns in RESEARCH.md §Code Examples
- Error handling: `try/catch` + local `error` state, display via NativeWind-styled error text with `accessibilityLiveRegion="polite"`

**Supabase auth call pattern** (from RESEARCH.md §Code Examples):
```typescript
// register.tsx: signUp
const { data, error } = await supabase.auth.signUp({
  email: email.trim(),
  password: password,
});
// If data.session === null → email confirmation needed
if (!data.session) {
  router.push('/(auth)/verify-email');
}

// login.tsx: signInWithPassword
const { data, error } = await supabase.auth.signInWithPassword({
  email: email.trim(),
  password: password,
});
// Generic error message only — never distinguish wrong-password vs no-account
if (error) setErrorMsg(t('auth.login.error_generic'));
```

---

### `app/app/(app)/index.tsx` (new — Garten-Plan-Placeholder)

**Analog:** `app/app/index.tsx` (lines 1–8) — exact same shell pattern:
```typescript
import { Text, View } from 'react-native';
export default function GartenPlanScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-stone-50">
      <Text className="text-xl font-semibold text-stone-800">
        {t('app.index.placeholder')}
      </Text>
      <Text className="text-sm text-stone-500 mt-2">
        {t('app.index.placeholder_sub')}
      </Text>
    </View>
  );
}
```
D-06: This screen is a placeholder; replace in Phase 4.

---

### `app/app/(app)/profile/plz.tsx` (new — PLZ input screen)

**Analog for Supabase save pattern:** `app/src/lib/enqueueAiJob.ts` (lines 14–19) — pattern for auth check before write:
```typescript
const { data: user } = await supabase.auth.getUser();
if (!user?.user) throw new Error('Not authenticated');
```

**Pattern for local-mode save** (from StorageAdapter usage pattern in `app/src/storage/index.ts`):
```typescript
// Always import storage from the barrel, never SqliteAdapter directly
import { storage } from '@/src/storage';

// Save profile key as JSON blob (Pitfall 6 — no flat keys)
await storage.set('profile', JSON.stringify({ plz, klimazone, ...rest }));
```

**PLZ lookup pattern** (from `packages/shared/src/constants/klimazonen.ts`):
```typescript
import { KLIMAZONEN } from '@spatenstich/shared';
// Phase 2 expands this to a full PLZ → Klimazone lookup table
// Import the lookup function from shared, never implement it in screen
import { lookupKlimazone } from '@spatenstich/shared';
const klimazone = lookupKlimazone(plz); // returns Klimazone | null
```

---

### `app/app/(app)/profile/vereinsregeln/upload.tsx` (new — PDF upload + loading screen)

**Analog:** `app/src/lib/enqueueAiJob.ts` (lines 14–46) — Supabase call + error-throw pattern:
```typescript
// Pattern: auth check before storage call
const { data: user } = await supabase.auth.getUser();
if (!user?.user) throw new Error('Not authenticated');

// Pattern: supabase call → check error → proceed
const { data: job, error: jobErr } = await supabase.from('ai_jobs').insert({ ... }).select().single();
if (jobErr) throw jobErr;
```

**File upload pattern** (from RESEARCH.md Pattern 7):
```typescript
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

const base64 = await FileSystem.readAsStringAsync(asset.uri, {
  encoding: FileSystem.EncodingType.Base64,
});
const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

const { error } = await supabase.storage
  .from('vereinsregeln')
  .upload(storagePath, byteArray, {
    contentType: asset.mimeType ?? 'application/pdf',
    upsert: true,
  });
```

**Edge function invoke pattern** (from RESEARCH.md §Code Examples):
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 55_000);
const { data, error } = await supabase.functions.invoke('extract-vereinsregeln', {
  body: { storagePath, userId },
});
clearTimeout(timeout);
```

---

### `app/src/storage/migrations.ts` (modify — add version 2)

**Self-analog** (current file, lines 1–23):
```typescript
export const MIGRATIONS: LocalMigration[] = [
  { version: 1, up: async () => { /* Bootstrap */ } },
  // Add version 2 here — KV store needs no schema change; initialize profile defaults
  { version: 2, up: async (_adapter) => {
    // No structural migration needed for KV store.
    // Profile keys ('profile', 'vereinsregeln') are created on first set().
    // Version bump signals Phase 2 data model is active.
  }},
];
```

`runMigrations` function is unchanged — the version + up-migration pattern is already correct.

---

### `packages/shared/src/types/domain.ts` (modify — add UserProfile, VereinsRegel types)

**Analog:** `packages/shared/src/types/storage.ts` (lines 1–10) — interface-only file, no runtime code:
```typescript
// D-08: CRUD only in Phase 1. Transactions/queries deferred to Phase 3.
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  // ...
}
```

**Pattern:** Exported interfaces only, no classes or runtime values. Import constants from `../constants` using type-only imports where possible. Full type definitions from RESEARCH.md §Domain Types are the target — copy verbatim.

---

### `packages/shared/src/constants/klimazonen.ts` (modify — expand PLZ lookup)

**Self-analog** (current file, lines 1–3):
```typescript
// Skeleton — vollständige PLZ-Lookup-Tabelle wird in Phase 2 ergänzt.
export const KLIMAZONEN = [1, 2, 3, 4, 5, 6, 7] as const;
export type Klimazone = typeof KLIMAZONEN[number];
```

**Pattern to add:** A lookup function alongside the existing const:
```typescript
// Keep existing KLIMAZONEN and Klimazone type unchanged
// Add: PLZ → Klimazone lookup map and function
export const PLZ_KLIMAZONE_MAP: Record<string, Klimazone> = {
  // Full map to be populated in Phase 2
  // Key: 5-digit PLZ string, Value: 1–7
};

export function lookupKlimazone(plz: string): Klimazone | null {
  return PLZ_KLIMAZONE_MAP[plz] ?? null;
}
```

**Analog for constant-object pattern:** `packages/shared/src/constants/archetypes.ts` (lines 1–9):
```typescript
export const ARCHETYPES = {
  SELBSTVERSORGER: 'selbstversorger',
  // ...
} as const;
export type Archetype = typeof ARCHETYPES[keyof typeof ARCHETYPES];
```

---

### `packages/shared/src/constants/vereinsregeln.ts` (new)

**Analog:** `packages/shared/src/constants/archetypes.ts` (lines 1–9) — same pattern: const object + derived type:
```typescript
// Pattern from archetypes.ts:
export const ARCHETYPES = { ... } as const;
export type Archetype = typeof ARCHETYPES[keyof typeof ARCHETYPES];

// Apply same pattern for vereinsregeln checklist defaults:
export const BKLEINGG_REGELN: VereinsregelChecklistItem[] = [
  // BKleingG hard-coded rules — istBKleingG: true, not deletable
];

export const STANDARD_VEREINSREGELN_CHECKLIST: VereinsregelChecklistItem[] = [
  // ~10–15 pre-defined rules per D-09
];
```

---

### `packages/shared/src/i18n/de.json` (modify — add auth.*, profile.*, rules.* keys)

**Self-analog** (current file, lines 1–14):
```json
{
  "common": {
    "ok": "OK",
    "cancel": "Abbrechen",
    "save": "Speichern",
    "delete": "Löschen",
    "retry": "Erneut versuchen",
    "loading": "Lädt…"
  },
  "errors": {
    "network": "Keine Verbindung. Bitte prüfe dein Netz.",
    "unknown": "Ein unerwarteter Fehler ist aufgetreten."
  }
}
```

**Pattern:** Flat JSON with nested namespace objects. All keys from UI-SPEC.md §Copywriting Contract must be present. New top-level namespaces to add: `auth`, `profile`, `rules`, `settings`. The `common` and `errors` blocks exist — extend `common` with `disclaimer_body` and `error_network`. Note: `errors.network` already exists but UI-SPEC.md defines `common.error_network` — add the new key without removing the old one to avoid breaking the Phase 1 i18n test.

---

### Test files (new)

**Analog:** `app/src/hooks/__tests__/useFlag.test.ts` and `app/src/storage/__tests__/StorageAdapter.test.ts`

**Test file naming pattern** (from both analogs):
```
app/src/<layer>/__tests__/<subject>.test.ts
packages/shared/src/__tests__/<subject>.test.ts
```

**Jest mock pattern for supabase** (from useFlag.test.ts lines 7–17):
```typescript
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: { enabled: true }, error: null }),
        })),
      })),
    })),
  },
}));
```

**Jest mock pattern for SecureStore** (no existing analog — infer from react-native mock):
```typescript
// app/src/__mocks__/react-native.ts pattern:
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
```

**QueryClientProvider wrapper pattern** (from useFlag.test.ts lines 19–24):
```typescript
function wrap(qc: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}
```

**jest.config.ts additions** — add two new project entries following the existing pattern (lines 3–33):
```typescript
// Add to projects array:
{
  displayName: 'stores',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/stores/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@spatenstich/shared$': '<rootDir>/../packages/shared/src/index.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^react-native-url-polyfill/auto$': '<rootDir>/src/__mocks__/react-native-url-polyfill.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, resolveJsonModule: true } }],
  },
},
```

---

## Shared Patterns

### Supabase direct import (applies to all app/ files that call Supabase)

**Source:** `app/src/lib/supabase.ts` line 13, confirmed by `app/src/hooks/useFlag.ts` line 2 and `app/src/lib/enqueueAiJob.ts` line 1.
```typescript
// Always use the named import from src/lib/supabase — never re-create a client
import { supabase } from '../lib/supabase';
// or with path alias:
import { supabase } from '@/src/lib/supabase';
```

### StorageAdapter barrel import (applies to all local-mode reads/writes)

**Source:** `app/src/storage/index.ts` lines 1–9. NEVER import SqliteAdapter or IndexedDbAdapter directly.
```typescript
import { storage } from '@/src/storage';
// storage is already Platform.select'd — do not re-select
```

### @spatenstich/shared barrel import (applies to all type/constant consumers)

**Source:** `packages/shared/src/index.ts` lines 1–8.
```typescript
// Types and constants from shared package via barrel
import type { Klimazone, Archetype, VereinsRegel, UserProfile } from '@spatenstich/shared';
import { ARCHETYPES, lookupKlimazone, BKLEINGG_REGELN } from '@spatenstich/shared';
// i18n is path-imported, not from barrel:
import de from '@spatenstich/shared/i18n/de';
```

### Error handling pattern (applies to all async operations in screens and lib)

**Source:** `app/src/lib/enqueueAiJob.ts` lines 32–33 + `supabase/functions/ai-job-consumer/index.ts` lines 42–44.
```typescript
// Pattern: destructure {data, error}, check error immediately, throw or return early
const { data, error } = await supabase.from(...).select(...).single();
if (error) throw error;
// -- or in screens, for user-visible errors:
if (error) { setErrorMsg(t('common.errors.unknown')); return; }
```

### NativeWind className pattern (applies to all new React Native screen/component files)

Per RESEARCH.md Pattern 4 and UI-SPEC.md Design System: use `className` prop on all View/Text/Pressable, never inline `style` objects. Color tokens from UI-SPEC.md §Color:
```typescript
// Dominant background
<View className="flex-1 bg-stone-50 dark:bg-stone-900">
// Secondary surface (cards, rows)
<View className="bg-stone-200 dark:bg-stone-800 rounded-xl p-4">
// Primary CTA button (accent)
<Pressable className="bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-lg p-4 min-h-[44px]">
// Heading text
<Text className="text-xl font-semibold text-stone-800 dark:text-stone-100">
```

### FOUND-06 constraint (applies to all files — never put secrets in client)

**Source:** `supabase/functions/ai-job-consumer/index.ts` lines 7–9 and comments.
```typescript
// FOUND-06: CLAUDE_API_KEY MUSS im Edge Function Deno.env bleiben.
// Niemals CLAUDE_API_KEY als EXPO_PUBLIC_* Variable setzen.
// Client darf supabase.functions.invoke() nutzen — Auth-Header wird automatisch gesetzt.
```

---

## No Analog Found

Files with no close match in the codebase — executor should follow RESEARCH.md patterns:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/src/stores/authStore.ts` | store | event-driven | Kein Zustand-Store im Codebase. Pattern aus RESEARCH.md Pattern 6. |
| `app/src/stores/profileStore.ts` | store | CRUD | Kein Zustand-Store im Codebase. Pattern aus RESEARCH.md Pattern 6. |
| `app/src/components/InlineBanner.tsx` | component | — | Keine UI-Komponenten im Codebase. Pattern aus UI-SPEC.md §Component Contract + §Interaction Contract. |
| `app/src/components/AuthChoiceCard.tsx` | component | — | Keine UI-Komponenten. Pattern aus UI-SPEC.md. |
| `app/src/components/ArchetypeCard.tsx` | component | — | Keine UI-Komponenten. Pattern aus UI-SPEC.md + `archetypes.ts` für Daten. |
| `app/src/components/TrafficLightBadge.tsx` | component | — | Keine UI-Komponenten. Pattern aus UI-SPEC.md §Interaction Contract §BKleingG. |
| `app/src/components/VereinsregelRow.tsx` | component | — | Keine UI-Komponenten. Pattern aus UI-SPEC.md §Component Contract. |
| `app/src/components/ExtractionLoader.tsx` | component | — | Keine UI-Komponenten. Pattern aus UI-SPEC.md §Interaction Contract §PDF-Extraction. |

---

## Metadata

**Analog search scope:** `app/src/`, `app/app/`, `supabase/functions/`, `supabase/migrations/`, `packages/shared/src/`
**Files scanned:** 19 source files (excl. node_modules)
**Pattern extraction date:** 2026-04-19

**Key codebase facts confirmed:**
- `app/app/_layout.tsx`: Minimal — Stack + Sentry.wrap only. No AuthProvider yet. Must be extended.
- `app/src/lib/supabase.ts`: `persistSession: true` set but NO `storage` adapter yet — LargeSecureStore addition is the first modification needed.
- `app/src/storage/index.ts`: Uses `Platform.select` to pick SqliteAdapter (native) or IndexedDbAdapter (web). This is the canonical storage access point.
- `packages/shared/src/constants/klimazonen.ts`: Skeleton only (`[1,2,3,4,5,6,7]`). Full PLZ lookup table must be built.
- `packages/shared/src/types/domain.ts`: Empty (`export type {}`). All Phase 2 types added fresh.
- `packages/shared/src/i18n/de.json`: 2 namespaces (`common`, `errors`). Phase 2 adds `auth`, `profile`, `rules`, `settings`.
- No Zustand stores exist yet. No React context/provider pattern exists yet. No UI component files exist yet.
- `supabase/functions/ai-job-consumer/index.ts` uses `npm:@supabase/supabase-js@2.103.2` (pinned). New edge function should pin the same version.
