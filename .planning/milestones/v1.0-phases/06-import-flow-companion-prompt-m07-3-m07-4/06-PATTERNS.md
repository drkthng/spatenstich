# Phase 6: Import-Flow + Companion-Prompt - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 13 new/modified files
**Analogs found:** 12 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/app/(app)/_layout.tsx` | layout/provider | event-driven | `app/app/(app)/_layout.tsx` (self, modify) | exact |
| `app/app/(app)/index.tsx` | screen | request-response | `app/app/(app)/index.tsx` (self, modify) | exact |
| `app/app/(app)/import/index.tsx` | screen | file-I/O + transform | `app/app/(app)/profile/vereinsregeln/upload.tsx` | role-match |
| `app/app/(app)/import/preview.tsx` | screen | CRUD + transform | `app/app/(app)/index.tsx` | role-match |
| `app/src/components/ImportEntityCard.tsx` | component | request-response | `app/src/components/TrafficLightBadge.tsx` + `app/src/components/ui/card.tsx` | role-match |
| `app/src/components/ImportErrorState.tsx` | component | request-response | `app/src/components/InlineBanner.tsx` | exact |
| `app/src/components/ui/switch.tsx` | ui-primitive | request-response | `app/src/components/ui/button.tsx` | role-match |
| `app/src/lib/importValidator.ts` | utility | transform | no analog — new capability | no-analog |
| `app/src/lib/importRepo.ts` | service | CRUD + file-I/O | `app/src/lib/gardenPlanRepo.ts` | exact |
| `app/src/stores/importStore.ts` | store | event-driven | `app/src/stores/captureStore.ts` | exact |
| `packages/shared/src/types/entities.ts` | model | — | `packages/shared/src/types/entities.ts` (self, modify) | exact |
| `app/src/lib/sync/SyncWorker.ts` | service | event-driven | `app/src/lib/sync/SyncWorker.ts` (self, modify) | exact |
| `supabase/migrations/20260509000016_import_drafts.sql` | migration | CRUD | `supabase/migrations/20260504000014_garden_plan.sql` | role-match |

---

## Pattern Assignments

### `app/app/(app)/_layout.tsx` (layout, modify — add ShareIntentProvider)

**Analog:** `app/app/(app)/_layout.tsx` (current file, lines 1-17)

**Current file pattern** (lines 1-17):
```typescript
// (app) group layout — Stack with headers (Phase 4 will add tabs).
import { Stack } from 'expo-router';
import { SyncStatusBadge } from '@/src/components/SyncStatusBadge';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerRight: () => <SyncStatusBadge />,
      }}
    />
  );
}
```

**Required modification — wrap with ShareIntentProvider and add share-intent effect:**
```typescript
// Split into AppLayoutInner (reads hook) + AppLayout (provides context).
// Pattern: expo-share-intent docs — expo-router integration.
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useRouter } from 'expo-router';
import * as React from 'react';

function AppLayoutInner() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const router = useRouter();

  React.useEffect(() => {
    if (!hasShareIntent || !shareIntent?.files?.length) return;
    const file = shareIntent.files[0];
    router.push({ pathname: '/(app)/import', params: { fileUri: file.path } });
    resetShareIntent(); // CRITICAL: always call to avoid re-navigation loop (Pitfall 2)
  }, [hasShareIntent, shareIntent]);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerRight: () => <SyncStatusBadge />,
      }}
    />
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

---

### `app/app/(app)/index.tsx` (screen, modify — add Import button)

**Analog:** `app/app/(app)/index.tsx` (current file, lines 1-111)

**Button addition pattern** — applies to BOTH the empty state block (line ~94) and the plan-view block (line ~71). Copy the router + Button import from the existing screen structure:

```typescript
// Import additions at top of file:
import { useRouter } from 'expo-router';
import { Button } from '@/src/components/ui/button';

// Inside component:
const router = useRouter();

// In empty state section (after existing status label, around line 101):
<Button
  onPress={() => router.push('/(app)/import' as any)}
  variant="default"
  className="mt-4"
>
  Aus Claude.ai importieren
</Button>

// In plan-view section (inside ScrollView, after GardenPlanView):
<Button
  onPress={() => router.push('/(app)/import' as any)}
  variant="outline"
  className="mt-4"
>
  Aus Claude.ai importieren
</Button>
```

**Existing loading/async pattern to follow** (lines 24-53): use `React.useEffect` + `async IIFE` + `cancelled` flag for any async data loading.

---

### `app/app/(app)/import/index.tsx` (screen, new — entry: share-intent receipt + paste fallback)

**Analog:** `app/app/(app)/profile/vereinsregeln/upload.tsx` (full file, 27 lines) + `app/app/(app)/index.tsx`

**Screen skeleton pattern** (from upload.tsx lines 1-27):
```typescript
import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function ImportEntryScreen(): React.JSX.Element {
  const router = useRouter();
  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900">
      <ScrollView contentContainerClassName="p-6 gap-6">
        {/* screen content */}
      </ScrollView>
    </View>
  );
}
```

**Multiline TextInput pattern for paste fallback:**
```typescript
// Input primitive extended for multiline — copy from app/src/components/ui/input.tsx
import { Input } from '@/src/components/ui/input';

<Input
  multiline
  numberOfLines={8}
  placeholder="JSON-Payload hier einfügen..."
  onBlur={() => {
    // validate on blur only (Pitfall 3 — not on every keystroke)
    handleValidate(pasteValue);
  }}
  value={pasteValue}
  onChangeText={setPasteValue}
  className="font-mono text-xs min-h-[160px]"
  textAlignVertical="top"
/>
```

**Route params pattern** (reading fileUri from layout navigation):
```typescript
import { useLocalSearchParams } from 'expo-router';

const { fileUri } = useLocalSearchParams<{ fileUri?: string }>();

React.useEffect(() => {
  if (!fileUri) return;
  // read file content, then validate
  (async () => {
    const content = await FileSystem.readAsStringAsync(fileUri);
    handleValidate(content);
  })();
}, [fileUri]);
```

**Navigate-to-preview pattern** (avoid large param — use importStore, Pitfall 1):
```typescript
import { useImportStore } from '@/src/stores/importStore';
// Set before navigate, never pass payload as param:
useImportStore.getState().setPayload(validatedPayload);
router.push('/(app)/import/preview');
```

---

### `app/app/(app)/import/preview.tsx` (screen, new — entity cards + toggles + confirm)

**Analog:** `app/app/(app)/index.tsx` (loading state + async action pattern)

**Sectioned ScrollView with SectionList or grouped FlatList** (no direct analog — apply card.tsx pattern):
```typescript
import * as React from 'react';
import { View, Text, ScrollView, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/src/components/ui/button';
import { useImportStore } from '@/src/stores/importStore';

export default function ImportPreviewScreen(): React.JSX.Element {
  const router = useRouter();
  const payload = useImportStore((s) => s.payload);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);

  // Initialize selection: all entities enabled except confidence < 0.6
  React.useEffect(() => {
    if (!payload) return;
    const initial = new Set<string>();
    // beds, plants, observations — add localId if confidence >= 0.6
    [...(payload.beds ?? []), ...(payload.plants ?? []), ...(payload.observations ?? [])]
      .forEach((e) => { if ((e.confidence ?? 1) >= 0.6) initial.add(e.localId); });
    setSelected(initial);
  }, [payload]);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await saveImport(mode, activeGardenId!, payload!, selected);
      router.replace('/(app)');
    } catch (err) {
      // show error banner
    } finally {
      setSaving(false);
    }
  };

  // ... render sections
}
```

**Existing loading error guard pattern** (from index.tsx lines 55-60):
```typescript
if (!payload) {
  return (
    <View className="flex-1 items-center justify-center bg-[#F9F7F4] dark:bg-[#1C1917]">
      <Text className="text-stone-500">Kein Import-Payload vorhanden.</Text>
    </View>
  );
}
```

---

### `app/src/components/ImportEntityCard.tsx` (component, new)

**Analogs:** `app/src/components/ui/card.tsx` (lines 1-37) + `app/src/components/TrafficLightBadge.tsx` (lines 1-62)

**Card structure pattern** (card.tsx lines 12-37):
```typescript
import { Card, CardHeader, CardContent } from '@/src/components/ui/card';

// Card is: rounded-xl bg-stone-200 dark:bg-stone-800 border border-stone-300 dark:border-stone-700
// CardHeader: p-4 gap-1
// CardContent: p-4 pt-0
```

**TrafficLightBadge reuse pattern** (TrafficLightBadge.tsx lines 1-8):
```typescript
import { TrafficLightBadge, type TrafficLightState } from '@/src/components/TrafficLightBadge';

// Map confidence to state (from RESEARCH.md Code Examples):
function confidenceToState(confidence: number | undefined): TrafficLightState {
  if (confidence === undefined) return 'neutral';
  if (confidence >= 0.8) return 'green';
  if (confidence >= 0.6) return 'amber';
  return 'red';
}
```

**React Native Switch pattern** (wraps native Switch — no existing analog, uses switch.tsx):
```typescript
import { Switch } from '@/src/components/ui/switch';

<Switch
  value={isSelected}
  onValueChange={(v) => onToggle(entity.localId, v)}
  disabled={entity.confidence !== undefined && entity.confidence < 0.6 && !isSelected}
  accessibilityLabel={`${entity.label} auswählen`}
/>
```

**Full component shape:**
```typescript
import * as React from 'react';
import { View, Text } from 'react-native';
import { Card, CardHeader, CardContent } from '@/src/components/ui/card';
import { TrafficLightBadge } from '@/src/components/TrafficLightBadge';
import { Switch } from '@/src/components/ui/switch';

export interface ImportEntityCardProps {
  entity: { localId: string; label: string; confidence?: number; [key: string]: unknown };
  isSelected: boolean;
  onToggle: (localId: string, value: boolean) => void;
  details?: React.ReactNode;
  testID?: string;
}

export function ImportEntityCard({ entity, isSelected, onToggle, details, testID }: ImportEntityCardProps): React.JSX.Element {
  const state = confidenceToState(entity.confidence);
  return (
    <Card className="mb-3" testID={testID}>
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-stone-800 dark:text-stone-100 flex-1">
            {entity.label}
          </Text>
          <Switch
            value={isSelected}
            onValueChange={(v) => onToggle(entity.localId, v)}
            accessibilityLabel={`${entity.label} auswählen`}
          />
        </View>
        <TrafficLightBadge state={state} label={confidenceLabel(state, entity.confidence)} />
      </CardHeader>
      {details ? <CardContent>{details}</CardContent> : null}
    </Card>
  );
}
```

---

### `app/src/components/ImportErrorState.tsx` (component, new)

**Analog:** `app/src/components/InlineBanner.tsx` (full file, lines 1-77)

**InlineBanner pattern** (lines 9-77):
```typescript
// InlineBanner props: message, actionLabel, onAction, onDismiss, variant, testID
// Color scheme: border-l-4 border-red-500 (error) or border-amber-500 (warning)
// bg-red-50 dark:bg-red-950 for error variant

import { InlineBanner } from '@/src/components/InlineBanner';
import * as Clipboard from 'expo-clipboard';
import schema from '../../../schemas/spatenstich-import.v1.json';

export function ImportErrorState({ errors, testID }: { errors: string[]; testID?: string }) {
  const message = errors[0] ?? 'Ungültiger Payload';
  return (
    <InlineBanner
      message={message}
      actionLabel="Schema kopieren"
      onAction={async () => {
        await Clipboard.setStringAsync(JSON.stringify(schema, null, 2));
      }}
      testID={testID}
    />
  );
}
```

**Note:** For multiple errors, render `InlineBanner` instances in a `View` or show primary error + count. Follow the exact `border-l-4` + icon + dismiss pattern from InlineBanner.tsx lines 36-50.

---

### `app/src/components/ui/switch.tsx` (ui-primitive, new)

**Analog:** `app/src/components/ui/button.tsx` (full file, lines 1-72) — same manual-install NativeWind primitive pattern

**NativeWind primitive pattern** (button.tsx lines 1-10):
```typescript
// UI Primitive: Switch
// Source: react-native-reusables (manual install pattern)
// Phase 6 manual install.
import * as React from 'react';
import { Switch as RNSwitch, type SwitchProps } from 'react-native';
import { cn } from '@/src/lib/utils';
```

**forwardRef + className pattern** (button.tsx lines 45-71):
```typescript
export interface SwitchProps extends Omit<RNSwitchProps, 'trackColor' | 'thumbColor'> {
  className?: string;
}

export const Switch = React.forwardRef<RNSwitch, SwitchProps>(
  ({ className, ...props }, ref) => (
    <RNSwitch
      ref={ref}
      trackColor={{ false: '#A8A29E', true: '#4A7C59' }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#A8A29E"
      {...props}
    />
  )
);
Switch.displayName = 'Switch';
```

**Color tokens** (from button.tsx lines 21-37): use `#4A7C59` (dark: `#6BAA7E`) for active/brand state, `#A8A29E` for inactive/stone.

---

### `app/src/lib/importValidator.ts` (utility, new — NO ANALOG)

**No analog exists.** This is the first validation utility using ajv in the codebase. Use patterns from RESEARCH.md Pattern 3 directly:

```typescript
// app/src/lib/importValidator.ts
// Compile schema ONCE at module level (Pitfall 3 — not inside the function).
import Ajv2020 from 'ajv/dist/2020';      // NOT default import (Pitfall 4)
import addFormats from 'ajv-formats';
import schema from '../../../schemas/spatenstich-import.v1.json'; // requires resolveJsonModule: true

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export type ValidationResult =
  | { ok: true; payload: ImportPayload }
  | { ok: false; errors: string[] };

export function validatePayload(raw: unknown): ValidationResult {
  const valid = validate(raw);
  if (valid) return { ok: true, payload: raw as ImportPayload };
  const errors = (validate.errors ?? []).map((e) =>
    `${e.instancePath || '(root)'}: ${e.message}`
  );
  // Cross-reference check: plants.bedRef must exist in beds
  if (raw && typeof raw === 'object') {
    const payload = raw as any;
    const bedIds = new Set((payload.beds ?? []).map((b: any) => b.localId));
    for (const plant of payload.plants ?? []) {
      if (plant.bedRef && !bedIds.has(plant.bedRef)) {
        errors.push(`plant "${plant.localId}": unbekannte bedRef "${plant.bedRef}"`);
      }
    }
  }
  return { ok: false, errors };
}
```

**Test file to create alongside:** `app/src/lib/__tests__/importValidator.test.ts` — use the same jest + jest-expo test structure as `app/src/lib/__tests__/gardenPlanRepo.test.ts`.

---

### `app/src/lib/importRepo.ts` (service, new)

**Analog:** `app/src/lib/gardenPlanRepo.ts` (full file, lines 1-140)

**Imports pattern** (gardenPlanRepo.ts lines 1-12):
```typescript
import { storage } from '../storage';
import { useAuthStore, type AuthMode } from '../stores/authStore';
import type { ImportRow, ImportItemRow, BedDraftRow, PlantDraftRow, ObservationDraftRow } from '@spatenstich/shared';
import { OutboxEnqueueError } from './errors';
import { scheduleWriteDebounced } from './sync/SyncTriggers';
```

**assertAccount + randomId pattern** (gardenPlanRepo.ts lines 14-23):
```typescript
function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
```

**writeWithOutbox pattern** (gardenPlanRepo.ts lines 63-74):
```typescript
try {
  await storage.writeWithOutbox('imports', importRow, {
    entity: 'imports',
    rowId: importRow.id,
    operation: 'insert',
    payload: importRow as unknown as Record<string, unknown>,
  });
  scheduleWriteDebounced();
} catch (cause) {
  throw new OutboxEnqueueError('imports', importRow.id, cause);
}
```

**Load pattern** (gardenPlanRepo.ts lines 77-85):
```typescript
export async function loadPendingDrafts(
  gardenId: string,
): Promise<BedDraftRow[]> {
  const rows = await storage.getRowsByGarden<BedDraftRow>('bed_drafts', gardenId);
  return rows.filter((r) => r.status === 'pending' && r.deletedAt === null);
}
```

---

### `app/src/stores/importStore.ts` (store, new)

**Analog:** `app/src/stores/captureStore.ts` (full file, lines 1-18)

**Zustand store pattern** (captureStore.ts lines 1-18):
```typescript
// Zustand store for import session state — holds parsed payload between Entry and Preview screens.
// Reset after completing the import flow or navigating away.
import { create } from 'zustand';
import type { ImportPayload } from '@spatenstich/shared';

export interface ImportState {
  payload: ImportPayload | null;
  setPayload: (payload: ImportPayload) => void;
  reset: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  payload: null,
  setPayload: (payload) => set({ payload }),
  reset: () => set({ payload: null }),
}));
```

**Pattern note:** `captureStore` uses no `persist` middleware — same for `importStore`. The payload is transient session state, not persisted to AsyncStorage. Drafts are persisted via `importRepo`.

---

### `packages/shared/src/types/entities.ts` (model, modify)

**Analog:** `packages/shared/src/types/entities.ts` (self, lines 1-100)

**EntityName union extension pattern** (entities.ts lines 5-12):
```typescript
// Add new entity names to the union — required for writeWithOutbox type safety (Pitfall 5):
export type EntityName =
  | 'gardens'
  | 'garden_members'
  | 'profiles'
  | 'vereinsregeln'
  | 'invite_codes'
  | 'garden_dimensions'
  | 'plan_elements'
  // Phase 6 additions:
  | 'imports'
  | 'import_items'
  | 'bed_drafts'
  | 'plant_drafts'
  | 'observation_drafts';
```

**RowBase extension pattern** (entities.ts lines 14-21) — all new row types extend `RowBase`:
```typescript
/** Phase 6: Import header row */
export interface ImportRow extends RowBase {
  gardenId: string;
  source: 'claude-ai-project';
  importedAt: string;           // ISO-Timestamp from payload.capture.timestamp
  chatReference: string | null;
  payloadSchemaVersion: string; // e.g. 'spatenstich-import.v1'
}

export interface ImportItemRow {
  // Does NOT extend RowBase — no LWW, write-once (RESEARCH.md Pattern 5 rationale)
  id: string;
  importId: string;
  gardenId: string;
  itemType: 'bed' | 'plant' | 'observation';
  localId: string;
  payload: Record<string, unknown>; // raw entity from import payload
  confidence: number | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface BedDraftRow {
  // No LWW — write-once draft (D-19)
  id: string;
  importItemId: string;
  gardenId: string;
  label: string;
  lengthCm: number | null;
  widthCm: number | null;
  sunExposure: string | null;
  soilNotes: string | null;
  confidence: number | null;
  status: 'pending' | 'promoted' | 'dismissed';
  promotedAt: string | null;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string | null;
  deletedAt: string | null;
}

// PlantDraftRow and ObservationDraftRow follow same shape with entity-specific columns.
```

**AnyRow union extension** (entities.ts lines 73-80): add new row types to `AnyRow`.

---

### `app/src/lib/sync/SyncWorker.ts` (service, modify — add dispatchPush cases)

**Analog:** `app/src/lib/sync/SyncWorker.ts` (self, lines 218-260)

**dispatchPush switch extension pattern** (SyncWorker.ts lines 218-227):
```typescript
// Current switch (lines 218-227) — add cases for Phase 6 entities:
private async dispatchPush(entry: OutboxEntry): Promise<void> {
  switch (entry.entity) {
    case 'gardens':        return this.pushGarden(entry);
    case 'profiles':       return this.pushProfile(entry);
    case 'vereinsregeln':  return this.pushVereinsregeln(entry);
    case 'garden_members': return this.pushGardenMember(entry);
    case 'invite_codes':   return this.pushInviteCode(entry);
    // Phase 4 — add garden_dimensions + plan_elements if not already present
    // Phase 6 additions (write-once insert-only):
    case 'imports':
    case 'import_items':
    case 'bed_drafts':
    case 'plant_drafts':
    case 'observation_drafts':
      return this.pushImportEntity(entry);
    default:
      throw new Error(`Unknown entity for push: ${(entry as { entity: string }).entity}`);
  }
}

// Generic insert-only handler for import entities (write-once, no update path):
private async pushImportEntity(entry: OutboxEntry): Promise<void> {
  const row = entry.payload;
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('no_user');
  // Convert camelCase keys to snake_case before upsert
  const { error } = await this.supabase
    .from(entry.entity)
    .upsert(toSnakeCase(row) as any, { onConflict: 'id' });
  if (error) throw error;
}
```

**Note:** `PULL_ENTITIES` (line 29) does NOT need to include import entities — drafts are write-once from the importing device, pull sync is not required.

---

### `supabase/migrations/20260509000016_import_drafts.sql` (migration, new)

**Analog:** `supabase/migrations/20260504000014_garden_plan.sql` (full file, 117 lines)

**Migration header pattern** (migration 014, lines 1-7):
```sql
-- Phase 6 Plan XX Task YY: imports + import_items + bed_drafts + plant_drafts + observation_drafts
-- Provides: Draft tables for M07.4 import flow with RLS on is_garden_member()
-- Follows: Migration 014 pattern, but WITHOUT LWW triggers (write-once semantics, D-19)
-- Next slot after: 20260509000015_remove_ai_tables.sql
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.
```

**RLS policy pattern** (migration 014, lines 27-32):
```sql
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imports_member_all" ON public.imports
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));
```

**Trigger pattern — zz_set_updated_at ONLY** (no aa_lww_guard, no mm_set_updated_by — draft tables are write-once):
```sql
-- Only updated_at trigger — no LWW guard, no updated_by trigger on draft tables.
CREATE TRIGGER zz_set_updated_at_imports BEFORE UPDATE ON public.imports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
```

**Index pattern** (migration 014, lines 24-25):
```sql
CREATE INDEX IF NOT EXISTS idx_imports_garden_id
  ON public.imports (garden_id) WHERE deleted_at IS NULL;
```

**Post-migration assertion pattern** (migration 014, lines 84-116):
```sql
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
    WHERE n.nspname='public' AND c.relname='imports' AND c.relkind='r';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_016_invariant: imports table missing';
  END IF;
  -- ... repeat for each of the 5 tables + RLS policies
  RAISE NOTICE 'migration_016 ok: 5 import draft tables + RLS applied';
END $$;
```

---

## Shared Patterns

### NativeWind Styling
**Source:** `app/src/components/ui/button.tsx`, `app/src/components/ui/card.tsx`
**Apply to:** All new components (`ImportEntityCard`, `ImportErrorState`, `switch.tsx`)

Key tokens to maintain:
- Brand green active: `bg-[#4A7C59] dark:bg-[#6BAA7E]`
- Background stone: `bg-stone-50 dark:bg-stone-900` (screens), `bg-stone-200 dark:bg-stone-800` (cards)
- Border: `border border-stone-300 dark:border-stone-700`
- Min touch target: `min-h-[44px]` on all interactive elements (`button.tsx` line 40)
- Active feedback: `active:opacity-80` on Pressable (button.tsx line 22)

### Error Handling (Repo layer)
**Source:** `app/src/lib/errors.ts` (lines 50-57) + `app/src/lib/gardenPlanRepo.ts` (lines 63-74)
**Apply to:** `importRepo.ts` — wrap every `writeWithOutbox` call:
```typescript
try {
  await storage.writeWithOutbox('imports', row, { ... });
  scheduleWriteDebounced();
} catch (cause) {
  throw new OutboxEnqueueError('imports', row.id, cause);
}
```

### Auth Guard
**Source:** `app/src/lib/gardenPlanRepo.ts` (lines 14-16) + `app/src/stores/authStore.ts`
**Apply to:** `importRepo.ts` — all exported functions must call `assertAccount(mode)` and check `userId`:
```typescript
function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}
// Then: const userId = useAuthStore.getState().userId;
//        if (!userId) throw new Error('not_authenticated');
```

### i18n String Pattern
**Source:** `packages/shared/src/i18n/de.json` (lines 1-17) + `app/app/(app)/index.tsx` (lines 6, 12-13)
**Apply to:** All new screens — add import flow strings to `de.json` under a new `"import"` key:
```json
{
  "import": {
    "title": "Aus Claude.ai importieren",
    "pasteHint": "JSON-Payload aus Claude.ai einfügen",
    "pasteLabel": "JSON einfügen",
    "confirmButton": "Ausgewählte übernehmen",
    "schemaCopy": "Schema kopieren",
    "errorTitle": "Ungültiger Payload",
    "staleImportBadge": "Veralteter Import",
    "sections": {
      "beds": "Beete",
      "plants": "Pflanzen",
      "observations": "Beobachtungen",
      "compliance": "Compliance (kommt bald)",
      "notes": "Freitext-Notizen"
    }
  }
}
```
Use `UTF-8 Umlaute` (ä, ö, ü, ß) — never ASCII substitutions per project rule.

### Screen i18n access pattern
**Source:** `app/app/(app)/index.tsx` (lines 6, 12-13):
```typescript
import de from '@spatenstich/shared/i18n/de';
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
// Usage: t('import.confirmButton')
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/src/lib/importValidator.ts` | utility | transform | No JSON Schema validation exists yet; first ajv usage in codebase. Use RESEARCH.md Pattern 3 directly. |
| `prompts/garden-project-system-prompt.md` | document | — | Companion prompt is a creative text document, not code. No analog pattern applicable. |

---

## Metadata

**Analog search scope:** `app/app/(app)/`, `app/src/components/`, `app/src/lib/`, `app/src/stores/`, `packages/shared/src/types/`, `supabase/migrations/`
**Files scanned:** ~90 files indexed, ~20 read in detail
**Key source files read:**
- `app/app/(app)/_layout.tsx`
- `app/app/(app)/index.tsx`
- `app/src/lib/gardenPlanRepo.ts`
- `app/src/lib/sync/SyncWorker.ts`
- `app/src/lib/errors.ts`
- `app/src/stores/authStore.ts`
- `app/src/stores/captureStore.ts`
- `app/src/components/TrafficLightBadge.tsx`
- `app/src/components/InlineBanner.tsx`
- `app/src/components/ui/card.tsx`
- `app/src/components/ui/button.tsx`
- `app/src/components/ui/input.tsx`
- `packages/shared/src/types/entities.ts`
- `supabase/migrations/20260504000014_garden_plan.sql`
**Pattern extraction date:** 2026-05-09
