# Phase 5: AI-Removal + Import-Schema — Research

**Researched:** 2026-05-09
**Domain:** Code-Bereinigung (AI-Entfernung) + JSON Schema Authoring (draft 2020-12)
**Confidence:** HIGH — codebase direkt inspiziert, alle Entfernungsziele verifiziert

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Edge Function `extract-vereinsregeln` wird **komplett entfernt** (nicht nur deaktiviert). Inklusive Client-Lib `app/src/lib/extractVereinsregeln.ts`, Deno-Deps, Tests.
- **D-02:** Import-Schema erhält in Phase 10 einen `vereinsregeln`-Block. Dieser Block ist NICHT Teil von Phase 5.
- **D-03:** Tabellen `ai_jobs`, `ai_results` und pgmq-Queue per **neuer Supabase-Migration gelöscht** (DROP TABLE). Kein TRUNCATE, kein Behalten.
- **D-04:** `ai_jobs` und `ai_results` werden aus dem Sync-Entity-Scope entfernt. Lokale SQLite/IndexedDB-Tabellen für diese Entities ebenfalls gelöscht.
- **D-05:** pgmq-Extension kann in Supabase bleiben (harmlos), aber die Queue selbst wird gelöscht. Falls pgmq keine anderen Nutzer hat, Extension ebenfalls entfernen.
- **D-06:** Folgende Dateien/Verzeichnisse werden komplett gelöscht:
  - `supabase/functions/ai-job-consumer/` (komplette Edge Function)
  - `supabase/functions/extract-vereinsregeln/` (komplette Edge Function)
  - `app/app/(app)/capture/` (alle 9 Screens + Layout)
  - `app/src/lib/photoResizer.ts`
  - `app/src/lib/extractVereinsregeln.ts`
  - `app/src/components/AnalysisLoader.tsx`
- **D-07:** `supabase/config.toml` — Einträge `[functions.ai-job-consumer]` und `[functions.extract-vereinsregeln]` entfernen.
- **D-08:** `app/src/lib/gardenPlanRepo.ts` — AI-bezogene Teile entfernen; Datei bleibt (enthält Plan-Rendering-Logik für Phase 7).
- **D-09:** `packages/shared/src/types/entities.ts` — AI-bezogene Type-Definitionen entfernen (AiJob, AiResult, etc.).
- **D-10:** Capture-Route komplett entfernen, kein Platzhalter, kein Redirect. Home-Screen zeigt keinen Capture-Button mehr.
- **D-11:** `complianceFlags` im v1-Schema **behalten** (optional). Vorwärtskompatibel für Phase 10.
- **D-12:** `freeFormNotes` als Plain String (Markdown erlaubt, aber nicht validiert).
- **D-13:** Schema-Versionierung: neue Version = neues Schema-File. v1 bleibt stabil.
- **D-14:** Schema-Datei in `schemas/spatenstich-import.v1.json`. Drei Referenz-Payloads in `schemas/examples/`.

### Claude's Discretion
- Migration-Reihenfolge und Abhängigkeiten zwischen DROP-Statements
- Ob `gardenPlanRepo.ts` teilweise erhalten bleibt oder komplett gelöscht wird (abhängig von Code-Analyse)
- Cleanup von i18n-Strings (`de.json`) die nur für Capture-Flow existierten
- Bereinigung von Navigation/Routing nach Entfernung der Capture-Screens

### Deferred Ideas (OUT OF SCOPE)
- `vereinsregeln`-Block im Import-Schema (Phase 10)
- Import-UI / Import-Screen (Phase 6)
- Plan-Editor (Phase 7)
- Claude.ai-System-Prompt (Phase 6)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Unterstützung |
|----|-------------|------------------------|
| REMOVE-01 | Alle Claude Vision / Anthropic SDK Clients, Edge Functions (`ai-job-consumer`), und zugehörige Screens entfernt | Vollständige Entfernungsliste aus Codebase-Inspektion ermittelt — 6 Verzeichnisse/Dateien, 8+ Cross-References |
| REMOVE-02 | Alle KI-bezogenen Env-Vars (`ANTHROPIC_API_KEY`, `PLANTNET_API_KEY`) entfernt | `.env.example` und `config.toml` als Bereinigungsziele identifiziert |
| REMOVE-03 | Onboarding, README, Privacy Policy von AI-Call-Sprache bereinigt | README.md enthält "Claude API (Vision + Text)" + "Pl@ntNet API" Referenzen — verifiziert |
| IMPORT-01 | JSON-Schema `spatenstich-import.v1.json` (draft 2020-12) definiert und committed | M07-Spec enthält komplettes Beispiel-Payload; AJV verfügbar für Validierung |
| IMPORT-02 | Drei Referenz-Payloads (`full.json`, `minimal.json`, `edge-cases.json`) validieren gegen Schema | AJV im Projekt vorhanden, Validierungsbefehl recherchiert |
</phase_requirements>

---

## Summary

Phase 5 ist eine **reine Bereinigungsphase** ohne neue Produktfunktionalität. Sie teilt sich in zwei klar abgegrenzte Arbeitsbereiche:

**M07.1 — AI-Removal:** Entfernung aller AI-Clients, Edge Functions, DB-Tabellen, Screens, Komponenten und Env-Vars. Die Codebase-Inspektion hat ergeben, dass die Entfernungsziele direkt in der D-06-Entscheidung benannt sind, es aber bedeutsame **Cross-References** gibt, die nicht vergessen werden dürfen: `SyncTriggers.ts` importiert `uploadPending()` aus `PhotoUploader.ts`; `SyncWorker.ts` hat einen `photo_queue`-Push-Handler; `StorageAdapters` (SQLite + IndexedDB) listen `photo_queue` als Entity; `migrateLocalToAccount.ts` setzt `sync_state` für `photo_queue`; `vereinsregeln/upload.tsx` (eine **bleibende** Screen-Datei) importiert `extractVereinsregeln.ts` und `uploadVereinsregelPdf.ts`. Der `vereinsregeln/upload.tsx`-Screen muss komplett ersetzt werden — er hängt an AI-Infrastruktur, die entfernt wird.

**M07.2 — Import-Schema:** `schemas/spatenstich-import.v1.json` als JSON Schema draft 2020-12 formalisieren. Die M07-Spezifikation enthält bereits das Datenmodell (beds, plants, observations, complianceFlags, freeFormNotes). AJV ist bereits im `node_modules` vorhanden und unterstützt draft 2020-12.

**Primäre Empfehlung:** Entfernungen **vor** Schema-Authoring durchführen (Wave 1 = Removal, Wave 2 = Schema). Das verhindert, dass teilweise entfernte AI-Infra die Build-Verifikation (Acceptance Criterion 2) blockiert.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| AI-Code-Entfernung (Edge Functions) | Backend (Supabase) | — | Deno-basierte Server-Functions liegen in `supabase/functions/` |
| DB-Tabellen-DROP (ai_jobs, ai_results) | Database/Storage | — | SQL-Migration, keine Client-Änderung |
| pgmq-Queue-Löschung | Database/Storage | — | Server-seitig, pgmq-API oder SQL |
| Capture-Screen-Entfernung | Frontend (Expo Router) | — | File-based routing: Verzeichnis-Löschung entfernt Route automatisch |
| Home-Screen-Bereinigung (Capture-Buttons) | Frontend (Expo Router) | — | `app/app/(app)/index.tsx` — UI-Änderung |
| SyncWorker photo_queue-Handler | Frontend (Sync-Layer) | — | Client-seitiger Push-Handler in `SyncWorker.ts` |
| StorageAdapter photo_queue-Scope | Frontend (Storage) | — | SQLite + IndexedDB Adapter-Listen |
| i18n-Bereinigung (de.json capture-Keys) | Frontend (shared) | — | `packages/shared/src/i18n/de.json` |
| Type-Definitionen bereinigen | Frontend (shared) | — | `packages/shared/src/types/` |
| JSON Schema authoring | Kein Tier (Artefakt) | — | Statische JSON-Datei in `schemas/` |
| Schema-Validierung (CI/Test) | Dev-Tooling | — | AJV-CLI oder Node-Script |
| README/Onboarding-Bereinigung | Dokumentation | — | `README.md`, keine Laufzeitkomponente |

---

## Standard Stack

### Core (bereits im Projekt vorhanden)

| Bibliothek | Version | Zweck | Status |
|------------|---------|-------|--------|
| AJV (Another JSON Validator) | ~8.x (in node_modules) | JSON Schema draft 2020-12 Validierung | [VERIFIED: node_modules/ajv vorhanden] |
| JSON Schema (draft 2020-12) | — | Schema-Spezifikationsformat für `spatenstich-import.v1` | [VERIFIED: M07-Spec, IMPORT-01 Requirement] |
| Supabase CLI | — | Migrations erstellen + deployen | [ASSUMED] |

### AJV: Draft 2020-12 Support

AJV v8 unterstützt JSON Schema draft 2020-12 **nativ**, aber mit explizitem Import:

```javascript
// Source: AJV docs — draft 2020-12 ist nicht der default
import Ajv2020 from "ajv/dist/2020"
const ajv = new Ajv2020()
```

[VERIFIED: node_modules/ajv/dist/2020 existiert]

**Für CLI-Validierung** (kein separates Script nötig):
```bash
node -e "
const Ajv = require('./node_modules/ajv/dist/2020');
const ajv = new Ajv({ strict: false });
const schema = require('./schemas/spatenstich-import.v1.json');
const payload = require('./schemas/examples/full.json');
const validate = ajv.compile(schema);
const valid = validate(payload);
if (!valid) { console.error(validate.errors); process.exit(1); }
console.log('VALID');
"
```

[ASSUMED — Syntax ungeprüft, aber AJV API ist stabil]

---

## Vollständige Entfernungsliste (Codebase-verifiziert)

### Dateien/Verzeichnisse komplett löschen

| Pfad | Typ | Verifiziert |
|------|-----|------------|
| `supabase/functions/ai-job-consumer/` | Edge Function (Verzeichnis) | [VERIFIED: existiert] |
| `supabase/functions/extract-vereinsregeln/` | Edge Function (Verzeichnis) | [VERIFIED: existiert] |
| `app/app/(app)/capture/` | 9 Screens + `_layout.tsx` | [VERIFIED: existiert, 9 Dateien] |
| `app/src/lib/photoResizer.ts` | Client-Lib | [VERIFIED: existiert] |
| `app/src/lib/extractVereinsregeln.ts` | Client-Lib | [VERIFIED: existiert] |
| `app/src/lib/enqueueAiJob.ts` | Client-Lib (AI-Job-Enqueue) | [VERIFIED: existiert, nicht in D-06 aber funktional AI-only] |
| `app/src/lib/uploadVereinsregelPdf.ts` | Client-Lib (PDF-Upload für AI) | [VERIFIED: existiert, hängt an extract-vereinsregeln] |
| `app/src/lib/photos/PhotoUploader.ts` | Photo-Upload → AI-Enqueue | [VERIFIED: existiert, ruft `enqueue_photo_analysis` RPC auf] |
| `app/src/lib/photos/photoQueueRepo.ts` | Photo-Queue-Repo | [VERIFIED: existiert, AI-Queue-Facade] |
| `app/src/components/AnalysisLoader.tsx` | AI-Loading-Komponente | [VERIFIED: existiert] |
| `app/src/components/BudgetWarningBanner.tsx` | AI-Budget-Banner | [VERIFIED: existiert] |
| `app/src/components/CaptureStepCard.tsx` | Capture-Flow-Komponente | [VERIFIED: existiert] |
| `app/src/components/ConfidenceBadge.tsx` | Confidence-Badge für AI-Elemente | [VERIFIED: existiert] |
| `app/src/components/DimensionInput.tsx` | Dimensions-Input für Capture-Flow | [VERIFIED: existiert — Claude's Discretion: prüfen ob Phase 7 diese braucht] |
| `app/src/components/ExtractionLoader.tsx` | Vereinsregeln-Extraction-Loader | [VERIFIED: existiert] |
| `app/src/components/PhotoThumbnail.tsx` | Photo-Thumbnail für Capture | [VERIFIED: existiert] |
| `app/src/components/ShapeSelector.tsx` | Shape-Selector für Capture-Flow | [VERIFIED: existiert — Claude's Discretion: prüfen ob Phase 7 diese braucht] |

> **Hinweis:** `DimensionInput.tsx` und `ShapeSelector.tsx` wurden für den Capture-Flow gebaut, könnten aber für den Plan-Editor (Phase 7) wiederverwendbar sein. Vor dem Löschen prüfen.

### Dateien teilweise bereinigen (Datei bleibt)

| Datei | Was zu entfernen ist | Verifiziert |
|-------|---------------------|------------|
| `supabase/config.toml` | Einträge `[functions.ai-job-consumer]` und `[functions.extract-vereinsregeln]` (Zeilen 384–388) | [VERIFIED: beide Einträge sichtbar] |
| `app/src/lib/gardenPlanRepo.ts` | `saveElements()`-Funktion (AI-Result-basiert, mit `aiResultId`-Parameter) + Kommentar "Account-only (Claude Vision = server-side API call)"; `loadAcceptedElements()` und `loadDimensions()` BEHALTEN (braucht Phase 7) | [VERIFIED: gardenPlanRepo.ts analysiert] |
| `app/src/lib/sync/SyncWorker.ts` | `case 'photo_queue'` in `dispatchPush()`, `pushPhotoQueue()`-Methode, `PhotoQueueRow`-Import, `photo_queue` aus `PULL_ENTITIES`-Array entfernen | [VERIFIED: SyncWorker.ts analysiert] |
| `app/src/lib/sync/SyncTriggers.ts` | `import { uploadPending }` + beide `uploadPending().catch()` Aufrufe in reconnect/foreground-Handlern | [VERIFIED: SyncTriggers.ts analysiert] |
| `app/src/lib/migrateLocalToAccount.ts` | `photo_queue` sync_state Reset-Zeilen (Zeilen 291–292) | [VERIFIED: gefunden] |
| `app/src/storage/SqliteAdapter.ts` | `'photo_queue'` aus Entity-Listen und `GARDEN_FOREIGN_KEY_MAP` | [VERIFIED: photo_queue in 3 Arrays] |
| `app/src/storage/IndexedDbAdapter.ts` | `'photo_queue'` aus Entity-Listen und `GARDEN_FOREIGN_KEY_MAP` | [VERIFIED: photo_queue in 3 Arrays] |
| `app/src/lib/mappers/rowMappers.ts` | `photoQueueFromDb`-Mapper (falls vorhanden) | [VERIFIED: Mapper existiert, Zeile 337–353] |
| `packages/shared/src/types/entities.ts` | `'photo_queue'` aus `EntityName` Union; `PhotoQueueRow`-Interface; entsprechende `AnyRow`-Union | [VERIFIED: photo_queue und PhotoQueueRow vorhanden] |
| `packages/shared/src/types/database.ts` | `ai_jobs` und `ai_results` Table-Definitionen | [VERIFIED: vorhanden] |
| `packages/shared/src/types/supabase.ts` | `ai_jobs`, `ai_results`, `photo_queue` Table-Definitionen | [VERIFIED: vorhanden] |
| `packages/shared/src/i18n/de.json` | Gesamter `"capture"`-Block (ca. Zeilen 176–251, ~76 Zeilen) | [VERIFIED: capture-Block gefunden] |
| `app/app/(app)/index.tsx` | Camera-Import, Capture-Button-Pressables (beide), "Garten erfassen"-Text; `loadAcceptedElements`/`loadDimensions` und `GardenPlanView` **BEHALTEN** | [VERIFIED: 2 Capture-Navigations-Aufrufe auf `/(app)/capture/...`] |
| `app/app/_layout.tsx` | Keine Capture-spezifischen Einträge gefunden — Expo Router file-based, keine manuelle Route-Registrierung nötig | [VERIFIED: _layout.tsx enthält keinen capture-Verweis] |
| `app/.env` und `app/.env.example` | `CLAUDE_API_KEY`-Kommentar/Verweis bereinigen (ist schon kommentiert, aber Kommentar referenziert FOUND-06 das superseded ist) | [VERIFIED: .env.example enthält Kommentar] |
| `README.md` | "Claude API (Vision + Text)" · "Pl@ntNet API" in Zeile 43+50; "Claude Vision analysiert" in Zeile 26 | [VERIFIED: 3 Fundstellen] |

### Screens, die umgeschrieben werden müssen (kein Delete)

| Datei | Problem | Lösung |
|-------|---------|--------|
| `app/app/(app)/profile/vereinsregeln/upload.tsx` | Importiert `extractVereinsregeln` + `uploadVereinsregelPdf` + zeigt `ExtractionLoader` | Screen muss neu geschrieben werden: zeigt "Vereinsregeln manuell eingeben" oder Platzhalter-CTA für Phase 10. ExtractionLoader/Loader-Logik komplett entfernen. |

### Supabase-Tests löschen (falls vorhanden)

Die `supabase/migrations/20260424000013` referenziert Supabase-Tests in `supabase/tests/` für `enqueue_photo_analysis`. Diese Tests prüfen:

```
supabase/tests/{lww_guard,trigger_ordering,enqueue_photo_analysis,...}
```

[ASSUMED — Existenz der Test-Dateien nicht direkt inspiziert, aber in Migration-Kommentar erwähnt]

---

## Architecture Patterns

### System Architecture Diagram (AI-Removal Flow)

```
Codebase (Phase 4 State)
        │
        ├── supabase/functions/ai-job-consumer/ ──────────► DROP (D-06)
        ├── supabase/functions/extract-vereinsregeln/ ─────► DROP (D-06)
        │
        ├── app/app/(app)/capture/ (9 Screens) ────────────► DROP (D-06, D-10)
        │
        ├── app/src/lib/ (AI-Clients)
        │   ├── photoResizer.ts ────────────────────────────► DROP (D-06)
        │   ├── extractVereinsregeln.ts ────────────────────► DROP (D-06)
        │   ├── enqueueAiJob.ts ────────────────────────────► DROP (implizit)
        │   ├── uploadVereinsregelPdf.ts ───────────────────► DROP (implizit)
        │   ├── photos/PhotoUploader.ts ────────────────────► DROP (implizit)
        │   ├── photos/photoQueueRepo.ts ───────────────────► DROP (implizit)
        │   └── gardenPlanRepo.ts ──────────────────────────► PARTIAL EDIT (D-08)
        │
        ├── app/src/lib/sync/
        │   ├── SyncWorker.ts ──────────────────────────────► PARTIAL EDIT
        │   └── SyncTriggers.ts ────────────────────────────► PARTIAL EDIT
        │
        ├── app/src/storage/
        │   ├── SqliteAdapter.ts ───────────────────────────► PARTIAL EDIT
        │   └── IndexedDbAdapter.ts ────────────────────────► PARTIAL EDIT
        │
        ├── packages/shared/src/types/ ─────────────────────► PARTIAL EDIT (D-09)
        ├── packages/shared/src/i18n/de.json ──────────────► PARTIAL EDIT
        │
        ├── supabase/config.toml ───────────────────────────► PARTIAL EDIT (D-07)
        └── supabase/migrations/ ───────────────────────────► NEW MIGRATION (D-03)
                                                              DROP ai_jobs, ai_results
                                                              DROP pgmq queue
```

### Import-Schema Datenfluss (M07.2)

```
M07-Spec (docs/specs/M07-claude-ai-bridge.md)
        │  enthält Beispiel-Payload (jsonc)
        │
        ▼
schemas/spatenstich-import.v1.json       ◄── Phase 5 erzeugt
   (JSON Schema draft 2020-12)
        │
        ├── schemas/examples/full.json   ◄── validiert gegen Schema
        ├── schemas/examples/minimal.json
        └── schemas/examples/edge-cases.json
                │
                ▼
        AJV Validation (node script)
             VALID ✓
```

### Recommended Project Structure (Schema-Artefakte)

```
schemas/
├── spatenstich-import.v1.json   # JSON Schema draft 2020-12
└── examples/
    ├── full.json                # Vollständiges Payload-Beispiel
    ├── minimal.json             # Nur Pflichtfelder + 1 Entity
    └── edge-cases.json          # Niedrige Confidence, optionale Felder fehlen
```

---

## JSON Schema: Draft 2020-12 Spezifikation

### Pflichtstruktur

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://spatenstich.app/schemas/spatenstich-import.v1.json",
  "title": "Spatenstich Import v1",
  "type": "object",
  "required": ["schemaVersion", "capture"],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "const": "spatenstich-import.v1"
    },
    "capture": {
      "type": "object",
      "required": ["timestamp"],
      "properties": {
        "timestamp": { "type": "string", "format": "date-time" },
        "location": {
          "type": "object",
          "properties": {
            "lat": { "type": "number", "minimum": -90, "maximum": 90 },
            "lon": { "type": "number", "minimum": -180, "maximum": 180 }
          },
          "required": ["lat", "lon"]
        },
        "photoRefs": { "type": "array", "items": { "type": "string" } },
        "chatReference": { "type": "string", "format": "uri" }
      }
    },
    "beds": { ... },
    "plants": { ... },
    "observations": { ... },
    "complianceFlags": { ... },
    "freeFormNotes": { "type": "string" }
  }
}
```

**M07-Spec Constraint (IMPORT-01):** Mindestens eines von `beds | plants | observations` muss vorhanden sein. Dies wird als `oneOf`/`anyOf`-Constraint oder als `if/then`-Logik ausgedrückt. [ASSUMED — konkrete JSON Schema 2020-12 Syntax für "at least one of multiple optional arrays is non-empty" ist nicht trivial]

**Empfehlung:** Im Schema als `comment` dokumentieren + in Payload-Validationsscript zusätzlich prüfen (simpler als komplexe Schema-Logik). Alternativ: alle drei als optional definieren und in der App validieren.

### Enum-Werte aus M07-Spec

```
sunExposure: "full" | "half" | "shade" | "mixed"
stageEstimate: "seedling" | "vegetative" | "flowering" | "fruiting" | "senescent"
kind (observation): "pest" | "disease" | "weather" | "soil" | "structural" | "other"
status (compliance): "compliant" | "warn" | "violation"
confidence: number (0.0–1.0)
```

[VERIFIED: direkt aus M07-claude-ai-bridge.md Spec]

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|-------------------|-------------|-------|
| JSON Schema Validierung | Custom Validator | AJV v8 (bereits vorhanden) | Draft 2020-12 support, type coercion, custom formats |
| Schema Format-Validierung (`date-time`, `uri`) | Regex-Checks | `ajv-formats` Plugin | RFC-konforme Implementierungen |
| `DROP TABLE`-Reihenfolge bei FK-Constraints | Manuelle Analyse | FK-Abhängigkeiten prüfen: `ai_results` → `ai_jobs` (FK `job_id`) → zuerst `ai_results` droppen | FK-Constraint verhindert umgekehrte Reihenfolge |

---

## Runtime State Inventory

> Relevant: Phase 5 entfernt ai_jobs/ai_results und pgmq-Queue. Lokale SQLite/IndexedDB-Daten für photo_queue. Prüfung aller 5 Kategorien.

| Kategorie | Gefundene Items | Erforderliche Aktion |
|-----------|----------------|---------------------|
| Stored data | Supabase Postgres: `ai_jobs`-Tabelle (potenziell 0 Rows — Phase 4 war nie human-verified), `ai_results`-Tabelle (potenziell 0 Rows), pgmq-Queue `ai_jobs` | DROP TABLE via neue Migration — kein Datenverlust da nie produktiv genutzt |
| Stored data (lokal) | SQLite / IndexedDB: `photo_queue`-Tabelle in lokalen Adaptern (potenziell 0 Rows für dieselben Gründe) | Entity aus Adapter-Listen entfernen; lokale Tabelle wird beim nächsten App-Start nicht mehr initialisiert |
| Live service config | Supabase: pgmq-Extension bleibt (D-05); keine laufenden Scheduler/Cron-Jobs für AI identifiziert | pgmq-Queue per `SELECT pgmq.drop_queue('ai_jobs')` löschen; Extension optional entfernen |
| OS-registered state | Keine — keine Task-Scheduler, pm2, launchd Einträge für diese App identifiziert | Keine |
| Secrets/env vars | `CLAUDE_API_KEY` (Supabase Edge Function Secret), `ANTHROPIC_API_KEY` / `PLANTNET_API_KEY` (in `.env.example` als "NIEMALS hier" kommentiert). Supabase Dashboard Secret muss manuell entfernt werden. | Supabase Dashboard: CLAUDE_API_KEY aus Secrets entfernen. `.env.example`: Kommentar bereinigen. |
| Build artifacts | Keine installierten Pakete, die umbenannt werden | `@anthropic-ai/sdk` in Edge Function — wird mit Function-Verzeichnis entfernt |

> **Kritischer Punkt:** `CLAUDE_API_KEY` ist ein Supabase Edge Function Secret (im Supabase Dashboard, nicht im Repo). Muss manuell über das Supabase Dashboard oder CLI entfernt werden: `supabase secrets unset CLAUDE_API_KEY`.

---

## Common Pitfalls

### Pitfall 1: FK-Reihenfolge beim DROP

**Was schiefläuft:** `DROP TABLE ai_jobs` schlägt fehl, weil `ai_results` eine FK-Referenz auf `ai_jobs` hat.

**Warum:** `ai_results.job_id REFERENCES ai_jobs(id) ON DELETE CASCADE` — aber CASCADE betrifft Rows, nicht das Löschen der Tabelle selbst.

**Vermeidung:** In der Migration zuerst `DROP TABLE ai_results`, dann `DROP TABLE ai_jobs`. Alternativ: `DROP TABLE ai_jobs CASCADE` — löscht ai_results implizit. Empfehlung: explizit beide droppen für Klarheit.

**Warnsignal:** `ERROR: cannot drop table ai_jobs because other objects depend on it`

---

### Pitfall 2: photo_queue noch in StorageAdapter-Listen nach Bereinigung

**Was schiefläuft:** App crasht beim Start, weil `photo_queue` noch in `ENTITIES_WITH_OUTBOX` oder `GARDEN_FOREIGN_KEY_MAP` steht, aber `PhotoQueueRow` nicht mehr im Type-System existiert.

**Warum:** SQLiteAdapter und IndexedDbAdapter listen `photo_queue` in mehreren Arrays. Wenn nur entities.ts bereinigt wird, bleiben die Adapter-Referenzen.

**Vermeidung:** Alle 4 Referenzstellen in jedem Adapter gleichzeitig entfernen:
1. Entity-Name in der String-Union-Liste
2. `GARDEN_FOREIGN_KEY_MAP`-Eintrag
3. Alle Array-Literale die `'photo_queue'` enthalten

**Warnsignal:** TypeScript-Fehler: `Type 'photo_queue' is not assignable to type EntityName`

---

### Pitfall 3: Home-Screen navigiert noch zu gelöschter Capture-Route

**Was schiefläuft:** App crasht oder zeigt 404, weil `router.push('/(app)/capture/step-overview')` aufgerufen wird, aber das Verzeichnis gelöscht wurde.

**Warum:** `app/app/(app)/index.tsx` hat zwei `router.push`-Aufrufe zu Capture-Screens (Zeilen 97 und 104), plus einen weiteren im Empty-State (Zeile 137).

**Vermeidung:** Home-Screen gleichzeitig mit Capture-Verzeichnis bereinigen — keine temporären Platzhalter (D-10 ist eindeutig: kein Redirect).

**Warnsignal:** Runtime-Error beim Tippen auf "Garten bearbeiten" oder "Garten erfassen"

---

### Pitfall 4: vereinsregeln/upload.tsx bricht nach Entfernung von extractVereinsregeln.ts

**Was schiefläuft:** Build-Fehler: `Cannot find module '@/src/lib/extractVereinsregeln'`

**Warum:** `app/app/(app)/profile/vereinsregeln/upload.tsx` importiert direkt `extractVereinsregeln` und `uploadVereinsregelPdf`. Diese Dateien werden entfernt, der Screen bleibt aber (Vereinsregeln-Feature bleibt, nur die AI-Extraktion fliegt raus).

**Vermeidung:** `vereinsregeln/upload.tsx` **neu schreiben** (nicht nur Imports entfernen) — zeigt stattdessen "Vereinsregeln können in Phase 10 über Claude.ai-Import eingepflegt werden" oder einen manuellen Eingabe-Placeholder.

**Warnsignal:** TypeScript-Build-Error zu `extractVereinsregeln` oder `uploadVereinsregelPdf`

---

### Pitfall 5: SyncTriggers ruft PhotoUploader nach Bereinigung

**Was schiefläuft:** TypeScript-Error oder Runtime-Error beim Sync.

**Warum:** `SyncTriggers.ts` importiert `uploadPending` aus `PhotoUploader.ts` und ruft es in zwei Event-Handlern auf (reconnect + foreground). Nach Löschung von `PhotoUploader.ts` bricht der Build.

**Vermeidung:** `SyncTriggers.ts` gleichzeitig mit `PhotoUploader.ts` bereinigen — beide `uploadPending()`-Aufrufe und den Import entfernen.

---

### Pitfall 6: pgmq-Queue DROP ohne Extension-Check

**Was schiefläuft:** `DROP EXTENSION pgmq` schlägt fehl, wenn noch andere Objekte die Extension verwenden.

**Warum:** pgmq-Extension könnte theoretisch andere Queues haben.

**Vermeidung:** Queue zuerst via `SELECT pgmq.drop_queue('ai_jobs', true)` (purge=true) löschen. Extension nur entfernen wenn `SELECT queue_name FROM pgmq.meta` leer ist. Safe-Variante: Extension weglassen (D-05: "Extension kann bleiben").

---

### Pitfall 7: AJV draft 2020-12 falscher Import

**Was schiefläuft:** Schema-Validierung wirft "unknown keyword" Fehler für `$schema: https://json-schema.org/draft/2020-12/schema`.

**Warum:** `const Ajv = require('ajv')` lädt den draft-07 Default. Draft 2020-12 braucht expliziten Pfad.

**Vermeidung:** `const Ajv = require('ajv/dist/2020')` verwenden.

---

## Code Examples

### Migration: ai_jobs + ai_results + pgmq-Queue droppen

```sql
-- Phase 5 Migration: AI-Tables entfernen (D-03)
-- Reihenfolge: zuerst ai_results (FK auf ai_jobs), dann ai_jobs
-- Dann pgmq-Queue löschen

-- Drop RLS-Policies zuerst (defensive — CASCADE macht das implizit)
DROP POLICY IF EXISTS "ai_results_creator_read" ON public.ai_results;
DROP POLICY IF EXISTS "ai_results_insert_service" ON public.ai_results;

DROP POLICY IF EXISTS "ai_jobs_creator_insert" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_creator_read" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_update_service" ON public.ai_jobs;
-- Alte Policy-Namen aus Migration 003:
DROP POLICY IF EXISTS "ai_jobs_member_insert" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_member_read" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_results_member_read" ON public.ai_results;

-- Drop Tabellen (CASCADE entfernt FKs und Indizes automatisch)
DROP TABLE IF EXISTS public.ai_results CASCADE;
DROP TABLE IF EXISTS public.ai_jobs CASCADE;

-- Drop pgmq-Queue (D-05: Queue löschen, Extension kann bleiben)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgmq') THEN
    PERFORM pgmq.drop_queue('ai_jobs', true); -- true = purge messages
  END IF;
END $$;

-- Optionaler Invariant-Check
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema='public' AND table_name IN ('ai_jobs','ai_results')) THEN
    RAISE EXCEPTION 'phase5_invariant: ai tables still exist after drop';
  END IF;
  RAISE NOTICE 'phase5 migration ok: ai_jobs + ai_results removed';
END $$;
```

[ASSUMED — pgmq.drop_queue Signatur ungeprüft, aber Pattern aus Foundation-Migration abgeleitet]

---

### gardenPlanRepo.ts: saveElements() — zu entfernende Teile

```typescript
// ENTFERNEN: saveElements() komplett (AI-Result-basiert)
// BEHALTEN:  saveDimensions(), loadDimensions(), loadAcceptedElements(), deleteAllElements()

// Zu entfernende Imports (nach saveElements-Entfernung):
import type { PlanElementCandidate } from '@spatenstich/shared'; // <- entfernen wenn nur in saveElements

// Kommentar-Update:
// VORHER: "Account-only (Claude Vision = server-side API call requires account mode)."
// NACHHER: "Account-only." (kein AI-Bezug)
```

[VERIFIED: gardenPlanRepo.ts analysiert]

---

### vereinsregeln/upload.tsx — Replacement-Strategie

Der Screen muss neu geschrieben werden. Inhalt nach Bereinigung:
- Entfernt: PDF-Upload-Button, ExtractionLoader, extractVereinsregeln, uploadVereinsregelPdf
- Ersetzt durch: Placeholder "Vereinsregeln werden in einem zukünftigen Update per Claude.ai-Import unterstützt" + CTA zur manuellen Eingabe (confirm.tsx)

```typescript
// Minimal-Replacement für vereinsregeln/upload.tsx nach Phase 5
// Zeigt nur Platzhalter — Phase 6/10 fügt echten Import hinzu
export default function VereinsregelnUploadScreen() {
  const router = useRouter();
  return (
    <View>
      <Text>Vereinsregeln-Import wird in einem zukünftigen Update verfügbar.</Text>
      <Pressable onPress={() => router.push('/(app)/profile/vereinsregeln/confirm')}>
        <Text>Manuell eingeben</Text>
      </Pressable>
    </View>
  );
}
```

[ASSUMED — genaues UI-Design liegt bei Claude's Discretion]

---

### JSON Schema: spatenstich-import.v1.json (Grundstruktur)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://spatenstich.app/schemas/spatenstich-import.v1.json",
  "title": "Spatenstich Import Payload v1",
  "description": "Datenkontrakt zwischen Claude.ai-Projekt und Spatenstich-App. Emittiert am Ende jeder Foto-Analyse-Session.",
  "type": "object",
  "required": ["schemaVersion", "capture"],
  "properties": {
    "schemaVersion": {
      "const": "spatenstich-import.v1",
      "description": "Versionierung: neue Version = neues Schema-File. v1 bleibt stabil."
    },
    "capture": {
      "type": "object",
      "required": ["timestamp"],
      "properties": {
        "timestamp": { "type": "string", "format": "date-time" },
        "location": {
          "type": "object",
          "required": ["lat", "lon"],
          "properties": {
            "lat": { "type": "number", "minimum": -90, "maximum": 90 },
            "lon": { "type": "number", "minimum": -180, "maximum": 180 }
          }
        },
        "photoRefs": { "type": "array", "items": { "type": "string" }, "description": "Dateiname-Hints, kein Payload" },
        "chatReference": { "type": "string", "format": "uri" }
      },
      "additionalProperties": false
    },
    "beds": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["localId", "label"],
        "properties": {
          "localId": { "type": "string" },
          "label": { "type": "string" },
          "approxDimensions": {
            "type": "object",
            "properties": {
              "lengthCm": { "type": "number", "minimum": 0 },
              "widthCm": { "type": "number", "minimum": 0 }
            }
          },
          "sunExposure": { "type": "string", "enum": ["full", "half", "shade", "mixed"] },
          "soilNotes": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    },
    "plants": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["localId"],
        "properties": {
          "localId": { "type": "string" },
          "bedRef": { "type": "string" },
          "scientificName": { "type": "string" },
          "commonNameDe": { "type": "string" },
          "stageEstimate": { "type": "string", "enum": ["seedling", "vegetative", "flowering", "fruiting", "senescent"] },
          "healthNotes": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    },
    "observations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["localId", "kind", "summary"],
        "properties": {
          "localId": { "type": "string" },
          "bedRef": { "type": "string" },
          "kind": { "type": "string", "enum": ["pest", "disease", "weather", "soil", "structural", "other"] },
          "summary": { "type": "string" },
          "suggestedActions": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "complianceFlags": {
      "type": "array",
      "description": "Optional — wird in Phase 10 angezeigt. v1 akzeptiert, ignoriert in UI.",
      "items": {
        "type": "object",
        "required": ["regulation", "status"],
        "properties": {
          "regulation": { "type": "string" },
          "status": { "type": "string", "enum": ["compliant", "warn", "violation"] },
          "note": { "type": "string" }
        }
      }
    },
    "freeFormNotes": {
      "type": "string",
      "description": "Markdown erlaubt, nicht validiert (D-12)."
    }
  },
  "additionalProperties": false
}
```

[CITED: docs/specs/M07-claude-ai-bridge.md — Enum-Werte und Struktur direkt aus Spec]

---

### AJV-Validierungsscript (Node.js)

```javascript
// scripts/validate-import-schema.js
// Validiert alle Referenz-Payloads gegen das v1-Schema
// Ausführen: node scripts/validate-import-schema.js

const Ajv2020 = require('./node_modules/ajv/dist/2020');
const addFormats = require('./node_modules/ajv-formats');
const path = require('path');
const fs = require('fs');

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);

const schema = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'schemas/spatenstich-import.v1.json'), 'utf8'
));
const validate = ajv.compile(schema);

const payloads = ['full', 'minimal', 'edge-cases'];
let allValid = true;

for (const name of payloads) {
  const payload = JSON.parse(fs.readFileSync(
    path.join(__dirname, `schemas/examples/${name}.json`), 'utf8'
  ));
  const valid = validate(payload);
  if (!valid) {
    console.error(`INVALID: ${name}.json`);
    console.error(validate.errors);
    allValid = false;
  } else {
    console.log(`VALID: ${name}.json`);
  }
}

if (!allValid) process.exit(1);
```

[ASSUMED — ajv-formats Verfügbarkeit im Projekt ungeprüft; AJV selbst ist vorhanden]

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Geändert | Impact für Phase 5 |
|--------------|-----------------|----------|--------------------|
| Claude Vision API in Edge Function | Keine In-App AI — alles über Claude.ai-Import | 2026-05-08 (Pivot M07) | Edge Functions komplett entfernen |
| pgmq-Queue für AI-Jobs | Keine Queue mehr | M07 | Queue löschen, Extension kann bleiben |
| photo_queue als Sync-Entity | Nicht mehr teil des Sync-Systems | M07 | Aus allen Adaptern entfernen |
| `FOUND-06`: AI-Keys nur server-seitig | Keine AI-Keys mehr nötig | M07 (superseded) | Env-Vars bereinigen |

---

## Assumptions Log

| # | Behauptung | Abschnitt | Risiko wenn falsch |
|---|-----------|-----------|-------------------|
| A1 | pgmq.drop_queue('ai_jobs', true) ist die korrekte API-Signatur | Migration Code Example | Migration würde fehlschlagen; Fallback: pgmq-Queue manuell via Dashboard löschen |
| A2 | ajv-formats ist im Projekt als Dependency vorhanden | AJV-Validierungsscript | `format: "date-time"` und `format: "uri"` werden nicht validiert; Problem: AJV ignoriert unbekannte Formate standardmäßig (kein Crash, aber keine Validierung) |
| A3 | `DimensionInput.tsx` und `ShapeSelector.tsx` werden nicht von Phase 7 (Plan-Editor) wiederverwendet | Entfernungsliste | Wenn Phase 7 diese braucht, müssten sie rekonstruiert werden; sicher prüfen vor Löschung |
| A4 | supabase/tests/ enthält enqueue_photo_analysis-Tests die gelöscht werden müssen | Entfernungsliste | Kein Build-Risiko (Supabase pgTAP-Tests sind separat), aber Test-Suite würde fehlschlagen |
| A5 | `vereinsregeln/upload.tsx` kann als einfacher Platzhalter neu geschrieben werden ohne Phase-6-Infra | vereinsregeln/upload.tsx Replacement | Phase 6 könnte andere Constraints haben; Minimalimplementierung ist sicher |

---

## Open Questions

1. **ajv-formats: vorhanden?**
   - Was wir wissen: AJV v8 ist in node_modules vorhanden
   - Unklar: Ob `ajv-formats` als separates Paket installiert ist
   - Empfehlung: `ls node_modules/ajv-formats` prüfen; falls nicht: entweder `npm install ajv-formats` im Projekt-Root oder format-Validierung im Script weglassen (AJV wirft keinen Fehler, ignoriert nur unbekannte Formate)

2. **DimensionInput.tsx / ShapeSelector.tsx für Phase 7 behalten?**
   - Was wir wissen: Beide wurden für Capture-Flow gebaut
   - Unklar: Ob Phase 7 (Plan-Editor mit Skia) diese generischen UI-Komponenten wiederverwenden kann
   - Empfehlung: Vor dem Löschen Phase-7-Plan konsultieren; im Zweifel: in einem separaten Commit löschen nach Phase-7-Plan-Review

3. **`pgmq.drop_queue` API-Signatur:**
   - Was wir wissen: Foundation-Migration nutzt `pgmq.create_queue()` Syntax
   - Unklar: Genaue Signatur von `drop_queue` (insbesondere purge-Parameter)
   - Empfehlung: `SELECT pgmq.drop_queue('ai_jobs');` ohne purge als safe default; oder manuell via Supabase Dashboard

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Schema-Validierungsscript | ja | v24.14.0 | — |
| AJV (node_modules/ajv) | Schema-Validierung | ja | ~8.x | — |
| Supabase CLI | Migration deployment | [ASSUMED] | — | Supabase Dashboard |
| ajv-formats | format: date-time, uri | ungeprüft | — | Ohne Formats; AJV ignoriert unbekannte Formate |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + jest-expo ~53.0.0 |
| Config file | `app/package.json` (jest-expo preset) |
| Quick run command | `cd app && pnpm test -- --passWithNoTests` |
| Full suite command | `cd app && pnpm test` |

### Phase Requirements → Test Map

| Req ID | Verhalten | Test-Typ | Automated Command | Datei vorhanden? |
|--------|----------|----------|-------------------|-----------------|
| REMOVE-01 | Keine `anthropic\|plantnet\|vision`-Imports in src/ | grep-Smoke | `grep -ri "anthropic\|plantnet\|vision" app/src/ app/app/` | ❌ Wave 0 (grep-Script oder CI-Step) |
| REMOVE-02 | Keine AI-Env-Vars in .env.example | grep-Smoke | `grep -i "anthropic\|plantnet\|claude_api" app/.env.example` | ❌ Wave 0 |
| REMOVE-03 | README ohne AI-Call-Sprache | Manual | — | Manual only |
| IMPORT-01 | Schema ist valides JSON Schema draft 2020-12 | node-Script | `node scripts/validate-import-schema.js` | ❌ Wave 0 |
| IMPORT-02 | Alle 3 Payloads validieren gegen Schema | node-Script | `node scripts/validate-import-schema.js` | ❌ Wave 0 |

### Sampling Rate
- **Pro Task-Commit:** `cd app && pnpm test -- --passWithNoTests`
- **Pro Wave-Merge:** Volle Test-Suite + `node scripts/validate-import-schema.js`
- **Phase Gate:** Volle Suite grün + `grep -ri "anthropic|plantnet" app/src app/app` = 0 Treffer

### Wave 0 Gaps
- [ ] `scripts/validate-import-schema.js` — IMPORT-01, IMPORT-02
- [ ] `schemas/` Verzeichnis anlegen
- [ ] `schemas/examples/` Verzeichnis anlegen
- [ ] Verify: `ls node_modules/ajv-formats` — ajv-formats Verfügbarkeit

---

## Security Domain

> security_enforcement nicht explizit deaktiviert in config.json — Abschnitt inkludiert.

### Applicable ASVS Categories

| ASVS Kategorie | Betrifft Phase 5 | Kontrolle |
|----------------|-----------------|-----------|
| V2 Authentication | nein — keine Auth-Änderungen | — |
| V3 Session Management | nein | — |
| V4 Access Control | ja — DB-Tabellen-DROP und RLS-Policy-Entfernung | Migration explizit DROP POLICY + DROP TABLE |
| V5 Input Validation | nein — kein User-Input in Phase 5 | — |
| V6 Cryptography | nein | — |

### Threat Patterns

| Pattern | STRIDE | Mitigierung in Phase 5 |
|---------|--------|------------------------|
| Verbleibende AI-API-Keys in Supabase Secrets | Information Disclosure | CLAUDE_API_KEY manuell über `supabase secrets unset` entfernen |
| Alte RLS-Policies auf gelöschten Tabellen | Elevation of Privilege | DROP TABLE CASCADE entfernt Policies automatisch — explizit dokumentieren |
| ai_jobs/ai_results-Rows mit user_id-Daten | Privacy | DROP TABLE entfernt alle Rows — kein Datenverlust-Risiko (nie produktiv genutzt) |

---

## Quellen

### Primary (HIGH confidence)
- `docs/specs/M07-claude-ai-bridge.md` — Vollständige Pivot-Spezifikation, Datenkontrakt, Enum-Werte
- `.planning/phases/05-ai-removal-import-schema/05-CONTEXT.md` — Alle Entscheidungen D-01 bis D-14
- Codebase-Inspektion (direkt gelesen): `ai-job-consumer/index.ts`, `SyncWorker.ts`, `SyncTriggers.ts`, `gardenPlanRepo.ts`, `PhotoUploader.ts`, `index.tsx`, `_layout.tsx`, `de.json`, `supabase/config.toml`, `entities.ts`, `supabase.ts`, `database.ts`, alle Migrations

### Secondary (MEDIUM confidence)
- `node_modules/ajv` — AJV v8 Verfügbarkeit verifiziert durch `ls`

### Tertiary (LOW confidence)
- AJV draft 2020-12 Import-Syntax (`ajv/dist/2020`) — aus AJV-Dokumentation bekannt, nicht durch Ausführung verifiziert
- pgmq `drop_queue`-API-Signatur — aus Foundation-Migration-Pattern abgeleitet

---

## Metadata

**Confidence breakdown:**
- Entfernungsliste: HIGH — direkt aus Codebase-Inspektion
- Cross-References: HIGH — alle Importpfade geprüft
- JSON Schema Struktur: HIGH — direkt aus M07-Spec abgeleitet
- AJV-Validierungsscript: MEDIUM — API-Pattern bekannt, nicht ausgeführt
- Migration SQL: MEDIUM — pgmq drop_queue Signatur angenommen

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (stabile Entfernungsphase, kein fast-moving Ökosystem)
