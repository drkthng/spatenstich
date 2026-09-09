# Phase 5: AI-Removal + Import-Schema — Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 14 (7 vollständig löschen, 7 partiell bereinigen + 3 neue Artefakte)
**Analogs found:** 12 / 14

---

## File Classification

| Datei / Artefakt | Rolle | Data Flow | Nächster Analog | Match-Qualität |
|---|---|---|---|---|
| `supabase/migrations/20260509000015_remove_ai_tables.sql` | migration | batch | `supabase/migrations/20260504000014_garden_plan.sql` | role-match |
| `app/src/lib/sync/SyncWorker.ts` (partial edit) | service | event-driven | sich selbst — partial removal | self |
| `app/src/lib/sync/SyncTriggers.ts` (partial edit) | utility | event-driven | sich selbst — partial removal | self |
| `app/src/lib/gardenPlanRepo.ts` (partial edit) | service | CRUD | sich selbst — partial removal | self |
| `app/src/lib/migrateLocalToAccount.ts` (partial edit) | utility | batch | sich selbst — partial removal | self |
| `app/src/storage/SqliteAdapter.ts` (partial edit) | utility | CRUD | `app/src/storage/IndexedDbAdapter.ts` | role-match |
| `app/src/storage/IndexedDbAdapter.ts` (partial edit) | utility | CRUD | `app/src/storage/SqliteAdapter.ts` | role-match |
| `packages/shared/src/types/entities.ts` (partial edit) | model | — | sich selbst — partial removal | self |
| `packages/shared/src/i18n/de.json` (partial edit) | config | — | sich selbst — partial removal | self |
| `app/app/(app)/index.tsx` (partial edit) | component | request-response | sich selbst — partial removal | self |
| `app/app/(app)/profile/vereinsregeln/upload.tsx` (rewrite) | component | request-response | `app/app/(app)/index.tsx` | role-match |
| `supabase/config.toml` (partial edit) | config | — | sich selbst — partial removal | self |
| `schemas/spatenstich-import.v1.json` | config (schema artifact) | — | keiner (neues Format) | none |
| `schemas/examples/full.json` / `minimal.json` / `edge-cases.json` | config (test fixtures) | — | keiner | none |
| `scripts/validate-import-schema.js` | utility | batch | keiner (neues Script) | none |

---

## Pattern Assignments

### `supabase/migrations/20260509000015_remove_ai_tables.sql` (migration, batch)

**Analog:** `supabase/migrations/20260504000014_garden_plan.sql` (Zeilen 1–116)

**Header-Kommentar-Pattern** (Analog Zeilen 1–6):
```sql
-- Phase 5 Plan XX Task YY: AI-Tabellen und pgmq-Queue entfernen
-- Provides: DROP ai_results, ai_jobs, pgmq.ai_jobs-Queue
-- Follows: Migration 014 pattern (Kommentar, Sektionen, DO $$ Invariant-Block)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.
```

**Sektions-Struktur-Pattern** (Analog Zeilen 7–116):
```sql
-- ──────────────────────────────────────────────────────────────
-- Section 1 — RLS-Policies entfernen (CASCADE macht es implizit — explizit für Klarheit)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_results_creator_read" ON public.ai_results;
DROP POLICY IF EXISTS "ai_results_insert_service" ON public.ai_results;
DROP POLICY IF EXISTS "ai_jobs_creator_insert" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_creator_read" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_update_service" ON public.ai_jobs;
-- Alte Policy-Namen aus Migration 003:
DROP POLICY IF EXISTS "ai_jobs_member_insert" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_member_read" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_results_member_read" ON public.ai_results;

-- ──────────────────────────────────────────────────────────────
-- Section 2 — Tabellen droppen (Reihenfolge: ai_results zuerst wegen FK auf ai_jobs)
-- ──────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.ai_results CASCADE;
DROP TABLE IF EXISTS public.ai_jobs CASCADE;

-- ──────────────────────────────────────────────────────────────
-- Section 3 — pgmq-Queue löschen (D-05: Extension kann bleiben)
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgmq') THEN
    PERFORM pgmq.drop_queue('ai_jobs', true); -- true = purge messages
  END IF;
END $$;
```

**Invariant-Check-Pattern** (Analog Zeilen 84–116):
```sql
-- ──────────────────────────────────────────────────────────────
-- Section 4 — Post-migration Invariant-Assertions
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name IN ('ai_jobs','ai_results')) THEN
    RAISE EXCEPTION 'phase5_invariant: ai tables still exist after drop';
  END IF;
  RAISE NOTICE 'phase5 migration ok: ai_jobs + ai_results + pgmq queue removed';
END $$;
```

> **Kritisch:** `ai_results` vor `ai_jobs` droppen (FK `ai_results.job_id → ai_jobs.id`). Analog: Zeile 1 der Section 2 in Migration 014 zeigt FK-bewusste CREATE-Reihenfolge — DROP ist umgekehrt.

---

### `app/src/lib/sync/SyncWorker.ts` (partial edit — photo_queue entfernen)

**Analog:** Datei selbst — nur Entfernungsoperationen.

**Imports: zu entfernende Zeile** (aktuell Zeile 18):
```typescript
// ENTFERNEN:
  PhotoQueueRow,
// aus dem named-import Block (Zeilen 10-19)
```

**PULL_ENTITIES: zu entfernende Zeile** (aktuell Zeilen 30-36):
```typescript
// ENTFERNEN: 'photo_queue' aus dem Array (das Array bleibt, nur der Eintrag fliegt raus)
// Zeile 35: (keine Zeile für photo_queue — photo_queue war nie in PULL_ENTITIES)
// Kommentar Zeile 29 muss angepasst werden:
// VORHER: "// Entities, die gepullt werden (photo_queue ist upload-driven, nicht pull-driven)"
// NACHHER: "// Entities, die gepullt werden"
```

**dispatchPush: zu entfernende Zeile** (aktuell Zeile 227):
```typescript
// ENTFERNEN aus switch-Statement (Zeilen 219-230):
      case 'photo_queue':   return this.pushPhotoQueue(entry);
```

**pushPhotoQueue: komplett entfernen** (aktuell Zeilen 329-364):
```typescript
// ENTFERNEN: gesamte private pushPhotoQueue(entry: OutboxEntry)-Methode (Zeilen 329–364)
```

**Pattern für default-case danach** — Default-case bleibt und reicht für Typ-Safety:
```typescript
default:
  throw new Error(`Unknown entity for push: ${(entry as { entity: string }).entity}`);
```

---

### `app/src/lib/sync/SyncTriggers.ts` (partial edit — PhotoUploader entfernen)

**Analog:** Datei selbst — nur Entfernungsoperationen.

**Import: zu entfernende Zeile** (aktuell Zeile 8):
```typescript
// ENTFERNEN:
import { uploadPending } from '../photos/PhotoUploader';
```

**Zwei uploadPending()-Aufrufe entfernen** (aktuell Zeilen 54-57 und 67-70):
```typescript
// ENTFERNEN Block 1 — in NetInfo reconnect-Handler (Zeile 54-57):
      uploadPending().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[SyncTriggers] reconnect uploadPending failed', e);
      });

// ENTFERNEN Block 2 — in AppState-Handler (Zeile 67-70):
      uploadPending().catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[SyncTriggers] foreground uploadPending failed', e);
      });
```

**Verbleibende Struktur nach Edit** — beide Event-Handler rufen nur noch `getSyncWorker().syncAll()` auf, kein weiterer Aufruf.

---

### `app/src/lib/gardenPlanRepo.ts` (partial edit — saveElements entfernen)

**Analog:** Datei selbst — `saveDimensions`, `loadDimensions`, `loadAcceptedElements`, `deleteAllElements` bleiben.

**Import: zu entfernende Zeile** (aktuell Zeile 11):
```typescript
// ENTFERNEN (nur in saveElements genutzt):
  PlanElementCandidate,
```

**Kommentar-Update** (aktuell Zeile 3):
```typescript
// VORHER: "// Account-only (Claude Vision = server-side API call requires account mode)."
// NACHHER: "// Account-only."
```

**Funktion komplett entfernen** (aktuell Zeilen 96-144):
```typescript
// ENTFERNEN: gesamte saveElements()-Funktion
// export async function saveElements(
//   mode: AuthMode, gardenId: string, elements: PlanElementCandidate[], aiResultId: string | null,
// ): Promise<PlanElementRow[]>
```

**Auch `aiResultId`-Feld in PlanElementRow** wird aus `entities.ts` entfernt (D-09) — nach Edit von entities.ts muss gardenPlanRepo.ts nicht mehr angepasst werden, da saveElements weg ist.

---

### `app/src/lib/migrateLocalToAccount.ts` (partial edit — photo_queue reset entfernen)

**Analog:** Datei selbst — nur 2 Zeilen entfernen.

**Zu entfernende Zeilen** (aktuell Zeilen 291-292):
```typescript
// ENTFERNEN:
  // photo_queue — nach Migration: 0 Einträge (keine Rows zu pullen)
  await storage.setSyncState({ entity: 'photo_queue', lastPullAt: serverNow, lastPushAt: null });
```

---

### `app/src/storage/SqliteAdapter.ts` und `IndexedDbAdapter.ts` (partial edit)

**Analog:** Beide Adapter spiegeln sich 1:1 — SqliteAdapter ist der Referenz-Analog für IndexedDbAdapter und umgekehrt.

**ROW_ENTITIES: photo_queue entfernen** (SqliteAdapter Zeilen 13-22, IndexedDbAdapter Zeilen 16-25):
```typescript
// ENTFERNEN in ROW_ENTITIES-Array:
  'photo_queue',

// ERGEBNIS-Array (beide Adapter):
const ROW_ENTITIES: EntityName[] = [
  'gardens',
  'garden_members',
  'profiles',
  'vereinsregeln',
  'invite_codes',
  // photo_queue entfernt
  'garden_dimensions',
  'plan_elements',
];
```

**GARDEN_ID_COLUMN / GARDEN_ID_FIELD: photo_queue entfernen** (SqliteAdapter Zeilen 26-47, IndexedDbAdapter Zeilen 29-38):
```typescript
// ENTFERNEN aus Record<EntityName, ...>:
  photo_queue: 'garden_id',  // aus GARDEN_ID_COLUMN
  photo_queue: 'gardenId',   // aus GARDEN_ID_FIELD (nur SqliteAdapter)
```

> **Achtung:** Beide Objekte sind `Record<EntityName, ...>`. Wenn `photo_queue` aus der `EntityName`-Union (entities.ts) entfernt wird, muss der Eintrag aus diesen Records **gleichzeitig** entfernt werden — sonst TypeScript-Fehler.

**IndexedDbAdapter — v3Entities im upgrade-Hook** (Zeilen 57-58):
```typescript
// ENTFERNEN aus dem v3Entities-Inline-Array im openDB upgrade-Hook:
  'photo_queue',
```

---

### `packages/shared/src/types/entities.ts` (partial edit)

**Analog:** Datei selbst. Entfernung erfolgt chirurgisch.

**EntityName-Union: photo_queue entfernen** (aktuell Zeile 11):
```typescript
// ENTFERNEN:
  | 'photo_queue'
```

**PhotoQueueRow-Interface komplett entfernen** (aktuell Zeilen 54-62):
```typescript
// ENTFERNEN:
export interface PhotoQueueRow extends RowBase {
  gardenId: string;
  storagePath: string;         // <garden_id>/<photo_id>.<ext>
  geoLat: number | null;
  geoLng: number | null;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  uploadError: string | null;
  jobId: string | null;        // von enqueue_photo_analysis RPC
}
```

**AnyRow-Union: PhotoQueueRow entfernen** (aktuell Zeile 101):
```typescript
// ENTFERNEN aus AnyRow-Union:
  | PhotoQueueRow
```

**PlanElementRow: aiResultId-Feld entfernen** (aktuell Zeile 74):
```typescript
// ENTFERNEN (D-09 — kein AI-Result-Bezug mehr):
  aiResultId: string | null;
```

**PlanElementCandidate-Interface entfernen** (aktuell Zeilen 86-94):
```typescript
// ENTFERNEN (nur von saveElements() genutzt, das ebenfalls entfernt wird):
export interface PlanElementCandidate {
  elementType: string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  confidence: 'high' | 'medium' | 'low';
}
```

---

### `packages/shared/src/i18n/de.json` (partial edit — capture-Block entfernen)

**Analog:** Datei selbst. JSON-Struktur aus Zeilen 176-251 belegt den Entfernungsbereich.

**Zu entfernender Block** (aktuell Zeilen 176-251):
```json
  "capture": {
    "title": "Garten fotografieren",
    "step": { ... },
    "shutter": "...",
    "gallery": "...",
    "review": { ... },
    "dimensions": { ... },
    "analysis": { ... },
    "confirm": { ... },
    "plan": { ... },
    "budget": { ... }
  },
```

**Verbleibende Struktur**: Das Komma vor `"sync"` muss entfernt werden, falls `"capture"` der letzte Key vor `"sync"` ist. JSON muss syntaktisch korrekt bleiben — nach Entfernung validieren.

---

### `app/app/(app)/index.tsx` (partial edit — Capture-Navigation und Camera-Import entfernen)

**Analog:** Datei selbst. Pattern aus Zeilen 1-142 gelesen.

**Imports: Camera entfernen** (aktuell Zeile 7):
```typescript
// ENTFERNEN:
import { Camera } from 'lucide-react-native';
```

**Capture-Navigation entfernen** (aktuell Zeilen 96-113 — "has plan"-Branch):
```typescript
// ENTFERNEN: Gesamter Footer CTAs-Block (Zeilen 93-113)
        {/* Footer CTAs */}
        <View className="p-4 border-t border-stone-200 dark:border-stone-700">
          <Pressable
            onPress={() => router.push('/(app)/capture/plan' as any)}
            ...
          >
            <Text>Garten bearbeiten</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/capture/step-overview' as any)}
            ...
          >
            <Text>Erneut erfassen</Text>
          </Pressable>
        </View>
```

**Empty-State-Block ersetzen** (aktuell Zeilen 117-141):
```typescript
// ENTFERNEN: gesamten Camera-Icon + "Garten erfassen"-Pressable + beschreibenden Text
// BEHALTEN: StatusLabel-Anzeige (Zeilen 119-123)
// ERSETZEN durch: Placeholder "Import-Funktion kommt in Phase 6"
// Pattern aus vereinsregeln/upload.tsx Placeholder (RESEARCH.md Zeilen 513-526)
```

**Verbleibende BEHALTEN-Teile** (D-10):
- `loadAcceptedElements` / `loadDimensions` Imports (Zeile 11) — bleiben
- `GardenPlanView`-Render (Zeilen 85-91) — bleibt
- `useRouter` (Zeile 6) — bleibt, Phase 6 braucht es für Import-Navigation

---

### `app/app/(app)/profile/vereinsregeln/upload.tsx` (Rewrite — kein partial edit)

**Analog:** `app/app/(app)/index.tsx` — gleiche Screen-Rolle, gleicher Component-Aufbau.

**Beibehaltene Import-Pattern** (aus index.tsx Zeilen 1-12):
```typescript
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { useAuthStore } from '@/src/stores/authStore';
```

**Verbleibende Stores** (aus upload.tsx Original Zeilen 23-25):
```typescript
// BEHALTEN:
import { useVereinsregelnStore } from '@/src/stores/vereinsregelnStore';
// ENTFERNEN:
// import { ExtractionLoader } from '@/src/components/ExtractionLoader';
// import { uploadVereinsregelPdf } from '@/src/lib/uploadVereinsregelPdf';
// import { extractVereinsregeln, ExtractVereinsregelnError } from '@/src/lib/extractVereinsregeln';
```

**Minimaler Screen-Aufbau nach Rewrite** (Pattern aus RESEARCH.md Zeilen 513-526):
```typescript
export default function VereinsregelnUploadScreen(): React.JSX.Element {
  const router = useRouter();
  // Kein state, kein AbortController, kein async
  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900">
      <ScrollView contentContainerClassName="p-6 gap-6">
        <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Vereinssatzung
        </Text>
        <Text className="text-sm text-stone-600 dark:text-stone-300">
          Vereinsregeln-Import wird in einem zukünftigen Update verfügbar.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/profile/vereinsregeln/confirm' as any)}
          className="mt-4 bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-lg px-6 py-3 min-h-[44px] items-center justify-center active:opacity-80"
        >
          <Text className="text-white font-semibold">Manuell eingeben</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
```

> Kein `ScreenState`, kein `controllerRef`, kein async — reine Placeholder-Komponente.

---

### `supabase/config.toml` (partial edit)

**Analog:** Datei selbst. RESEARCH.md verifiziert: Einträge an Zeilen 384-388.

**Zu entfernende Blöcke**:
```toml
# ENTFERNEN:
[functions.ai-job-consumer]
verify_jwt = true

# ENTFERNEN:
[functions.extract-vereinsregeln]
verify_jwt = true
```

---

### `schemas/spatenstich-import.v1.json` (neue Datei)

**Kein Codebase-Analog vorhanden.** Vollständiges Schema aus RESEARCH.md Zeilen 532-636.

**$schema und $id Pattern** (JSON Schema draft 2020-12 Konvention):
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://spatenstich.app/schemas/spatenstich-import.v1.json",
  "title": "Spatenstich Import Payload v1",
  "description": "...",
  "type": "object",
  "required": ["schemaVersion", "capture"],
  "additionalProperties": false
}
```

**Vollständige Schema-Struktur**: Exakt aus RESEARCH.md Code Example (Zeilen 532-636) übernehmen — enthält `schemaVersion`, `capture`, `beds`, `plants`, `observations`, `complianceFlags` (optional, D-11), `freeFormNotes` (plain string, D-12).

---

### `schemas/examples/full.json`, `minimal.json`, `edge-cases.json` (neue Dateien)

**Kein Codebase-Analog vorhanden.** Struktur folgt dem Schema.

**Muster für minimal.json** (nur Pflichtfelder):
```json
{
  "schemaVersion": "spatenstich-import.v1",
  "capture": {
    "timestamp": "2026-05-09T14:30:00Z"
  },
  "beds": [
    {
      "localId": "bed-001",
      "label": "Hochbeet Nord"
    }
  ]
}
```

---

### `scripts/validate-import-schema.js` (neues Script)

**Kein Codebase-Analog vorhanden.** Vollständiges Script aus RESEARCH.md Zeilen 643-680.

**AJV-Import-Pattern** (RESEARCH.md Zeile 649 — Pitfall 7 vermeiden):
```javascript
// KORREKT — draft 2020-12:
const Ajv2020 = require('./node_modules/ajv/dist/2020');
// FALSCH — lädt draft-07 default:
// const Ajv = require('ajv');
```

---

## Shared Patterns

### Entfernungs-Koordination (photo_queue Cross-Reference)

**Quelle:** RESEARCH.md Pitfall 2 + Codebase-Inspektion
**Betrifft:** `entities.ts`, `SqliteAdapter.ts`, `IndexedDbAdapter.ts`, `SyncWorker.ts`, `migrateLocalToAccount.ts`

Alle 5 Dateien müssen in **einem einzigen Commit-Satz** bereinigt werden. TypeScript-Fehler bei Typ-Inkonsistenz sind das Warnsignal:

```
Type '"photo_queue"' is not assignable to type 'EntityName'
```

**Reihenfolge innerhalb der Dateien:**
1. `entities.ts` — `photo_queue` aus `EntityName`, `PhotoQueueRow`, `AnyRow` entfernen
2. `SqliteAdapter.ts` + `IndexedDbAdapter.ts` — `photo_queue` aus allen Arrays und Record-Maps entfernen
3. `SyncWorker.ts` — Import + `dispatchPush`-case + `pushPhotoQueue`-Methode entfernen
4. `migrateLocalToAccount.ts` — 2 Zeilen entfernen

### Screen-Placeholder-Pattern (für vereinsregeln/upload.tsx und index.tsx empty-state)

**Quelle:** `app/app/(app)/index.tsx` (Zeilen 60-64 — Loading-State als einfachstes Muster) + RESEARCH.md

Placeholder-Screens verwenden NativeWind-Klassen, `Pressable` mit `accessibilityRole="button"`, grüne Primärfarbe `bg-[#4A7C59]`:
```typescript
className="bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-lg px-6 py-3 min-h-[44px] items-center justify-center active:opacity-80"
```

### Migration-Pattern (Supabase)

**Quelle:** `supabase/migrations/20260504000014_garden_plan.sql` (Zeilen 1-116)

Alle Migrationen folgen:
1. Kopfzeilen-Kommentar mit Phase/Plan/Task-Referenz + `DO NOT add BEGIN/COMMIT`
2. Sektionen mit `-- ────────` Trennlinien
3. `DROP POLICY IF EXISTS` vor `DROP TABLE IF EXISTS`
4. `DO $$ ... END $$` Invariant-Check am Ende mit `RAISE NOTICE 'migration_0XX ok: ...'`

### i18n-Cleanup-Pattern

**Quelle:** `packages/shared/src/i18n/de.json` (Zeilen 176-251)

Nach Entfernung eines Top-Level-Keys: JSON auf syntaktische Korrektheit prüfen (kein trailing comma). Enums und Schlüssel in de.json sind flache Strings, keine Interpolation außer `{n}`, `{date}`, `{w}`, `{h}`.

---

## No Analog Found

| Datei | Rolle | Data Flow | Begründung |
|---|---|---|---|
| `schemas/spatenstich-import.v1.json` | schema artifact | — | Erster JSON-Schema-Eintrag im Projekt |
| `schemas/examples/*.json` | test fixtures | — | Keine Fixture-Dateien im Projekt vorhanden |
| `scripts/validate-import-schema.js` | dev-tooling | batch | Kein Validierungsscript-Muster im Projekt |

Für diese drei gilt: Vollständiges Muster aus RESEARCH.md Code Examples (Zeilen 270-680) übernehmen — Struktur ist vollständig spezifiziert und verifiziert.

---

## Metadata

**Analog-Suchbereich:** `app/src/`, `app/app/`, `packages/shared/src/`, `supabase/migrations/`, `supabase/functions/`
**Gescannte Dateien:** 14 Quelldateien direkt gelesen
**Pattern-Extraction-Datum:** 2026-05-09
