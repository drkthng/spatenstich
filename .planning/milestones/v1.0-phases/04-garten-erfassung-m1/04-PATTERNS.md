# Phase 4: Garten-Erfassung (M1) - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 16 new/modified files
**Analogs found:** 14 / 16

---

## File Classification

| Neue/modifizierte Datei | Rolle | Data Flow | Nächstes Analog | Match-Qualität |
|-------------------------|-------|-----------|-----------------|----------------|
| `app/app/(app)/capture/_layout.tsx` | route/layout | request-response | `app/app/(app)/_layout.tsx` | exact |
| `app/app/(app)/capture/step-1.tsx` | component/screen | request-response | `app/app/(app)/index.tsx` | role-match |
| `app/app/(app)/capture/step-2.tsx` | component/screen | request-response | `app/app/(app)/index.tsx` | role-match |
| `app/app/(app)/capture/step-3.tsx` | component/screen | request-response | `app/app/(app)/index.tsx` | role-match |
| `app/app/(app)/capture/review.tsx` | component/screen | request-response | `app/app/(app)/index.tsx` | role-match |
| `app/app/(app)/capture/dimensions.tsx` | component/screen | CRUD | `app/app/(app)/index.tsx` | role-match |
| `app/app/(app)/capture/analysing.tsx` | component/screen | event-driven | `app/src/components/ExtractionLoader.tsx` | exact |
| `app/app/(app)/plan-elements.tsx` | component/screen | CRUD | `app/src/components/VereinsregelRow.tsx` | role-match |
| `app/app/(app)/index.tsx` | component/screen | CRUD | `app/app/(app)/index.tsx` | exact |
| `app/src/lib/photoResizer.ts` | utility | transform | `app/src/lib/photos/photoQueueRepo.ts` | role-match |
| `app/src/lib/gardenPlanRepo.ts` | service | CRUD | `app/src/lib/gardenRepo.ts` | exact |
| `app/src/components/PlanElementRow.tsx` | component | request-response | `app/src/components/VereinsregelRow.tsx` | exact |
| `supabase/functions/ai-job-consumer/index.ts` | service | event-driven | `supabase/functions/extract-vereinsregeln/index.ts` | exact |
| `supabase/functions/ai-job-consumer/parseElements.ts` | utility | transform | `supabase/functions/extract-vereinsregeln/parseRules.ts` | exact |
| `supabase/migrations/20260504000014_garden_plan.sql` | migration | CRUD | `supabase/migrations/20260424000013_offline_sync_infrastructure.sql` | exact |
| `packages/shared/src/types/entities.ts` | model | — | `packages/shared/src/types/entities.ts` | exact (extend) |

---

## Pattern Assignments

### `app/app/(app)/capture/_layout.tsx` (route/layout, request-response)

**Analog:** `app/app/(app)/_layout.tsx`

**Vollständiges Muster** (Zeilen 1–17):
```typescript
// (app) group layout — Stack with headers.
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

**Abweichung:** Capture-Flow braucht einen eigenen `_layout.tsx` innerhalb von `capture/` — Stack ohne Back-Button-Hack, aber mit Fortschrittsanzeige (1/3, 2/3, 3/3) im `headerTitle`. Kein SyncStatusBadge nötig (Capture-Flow ist session-gebunden).

---

### `app/app/(app)/capture/step-1.tsx` / `step-2.tsx` / `step-3.tsx` (component/screen, request-response)

**Analog:** `app/app/(app)/index.tsx`

**Imports-Muster** (Zeilen 1–8):
```typescript
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
```

**Screen-Grundstruktur-Muster** (Zeilen 12–37):
```typescript
export default function GartenPlanScreen(): React.JSX.Element {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-stone-900 p-6">
      <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100 text-center">
        {t('...')}
      </Text>
      <Pressable
        onPress={() => router.push('/(app)/capture/step-2')}
        className="mt-6 bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-lg px-6 py-3 min-h-[44px] items-center justify-center active:opacity-80"
        accessibilityRole="button"
      >
        <Text className="text-white font-semibold">{t('...')}</Text>
      </Pressable>
    </View>
  );
}
```

**Hinweis:** Jeder Capture-Screen ruft `capturePhoto()` (Kamera) oder `pickFromGallery()` auf, dann `resizeToMaxMp(uri)`, dann `enqueuePhoto(gardenId, resizedUri, optIn)`. Die 1-Foto-Warnung (D-08 / PHOTO-07) wird mit `InlineBanner.tsx` (Zeilen 18–77 in InlineBanner.tsx) dargestellt.

---

### `app/app/(app)/capture/analysing.tsx` (component/screen, event-driven)

**Analog:** `app/src/components/ExtractionLoader.tsx`

**Imports-Muster** (Zeilen 15–21):
```typescript
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Loader2, AlertCircle } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
```

**Loading-State-Muster** (Zeilen 32–95):
```typescript
export function ExtractionLoader({ state, onCancel, onRetry, testID }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      testID={testID}
      className="absolute inset-0 bg-white/95 dark:bg-stone-900/95 items-center justify-center px-8"
    >
      {state === 'loading' ? (
        <>
          <Loader2 size={48} color="#4A7C59" />
          {/* Fortschrittsbalken via animate-pulse (NativeWind CSS-Animation / RN-Worklet): */}
          <View className="w-full h-1.5 bg-stone-200 rounded-full mt-6 overflow-hidden">
            <View className="h-full w-1/2 bg-[#4A7C59] rounded-full animate-pulse" />
          </View>
        </>
      ) : (
        <AlertCircle size={48} color="#DC2626" />
      )}
    </View>
  );
}
```

**Job-Status-Polling-Muster** (aus RESEARCH.md Pattern 5 — kein bestehendes Codebeispiel):
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['ai_job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_jobs')
        .select('status, last_error')
        .eq('id', jobId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'done' || status === 'failed') return false;
      return 3000;
    },
    staleTime: 0,
  });
}
```

**Kein Analog vorhanden:** TanStack Query polling. Pattern aus RESEARCH.md §Pattern 5 verwenden.

---

### `app/app/(app)/plan-elements.tsx` (component/screen, CRUD)

**Analog:** `app/src/components/VereinsregelRow.tsx` (Toggle-Listen-Pattern)

**Imports-Muster** (Zeilen 9–13):
```typescript
import * as React from 'react';
import { View, Switch, Pressable, Text } from 'react-native';
import { Lock, Pencil, Trash2 } from 'lucide-react-native';
import type { VereinsRegel } from '@spatenstich/shared';
```

**Row-Props-Interface-Muster** (Zeilen 14–20):
```typescript
export interface VereinsregelRowProps {
  rule: VereinsRegel;
  onToggle?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  testID?: string;
}
```

**Toggle-Row-Muster** (Zeilen 51–95):
```typescript
return (
  <View
    testID={testID}
    className="flex-row items-center gap-3 py-3 px-3 min-h-[52px]"
  >
    <Switch
      value={rule.aktiv}
      onValueChange={() => onToggle?.(rule.id)}
      accessibilityLabel={`Regel ${rule.titel} aktiv`}
    />
    <View className="flex-1">
      <Text className="text-base text-stone-900 dark:text-stone-100">
        {rule.titel}
      </Text>
    </View>
  </View>
);
```

**Abweichung für `PlanElementRow.tsx`:** Statt `switch + edit + delete` hat `PlanElementRow` `accept/reject toggle` + Konfidenz-Badge (`high`→grün, `medium`→gelb, `low`→rot). Kein Pencil/Trash — Phase 4 ist confirmation only.

---

### `app/src/lib/photoResizer.ts` (utility, transform)

**Analog:** `app/src/lib/photos/photoQueueRepo.ts` (Utility-Service-Pattern)

**Imports + Export-Muster** (Zeilen 1–21, photoQueueRepo.ts):
```typescript
import { storage } from '../../storage';
import { useAuthStore } from '../../stores/authStore';
// ...

export async function enqueuePhoto(
  gardenId: string,
  localUri: string,
  optIn: boolean,
): Promise<string> {
  // ...
}
```

**Concrete Pattern für photoResizer.ts** (aus RESEARCH.md §Pattern 1 / §Code Examples):
```typescript
// Source: expo-image-manipulator Docs
import * as ImageManipulator from 'expo-image-manipulator';

export async function resizeToMaxMp(localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1092 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}
```

**Reihenfolge:** `capturePhoto()` → `resizeToMaxMp(uri)` → `enqueuePhoto(gardenId, resizedUri, optIn)`. EXIF-Strip passiert INNERHALB von `enqueuePhoto()`. Resize MUSS vor `enqueuePhoto()` kommen.

---

### `app/src/lib/gardenPlanRepo.ts` (service, CRUD)

**Analog:** `app/src/lib/gardenRepo.ts`

**Imports-Muster** (Zeilen 10–28):
```typescript
import { supabase } from './supabase';
import { storage } from '../storage';
import NetInfo from '@react-native-community/netinfo';
import type { AuthMode } from '../stores/authStore';
import type { Garden, GardenRow } from '@spatenstich/shared';
import { OutboxEnqueueError } from './errors';
import { scheduleWriteDebounced } from './sync/SyncTriggers';
```

**Account-Only-Guard-Muster** (Zeilen 37–39):
```typescript
function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}
```

**writeWithOutbox-Muster** (Zeilen 143–154):
```typescript
try {
  await storage.writeWithOutbox('gardens', extendedUpdated, {
    entity: 'gardens',
    rowId: gardenId,
    operation: existing ? 'update' : 'insert',
    payload: extendedUpdated as unknown as Record<string, unknown>,
  });
  scheduleWriteDebounced();
} catch (cause) {
  throw new OutboxEnqueueError('gardens', gardenId, cause);
}
```

**Abweichung für gardenPlanRepo.ts:** Entities sind `garden_dimensions` und `plan_elements`. `plan_elements` hat zusätzlich `is_accepted`-Flag. `loadByGarden()` gibt alle accepted Elements + Dimensions zurück. `saveElements()` schreibt mehrere Rows via `writeWithOutbox` in Schleife.

---

### `app/src/components/PlanElementRow.tsx` (component, request-response)

**Analog:** `app/src/components/VereinsregelRow.tsx`

Vollständiges Muster aus `VereinsregelRow.tsx` (Zeilen 1–95) verwenden.

**Key Props-Abweichung:**
```typescript
export interface PlanElementRowProps {
  element: PlanElementCandidate;  // statt VereinsRegel
  onToggle?: (id: string) => void;
  testID?: string;
  // kein onEdit, kein onDelete in Phase 4
}
```

**Konfidenz-Badge-Ergänzung** (neu, kein Analog):
```typescript
const CONFIDENCE_STYLE = {
  high:   { bg: 'bg-green-100',  text: 'text-green-800',  label: 'sicher'       },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'wahrscheinlich'},
  low:    { bg: 'bg-red-100',    text: 'text-red-800',    label: 'unsicher'      },
};
// Auto-Default: high/medium → Toggle ON (pre-accepted), low → Toggle OFF (pre-rejected)
```

---

### `supabase/functions/ai-job-consumer/index.ts` (service, event-driven)

**Analog:** `supabase/functions/extract-vereinsregeln/index.ts`

**Secrets/Init-Muster** (Zeilen 12–31):
```typescript
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_BETA = 'files-api-2025-04-14';

// FOUND-06: All secrets only via Deno.env. Never fall back to literal values.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLAUDE_KEY = Deno.env.get('CLAUDE_API_KEY')!;

if (!SUPABASE_URL || !SERVICE_ROLE || !CLAUDE_KEY) {
  throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CLAUDE_API_KEY');
}

const anthropic = new Anthropic({ apiKey: CLAUDE_KEY });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
```

**Files-API-Upload-Muster** (Zeilen 69–81):
```typescript
const buffer = await fileData.arrayBuffer();
const filename = storagePath.split('/').pop() ?? 'photo.jpg';
const uploaded = await anthropic.beta.files.upload(
  { file: new File([buffer], filename, { type: 'image/jpeg' }) },
  { headers: { 'anthropic-beta': ANTHROPIC_BETA } },
);
```

**Files-API-Cleanup-in-finally-Muster** (Zeilen 100–109):
```typescript
} finally {
  // Always delete uploaded Anthropic file (non-fatal on failure)
  await anthropic.beta.files
    .delete(uploaded.id, undefined, {
      headers: { 'anthropic-beta': ANTHROPIC_BETA },
    })
    .catch((e: unknown) => console.warn('files.delete failed', e));
}
```

**Claude-Call-Muster** (Zeilen 84–99):
```typescript
response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: EXTRACTION_PROMPT },
      // @ts-ignore — Files API block shape not yet in public SDK types
      { type: 'document', source: { type: 'file', file_id: uploaded.id } },
    ],
  }],
});
```

**Fehlerbehandlung-Muster** (Zeilen 118–130):
```typescript
} catch (err) {
  console.error('extract-vereinsregeln failed', err);
  const message = err instanceof Error ? err.message : 'internal_error';
  return json({ error: message }, 500);
}
```

**Kritische Abweichung für ai-job-consumer:**
- `job.user_id` → `job.created_by_user_id` (Migration 007, Pitfall 2)
- `ai_results.INSERT` braucht `user_id: job.created_by_user_id` (Pitfall 3)
- Mehrere Fotos (nicht ein PDF): alle Storage-Paths aus `ai_jobs.payload` laden
- Bilder ZUERST im Content-Array, dann Text (Claude Vision Docs-Empfehlung)
- Budget-Check VOR Claude-Call: `COUNT ai_jobs WHERE garden_id = X AND created_at >= today`

---

### `supabase/functions/ai-job-consumer/parseElements.ts` (utility, transform)

**Analog:** `supabase/functions/extract-vereinsregeln/parseRules.ts`

**Type-Definition-Muster** (Zeilen 21–28):
```typescript
export type VereinsRegelCandidate = {
  titel: string;
  beschreibung?: string;
  wert?: number;
  einheit?: string;
  source: 'pdf_extraction';
  istBKleingG: false;
};
```

**safeParseJsonArray-Muster** (Zeilen 116–138):
```typescript
function safeParseJsonArray(rawText: string): unknown[] | null {
  // 1. Try direct parse
  const direct = tryJson(rawText);
  if (Array.isArray(direct)) return direct;

  // 2. Strip markdown fence ```json ... ```
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    const inner = tryJson(fenceMatch[1]);
    if (Array.isArray(inner)) return inner;
  }

  // 3. Substring between first '[' and last ']'
  const first = rawText.indexOf('[');
  const last = rawText.lastIndexOf(']');
  if (first !== -1 && last !== -1 && last > first) {
    const slice = rawText.substring(first, last + 1);
    const bracketed = tryJson(slice);
    if (Array.isArray(bracketed)) return bracketed;
  }

  return null;
}
```

**Validierungs-coerce-Muster** (Zeilen 148–179):
```typescript
function coerceTitel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_TITEL_LEN
    ? trimmed.substring(0, MAX_TITEL_LEN)
    : trimmed;
}
// Gleich für coerceLabel(), coerceElementType(), coerceConfidence(), coerceNumber()
```

**Abweichung für parseElements.ts:** Keine `istBKleingG`-Logik. Stattdessen `confidence`-Coercion: nur `'high' | 'medium' | 'low'` akzeptieren, sonst default `'medium'`. Koordinaten `x_m, y_m, width_m, height_m` als `coerceNumber()` validieren (Number.isFinite-Check).

---

### `supabase/migrations/20260504000014_garden_plan.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260424000013_offline_sync_infrastructure.sql`

**Table-Definition-Muster** (Zeilen 121–163, Migration 013):
```sql
CREATE TABLE IF NOT EXISTS public.photo_queue (
  id                 uuid primary key default gen_random_uuid(),
  garden_id          uuid not null references public.gardens(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  -- ...
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id),
  deleted_at         timestamptz
);
```

**RLS-Muster** (Zeilen 145–151):
```sql
ALTER TABLE public.photo_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_queue_member_all" ON public.photo_queue
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));
```

**LWW-Trigger-Trio-Muster** (Zeilen 154–163):
```sql
CREATE TRIGGER aa_lww_guard_photo_queue BEFORE UPDATE ON public.photo_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_lww_guard();
CREATE TRIGGER mm_set_updated_by_user_id_photo_queue BEFORE UPDATE ON public.photo_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_by_user_id();
CREATE TRIGGER zz_set_updated_at_photo_queue BEFORE UPDATE ON public.photo_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
```

**Abweichung für garden_plan.sql:** Zwei neue Tables: `garden_dimensions` (UNIQUE per garden_id) + `plan_elements`. SQL-Template aus RESEARCH.md §"Neue DB-Entities" verwenden. Jeweils RLS `is_garden_member` + LWW-Trigger-Trio-Muster kopieren.

---

### `packages/shared/src/types/entities.ts` (model, extend)

**Analog:** `packages/shared/src/types/entities.ts` (gleiche Datei, erweitern)

**RowBase-Muster** (Zeilen 14–20):
```typescript
export interface RowBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string | null;
  deletedAt: string | null;
}
```

**Bestehende Entity-Muster** (Zeilen 22–60):
```typescript
export interface GardenRow extends RowBase {
  name: string;
  ownerUserId: string;
}
```

**Neue Entities hinzufügen:**
```typescript
export interface GardenDimensionsRow extends RowBase {
  gardenId: string;
  shape: 'rectangle' | 'l_shape' | 'trapezoid' | 'freehand';
  widthM: number;
  heightM: number;
  extraDims: Record<string, unknown> | null;  // L-Form/Trapez/Freihand
}

export interface PlanElementRow extends RowBase {
  gardenId: string;
  aiResultId: string | null;
  elementType: string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  confidence: 'high' | 'medium' | 'low' | null;
  isAccepted: boolean;
}
```

**EntityName erweitern:**
```typescript
export type EntityName =
  | 'gardens'
  | 'garden_members'
  | 'profiles'
  | 'vereinsregeln'
  | 'invite_codes'
  | 'photo_queue'
  | 'garden_dimensions'   // NEU Phase 4
  | 'plan_elements';      // NEU Phase 4
```

---

### `app/app/(app)/index.tsx` (component/screen — ersetzen)

**Analog:** `app/app/(app)/index.tsx` (gleiche Datei, ersetzen)

**Aktuelles Muster** (Zeilen 1–37) als Basis für den ersetzen Screen. Phase 4 ersetzt den Placeholder durch:
1. Prüfung ob `plan_elements` für den aktiven Garten vorhanden sind
2. Wenn ja: SVG-Plan rendern (react-native-svg, statisch)
3. Wenn nein: Empty-State + CTA "Garten erfassen" → `router.push('/(app)/capture/step-1')`

Imports-Muster für SVG-Plan-Rendering (react-native-svg):
```typescript
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';

const COLORS = {
  background: '#F5F0E8',
  lawn: '#8DB580',
  bed: '#C4956A',
  path: '#D4C5A9',
  hut: '#A0785A',
  border: '#8B7355',
};
```

---

## Shared Patterns

### Authentifizierung / Account-Only Guard

**Quelle:** `app/src/lib/gardenRepo.ts` Zeilen 37–39
**Anwenden auf:** `gardenPlanRepo.ts`, alle Capture-Screens

```typescript
function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}
```

Garten-Erfassung erfordert Account-Modus (Claude Vision = Server-seitiger API Call).

---

### Fehlerbehandlung (Client)

**Quelle:** `app/src/lib/gardenRepo.ts` Zeilen 143–154 + `app/src/lib/errors.ts`

```typescript
try {
  await storage.writeWithOutbox('gardens', row, { entity: '...', rowId, operation, payload });
  scheduleWriteDebounced();
} catch (cause) {
  throw new OutboxEnqueueError('entity_name', rowId, cause);
}
```

**Anwenden auf:** `gardenPlanRepo.ts` für alle `writeWithOutbox`-Calls.

---

### Fehlerbehandlung (Edge Function)

**Quelle:** `supabase/functions/extract-vereinsregeln/index.ts` Zeilen 118–130

```typescript
} catch (err) {
  console.error('extract-vereinsregeln failed', err);
  const message = err instanceof Error ? err.message : 'internal_error';
  return json({ error: message }, 500);
}
// T-2-03-04: CLAUDE_API_KEY NIEMALS in Fehlermeldungen oder Log-Zeilen
```

**Anwenden auf:** `ai-job-consumer/index.ts` (ersetzte Version).

---

### Anthropic Files API Cleanup

**Quelle:** `supabase/functions/extract-vereinsregeln/index.ts` Zeilen 100–109

```typescript
} finally {
  await anthropic.beta.files
    .delete(uploaded.id, undefined, {
      headers: { 'anthropic-beta': ANTHROPIC_BETA },
    })
    .catch((e: unknown) => console.warn('files.delete failed', e));
}
```

**Anwenden auf:** `ai-job-consumer/index.ts` — für ALLE hochgeladenen photo file_ids in einem `finally`-Block.

---

### toRow/fromRow-Mapper (camelCase↔snake_case)

**Quelle:** `app/src/lib/mappers/rowMappers.ts`

Alle neuen Entities (`garden_dimensions`, `plan_elements`) brauchen Mapper-Funktionen nach dem bestehenden Muster in `rowMappers.ts`. Verhindert Silent-Drop bei Upsert (Phase-2.5-Erkenntnis).

---

### DSGVO / EXIF-Strip Reihenfolge

**Quelle:** `app/src/lib/photos/photoQueueRepo.ts` Zeilen 43–45

```typescript
// Step 1+2: Strip EXIF + extract GPS (Task 03-05-01)
const { strippedUri, gps } = await stripExifAndExtractGps(localUri, { optIn });
```

**Reihenfolge:** `resizeToMaxMp(uri)` → `enqueuePhoto(gardenId, resizedUri, optIn)` → (innerhalb enqueuePhoto) `stripExifAndExtractGps()`. EXIF-Strip liegt INNERHALB von enqueuePhoto — nicht nochmals aufrufen.

---

### InlineBanner für Warnungen

**Quelle:** `app/src/components/InlineBanner.tsx` Zeilen 18–77

```typescript
<InlineBanner
  message="Nur 1 Foto aufgenommen. Mehr Fotos liefern bessere Erkennungsergebnisse."
  actionLabel="Weiteres Foto hinzufügen"
  onAction={() => router.push('/(app)/capture/step-1')}
  onDismiss={() => {}}
/>
```

**Anwenden auf:** `capture/review.tsx` (1-Foto-Warnung PHOTO-07), `capture/analysing.tsx` (Budget-Soft-Warning).

---

## No Analog Found

| Datei | Rolle | Data Flow | Grund |
|-------|-------|-----------|-------|
| `app/app/(app)/capture/dimensions.tsx` | component/screen | CRUD | Kein bestehendes Formular-Screen-Muster mit Form-Silhouetten-Auswahl. Neues UI-Pattern (4 Shape-Tiles + dynamische Maßfelder). Basis: `index.tsx`-Screen-Struktur + RN TextInput. |

---

## Metadata

**Analog-Suchbereich:** `app/src/lib/`, `app/src/components/`, `app/app/(app)/`, `supabase/functions/`, `supabase/migrations/`, `packages/shared/src/types/`
**Gescannte Dateien:** 18 Dateien gelesen
**Pattern-Extraktions-Datum:** 2026-05-03
