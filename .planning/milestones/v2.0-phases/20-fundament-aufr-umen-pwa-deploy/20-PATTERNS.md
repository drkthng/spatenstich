# Phase 20: Fundament, Aufräumen, PWA-Deploy - Pattern Map

**Mapped:** 2026-09-09
**Files analyzed:** 26 (create/modify) across WP 20.1–20.4
**Analogs found:** 21 / 26 (rest use RESEARCH.md Code Examples as the analog — no prior in-repo example exists for PWA-specific artifacts)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/eslint.config.js` (add overrides) | config | transform | `app/eslint.config.js` (self, extend) | exact |
| `.github/workflows/ci.yml` (add env vars) | config | request-response | `.github/workflows/ci.yml` (self, extend) | exact |
| `.github/workflows/deploy-web.yml` (new) | config | batch | `.github/workflows/ci.yml` | role-match |
| `.github/workflows/supabase-keepalive.yml` (new) | config | request-response | `.github/workflows/ci.yml` | role-match |
| `.github/workflows/eas-build.yml` (trigger change) | config | event-driven | `.github/workflows/eas-build.yml` (self) | exact |
| `supabase/migrations/20260910000020_cleanup_legacy.sql` (new) | migration | batch | `supabase/migrations/20260509000015_remove_ai_tables.sql` | exact |
| `packages/shared/src/constants/flags.ts` (rewrite → `FEATURES`) | config | transform | `packages/shared/src/constants/flags.ts` (self, replace) | exact |
| `app/src/hooks/useFlag.ts` (delete) | hook | CRUD | n/a (deletion) | n/a |
| `app/app/(app)/_layout.tsx` (remove ShareIntentProvider, add SW/install-banner glue) | provider/layout | event-driven | `app/app/(app)/_layout.tsx` (self, modify) | exact |
| `app/app/_layout.tsx` (SW registration, update-toast, beforeinstallprompt, storage.persist) | provider/layout | event-driven | `app/app/_layout.tsx` (self, extend) | exact |
| `app/src/lib/shareInbox.ts` (new) | utility | file-I/O | `app/src/storage/IndexedDbAdapter.ts` | role-match (idb usage) |
| `app/app/(app)/import/index.tsx` (extend for `?from=share`) | component | request-response | `app/app/(app)/import/index.tsx` (self, extend) | exact |
| `app/src/stores/authStore.ts` (add `pendingRoute`, `installPromptEvent`) | store | CRUD | `app/src/stores/authStore.ts` (self, extend) | exact |
| Install-prompt banner component (new, under Settings) | component | event-driven | `app/src/components/InlineBanner.tsx` | role-match |
| SW-update-toast component (new) | component | event-driven | `app/src/components/InlineBanner.tsx` | role-match |
| `app/sw-src.js` (new) | service/worker | event-driven | none in-repo | no analog — use RESEARCH.md §Pattern 2/3 |
| `app/workbox-config.js` (new) | config | batch | none in-repo | no analog — use RESEARCH.md §Pattern 2 |
| `app/public/manifest.json` (new) | config | — | none in-repo | no analog — use RESEARCH.md §Pattern 3 |
| `app/public/index.html` (new) | config | — | none in-repo (does not exist yet, `app/dist/index.html` is generated output, not source) | no analog — use RESEARCH.md §Pattern 1 |
| `app/public/_headers` (new) | config | — | none in-repo | no analog — use RESEARCH.md Pitfall 3 |
| `scripts/gen-icons.mjs` (new) | utility | file-I/O | `scripts/check-claude-key-in-bundle.sh` (script conventions only, different language) | partial-match |
| `scripts/inject-html-head.mjs` (new) | utility | file-I/O | `scripts/check-claude-key-in-bundle.sh` (bash conventions, cross-language) | partial-match |
| `scripts/keepalive.ps1` (new) | utility | request-response | none in-repo | no analog — use RESEARCH.md §3/Kap 7.3 |
| `scripts/backup-supabase.ps1` (new) | utility | batch | none in-repo | no analog — use RESEARCH.md Kap 7.4 |
| `app/src/lib/supabase.ts` (`detectSessionInUrl: true` on web) | config | request-response | `app/src/lib/supabase.ts` (self, extend) | exact |
| `app/app/(app)/index.tsx` (Home buttons → `common.accountRequired` for local mode) | component | request-response | `app/app/(app)/index.tsx` (self, modify lines 183-224) | exact |
| `app/app/(app)/profile/index.tsx` (gate Vereinsregeln banner behind `FEATURES.vereinsregeln`) | component | request-response | `app/app/(app)/profile/index.tsx` (self, modify) | exact |
| `app/app/(app)/profile/vereinsregeln/index.tsx` (remove PDF card, `rules.upload.*`) | component | request-response | `app/app/(app)/profile/vereinsregeln/index.tsx` (self, modify lines 56-62) | exact |
| `app/app/(app)/profile/vereinsregeln/upload.tsx` (delete) | component | file-I/O | n/a (deletion) | n/a |
| `app/src/lib/sync/SyncWorker.ts` (gate `pushVereinsregeln` behind `FEATURES.vereinsregeln`) | service | event-driven | `app/src/lib/sync/SyncWorker.ts` (self, modify) | exact |
| `app/src/components/__tests__/create-garden-entrypoints.test.tsx` (mock `getState`) | test | CRUD | `app/src/hooks/__tests__/useKalenderData.test.ts` | exact |
| `app/eslint.config.js`, `app/jest.config.ts`, `app.config.ts`, `metro.config.js`, `package.json` scripts | config | transform | selves (modify in place) | exact |
| `CLAUDE.md`, `README.md`, `pnpm-workspace.yaml` (doc corrections) | config/docs | transform | selves (modify in place) | exact |

## Pattern Assignments

### `.github/workflows/deploy-web.yml` (config, batch)

**Analog:** `.github/workflows/ci.yml`

**Full existing structure to copy job/step conventions from** (`.github/workflows/ci.yml:1-27`):
```yaml
name: CI — PR Checks
on:
  pull_request:
    branches: [master, main]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.33.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Typecheck
        run: pnpm -r run typecheck
      - name: Lint
        run: pnpm -r run lint
      - name: Test
        run: pnpm -r run test --passWithNoTests
      - name: Web export (for bundle scan)
        run: pnpm --filter app exec expo export --platform web
      - name: Scan bundle for secrets
        run: bash scripts/check-claude-key-in-bundle.sh app/dist
```
Copy the `actions/checkout@v4` → `pnpm/action-setup@v4` (pinned `10.33.0`) → `actions/setup-node@v4` (node 22, pnpm cache) → `pnpm install --frozen-lockfile` preamble verbatim. Then per CONTEXT.md D-02/WP20.4: `on: push: branches: [master]` + `workflow_dispatch:`, then `pnpm --filter app run build:web`, `bash scripts/check-claude-key-in-bundle.sh app/dist` (same secret-scan step, same script), then `cloudflare/wrangler-action@v3` with `command: pages deploy app/dist --project-name spatenstich --branch main`, `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`, `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`.

**Env-var pattern to add to `ci.yml` and reuse in `deploy-web.yml`:**
```yaml
env:
  EXPO_PUBLIC_SUPABASE_URL: ${{ vars.EXPO_PUBLIC_SUPABASE_URL }}
  EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ vars.EXPO_PUBLIC_SUPABASE_ANON_KEY }}
```

---

### `supabase/migrations/20260910000020_cleanup_legacy.sql` (migration, batch)

**Analog:** `supabase/migrations/20260509000015_remove_ai_tables.sql` (full file structure, sections 1-4 pattern)

**Section/comment header convention** (lines 1-5):
```sql
-- Phase 5 Plan 01 Task 1: AI-Tabellen und pgmq-Queue entfernen
-- Provides: DROP ai_results, ai_jobs, pgmq.ai_jobs-Queue
-- Follows: Migration 014 pattern (Kommentar, Sektionen, DO $$ Invariant-Block)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.
```

**Section-banner + drop-policy-then-table pattern** (lines 6-24):
```sql
-- ──────────────────────────────────────────────────────────────
-- Section 1 — RLS-Policies entfernen
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_results_creator_read" ON public.ai_results;
...
-- ──────────────────────────────────────────────────────────────
-- Section 2 — Tabellen droppen (ai_results zuerst wegen FK auf ai_jobs)
-- ──────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.ai_results CASCADE;
DROP TABLE IF EXISTS public.ai_jobs CASCADE;
```

**Conditional-existence-check pattern** (lines 25-32) — reuse for the `storage.objects` empty-bucket guard in migration 020:
```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgmq') THEN
    PERFORM pgmq.drop_queue('ai_jobs', true);
  END IF;
END $$;
```

**Trailing post-migration invariant-assertion block** (line 34 onward, `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables ...`) — copy the same assert-then-raise-exception idiom to confirm `photo_queue`/`feature_flags`/dropped columns are actually gone after the migration runs.

**`transfer_ownership` body sourcing:** Do NOT copy from `20260424000013_offline_sync_infrastructure.sql` directly (contains the `created_by_user_id` regression at lines 317-319). Read `20260423000010_custom_sqlstate_codes.sql` (SQLSTATE codes `P9004`/`P9005`) + `20260424000013_offline_sync_infrastructure.sql` (LWW `updated_at = now()` guard, but omit its `created_by_user_id` overwrite) and reconstruct per RESEARCH.md Pitfall 5.

---

### `packages/shared/src/constants/flags.ts` (config, transform)

**Current file (to be fully replaced)**:
```typescript
export const FLAGS = { EXAMPLE: 'example_flag' } as const;
export type FlagKey = typeof FLAGS[keyof typeof FLAGS];
```
Replace with a compile-time `FEATURES` object per D-05, e.g. `export const FEATURES = { vereinsregeln: false } as const;`. Keep it a plain exported const (no query, no Supabase dependency) — this removes the need for `useFlag.ts` entirely (delete that file; it was the only consumer-facing entry point and used `useQuery` + `supabase.from('feature_flags')`, both being dropped per D-06/migration 020).

---

### `app/app/_layout.tsx` (provider/layout, event-driven)

**Analog:** self (`app/app/_layout.tsx`), extend in place

**Existing Sentry-init + platform-guard + effect pattern** (lines 1-38):
```typescript
import * as React from 'react';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Stack, SplashScreen, useSegments, useRouter } from 'expo-router';
...
if (Platform.OS === 'web') {
  const { LogBox } = require('react-native');
  LogBox.ignoreAllLogs(true);
}
...
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.ENVIRONMENT ?? 'dev',
  tracesSampleRate: 1.0,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

function SplashController(): null {
  const { isLoading } = useAuth();
  React.useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);
  return null;
}
```
Follow the same "small controller component with a `useEffect` guarded by a condition, rendered `null`, mounted once in the tree" shape for the new SW-registration effect and `beforeinstallprompt` capture effect. Guard exactly like the existing `Platform.OS === 'web'` check: `Platform.OS === 'web' && 'serviceWorker' in navigator && location.protocol === 'https:'`. `useAuthStore` selector usage for `mode`/`activeGardenId` (lines 46-48) is the pattern to follow for reading/writing `pendingRoute`/`installPromptEvent` in the store.

---

### `app/app/(app)/_layout.tsx` (provider/layout, event-driven)

**Analog:** self, modify in place — **remove** the `ShareIntentProvider` wrapper entirely

**Current file in full** (to be stripped of `expo-share-intent`):
```typescript
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { SyncStatusBadge } from '@/src/components/SyncStatusBadge';

function AppLayoutInner() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const router = useRouter();
  React.useEffect(() => {
    if (!hasShareIntent || !shareIntent?.files?.length) return;
    const file = shareIntent.files[0];
    router.push({ pathname: '/(app)/import', params: { fileUri: file.path } } as any);
    resetShareIntent();
  }, [hasShareIntent, shareIntent]);
  return (
    <Stack screenOptions={{ headerShown: true, headerTitle: '', headerRight: () => <SyncStatusBadge /> }} />
  );
}
export default function AppLayout() {
  return (
    <ShareIntentProvider>
      <AppLayoutInner />
    </ShareIntentProvider>
  );
}
```
The `router.push({...fileUri}) then reset` shape is the pattern to reuse for `shareInbox.ts` consumption in `import/index.tsx` (read once, clear immediately — same anti-re-navigation-loop idiom, just triggered by `?from=share` query param instead of a context hook). Keep `Stack` + `headerRight: SyncStatusBadge` untouched; only delete the `ShareIntentProvider`/`useShareIntentContext` wiring.

---

### `app/src/lib/shareInbox.ts` (utility, file-I/O)

**Analog:** `app/src/storage/IndexedDbAdapter.ts`

**`idb` import + open pattern** (lines 1-13):
```typescript
import { openDB, type IDBPDatabase } from 'idb';
import type { StorageAdapter, EntityName, AnyRow, OutboxEntry, SyncStateEntry, QueryOptions } from '@spatenstich/shared';

const KV_STORE = 'kv';
const OUTBOX_STORE = 'sync_outbox';
const STATE_STORE = 'sync_state';
const SCHEMA_VERSION_KEY = '__schema_version__';
```
Follow the same `openDB<Schema>(dbName, version, { upgrade(db) { db.createObjectStore(...) } })` + named-constant-for-store-name convention for the new `spatenstich-share` DB / `inbox` store / `latest` key (per CONTEXT.md WP20.3). The SW's `sw-src.js` writes to this same IndexedDB name directly (not via the `idb` package, since the SW source isn't bundled through Metro) — `shareInbox.ts` on the app side is the only place that should import `idb` for this store; keep both sides using identical DB/store/key string literals to avoid drift.

---

### `app/app/(app)/import/index.tsx` (component, request-response)

**Analog:** self, extend in place

**Existing fileUri-effect + validate pattern** (lines 1-46):
```typescript
import * as React from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
...
export default function ImportEntryScreen(): React.JSX.Element {
  const router = useRouter();
  const { fileUri } = useLocalSearchParams<{ fileUri?: string }>();
  const [pasteValue, setPasteValue] = React.useState('');
  const [errors, setErrors] = React.useState<string[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!fileUri) return;
    (async () => {
      setLoading(true);
      try {
        const content = Platform.OS === 'web'
          ? await (await fetch(fileUri)).text()
          : await FileSystem.readAsStringAsync(fileUri);
        handleValidate(content);
      } catch {
        setErrors([t('import.errorJsonSyntax')]);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileUri]);
```
Add a second, parallel `useEffect` keyed on `useLocalSearchParams<{ from?: string }>().from === 'share'` that calls `shareInbox.readAndClear()` and feeds the result into the same `handleValidate(content)` function — mirrors the existing `fileUri` effect exactly (same loading/error state, same `handleValidate` call). For the not-logged-in case, use the `authStore.pendingRoute` set/consume pattern described in the authStore pattern below.

---

### `app/src/stores/authStore.ts` (store, CRUD)

**Analog:** self, extend in place

**Full current store** (zustand + persist + migrate pattern, lines 1-52):
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthMode = 'account' | 'local' | null;

export interface AuthState {
  mode: AuthMode;
  userId: string | null;
  activeGardenId: string | null;
  setAccountMode: (userId: string) => void;
  setLocalMode: (uuid: string) => void;
  setActiveGarden: (gardenId: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      mode: null,
      userId: null,
      activeGardenId: null,
      ...
    }),
    {
      name: 'spatenstich-auth',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0 && typeof persistedState === 'object' && persistedState !== null) {
          return { ...persistedState, activeGardenId: null };
        }
        return persistedState;
      },
    }
  )
);
```
Add `pendingRoute: string | null` and `installPromptEvent: unknown | null` (BeforeInstallPromptEvent isn't a standard TS DOM type — use `unknown` or a local interface) to `AuthState`, with `setPendingRoute`/`clearPendingRoute` and `setInstallPrompt`/`clearInstallPrompt` setters, following the exact `set({ field: value })` shape already used by `setActiveGarden`. **Bump `version: 2`** and extend the `migrate` function's `if (version === 0 ...)` branch to also default the two new fields — follow the existing v0→v1 migration idiom exactly (spread `persistedState`, add missing keys as `null`). `installPromptEvent` should probably NOT be persisted (it's a live browser Event object, not serializable) — if so, use zustand's `partialize` option in the `persist` config (not currently used in this file, so this is a net-new addition, but stays within the same `persist(...)` config object).

---

### Install-prompt banner / SW-update-toast (component, event-driven)

**Analog:** `app/src/components/InlineBanner.tsx`

**Full variant-driven banner shape** (lines 1-40):
```typescript
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react-native';
import { cn } from '@/src/lib/utils';

export interface InlineBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  variant?: 'warning' | 'error' | 'success';
  testID?: string;
}

const VARIANT_STYLES = {
  warning: { border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950', iconColor: '#D97706', Icon: AlertCircle },
  ...
} as const;
```
Reuse `InlineBanner` directly (it already supports `message` + `actionLabel` + `onAction` + `onDismiss` + `variant`) for both the "Spatenstich als App installieren" banner and the "Neue Version verfügbar · Neu laden" SW-update toast — no new component is strictly required; pass `actionLabel="Installieren"`/`"Neu laden"` and `onAction` wired to `beforeinstallprompt.prompt()` / SW `postMessage('SKIP_WAITING')` + reload respectively. If a distinct toast placement (not inline in a screen) is needed, model any new wrapper on this same variant/border/icon convention.

---

### `app/eslint.config.js` (config, transform)

**Analog:** self, extend in place

**Current file in full:**
```javascript
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**'],
  },
]);
```
Per RESEARCH.md Pitfall 6, insert the new `{ files: ['**/__tests__/**', '**/__mocks__/**'], rules: {...} }` override object **between** `expoConfig` and the existing `{ ignores: [...] }` object (or after it — order among the two additive objects doesn't matter, but both must come after `expoConfig` since flat-config merges in array order).

---

### `app/src/components/__tests__/create-garden-entrypoints.test.tsx` (test, CRUD)

**Analog:** `app/src/hooks/__tests__/useKalenderData.test.ts`

**Current (broken) mock in create-garden-entrypoints.test.tsx** (lines 59-64):
```typescript
let mockMode = 'account';
let mockActiveGardenId: string | null = 'g-1';
jest.mock('@/src/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ mode: mockMode, activeGardenId: mockActiveGardenId }),
}));
```

**Target pattern — `getState` added via function+property, from `useKalenderData.test.ts`** (lines 36-50):
```typescript
let mockMode: string | null = 'account';
let mockUserId: string | null = 'user-1';

// useAuthStore is used both as a React hook (selector call) and as a Zustand store
// via useAuthStore.getState() (imperative call in addPlantToPlan).
// We mock it as a function with a .getState method attached.
jest.mock('../../stores/authStore', () => {
  function hookFn(selector: (s: any) => any) {
    return selector({ activeGardenId: mockActiveGardenId, mode: mockMode });
  }
  hookFn.getState = () => ({ userId: mockUserId });
  return { useAuthStore: hookFn };
});
```
Apply the identical `function hookFn(...) {...}; hookFn.getState = () => ({...}); return { useAuthStore: hookFn }` shape to `create-garden-entrypoints.test.tsx`'s mock (module path is `@/src/stores/authStore` there vs `../../stores/authStore` here — keep the existing import alias style per file).

---

## Shared Patterns

### CI workflow scaffold (checkout → pnpm setup → node setup → install)
**Source:** `.github/workflows/ci.yml:7-19`
**Apply to:** `deploy-web.yml`, `supabase-keepalive.yml` (minus the pnpm/node setup for the curl-only keepalive job, which needs no Node toolchain at all — just `curl`).
```yaml
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v4
  with:
    version: 10.33.0
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: 'pnpm'
- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

### Secret-scan gate
**Source:** `scripts/check-claude-key-in-bundle.sh`
**Apply to:** both `ci.yml` (already wired) and the new `deploy-web.yml` (must run this exact script against `app/dist` before the Cloudflare deploy step, per D-02/DEPLOY-05).
```bash
BUNDLE_DIR="${1:-app/dist}"
PATTERNS=("sk-ant-" "CLAUDE_API_KEY" "SUPABASE_SERVICE_ROLE_KEY")
# grep -r --binary-files=text -l "$p" "$BUNDLE_DIR" ... exit 1 if found
```

### Zustand persist + versioned migrate
**Source:** `app/src/stores/authStore.ts:24-52`
**Apply to:** any new store field additions (`pendingRoute`, `installPromptEvent`) — bump `version`, extend `migrate`'s `if (version === N ...)` branch, never mutate old branches.

### Migration file section-banner + DO $$ invariant-assert convention
**Source:** `supabase/migrations/20260509000015_remove_ai_tables.sql` (whole file)
**Apply to:** `supabase/migrations/20260910000020_cleanup_legacy.sql` — same header comment block, `-- ─── Section N — <name> ───` banners, `DROP POLICY IF EXISTS` before `DROP TABLE`, `DO $$ ... END $$;` blocks for conditional/guarded operations and post-migration assertions.

### i18n key lookup helper (dotted-path reducer)
**Source:** `app/app/(app)/import/index.tsx:19-20`
```typescript
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
```
**Apply to:** any new screen/component text (e.g., `common.accountRequired`, install-banner copy) — reuse this existing per-file helper convention rather than introducing an i18n library; add new keys with UTF-8 umlauts to `packages/shared/src/i18n/de.json` per the `feedback_german_umlauts` memory rule.

### `Platform.OS === 'web' && <feature-detect>` guard
**Source:** `app/app/_layout.tsx:7` (`Platform.OS === 'web'` LogBox guard)
**Apply to:** SW registration guard: `Platform.OS === 'web' && 'serviceWorker' in navigator && location.protocol === 'https:'`.

## No Analog Found

Files with no close match in the codebase — planner should use RESEARCH.md Code Examples/Patterns instead:

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/sw-src.js` | service/worker | event-driven | First service worker in the repo; no prior SW code exists. Use RESEARCH.md §Pattern 2 (Workbox injectManifest) and §Pattern 3 (Web Share Target fetch handler) verbatim, watch Pitfall 2 (ESM `import` vs module-worker registration). |
| `app/workbox-config.js` | config | batch | First Workbox build config; use RESEARCH.md §Pattern 2 Code Example (`globDirectory`, `swSrc`, `swDest`, `maximumFileSizeToCacheInBytes`). |
| `app/public/manifest.json` | config | — | First PWA manifest in repo. Use RESEARCH.md §Pattern 3 JSON example + CONTEXT.md D-03 field list (icons, share_target). |
| `app/public/index.html` | config | — | `app/public/` directory does not exist yet (verified in RESEARCH.md §Pattern 1: "app/public/index.html does not currently exist"). Build from RESEARCH.md §Pattern 1's `%LANG_ISO_CODE%`/`%WEB_TITLE%` substitution contract, or hardcode `lang="de"` per CONTEXT.md's simpler literal requirement. |
| `app/public/_headers` | config | — | No prior Cloudflare Pages config in repo. Use RESEARCH.md Pitfall 3's exact rule ordering (`/index.html`, `/sw.js` no-cache; `/_expo/static/*` immutable; `/*` catch-all). |
| `scripts/gen-icons.mjs` | utility | file-I/O | No prior Node/`sharp` scripts in `scripts/` (existing scripts are bash). New devDependency `sharp` — flagged `checkpoint:human-verify` per RESEARCH.md Package Legitimacy Audit before `pnpm add -D`. |
| `scripts/keepalive.ps1`, `scripts/backup-supabase.ps1` | utility | request-response / batch | No prior PowerShell scripts in repo (`[VERIFIED: no scripts/*.ps1 files exist yet]` per RESEARCH.md Runtime State Inventory). Build from RESEARCH.md Kap 7.3/7.4 sketches; net-new OS-level artifacts, not migrating any prior state. |

## Metadata

**Analog search scope:** `app/app/`, `app/src/`, `packages/shared/src/`, `supabase/migrations/`, `.github/workflows/`, `scripts/`
**Files scanned:** ~20 (targeted Read/grep on files named explicitly in the pattern-mapping prompt; no broad Glob sweep needed since CONTEXT.md/RESEARCH.md already named exact analog candidates)
**Pattern extraction date:** 2026-09-09
</content>
