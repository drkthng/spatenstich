# Phase 6: Import-Flow + Companion-Prompt (M07.3 + M07.4) — Research

**Researched:** 2026-05-09
**Domain:** Share-Intent handling, JSON Schema validation, Supabase draft tables, Claude.ai system prompt authoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Companion-Prompt (M07.3)**
- D-01: Prompt auf Deutsch, konversationeller Ton, fachlich fundiert
- D-02: Deckt ab: BKleingG, Sächsische RKO, Leipzig-spezifische Regeln, Pflanzen-ID-Heuristiken Klimazone 7a. Modell-Empfehlung: Opus 4.7
- D-03: Output-Disziplin: jede Foto-Analyse-Session endet mit fenced ```json Block der `spatenstich-import.v1` entspricht; bei unklarem Foto Rückfrage statt Halluzination
- D-04: Setup-Anleitung im Prompt-Dokument: Projektname, Knowledge-Files, "Re-emit last payload"-Instruktion
- D-05: Schema `schemas/spatenstich-import.v1.json` als Knowledge-File im Claude.ai-Projekt

**Import-Screen Navigation (M07.4)**
- D-06: Route `app/(app)/import/` als eigener Stack; `index.tsx` (Einstieg) + `preview.tsx` (Preview)
- D-07: Zugang via Button auf Home-Screen (Empty State + Plan-View). Text: "Aus Claude.ai importieren". Kein eigener Tab
- D-08: Share-Intent via Expo config plugin für `application/json`; Custom URL Scheme `spatenstich://import`
- D-09: Paste-Fallback: große Textarea; Inline-Validierung beim Blur

**Preview-UI**
- D-10: Card-basierte Liste mit Entity-Toggles pro Entity (Bed, Plant, Observation)
- D-11: Confidence-Chip: grün (≥ 0.8), gelb (0.6–0.79), rot (< 0.6); Rot-Chips zeigen Warning-Text; kein Bulk-Accept unter 0.6
- D-12: Fehler-Handling: ungültiger Payload → Inline-Fehlermeldung + "Schema kopieren"-Button
- D-13: Sections-Gruppierung: Beete → Pflanzen → Beobachtungen → Compliance (ausgegraut) → Freitext-Notizen

**Offline-Import**
- D-14: Offline-first: Import-Parsing und Preview lokal; Drafts zuerst in lokale SQLite-Tabellen
- D-15: Supabase-Sync via bestehendem Sync-Worker (Phase 3 Outbox-Pattern)
- D-16: Draft-Lifecycle: bleiben bis promoted (Phase 7) oder manuell gelöscht; nach 30 Tagen "Stale Import"-Badge

**Supabase-Tables**
- D-17: RLS auf garden_member-Check (Phase 2.5 Pattern); Tags: `source`, `importedAt`, optional `chatReference`
- D-18: `imports`-Table als Header; `import_items` als Detail mit FK auf `imports` und Typ-Discriminator
- D-19: Draft-Tables (`bed_drafts`, `plant_drafts`, `observation_drafts`) mit FK auf `import_items` und `garden_id`; Status: `pending` | `promoted` | `dismissed`

### Claude's Discretion
- Migration-Nummer und exakte Column-Definitionen für Draft-Tables
- Share-Intent Expo Plugin Konfiguration (platform-spezifisch iOS vs Android)
- i18n-Strings für Import-Flow in `de.json`
- Genaue Aufteilung der Preview-Card-Layouts
- Companion-Prompt-Feinschliff
- Ob `complianceFlags` in Preview ausgegraut oder komplett ausgeblendet

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMPORT-03 | Claude.ai-Projekt-System-Prompt in `prompts/garden-project-system-prompt.md` | Prompt authoring pattern documented; M07-spec defines acceptance criteria |
| IMPORT-04 | App registriert Share-Intent-Handler für `application/json` + Custom URL Scheme `spatenstich://import` | expo-share-intent v4.1.2 verified for SDK 53; `spatenstich` scheme already in app.config.ts |
| IMPORT-05 | Paste-Fallback (Textarea) für Desktop-Claude.ai-Chat | expo-clipboard already installed; multiline TextInput pattern established |
| IMPORT-06 | Preview-Screen mit geparsten Entities + Toggle pro Entity; Confidence < 0.6 mit Warning-Chip | TrafficLightBadge reusable; Switch primitive needed; UI-SPEC complete |
| IMPORT-07 | Invalid Payload zeigt actionable Fehler + "Schema kopieren"-Button | ajv v8 + schema bundling pattern; expo-clipboard for copy action |
| IMPORT-08 | Supabase-Tables `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts` mit RLS | Migration pattern established (migration 016); column schema designed in this research |
</phase_requirements>

---

## Summary

Phase 6 delivers two parallel workstreams: a text document (the Claude.ai companion prompt) and a mobile app feature (the import flow). Both are medium complexity individually but require careful sequencing since the prompt must satisfy the same `spatenstich-import.v1` JSON Schema the app validates against.

The **share-intent** mechanism is the critical technical unknown. `expo-share-intent` v4.1.2 (verified against npm registry) matches the project's Expo SDK 53 exactly and covers iOS (Share Extension + UTType `public.json`) and Android (intent filter for `application/json`) via a single config plugin. The app already has `spatenstich` as its URL scheme in `app.config.ts`, so custom deep link support requires only adding `expo-share-intent` to the plugin array and the share intent handling in the layout. No additional libraries are needed for JSON validation — `ajv` v8 is available globally in the npm environment and supports JSON Schema draft-2020-12. Since this project runs on React Native (not a browser), `ajv` requires importing `Ajv2020` from `ajv/dist/2020`, and the schema can be compiled at module init to avoid overhead on first parse.

The **Supabase draft tables** follow the established migration pattern from migrations 013–015 exactly: `is_garden_member()` RLS, LWW trigger trio (`aa_`/`mm_`/`zz_`), `deleted_at` soft-delete. The new tables **do not** require LWW triggers because drafts are not collaboratively edited — they are write-once by the importing user. This simplifies the migration compared to plan elements. The next migration slot is `20260509000016`.

**Primary recommendation:** Use `expo-share-intent` v4.1.2 for share-intent handling; `ajv` (already in node_modules) for validation; follow the exact Phase 3 outbox + repo pattern for draft persistence; keep the companion prompt in a single `prompts/garden-project-system-prompt.md` file with embedded setup instructions.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| JSON payload validation | Client (React Native) | — | Offline-first requirement; no server round-trip for validation |
| Share-intent receipt (OS-level) | Native Module (expo-share-intent) | Client routing | OS delivers file; app must handle in layout/native-intent handler |
| Draft persistence (local) | Client SQLite (StorageAdapter) | — | Offline-first; identical to plan_elements pattern |
| Draft sync to Supabase | Client Outbox → Supabase | — | Phase 3 SyncWorker extended with new entities |
| RLS enforcement | Supabase (Postgres) | — | All import tables scoped to garden_member |
| Companion prompt delivery | Static file (`prompts/`) | — | No runtime — document for Dirk to paste into Claude.ai |
| Preview state | Client component state | — | Not persisted until "Ausgewählte übernehmen" tapped |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-share-intent | 4.1.2 | Share-Intent handler (iOS + Android) | Only Expo-native module that handles `application/json` share intents across both platforms; verified peer: `expo: ^53` [VERIFIED: npm registry] |
| ajv | 8.20.0 (already in node_modules) | JSON Schema draft-2020-12 validation | Fastest validator, supports draft-2020-12, already available; compile schema once at module init [VERIFIED: npm view] |
| expo-clipboard | ~7.0.1 (already installed) | "Schema kopieren" copy action | Already in `app/package.json` [VERIFIED: codebase] |
| expo-document-picker | ^55.0.13 (already installed) | File picker fallback ("JSON-Datei öffnen") | Already in `app/package.json`; used when share intent not available [VERIFIED: codebase] |
| expo-linking | ~7.0.0 (already installed) | Deep link URL parsing | Already installed; `Linking.parse()` for `spatenstich://import` URLs [VERIFIED: codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-file-system | ~18.0.0 (already installed) | Read JSON file from share-intent URI | When expo-share-intent delivers a file URI instead of inline content |
| ajv-formats | 3.0.1 (in node_modules) | `format: "date-time"` + `format: "uri"` validators | Required for capture.timestamp and chatReference schema validation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-share-intent | Custom Expo config plugin (native code) | Much more implementation effort; native iOS Share Extension + Android Activity requires writing Swift/Kotlin — expo-share-intent handles this |
| expo-share-intent | expo-document-picker only | Document picker requires user to navigate to file; share-intent is OS-native UX ("share from Files app to Spatenstich") |
| ajv | zod | Zod requires rewriting the schema in TypeScript; ajv validates the existing `spatenstich-import.v1.json` directly — zero schema duplication |
| ajv | JSON.parse + manual checks | Hand-rolling validation misses edge cases (unknown bedRef cross-reference, enum validation, minimum constraints) |

**Installation (new package only):**
```bash
cd app && pnpm add expo-share-intent@4.1.2
```

**Version verification:**
- `expo-share-intent@4.1.2` — verified via `npm view expo-share-intent@4.1.2 peerDependencies` — peers: `expo: ^53`, `expo-linking: >=7.0.2` (both satisfied) [VERIFIED: npm registry]
- `ajv@8.20.0` — verified via `npm view ajv version` [VERIFIED: npm view]

---

## Architecture Patterns

### System Architecture Diagram

```
[Claude.ai project (Dirk's phone)]
    │
    │  spatenstich-import.v1 JSON payload
    ▼
[OS Share Sheet / Files App]
    │  Share → Spatenstich (application/json)
    │  OR: spatenstich://import?payload=<base64>
    ▼
[expo-share-intent native module]  ─── OR ─── [Paste Textarea (onBlur)]
    │                                                     │
    │  file URI / inline JSON string                      │  JSON string
    ▼                                                     ▼
[Import Entry Screen — app/(app)/import/index.tsx]
    │
    │  JSON.parse + ajv validate (offline, synchronous)
    │
    ├──(invalid)──► [ImportErrorState + "Schema kopieren" via expo-clipboard]
    │
    └──(valid)────► navigate to preview
                        │
                        ▼
          [Import Preview Screen — app/(app)/import/preview.tsx]
                        │
                        │  entity toggles (component state)
                        │  confidence filtering (< 0.6 → off by default)
                        │
                        │  "Ausgewählte übernehmen" tapped
                        ▼
          [importRepo.saveImport()] ── writeWithOutbox ──► [SQLite: imports + import_items + bed/plant/observation_drafts]
                                                                        │
                                                                [SyncWorker (Outbox)]
                                                                        │
                                                                [Supabase: same tables, RLS scoped to garden_member]
```

### Recommended Project Structure

New files to create:

```
app/
├── app/(app)/import/
│   ├── index.tsx          # Entry: share-intent receipt OR paste fallback
│   └── preview.tsx        # Preview: entity cards, toggles, confirm
├── src/
│   ├── components/
│   │   ├── ImportEntityCard.tsx    # Card + TrafficLightBadge + Switch per entity
│   │   ├── ImportErrorState.tsx    # Error banner + "Schema kopieren" button
│   │   └── ui/
│   │       └── switch.tsx          # NativeWind-wrapped react-native Switch
│   ├── lib/
│   │   ├── importRepo.ts          # Repo pattern: saveImport(), loadPendingDrafts()
│   │   └── importValidator.ts     # ajv schema compilation + validatePayload()
│   └── stores/
│       └── importStore.ts         # Zustand: pending import payload between screens
packages/
└── shared/src/types/
    └── entities.ts        # Add: ImportRow, ImportItemRow, BedDraftRow, PlantDraftRow, ObservationDraftRow, EntityName additions
supabase/
└── migrations/
    └── 20260509000016_import_drafts.sql   # 5 new tables + RLS + LWW-free
prompts/
└── garden-project-system-prompt.md       # M07.3 companion prompt
```

### Pattern 1: expo-share-intent Setup (app.config.ts)

**What:** Register app as handler for `application/json` files on iOS and Android via config plugin.
**When to use:** Required for IMPORT-04. Added alongside existing sentry plugin.

```typescript
// Source: expo-share-intent README + npm docs (verified v4.1.2)
// app/app.config.ts
plugins: [
  'expo-router',
  [
    '@sentry/react-native/expo',
    { /* existing sentry config */ }
  ],
  [
    'expo-share-intent',
    {
      // iOS: accept JSON files shared from Files app / Claude.ai export
      iosActivationRules: {
        NSExtensionActivationSupportsFileWithMaxCount: 1,
      },
      // iOS UTType for JSON files
      iosShareExtensionName: 'SpatenstichShareExtension',
      // Android: accept application/json MIME type
      androidIntentFilters: ['application/json'],
    },
  ],
],
```

**Note:** `spatenstich` scheme is already set at the top level of `app.config.ts` (`scheme: 'spatenstich'`). expo-share-intent uses this existing scheme for deep link routing — no duplicate scheme declaration needed. [VERIFIED: app.config.ts codebase read]

### Pattern 2: Share-Intent Reception in Layout

**What:** Handle incoming share intent in `app/(app)/_layout.tsx` using `ShareIntentProvider` + `useShareIntentContext`.
**When to use:** Wraps the (app) stack so all app-group screens can react to incoming intents.

```typescript
// Source: expo-share-intent docs — expo-router integration pattern
// app/app/(app)/_layout.tsx
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useRouter } from 'expo-router';

function AppLayoutInner() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const router = useRouter();

  React.useEffect(() => {
    if (!hasShareIntent || !shareIntent?.files?.length) return;
    const file = shareIntent.files[0];
    // Read file content, then navigate to import screen
    router.push({ pathname: '/(app)/import', params: { fileUri: file.path } });
    resetShareIntent();
  }, [hasShareIntent, shareIntent]);

  return <Stack screenOptions={{ headerShown: true, headerTitle: '', headerRight: () => <SyncStatusBadge /> }} />;
}

export default function AppLayout() {
  return (
    <ShareIntentProvider>
      <AppLayoutInner />
    </ShareIntentProvider>
  );
}
```

### Pattern 3: JSON Validation with ajv (draft-2020-12)

**What:** Compile schema once at module init; call `validatePayload()` synchronously for offline validation.
**When to use:** Called from both paste-fallback (onBlur) and share-intent file reader.

```typescript
// Source: ajv docs (ajv.js.org/guide/getting-started.html) [ASSUMED — standard ajv usage]
// app/src/lib/importValidator.ts
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '../../../schemas/spatenstich-import.v1.json';

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

**Note on React Native bundling:** `ajv/dist/2020` (CJS) works with Metro. The JSON schema import (`import schema from '...'`) works in Metro with `resolveJsonModule: true` in tsconfig (already set: `tsconfig.json` exists in project root). [ASSUMED — tsconfig resolveJsonModule needs verification]

### Pattern 4: importRepo.ts (following gardenPlanRepo.ts pattern)

**What:** Draft persistence using `writeWithOutbox` for Supabase sync.
**When to use:** Called from Preview screen confirm action.

```typescript
// Source: gardenPlanRepo.ts pattern (verified in codebase)
// app/src/lib/importRepo.ts
export async function saveImport(
  mode: AuthMode,
  gardenId: string,
  payload: ImportPayload,
  selectedLocalIds: Set<string>,
): Promise<void> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  const now = new Date().toISOString();
  const importId = randomId();

  // 1. Write imports header row
  const importRow: ImportRow = {
    id: importId,
    gardenId,
    source: 'claude-ai-project',
    importedAt: payload.capture.timestamp,
    chatReference: payload.capture.chatReference ?? null,
    payloadSchemaVersion: payload.schemaVersion,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: userId,
    deletedAt: null,
  };
  await storage.writeWithOutbox('imports', importRow, {
    entity: 'imports', rowId: importRow.id, operation: 'insert', payload: importRow,
  });

  // 2. Write selected entities as draft rows...
  // (beds → bed_drafts, plants → plant_drafts, observations → observation_drafts)
}
```

### Pattern 5: Supabase Migration 016 Schema Design

**What:** Five new tables following the established RLS + migration pattern. **No LWW triggers** on draft tables — drafts are write-once per user, no collaborative conflict possible.
**When to use:** Migration 016 (next slot after 015 which is `20260509000015_remove_ai_tables.sql`).

```sql
-- Migration filename: 20260509000016_import_drafts.sql
-- Tables: imports, import_items, bed_drafts, plant_drafts, observation_drafts
-- RLS: is_garden_member(garden_id) on all tables
-- No LWW triggers: drafts are write-once, no concurrent edit conflict possible (D-19)
-- Soft-delete: deleted_at column on all tables (consistent with Phase 3 pattern)

CREATE TABLE public.imports (
  id                   uuid primary key default gen_random_uuid(),
  garden_id            uuid not null references public.gardens(id) on delete cascade,
  source               text not null default 'claude-ai-project',
  imported_at          timestamptz not null,
  chat_reference       text,
  payload_schema_version text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  updated_by_user_id   uuid references auth.users(id),
  deleted_at           timestamptz
);
-- index, RLS (is_garden_member), zz_set_updated_at trigger only (no LWW)

CREATE TABLE public.import_items (
  id          uuid primary key default gen_random_uuid(),
  import_id   uuid not null references public.imports(id) on delete cascade,
  garden_id   uuid not null references public.gardens(id) on delete cascade,
  item_type   text not null check (item_type in ('bed','plant','observation')),
  local_id    text not null,
  payload     jsonb not null,
  confidence  double precision,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

CREATE TABLE public.bed_drafts (
  id               uuid primary key default gen_random_uuid(),
  import_item_id   uuid not null references public.import_items(id) on delete cascade,
  garden_id        uuid not null references public.gardens(id) on delete cascade,
  label            text not null,
  length_cm        double precision,
  width_cm         double precision,
  sun_exposure     text,
  soil_notes       text,
  confidence       double precision,
  status           text not null default 'pending' check (status in ('pending','promoted','dismissed')),
  promoted_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id),
  deleted_at       timestamptz
);
-- plant_drafts and observation_drafts follow same pattern with their entity-specific columns
```

**Rationale for no LWW triggers on draft tables:** Drafts are created by one user from an import session and only promoted/dismissed. A second user does not collaboratively edit the same draft row. The existing `zz_set_updated_at` trigger suffices for `updated_at` maintenance without the overhead of LWW guard. [ASSUMED — confirmed by D-14/D-19 intent; risk: if Phase 7 makes drafts collaboratively editable, LWW may need to be added then]

### Anti-Patterns to Avoid

- **Do not pass full parsed payload via navigation params:** React Native navigation params are serialized. Large payloads (many entities) risk truncation or performance issues. Use a Zustand `importStore` as intermediate state — set before navigate, read on Preview screen.
- **Do not validate on every keystroke in Paste-Fallback:** Validation runs ajv compilation + cross-reference checks. Fire only on `onBlur` (specified in UI-SPEC).
- **Do not use expo-sharing for receiving files:** `expo-sharing` is for *sending* files from the app. For *receiving*, `expo-share-intent` is the correct library.
- **Do not import ajv default export:** On React Native/Metro, `import Ajv from 'ajv'` may fail because Ajv's main export is the draft-07 validator. Always use `import Ajv2020 from 'ajv/dist/2020'` for draft-2020-12 support.
- **Do not add LWW triggers to draft tables:** Unnecessary for write-once draft entities and adds migration complexity.
- **Do not add a separate Tab for Import:** D-07 explicitly states Import is a button on Home, not a tab.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| iOS Share Extension + Android Intent Filter | Custom Expo config plugin with Swift/Kotlin | expo-share-intent v4.1.2 | Share extensions require native code in both platforms; expo-share-intent packages both + provides a React hook |
| JSON Schema validation | Custom type-checking if/else tree | ajv v8 + spatenstich-import.v1.json | Schema has 15+ constraints (enums, formats, cross-references); hand-rolled validation will drift from the schema |
| Clipboard copy | Native module | expo-clipboard (already installed) | Already bundled; `Clipboard.setStringAsync()` is one line |
| File content reading from share URI | expo-file-system directly | expo-share-intent's `shareIntent.files[0].path` | expo-share-intent normalizes the URI across iOS (share extension temp dir) and Android (content:// URIs) |

**Key insight:** The iOS share extension and Android intent filter are genuinely complex native configurations. expo-share-intent handles UTType registration, NSExtensionActivationRules, and Android manifest IntentFilter generation — roughly 200 lines of native config compressed to 10 lines of plugin config.

---

## Common Pitfalls

### Pitfall 1: Passing Large Payload Through Navigation Params

**What goes wrong:** `router.push({ pathname: '/(app)/import/preview', params: { payload: JSON.stringify(bigPayload) } })` — React Native serializes params via the native bridge; large payloads (full garden analysis) can cause "too large for bridge" warnings or silent truncation on older devices.
**Why it happens:** Expo Router exposes navigation params as URL-like strings, not as in-memory references.
**How to avoid:** Set parsed payload in a Zustand `importStore` before navigating; Preview screen reads from store, not from params.
**Warning signs:** Preview screen receives truncated or empty payload despite valid parse on Entry screen.

### Pitfall 2: Stale ShareIntentProvider Context

**What goes wrong:** `hasShareIntent` stays `true` after navigating away from the Import screen, causing re-navigation loops.
**Why it happens:** `resetShareIntent()` must be called explicitly after consuming the intent — it is not auto-reset on navigation.
**How to avoid:** Always call `resetShareIntent()` after routing to the import screen in the layout effect.
**Warning signs:** App keeps navigating to Import screen on every render cycle.

### Pitfall 3: ajv Compilation on Every Validate Call

**What goes wrong:** Calling `new Ajv2020().compile(schema)` inside `validatePayload()` function — recompiles the schema on every call, causing perceptible lag on low-end devices.
**Why it happens:** `ajv.compile()` is expensive (JIT-compiles the schema to a JS function).
**How to avoid:** Compile once at module level (outside the function), as shown in Pattern 3. Module-level const is evaluated once when the module is first imported.
**Warning signs:** 200–500ms delay on each paste-fallback blur event.

### Pitfall 4: iOS UTType vs Android MIME Type Mismatch

**What goes wrong:** Configuring only `androidIntentFilters: ['application/json']` without the iOS `NSExtensionActivationSupportsFileWithMaxCount` — app receives Android JSON shares but does not appear in iOS share sheet for JSON files.
**Why it happens:** iOS uses UTTypes (`public.json`), not MIME types. The two platforms use different intent/activation systems.
**How to avoid:** Configure both `iosActivationRules` (with file count) and `androidIntentFilters` in the plugin config (see Pattern 1).
**Warning signs:** App appears in Android share sheet for .json files but not in iOS share sheet.

### Pitfall 5: EntityName Not Extended for New Tables

**What goes wrong:** `writeWithOutbox('imports', ...)` throws TypeScript error because `'imports'` is not in the `EntityName` union type in `packages/shared/src/types/entities.ts`.
**Why it happens:** `EntityName` is a literal union; new tables require explicit extension.
**How to avoid:** Add `'imports' | 'import_items' | 'bed_drafts' | 'plant_drafts' | 'observation_drafts'` to the `EntityName` union **and** update `PULL_ENTITIES` in SyncWorker if pull sync is needed.
**Warning signs:** TypeScript error on `writeWithOutbox` call; tests fail.

### Pitfall 6: SyncWorker dispatchPush Missing New Entities

**What goes wrong:** Drafts write to local SQLite via outbox but never sync to Supabase — the SyncWorker `dispatchPush` switch has no cases for `'imports'`, `'bed_drafts'`, etc., so it throws `'Unknown entity for push'` and the outbox entry stays permanently failed.
**Why it happens:** SyncWorker's `dispatchPush` switch is exhaustive; unknown entities throw.
**How to avoid:** Add push handlers for each new entity in SyncWorker (or add a generic "upsert raw payload" handler for import entities).
**Warning signs:** Sync badge shows permanent error; Supabase tables remain empty despite local drafts existing.

### Pitfall 7: Missing `resolveJsonModule` for Schema Import

**What goes wrong:** `import schema from '../../../schemas/spatenstich-import.v1.json'` fails at runtime with "Cannot find module" or type error.
**Why it happens:** Metro supports JSON imports but TypeScript `tsconfig` must have `resolveJsonModule: true`.
**How to avoid:** Verify `tsconfig.json` at project root has `"resolveJsonModule": true`. If not, add it, or use `require()` as fallback.
**Warning signs:** Build-time TypeScript error on the schema import line.

---

## Code Examples

Verified patterns from codebase:

### Confidence → TrafficLight State Mapping

```typescript
// Source: TrafficLightBadge.tsx + UI-SPEC confidence thresholds (codebase verified)
function confidenceToState(confidence: number | undefined): TrafficLightState {
  if (confidence === undefined) return 'neutral';
  if (confidence >= 0.8) return 'green';
  if (confidence >= 0.6) return 'amber';
  return 'red';
}
```

### RLS Policy Pattern (from migration 014, verified)

```sql
-- Source: 20260504000014_garden_plan.sql (codebase verified)
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imports_member_all" ON public.imports
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));
```

### Repo writeWithOutbox Pattern (from gardenPlanRepo.ts, verified)

```typescript
// Source: app/src/lib/gardenPlanRepo.ts (codebase verified)
try {
  await storage.writeWithOutbox('imports', row, {
    entity: 'imports',
    rowId: row.id,
    operation: 'insert',
    payload: row as unknown as Record<string, unknown>,
  });
  scheduleWriteDebounced();
} catch (cause) {
  throw new OutboxEnqueueError('imports', row.id, cause);
}
```

### expo-clipboard Usage (verified installed)

```typescript
// Source: package.json (expo-clipboard ~7.0.1 confirmed installed)
import * as Clipboard from 'expo-clipboard';
import schema from '../../../schemas/spatenstich-import.v1.json';

async function copySchema(): Promise<void> {
  await Clipboard.setStringAsync(JSON.stringify(schema, null, 2));
}
```

### Import Button on Home Screen (both states)

```typescript
// Source: app/app/(app)/index.tsx pattern (codebase verified — empty state and plan-view both rendered)
import { useRouter } from 'expo-router';

const router = useRouter();
// Add to both empty state and plan view sections:
<Button onPress={() => router.push('/(app)/import')} variant="default">
  Aus Claude.ai importieren
</Button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-share-intent` v3 (SDK 51/52) | v4.x (SDK 53) | 2025 | Breaking API changes in `ShareIntentProvider`; always use v4 for SDK 53 |
| `react-native-share` (community) | `expo-share-intent` (native module) | 2024+ | Expo-native module avoids bare workflow + better managed workflow support |
| `ajv` v6 (draft-07 only) | `ajv` v8 (all drafts including 2020-12) | ajv v8 released 2021 | Must use `ajv/dist/2020` entry point for draft-2020-12; default export is still draft-07 |

**Deprecated/outdated:**
- `expo-sharing`: Only for sending files OUT of the app. Wrong library for receiving share intents.
- `ajv` default import for draft-2020-12: Use `ajv/dist/2020` named export.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ajv/dist/2020` import path works with Metro bundler without additional resolver config | Standard Stack, Pattern 3 | If Metro can't resolve `ajv/dist/2020`, need a metro.config.js alias or switch to `require()` |
| A2 | `resolveJsonModule: true` is set in root tsconfig.json (file exists but was not read) | Pattern 3 | TypeScript error on JSON schema import; fallback: `const schema = require('...')` |
| A3 | No LWW triggers needed on draft tables (write-once semantics) | Pattern 5, Migration | If Phase 7 makes drafts collaboratively editable, LWW triggers need to be added retroactively via migration |
| A4 | `expo-share-intent` v4.1.2 `iosActivationRules.NSExtensionActivationSupportsFileWithMaxCount` covers `public.json` UTType without explicit UTType declaration | Pattern 1 | iOS share sheet may not show Spatenstich for JSON files; fix: add `NSExtensionActivationSupportsWebContentWithMaxCount` or explicit `UTTypeIdentifier` override |
| A5 | Passing `fileUri` as navigation param from layout effect to Import Entry screen is safe (short string, not the full payload) | Pattern 2 | No risk — URI is a short string; only full payload passing is problematic |
| A6 | Companion prompt authoring for `prompts/garden-project-system-prompt.md` is a creative/editorial task — no code research needed beyond confirming file path | Architecture | File path is confirmed by M07-spec D-03; content quality is author-dependent |

---

## Open Questions

1. **expo-share-intent iOS UTType for JSON files**
   - What we know: `NSExtensionActivationSupportsFileWithMaxCount: 1` enables file sharing; Android `androidIntentFilters: ['application/json']` covers Android
   - What's unclear: Whether iOS requires explicit `UTTypeIdentifier: 'public.json'` in the plugin config or if the file count rule is sufficient
   - Recommendation: Test on real iOS device during Wave 1 execution; if Files app share sheet does not show Spatenstich for `.json` files, add explicit UTType configuration. The paste-fallback (D-09) provides coverage if share intent has platform issues.

2. **SyncWorker extension strategy for import entities**
   - What we know: `dispatchPush` switch must be extended; imports are write-once (no update operation needed from client)
   - What's unclear: Whether to add dedicated push handlers per entity (5 new cases) or a generic "insert-only" handler for import entities
   - Recommendation: Generic insert-only handler keyed on entity name prefix `'import'` / `'_drafts'` suffix — reduces boilerplate while maintaining type safety.

3. **ajv Metro bundling**
   - What we know: ajv v8 is in node_modules; project uses Metro bundler with SDK 53
   - What's unclear: Whether `ajv/dist/2020` subpath export resolves correctly under Metro's package.json exports handling (SDK 53 has `unstable_enablePackageExports` default-on)
   - Recommendation: Verify in Wave 0 by adding a unit test that imports and runs `validatePayload` — if it fails, the executor should add `ajv` to `moduleNameMapper` in jest config or add Metro alias.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| expo-share-intent | IMPORT-04 | Not installed | — | Install in Wave 0: `pnpm add expo-share-intent@4.1.2` |
| ajv | IMPORT-07 | Available (node_modules) | 8.20.0 | — |
| ajv-formats | IMPORT-07 | Available (node_modules) | 3.0.1 | — |
| expo-clipboard | IMPORT-07 | Available | ~7.0.1 | — |
| expo-document-picker | IMPORT-05 | Available | ^55.0.13 | — |
| expo-file-system | IMPORT-04 | Available | ~18.0.0 | — |
| expo-linking | IMPORT-04 | Available | ~7.0.0 | — |
| Supabase (local) | IMPORT-08 | ✓ (supabase CLI project) | — | — |

**Missing dependencies with no fallback:**
- `expo-share-intent@4.1.2` — must be installed before native build

**Missing dependencies with fallback:**
- None

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + jest-expo ~53.0.0 |
| Config file | `app/package.json` → `"test": "jest --passWithNoTests"` + jest config in package.json |
| Quick run command | `cd app && pnpm test -- --testPathPattern=import` |
| Full suite command | `cd app && pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMPORT-03 | Companion prompt file exists at correct path | smoke (file existence) | `ls prompts/garden-project-system-prompt.md` | ❌ Wave 0 |
| IMPORT-04 | Share-intent handler receives JSON and navigates | manual (requires native build) | manual on device | — |
| IMPORT-05 | Paste-fallback validates JSON on blur | unit | `pnpm test -- --testPathPattern=importValidator` | ❌ Wave 0 |
| IMPORT-06 | Confidence thresholds map to correct TrafficLight state | unit | `pnpm test -- --testPathPattern=importValidator` | ❌ Wave 0 |
| IMPORT-07 | Invalid payload returns actionable error messages | unit | `pnpm test -- --testPathPattern=importValidator` | ❌ Wave 0 |
| IMPORT-08 | importRepo.saveImport writes to SQLite outbox | unit (StorageAdapter mock) | `pnpm test -- --testPathPattern=importRepo` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd app && pnpm test -- --testPathPattern=import`
- **Per wave merge:** `cd app && pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `app/src/lib/__tests__/importValidator.test.ts` — covers IMPORT-05, IMPORT-06, IMPORT-07
- [ ] `app/src/lib/__tests__/importRepo.test.ts` — covers IMPORT-08
- [ ] `expo-share-intent@4.1.2` installation: `cd app && pnpm add expo-share-intent@4.1.2`
- [ ] Verify `resolveJsonModule: true` in root `tsconfig.json`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | RLS `is_garden_member()` on all 5 new tables |
| V5 Input Validation | yes | ajv draft-2020-12 validation of imported JSON before any persistence |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious JSON payload (oversized / deeply nested) | Tampering | ajv `allErrors: true` + `additionalProperties: false` in schema rejects unknown fields; consider payload size limit before JSON.parse (D-03 contract) |
| bedRef cross-reference injection | Tampering | Custom cross-ref check in `validatePayload()` (see Pattern 3) |
| RLS bypass via garden_id spoofing | Elevation of Privilege | `is_garden_member()` RLS on all 5 tables (Supabase server-enforced) |
| Clipboard data interception | Information Disclosure | Out of scope — clipboard is user-controlled; "Schema kopieren" only writes the public schema, not user data |

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 6 |
|-----------|------------------|
| Zero outbound AI calls | Import flow must never call any external API during JSON parsing or preview — confirmed, all validation is local |
| Supabase (Frankfurt, EU) | New tables in migration 016 follow same EU-hosted Supabase project — no new services |
| expo-sqlite (structured data) + Outbox-Pattern | Draft tables use existing StorageAdapter + writeWithOutbox pattern |
| NativeWind / react-native-reusables for UI | `Switch` primitive follows same manual-install pattern as existing `button.tsx` |
| pnpm workspaces monorepo | `cd app && pnpm add expo-share-intent@4.1.2` — install into app/ workspace |
| TypeScript 5.x throughout | All new files typed; new EntityName entries added to shared types |
| GSD workflow | No direct repo edits outside GSD — executor must use `/gsd-execute-phase` |
| German UTF-8 strings | All i18n strings in `de.json` use UTF-8 Umlaute (ä, ö, ü, ß) — never ASCII substitutions |

---

## Sources

### Primary (HIGH confidence)
- Codebase: `app/package.json` — confirmed installed packages (expo-clipboard, expo-document-picker, expo-linking, expo-file-system, ajv, ajv-formats)
- Codebase: `app/app.config.ts` — confirmed `scheme: 'spatenstich'`, existing plugin array
- Codebase: `app/src/lib/gardenPlanRepo.ts` — writeWithOutbox pattern
- Codebase: `app/src/lib/sync/SyncWorker.ts` — dispatchPush extensibility, EntityName pattern
- Codebase: `packages/shared/src/types/entities.ts` — EntityName union, RowBase interface
- Codebase: `supabase/migrations/20260509000015_remove_ai_tables.sql` — last migration (slot 015)
- Codebase: `supabase/migrations/20260504000014_garden_plan.sql` — migration pattern (RLS, triggers)
- npm registry: `npm view expo-share-intent@4.1.2 peerDependencies` → `expo: "^53"` confirmed
- npm registry: `npm view ajv version` → `8.20.0` confirmed
- 06-UI-SPEC.md — component inventory, screen layouts, interaction contracts, copy

### Secondary (MEDIUM confidence)
- WebFetch: `https://github.com/achorein/expo-share-intent` — plugin config, hook API, SDK version matrix
- WebFetch: `https://docs.expo.dev/router/advanced/native-intent/` — `+native-intent.tsx` redirectSystemPath API
- WebSearch: expo-share-intent SDK 53 = v4.x confirmed by multiple sources

### Tertiary (LOW confidence)
- [A1] ajv/dist/2020 Metro bundling — standard usage pattern, not tested in this codebase
- [A2] tsconfig resolveJsonModule — file exists but not read during research

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry and project package.json
- Architecture: HIGH — patterns directly derived from existing Phase 3 codebase patterns
- Share-intent config: MEDIUM — expo-share-intent iOS UTType specifics need device testing (A4)
- Pitfalls: HIGH — derived from actual codebase patterns and documented expo-share-intent behavior

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (stable libraries; expo-share-intent 4.x unlikely to break before SDK 55 upgrade)
