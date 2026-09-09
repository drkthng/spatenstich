---
phase: 05-ai-removal-import-schema
plan: "03"
subsystem: import-schema
tags: [schema, json-schema, ajv, supabase, migration, data-contract]
dependency_graph:
  requires: [05-01]
  provides: [spatenstich-import.v1-schema, migration-015-applied]
  affects: [phase-06-import-flow]
tech_stack:
  added: [ajv/dist/2020, ajv-formats]
  patterns: [JSON Schema draft 2020-12, AJV validation, DB migration push]
key_files:
  created:
    - schemas/spatenstich-import.v1.json
    - schemas/examples/full.json
    - schemas/examples/minimal.json
    - schemas/examples/edge-cases.json
    - scripts/validate-import-schema.js
  modified: []
decisions:
  - "JSON Schema draft 2020-12 gewaehlt (nicht draft-07): Zukunftssicher, AJV 8.x unterstuetzt es nativ"
  - "additionalProperties: false auf allen Ebenen: Strikter Kontrakt verhindert stilles Schema-Drift"
  - "sunExposure enum: 'half' (nicht 'halfShade' wie in M07-Spec-Example): Plan-Interface ist massgeblich, Spec-Kommentar war Entwurf"
metrics:
  duration_seconds: 168
  completed_date: "2026-05-09"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
requirements:
  - IMPORT-01
  - IMPORT-02
---

# Phase 05 Plan 03: Import-Schema + DB Migration 015 Summary

**One-liner:** JSON Schema draft 2020-12 fuer `spatenstich-import.v1` mit 3 AJV-validierten Referenz-Payloads + Migration 015 (DROP ai_jobs/ai_results) auf Supabase gepusht.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | JSON Schema + Referenz-Payloads + Validierungsscript | 0f33421 | 5 created |
| 2 | Supabase DB Push Migration 015 | (inline, no separate commit) | DB-only |

## What Was Built

### Task 1: spatenstich-import.v1 JSON Schema

`schemas/spatenstich-import.v1.json` — vollstaendiges JSON Schema draft 2020-12:
- Pflichtfelder: `schemaVersion` (const: "spatenstich-import.v1"), `capture.timestamp`
- Optionale Top-Level-Arrays: `beds`, `plants`, `observations`, `complianceFlags`, `freeFormNotes`
- Alle Enums korrekt: `sunExposure` (full/half/shade/mixed), `stageEstimate` (seedling/vegetative/flowering/fruiting/senescent), `kind` (pest/disease/weather/soil/structural/other), `status` (compliant/warn/violation)
- `additionalProperties: false` auf allen Ebenen — strikter Kontrakt

Drei Referenz-Payloads:
- `schemas/examples/full.json` — alle Felder belegt, 2 Beete, 2 Pflanzen, 1 Beobachtung, 1 Compliance-Flag
- `schemas/examples/minimal.json` — nur Pflichtfelder + 1 Beet (Pflichtfelder-Test)
- `schemas/examples/edge-cases.json` — niedrige Confidence (0.28-0.55), fehlende optionale Felder, strukturelle Beobachtung ohne bedRef, Compliance-Warnung

`scripts/validate-import-schema.js` — AJV 8.x mit ajv/dist/2020 + ajv-formats. Alle 3 Payloads VALID bestaetigt.

### Task 2: Supabase DB Push Migration 015

Migration `20260509000015_remove_ai_tables.sql` (erstellt in Plan 01) erfolgreich auf Remote-DB gepusht:
- `ai_jobs` Tabelle gedropt (inkl. RLS-Policies, CASCADE auf plan_elements FK)
- `ai_results` Tabelle gedropt
- pgmq-Queue `ai_analysis` entfernt (mit deprecation-NOTICE fuer altes API)
- Pruefung: `NOTICE: phase5 migration ok: ai_jobs + ai_results + pgmq queue removed`

## Deviations from Plan

### Schema-Abweichung: sunExposure Enum

**Gefunden waehrend:** Task 1, Vergleich M07-Spec vs. Plan-Schema
**Issue:** M07-claude-ai-bridge.md zeigt im Kommentar `"halfShade"` als Enum-Wert. Der Plan-PLAN.md definiert dagegen explizit `"half"`. Beides ist inkompatibel.
**Fix:** Plan-PLAN.md ist massgeblich (er formalisiert den Kontrakt). `"half"` gewaehlt. Kein `"halfShade"`.
**Auswirkung:** Claude.ai-Projekt-Prompt muss `"half"` verwenden, nicht `"halfShade"`. Wird in M07.3 (Prompt-Authoring) beachtet.

### DB Push: Interaktive Bestaetigung ohne Token

**Gefunden waehrend:** Task 2
**Issue:** `supabase db push --linked` fragte interaktiv nach Bestaetigung (Y/n). SUPABASE_ACCESS_TOKEN nicht gesetzt.
**Fix:** Bestaetigung wurde erteilt. Push lief erfolgreich durch (kein Token erforderlich wenn supabase CLI bereits eingeloggt ist via `supabase login`).
**Ergebnis:** Migration 015 angewendet, keine Fehler.

## Verification Results

```
node scripts/validate-import-schema.js
VALID: full.json
VALID: minimal.json
VALID: edge-cases.json

All payloads valid against spatenstich-import.v1 schema.
```

DB Push:
```
Applying migration 20260509000015_remove_ai_tables.sql...
NOTICE: phase5 migration ok: ai_jobs + ai_results + pgmq queue removed
Finished supabase db push.
```

## Known Stubs

Keine. Schema ist vollstaendig definiert und durch Beispiel-Payloads belegt.

## Threat Flags

Keine neuen Security-Surfaces eingeführt. Migration 015 entfernt (nicht fügt hinzu) Surface.
T-05-08 (Denial of Service: DB Push failure) — mitigiert: IF EXISTS Guards in Migration vorhanden.

## Self-Check: PASSED

- [x] schemas/spatenstich-import.v1.json existiert
- [x] schemas/examples/full.json existiert und enthaelt "spatenstich-import.v1"
- [x] schemas/examples/minimal.json existiert und enthaelt "spatenstich-import.v1"
- [x] schemas/examples/edge-cases.json existiert und enthaelt "spatenstich-import.v1"
- [x] scripts/validate-import-schema.js existiert und enthaelt "ajv/dist/2020"
- [x] Commit 0f33421 existiert
- [x] node scripts/validate-import-schema.js → alle VALID, exit 0
- [x] Migration 015 auf Supabase-DB gepusht (bestaetigt via CLI output)
