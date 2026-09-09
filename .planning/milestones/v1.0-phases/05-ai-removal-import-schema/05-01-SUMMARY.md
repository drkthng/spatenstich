---
phase: 05-ai-removal-import-schema
plan: "01"
subsystem: backend
tags: [cleanup, migration, types, ai-removal]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/20260509000015_remove_ai_tables.sql
    - packages/shared/src/types/entities.ts (bereinigt)
    - packages/shared/src/types/database.ts (bereinigt)
    - packages/shared/src/types/supabase.ts (bereinigt)
  affects:
    - Wave 2 App-Code-Bereinigung (TypeScript-Abhängigkeiten aufgelöst)
tech_stack:
  added: []
  patterns:
    - Migration mit expliziten DROP POLICY vor DROP TABLE (Defense-in-depth)
    - pgmq.drop_queue mit purge=true für pending messages
    - Post-migration DO $$ Invariant-Assertions
key_files:
  created:
    - supabase/migrations/20260509000015_remove_ai_tables.sql
  modified:
    - packages/shared/src/types/entities.ts
    - packages/shared/src/types/database.ts
    - packages/shared/src/types/supabase.ts
  deleted:
    - supabase/functions/ai-job-consumer/ (komplett)
    - supabase/functions/extract-vereinsregeln/ (komplett)
    - supabase/config.toml (AI Function-Eintraege)
    - supabase/tests/enqueue_photo_analysis.sql
    - supabase/tests/photo-queue-rls.test.sql
decisions:
  - "Migration loescht ai_results vor ai_jobs (FK-Reihenfolge)"
  - "pgmq Extension bleibt, nur Queue wird geloescht (D-05)"
  - "enqueue_photo_analysis Function aus supabase.ts entfernt (AI-Relikt)"
metrics:
  duration_seconds: 187
  completed_date: "2026-05-09T05:44:56Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 15
---

# Phase 05 Plan 01: AI-Removal Backend-Bereinigung Summary

**One-liner:** Supabase Migration 015 droppt ai_results/ai_jobs/pgmq-Queue, beide Edge Functions geloescht, shared Types von photo_queue/PhotoQueueRow/PlanElementCandidate/aiResultId bereinigt.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Supabase-Migration 015 + Edge Functions loeschen + config.toml + Tests | 0831320 | 12 files (1 created, 8 deleted, 1 modified, 2 deleted tests) |
| 2 | Shared Types bereinigen (entities.ts, database.ts, supabase.ts) | 7fb99f9 | 3 files modified |

## What Was Built

**Task 1 — Backend-Infrastruktur bereinigt:**
- Migration `20260509000015_remove_ai_tables.sql` erstellt mit korrekter Reihenfolge: DROP POLICY -> DROP TABLE ai_results CASCADE -> DROP TABLE ai_jobs CASCADE -> pgmq.drop_queue('ai_jobs', true)
- Post-migration Invariant-Assertion: wirft EXCEPTION wenn Tabellen noch existieren
- `supabase/functions/ai-job-consumer/` (4 Dateien) komplett geloescht
- `supabase/functions/extract-vereinsregeln/` (4 Dateien) komplett geloescht
- `supabase/config.toml`: `[functions.ai-job-consumer]` und `[functions.extract-vereinsregeln]` Bloecke entfernt
- `supabase/tests/enqueue_photo_analysis.sql` und `photo-queue-rls.test.sql` geloescht

**Task 2 — Shared Types bereinigt:**
- `entities.ts`: `photo_queue` aus `EntityName` Union, `PhotoQueueRow` Interface, `aiResultId` aus `PlanElementRow`, `PlanElementCandidate` Interface, `PhotoQueueRow` aus `AnyRow` Union entfernt
- `database.ts`: `ai_jobs` + `ai_results` Table-Definitionen (Row/Insert/Update/Relationships) entfernt
- `supabase.ts`: `ai_jobs` + `ai_results` + `photo_queue` Table-Definitionen entfernt, `enqueue_photo_analysis` Function-Definition entfernt

## Deviations from Plan

**Zusaetzliche Bereinigung (Rule 2 — Missing Critical):**
- `enqueue_photo_analysis` RPC-Definition aus `supabase.ts` Functions-Sektion entfernt. Diese war im Plan nicht explizit erwaehnt, ist aber ein AI-Relikt das bei Wave 2 TypeScript-Fehler verursacht haette.

## Known Stubs

None — alle Aenderungen sind reine Loeschungen/Bereinigungen.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: secret_cleanup | supabase/dashboard | CLAUDE_API_KEY in Supabase Dashboard muss manuell via `supabase secrets unset CLAUDE_API_KEY` entfernt werden (T-05-01, wird in Plan 02 als Checkpoint dokumentiert) |

## Self-Check: PASSED

- [x] `supabase/migrations/20260509000015_remove_ai_tables.sql` existiert
- [x] `supabase/functions/ai-job-consumer/` existiert nicht
- [x] `supabase/functions/extract-vereinsregeln/` existiert nicht
- [x] `entities.ts` enthaelt kein `photo_queue`, `PhotoQueueRow`, `PlanElementCandidate`, `aiResultId`
- [x] `database.ts` enthaelt kein `ai_jobs`, `ai_results`
- [x] `supabase.ts` enthaelt kein `ai_jobs`, `ai_results`, `photo_queue`
- [x] Commit 0831320 existiert
- [x] Commit 7fb99f9 existiert
