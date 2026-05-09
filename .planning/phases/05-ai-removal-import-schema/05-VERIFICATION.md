---
phase: 05-ai-removal-import-schema
verified: 2026-05-09T08:30:00Z
status: gaps_found
score: 4/5 success criteria verified
overrides_applied: 0
gaps:
  - truth: "Alle KI-bezogenen Env-Vars entfernt (REMOVE-02)"
    status: partial
    reason: "supabase/functions/.env.example enthaelt noch 'CLAUDE_API_KEY=' auf Zeile 5. app/.env.example ist sauber, aber das functions-spezifische .env.example wurde im Plan-Scope ausgelassen."
    artifacts:
      - path: "supabase/functions/.env.example"
        issue: "Zeile 5: CLAUDE_API_KEY= — AI-Env-Var-Referenz nach Edge-Function-Loeschung nicht bereinigt"
      - path: "packages/shared/src/constants/queues.ts"
        issue: "Exportiert QUEUES = { AI_JOBS: 'ai_jobs' } — AI-Job-Queue-Konstante, wird nicht mehr verwendet, aber re-exportiert via packages/shared/src/index.ts"
    missing:
      - "supabase/functions/.env.example bereinigen: CLAUDE_API_KEY= Zeile entfernen (oder gesamte Datei loeschen, da beide Edge Functions geloescht wurden)"
      - "packages/shared/src/constants/queues.ts loeschen (AI_JOBS-Konstante ohne Nutzer) und Re-Export aus index.ts entfernen"
human_verification:
  - test: "App-Build gruene TypeScript-Pruefung verifizieren"
    expected: "cd app && npx tsc --noEmit gibt exit 0 aus"
    why_human: "Build-Ausfuehrung erfordert komplette Node/pnpm-Umgebung; kann nicht im Verifier-Kontext sicher ausgefuehrt werden"
  - test: "Zero outbound AI-Netzwerk-Calls im laufenden App-Build"
    expected: "Keine ausgehenden Verbindungen zu api.anthropic.com, plant.id, oder aehnlichen KI-APIs beim App-Start und normaler Nutzung"
    why_human: "Netzwerk-Behavior erfordert echten App-Run auf Geraet oder Simulator"
---

# Phase 5: AI-Removal + Import-Schema Verification Report

**Phase Goal:** Zero AI-API-Aufrufe aus der App. Alle Claude Vision / Pl@ntNet Clients, Edge Functions, Env-Vars, Screens und Tests entfernt. Import-Schema `spatenstich-import.v1` als JSON Schema (draft 2020-12) definiert und mit Referenz-Payloads validiert.
**Verified:** 2026-05-09T08:30:00Z
**Status:** gaps_found
**Re-verification:** Nein — initiale Verifikation

---

## Ziel-Erreichung

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidenz |
|---|-------|--------|---------|
| SC-1 | `grep -ri "anthropic\|plantnet\|vision" src/` gibt keine funktionalen Code-Treffer zurueck | PARTIAL | app/src/ und app/app/ sind sauber. Jedoch: `supabase/functions/.env.example` enthaelt `CLAUDE_API_KEY=` (Zeile 5). `packages/shared/src/constants/queues.ts` exportiert `QUEUES = { AI_JOBS: 'ai_jobs' }` (unused). Beide sind AI-Relikte ohne Bereinigung. |
| SC-2 | App baut und shipped gruen auf iOS + Android; null ausgehende Netzwerk-Calls jenseits Supabase + Expo | HUMAN NEEDED | TypeScript-Typen sind sauber (basierend auf Code-Review); tatsaechlicher Build und Netzwerk-Behavior benoetigt Human-Verifikation |
| SC-3 | `schemas/spatenstich-import.v1.json` existiert als valides JSON Schema (draft 2020-12) | VERIFIED | Datei existiert. Enthaelt `"$schema": "https://json-schema.org/draft/2020-12/schema"`, `"const": "spatenstich-import.v1"`, alle Pflichtfelder (beds, plants, observations, complianceFlags, freeFormNotes), `additionalProperties: false` auf allen Ebenen. |
| SC-4 | Drei Referenz-Payloads (full.json, minimal.json, edge-cases.json) validieren alle gegen Schema | VERIFIED | `node scripts/validate-import-schema.js` ausgefuehrt: "VALID: full.json", "VALID: minimal.json", "VALID: edge-cases.json", exit 0. |
| SC-5 | Onboarding, README und Privacy Policy von AI-Call-Sprache bereinigt | VERIFIED | README: kein "Pl@ntNet", "Claude Vision", "Claude API" gefunden. app/app/(app)/settings/privacy.tsx: keine AI-Call-Sprache. de.json: kein "capture"-Block. |

**Score:** 3/5 Truths vollstaendig verified (SC-3, SC-4, SC-5); SC-1 partial; SC-2 human-needed

---

### Artifacts: Plan 01 (Backend-Bereinigung)

| Artifact | Erwartet | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260509000015_remove_ai_tables.sql` | DROP TABLE ai_results, ai_jobs, pgmq queue | VERIFIED | Existiert, enthaelt DROP POLICY + DROP TABLE IF EXISTS public.ai_results CASCADE + DROP TABLE IF EXISTS public.ai_jobs CASCADE + pgmq.drop_queue + Invariant-Assertion |
| `packages/shared/src/types/entities.ts` | Bereinigt: keine photo_queue, PhotoQueueRow, PlanElementCandidate, aiResultId | VERIFIED | EntityName hat 7 Members (ohne photo_queue), PlanElementRow ohne aiResultId, PlanElementCandidate entfernt, AnyRow ohne PhotoQueueRow |
| `packages/shared/src/types/database.ts` | Keine ai_jobs, ai_results Definitionen | VERIFIED | grep Treffer: 0 |
| `packages/shared/src/types/supabase.ts` | Keine ai_jobs, ai_results, photo_queue Definitionen | VERIFIED | grep Treffer: 0 |
| `supabase/functions/ai-job-consumer/` | Geloescht | VERIFIED | Verzeichnis existiert nicht |
| `supabase/functions/extract-vereinsregeln/` | Geloescht | VERIFIED | Verzeichnis existiert nicht |
| `supabase/config.toml` | Keine ai-job-consumer / extract-vereinsregeln Eintraege | VERIFIED | grep Treffer: 0 |
| `supabase/tests/enqueue_photo_analysis.sql` | Geloescht | VERIFIED | Datei existiert nicht |
| `supabase/tests/photo-queue-rls.test.sql` | Geloescht | VERIFIED | Datei existiert nicht |

### Artifacts: Plan 02 (App-Level Bereinigung)

| Artifact | Erwartet | Status | Details |
|----------|----------|--------|---------|
| `app/app/(app)/capture/` | Geloescht | VERIFIED | Verzeichnis existiert nicht |
| `app/app/(app)/index.tsx` | Keine Camera-Imports, keine Capture-Navigation | VERIFIED | Kein "Camera", kein "capture", kein "step-overview" in index.tsx |
| `app/app/(app)/profile/vereinsregeln/upload.tsx` | Platzhalter-Screen ohne AI-Extraktion | VERIFIED | Nur React/View/Text/Pressable/useRouter; "Manuell eingeben" Button vorhanden; kein extractVereinsregeln, kein ExtractionLoader |
| `packages/shared/src/i18n/de.json` | Kein "capture"-Block | VERIFIED | grep Treffer fuer "capture" als Top-Level-Key: 0 |
| `app/src/lib/photos/PhotoUploader.ts` | Geloescht | VERIFIED | Datei existiert nicht (Verzeichnis enthaelt noch exifStrip-Dateien, die nicht AI-bezogen sind) |
| `app/src/lib/photos/photoQueueRepo.ts` | Geloescht | VERIFIED | Datei existiert nicht |
| `app/src/lib/extractVereinsregeln.ts` | Geloescht | VERIFIED | Datei existiert nicht |
| `app/src/lib/enqueueAiJob.ts` | Geloescht | VERIFIED | Datei existiert nicht |
| `app/src/lib/uploadVereinsregelPdf.ts` | Geloescht | VERIFIED | Datei existiert nicht |
| `app/src/lib/sync/SyncWorker.ts` | Kein photo_queue case, kein pushPhotoQueue | VERIFIED | grep Treffer: 0 fuer photo_queue und pushPhotoQueue |
| `app/src/lib/sync/SyncTriggers.ts` | Kein uploadPending | VERIFIED | grep Treffer: 0 |
| `app/src/storage/SqliteAdapter.ts` | Kein photo_queue | VERIFIED | grep Treffer: 0 |
| `app/src/storage/IndexedDbAdapter.ts` | Kein photo_queue | VERIFIED | grep Treffer: 0 |
| `app/src/components/AnalysisLoader.tsx` | Geloescht | VERIFIED | Datei existiert nicht |
| `app/src/components/ConfidenceBadge.tsx` | Geloescht | VERIFIED | Datei existiert nicht |
| `app/src/components/ExtractionLoader.tsx` | Geloescht | VERIFIED | Datei existiert nicht |
| `supabase/functions/.env.example` | NICHT in Plan adressiert | GAP | Enthaelt noch `CLAUDE_API_KEY=` auf Zeile 5 — AI-Env-Var nicht bereinigt |

### Artifacts: Plan 03 (Import-Schema)

| Artifact | Erwartet | Status | Details |
|----------|----------|--------|---------|
| `schemas/spatenstich-import.v1.json` | JSON Schema draft 2020-12 | VERIFIED | Existiert, `"$schema": "https://json-schema.org/draft/2020-12/schema"`, alle Properties vorhanden |
| `schemas/examples/full.json` | Alle Felder belegt, schemaVersion korrekt | VERIFIED | Enthaelt "schemaVersion": "spatenstich-import.v1", 2 Beete, 2 Pflanzen, 1 Beobachtung, 1 Compliance-Flag |
| `schemas/examples/minimal.json` | Nur Pflichtfelder | VERIFIED | Enthaelt "schemaVersion": "spatenstich-import.v1", nur capture + 1 Beet |
| `schemas/examples/edge-cases.json` | Niedrige Confidence, fehlende optionale Felder | VERIFIED | Enthaelt "schemaVersion": "spatenstich-import.v1", Confidence 0.28-0.55, strukturelle Beobachtung |
| `scripts/validate-import-schema.js` | AJV-Validierungsscript | VERIFIED | Existiert, enthaelt "ajv/dist/2020", referenziert spatenstich-import.v1.json, alle 3 Payloads validieren |

---

### Key Link Verifikation

| Von | Nach | Via | Status | Details |
|-----|------|-----|--------|---------|
| `scripts/validate-import-schema.js` | `schemas/spatenstich-import.v1.json` | readFileSync | WIRED | Zeile 13: `path.join(__dirname, '..', 'schemas', 'spatenstich-import.v1.json')` |
| `schemas/examples/full.json` | `schemas/spatenstich-import.v1.json` | schemaVersion const | WIRED | "schemaVersion": "spatenstich-import.v1" vorhanden, AJV validiert erfolgreich |
| `app/src/lib/sync/SyncWorker.ts` | `packages/shared/src/types/entities.ts` | EntityName import | WIRED | Import `EntityName` ohne photo_queue gefunden |
| `app/src/storage/SqliteAdapter.ts` | `packages/shared/src/types/entities.ts` | EntityName import | WIRED | Kein photo_queue in Adapter-Maps |

---

### Data-Flow Trace (Level 4)

| Artifact | Data-Variable | Quelle | Produziert echte Daten | Status |
|----------|--------------|--------|------------------------|--------|
| `app/app/(app)/index.tsx` | `elements`, `dimensions` | `loadAcceptedElements()`, `loadDimensions()` via gardenPlanRepo | Ja — liest aus SQLite/IndexedDB via Repo-Layer | FLOWING |
| `scripts/validate-import-schema.js` | Payload-Daten | `fs.readFileSync` auf schemas/examples/ | Ja — echte JSON-Dateien | FLOWING |

---

### Behavioral Spot-Checks

| Verhalten | Befehl | Ergebnis | Status |
|-----------|--------|---------|--------|
| Schema-Validierung laeuft fehlerfrei | `node scripts/validate-import-schema.js` | "VALID: full.json", "VALID: minimal.json", "VALID: edge-cases.json" — exit 0 | PASS |
| Capture-Verzeichnis nicht vorhanden | `test ! -d app/app/(app)/capture` | Verzeichnis existiert nicht | PASS |
| config.toml ohne AI-Functions | `grep -q 'ai-job-consumer' supabase/config.toml` | Kein Treffer | PASS |
| entities.ts ohne photo_queue | `grep -q 'photo_queue' packages/shared/src/types/entities.ts` | Kein Treffer | PASS |
| TypeScript-Build | `cd app && npx tsc --noEmit` | NICHT AUSGEFUEHRT (requires full env) | SKIP |

---

### Anforderungs-Abdeckung

| Anforderung | Quell-Plan | Beschreibung | Status | Evidenz |
|-------------|-----------|-------------|--------|---------|
| REMOVE-01 | 05-01, 05-02 | Alle Claude Vision / Anthropic SDK Clients, Edge Functions, Screens entfernt | SATISFIED | ai-job-consumer und extract-vereinsregeln geloescht; alle Capture-Screens geloescht; kein anthropic/plantnet in app/src oder app/app |
| REMOVE-02 | 05-01, 05-02 | Alle KI-bezogenen Env-Vars entfernt | PARTIAL | app/.env.example sauber; app/.env sauber; supabase/functions/.env.example enthaelt noch CLAUDE_API_KEY= |
| REMOVE-03 | 05-02 | Onboarding, README, Privacy Policy von AI-Call-Sprache bereinigt | SATISFIED | README ohne Pl@ntNet/Claude Vision; privacy.tsx ohne AI-Call-Sprache; de.json ohne capture-Block |
| IMPORT-01 | 05-03 | JSON-Schema spatenstich-import.v1.json (draft 2020-12) definiert | SATISFIED | Datei existiert, valides JSON Schema draft 2020-12, REQUIREMENTS.md markiert als [x] Complete |
| IMPORT-02 | 05-03 | Drei Referenz-Payloads validieren gegen Schema | SATISFIED | AJV-Validierung: alle 3 VALID, REQUIREMENTS.md markiert als [x] Complete |

---

### Anti-Pattern-Analyse

| Datei | Zeile | Muster | Schwere | Auswirkung |
|-------|-------|--------|---------|------------|
| `supabase/functions/.env.example` | 5 | `CLAUDE_API_KEY=` — AI-Env-Var-Referenz | BLOCKER | REMOVE-02 nicht vollstaendig erfuellt; Edge Functions sind geloescht, aber Env-Var-Template bleibt |
| `packages/shared/src/constants/queues.ts` | 1-2 | `QUEUES = { AI_JOBS: 'ai_jobs' }` — AI-Queue-Konstante | WARNING | Wird nirgendwo in App oder Edge Functions genutzt; re-exportiert via index.ts aber toter Code; kein laufzeitkritischer Pfad |
| `app/src/lib/mappers/rowMappers.ts` | 6 | Kommentar referenziert "photo_queue-Tabelle" | INFO | Nur historischer Kommentar, kein funktionaler Code; nicht bereinigt aber harmlos |

---

### Human-Verifikation erforderlich

#### 1. TypeScript-Build: Null-Fehler bestaetigen

**Test:** `cd app && npx tsc --noEmit` ausfuehren
**Erwartet:** Exit 0, keine TypeScript-Fehler
**Warum Human:** Build-Ausfuehrung benoetigt vollstaendige Node/pnpm-Umgebung mit installierten Dependencies; kann nicht sicher im Verifier-Kontext ausgefuehrt werden

#### 2. Zero Outbound AI-API-Calls im App-Run

**Test:** App auf iOS Simulator oder echtem Geraet starten, Netzwerk-Traffic monitoren (z.B. Charles Proxy)
**Erwartet:** Keine ausgehenden Verbindungen zu api.anthropic.com, plant.id, replicate.com oder aehnlichen KI-APIs bei normalem App-Betrieb
**Warum Human:** Netzwerk-Behavior erfordert echten App-Run; grep-basierte Verifikation zeigt kein anthropic/plantnet in Code, aber laufzeit-dynamische Importe koennen nicht vollstaendig ausgeschlossen werden

---

### Gaps-Zusammenfassung

**2 Gaps identifiziert:**

**Gap 1 (Blocker):** `supabase/functions/.env.example` enthaelt noch `CLAUDE_API_KEY=` auf Zeile 5. Die beiden Edge Functions (`ai-job-consumer`, `extract-vereinsregeln`) wurden korrekt geloescht, aber ihr zugehoeriges `.env.example`-Template-File wurde nicht bereinigt. REMOVE-02 ("Alle KI-bezogenen Env-Vars entfernt") ist damit nicht vollstaendig erfuellt. Da die gesamte `supabase/functions/`-Struktur jetzt nur noch `_shared/` enthaelt, koennte das `.env.example` entweder geloescht oder auf Supabase-Non-AI-Secrets reduziert werden.

**Gap 2 (Warning):** `packages/shared/src/constants/queues.ts` exportiert `QUEUES = { AI_JOBS: 'ai_jobs' }` und wird via `packages/shared/src/index.ts` re-exportiert. Diese Konstante ist ein AI-Relikt aus der Phase-1/Phase-3-Infrastruktur (pgmq ai_jobs Queue). Sie wird nirgendwo im App-Code oder in den verbleibenden Supabase-Functions verwendet. Die Konstante ist toter Code, der den Eindruck erweckt, AI-Job-Queueing sei noch aktiv. Da der Plan REMOVE-01/REMOVE-02 auf "alle" AI-Relikte abzielt, ist dies ein unvollstaendiges Cleanup.

---

*Verified: 2026-05-09T08:30:00Z*
*Verifier: Claude (gsd-verifier)*
