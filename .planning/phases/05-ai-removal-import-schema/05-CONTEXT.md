# Phase 5: AI-Removal + Import-Schema - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Zwei Arbeitsbereiche:
1. **AI-Removal (M07.1):** Alle In-App-AI-Clients, Edge Functions, Env-Vars, Screens, Tests und DB-Tabellen entfernen. Nach Phase 5 macht die App null ausgehende KI-API-Aufrufe.
2. **Import-Schema (M07.2):** JSON-Schema `spatenstich-import.v1.json` (draft 2020-12) definieren und mit Referenz-Payloads validieren. Das Schema ist der Datenkontrakt zwischen Claude.ai-Projekt und App.

Nicht im Scope: Import-UI (Phase 6), Plan-Editor (Phase 7), Claude.ai-System-Prompt (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Vereinsregeln-Edge-Function (extract-vereinsregeln)
- **D-01:** Edge Function `extract-vereinsregeln` wird **komplett entfernt** (nicht nur deaktiviert). Inklusive Client-Lib `app/src/lib/extractVereinsregeln.ts`, Deno-Deps, Tests. Grund: Phase 10 (v1.1) wird Vereinsregeln-Extraktion über Claude.ai-Import lösen (gleicher Weg wie Gartenanalyse), nicht über eigene Edge Function mit Anthropic SDK.
- **D-02:** Das Import-Schema `spatenstich-import.v1` wird in Phase 10 um einen `vereinsregeln`-Block erweitert. Dieser Block ist NICHT Teil von Phase 5.

### DB-Tabellen & Migrationen
- **D-03:** Tabellen `ai_jobs`, `ai_results` und die pgmq-Queue werden per **neuer Supabase-Migration gelöscht** (DROP TABLE). Kein TRUNCATE, kein Behalten. Phase 4 war nie human-verified, kein Datenverlust.
- **D-04:** Phase-3-Entscheidung D-02 (Sync-Entity-Scope) wird aktualisiert: `ai_jobs` und `ai_results` werden aus dem Entity-Scope entfernt. Lokale SQLite-Tabellen für diese Entities werden ebenfalls gelöscht (falls angelegt).
- **D-05:** `pgmq`-Extension kann in Supabase bleiben (harmlos), aber die Queue selbst wird gelöscht. Falls pgmq keine anderen Nutzer hat, Extension ebenfalls entfernen.

### AI-Code-Entfernung (Scope)
- **D-06:** Folgende Dateien/Verzeichnisse werden komplett gelöscht:
  - `supabase/functions/ai-job-consumer/` (komplette Edge Function)
  - `supabase/functions/extract-vereinsregeln/` (komplette Edge Function)
  - `app/app/(app)/capture/` (alle 9 Screens + Layout)
  - `app/src/lib/photoResizer.ts`
  - `app/src/lib/extractVereinsregeln.ts`
  - `app/src/components/AnalysisLoader.tsx`
- **D-07:** `supabase/config.toml` — Einträge `[functions.ai-job-consumer]` und `[functions.extract-vereinsregeln]` entfernen.
- **D-08:** `app/src/lib/gardenPlanRepo.ts` — AI-bezogene Teile entfernen; Datei bleibt falls sie Plan-Rendering-Logik enthält die Phase 7 braucht.
- **D-09:** `packages/shared/src/types/entities.ts` — AI-bezogene Type-Definitionen entfernen (AiJob, AiResult, etc.).
- **D-10:** Capture-Route komplett entfernen, kein Platzhalter, kein Redirect. Home-Screen zeigt keinen Capture-Button mehr. Phase 6 fügt Import-Screen hinzu, Phase 7 den Editor.

### Import-Schema
- **D-11:** `complianceFlags` im v1-Schema **behalten** (als optional). Claude.ai kann sie bereits emittieren; App zeigt sie in Phase 5 noch nicht an. Phase 10 aktiviert die Anzeige. Vorwärtskompatibel.
- **D-12:** `freeFormNotes` als **Plain String** (Markdown erlaubt, aber nicht validiert). Keine Strukturierung, keine Kategorie-Tags. App rendert als Markdown.
- **D-13:** Schema-Versionierung: **Neue Version = neues Schema-File** (`spatenstich-import.v2.json`). v1 bleibt stabil und wird nie gebrochen. App kann mehrere Versionen parallel akzeptieren und intern konvertieren.
- **D-14:** Schema-Datei liegt in `schemas/spatenstich-import.v1.json`. Drei Referenz-Payloads in `schemas/examples/` (`full.json`, `minimal.json`, `edge-cases.json`).

### Claude's Discretion
- Migration-Reihenfolge und Abhängigkeiten zwischen DROP-Statements
- Ob `gardenPlanRepo.ts` teilweise erhalten bleibt oder komplett gelöscht wird (abhängig von Code-Analyse)
- Cleanup von i18n-Strings (`de.json`) die nur für Capture-Flow existierten
- Bereinigung von Navigation/Routing nach Entfernung der Capture-Screens

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pivot-Spezifikation
- `docs/specs/M07-claude-ai-bridge.md` — Definiert den kompletten Pivot: Workflow, Constraints, Datenkontrakt `spatenstich-import.v1` mit Schema-Beispiel. Hauptreferenz für Import-Schema-Design.

### Requirements
- `.planning/REQUIREMENTS.md` §AI-Removal (REMOVE-01, REMOVE-02, REMOVE-03) — Acceptance Criteria für Code-Entfernung
- `.planning/REQUIREMENTS.md` §Import-Schema (IMPORT-01, IMPORT-02) — Acceptance Criteria für Schema-Definition

### Prior Phase Context
- `.planning/phases/03-offline-sync-2-user-shared-state/03-CONTEXT.md` §D-02 — Sync-Entity-Scope, muss aktualisiert werden (ai_jobs/ai_results entfernen)

### Bestehender AI-Code (Entfernungsziele)
- `supabase/functions/ai-job-consumer/index.ts` — Anthropic SDK Edge Function
- `supabase/functions/extract-vereinsregeln/index.ts` — Anthropic SDK Edge Function
- `app/app/(app)/capture/` — 9 Capture-Screens
- `app/src/lib/photoResizer.ts` — Client-side Foto-Resize für Vision API
- `app/src/lib/extractVereinsregeln.ts` — Client-Lib für Vereinsregeln-Extraktion
- `app/src/components/AnalysisLoader.tsx` — Loading-Komponente für AI-Analyse

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/shared/src/types/entities.ts` — Typ-Definitionen, muss bereinigt werden aber Grundstruktur bleibt
- `supabase/functions/_shared/` — Shared Edge Function utilities, bleiben erhalten
- `schemas/` — Verzeichnis existiert noch nicht, wird angelegt

### Established Patterns
- Supabase-Migrationen: sequentiell nummeriert in `supabase/migrations/`
- Edge Functions: eigenes Verzeichnis pro Function mit `deno.json` + `index.ts`
- RLS-Policies: member-check Pattern aus Phase 2.5
- Feature-Flags: Supabase-Tabelle `feature_flags` mit `useFlag()` Hook

### Integration Points
- Home-Screen (`app/app/(app)/index.tsx`) — Capture-Button entfernen
- App-Layout (`app/app/_layout.tsx`) — Capture-Route entfernen
- Navigation/Routing — Expo Router file-based, Verzeichnis-Löschung entfernt Route automatisch
- `supabase/config.toml` — Edge Function Registrierung

</code_context>

<specifics>
## Specific Ideas

- **Vereinsregeln Phase 10:** Wird über Claude.ai-Import gelöst (gleicher Weg wie Gartenanalyse). Import-Schema bekommt dann einen `vereinsregeln`-Block. Keine eigene Edge Function.
- **Schema-Design:** M07-Spec (`docs/specs/M07-claude-ai-bridge.md`) enthält bereits das vollständige Schema-Beispiel. Phase 5 formalisiert das als JSON Schema (draft 2020-12).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-ai-removal-import-schema*
*Context gathered: 2026-05-09*
