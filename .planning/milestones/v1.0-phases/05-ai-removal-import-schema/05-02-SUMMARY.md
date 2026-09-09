---
phase: "05"
plan: "02"
subsystem: app-cleanup
tags: [ai-removal, cleanup, pivot-m07, typescript, sync, i18n]
dependency_graph:
  requires: [05-01]
  provides: [clean-app-codebase-no-ai]
  affects: [app/src/lib/sync, app/src/storage, app/app/(app), packages/shared/src/i18n]
tech_stack:
  added: []
  patterns: [file-deletion, import-cleanup, placeholder-screen]
key_files:
  created: []
  modified:
    - app/app/(app)/index.tsx
    - app/app/(app)/profile/vereinsregeln/upload.tsx
    - app/src/lib/sync/SyncWorker.ts
    - app/src/lib/sync/SyncTriggers.ts
    - app/src/lib/gardenPlanRepo.ts
    - app/src/lib/migrateLocalToAccount.ts
    - app/src/lib/mappers/rowMappers.ts
    - app/src/storage/SqliteAdapter.ts
    - app/src/storage/IndexedDbAdapter.ts
    - packages/shared/src/i18n/de.json
    - packages/shared/src/index.ts
    - README.md
    - app/.env.example
  deleted:
    - app/src/lib/photos/PhotoUploader.ts
    - app/src/lib/photos/photoQueueRepo.ts
    - app/src/lib/photoResizer.ts
    - app/src/lib/extractVereinsregeln.ts
    - app/src/lib/enqueueAiJob.ts
    - app/src/lib/uploadVereinsregelPdf.ts
    - app/src/components/AnalysisLoader.tsx
    - app/src/components/BudgetWarningBanner.tsx
    - app/src/components/CaptureStepCard.tsx
    - app/src/components/ConfidenceBadge.tsx
    - app/src/components/DimensionInput.tsx
    - app/src/components/ExtractionLoader.tsx
    - app/src/components/PhotoThumbnail.tsx
    - app/src/components/ShapeSelector.tsx
    - app/src/components/PlanElementRow.tsx
    - app/app/(app)/capture/_layout.tsx
    - app/app/(app)/capture/analysing.tsx
    - app/app/(app)/capture/confirm.tsx
    - app/app/(app)/capture/dimensions.tsx
    - app/app/(app)/capture/plan.tsx
    - app/app/(app)/capture/review.tsx
    - app/app/(app)/capture/step-north.tsx
    - app/app/(app)/capture/step-overview.tsx
    - app/app/(app)/capture/step-south.tsx
    - app/src/components/__tests__/CaptureStepCard.test.tsx
    - app/src/components/__tests__/ConfirmScreen.test.tsx
    - app/src/components/__tests__/ReviewScreen.test.tsx
    - app/src/lib/__tests__/extractVereinsregeln.test.ts
    - app/src/lib/__tests__/photoResizer.test.ts
    - app/src/lib/photos/__tests__/PhotoUploader.test.ts
    - app/src/lib/photos/__tests__/photoQueueRepo.test.ts
decisions:
  - "PlanElementRow.tsx Komponente gelöscht (Capture-spezifisch, nicht GardenPlanView-kompatibel)"
  - "aiResultId aus rowMappers planElementToLocal/ToDb entfernt (Field existiert nicht mehr in PlanElementRow nach Plan 01)"
  - "PhotoQueueRow + PlanElementCandidate aus packages/shared/src/index.ts entfernt (Plan-01-Überbleibsel)"
  - "AI-spezifische Test-Dateien komplett gelöscht statt bereinigt (keine testbaren Funktionen mehr)"
  - "SyncTriggers.test.ts: uploadPending Tests entfernt, syncAll Tests behalten"
metrics:
  duration: "~35 min"
  completed: "2026-05-09"
  tasks_completed: 2
  files_changed: 40
---

# Phase 05 Plan 02: App-Level AI-Code-Bereinigung — Summary

**One-liner:** Vollständige Entfernung aller AI-Client-Libs, Capture-Screens (9), AI-Komponenten (15), Sync-Referenzen auf photo_queue/PhotoQueueRow, i18n capture-Block und README AI-Sprache — TypeScript-Build gruen.

## Was wurde gemacht

### Task 1: Client-Libs + Komponenten löschen, Sync + Storage + Repos bereinigen

**Gelöschte Dateien (14 Produktions- + 7 Test-Dateien):**
- `app/src/lib/photos/PhotoUploader.ts` — AI-gesteuerter Foto-Upload
- `app/src/lib/photos/photoQueueRepo.ts` — Photo-Queue-Persistenz
- `app/src/lib/photoResizer.ts` — Foto-Resizing für AI-Upload
- `app/src/lib/extractVereinsregeln.ts` — Claude PDF-Extraktion
- `app/src/lib/enqueueAiJob.ts` — AI-Job-Queue
- `app/src/lib/uploadVereinsregelPdf.ts` — PDF-Upload an Supabase Storage
- 8 AI-spezifische Komponenten (AnalysisLoader, BudgetWarningBanner, CaptureStepCard, ConfidenceBadge, DimensionInput, ExtractionLoader, PhotoThumbnail, ShapeSelector)

**Bereinigt:**
- `SyncWorker.ts`: PhotoQueueRow-Import, photo_queue switch-case, pushPhotoQueue-Methode
- `SyncTriggers.ts`: uploadPending-Import, beide uploadPending()-Aufrufe
- `gardenPlanRepo.ts`: PlanElementCandidate-Import, saveElements-Funktion
- `migrateLocalToAccount.ts`: photo_queue sync_state Reset (2 Zeilen)
- `rowMappers.ts`: PhotoQueueRow-Import, DbPhotoQueueRowLoose-Typ, photoQueueFromDb-Mapper
- `SqliteAdapter.ts`: photo_queue aus ROW_ENTITIES, GARDEN_ID_COLUMN, GARDEN_ID_FIELD
- `IndexedDbAdapter.ts`: photo_queue aus ROW_ENTITIES, GARDEN_ID_COLUMN, v3Entities, __createRowTablesV3

### Task 2: Capture-Screens löschen, Home + upload.tsx + i18n + README bereinigen

**Gelöschte Screens (9):**
- `app/app/(app)/capture/_layout.tsx`
- `app/app/(app)/capture/analysing.tsx`
- `app/app/(app)/capture/confirm.tsx`
- `app/app/(app)/capture/dimensions.tsx`
- `app/app/(app)/capture/plan.tsx`
- `app/app/(app)/capture/review.tsx`
- `app/app/(app)/capture/step-north.tsx`
- `app/app/(app)/capture/step-overview.tsx`
- `app/app/(app)/capture/step-south.tsx`

**Bereinigt:**
- `app/app/(app)/index.tsx`: Camera-Import entfernt, Capture-Buttons entfernt, Platzhalter Empty-State (kein "Garten erfassen"-Button)
- `vereinsregeln/upload.tsx`: Komplett neu als Platzhalter (kein extractVereinsregeln, kein ExtractionLoader)
- `de.json`: capture-Block (~76 Zeilen) entfernt; `home.emptyTitle` + `home.emptySubtitle` hinzugefügt
- `README.md`: Claude Vision, Pl@ntNet, Claude API Referenzen entfernt; M07 Pivot reflektiert
- `app/.env.example`: CLAUDE_API_KEY Kommentar entfernt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PlanElementRow.tsx Komponente — Import von ConfidenceBadge (gelöscht) + PlanElementCandidate (nicht mehr in shared)**
- **Found during:** Task 2, TypeScript-Build-Verifikation
- **Issue:** `app/src/components/PlanElementRow.tsx` importierte `ConfidenceBadge` (gelöscht) und `PlanElementCandidate` (aus shared entfernt in Plan 01). Capture-spezifische Komponente ohne Nutzer nach Screen-Löschung.
- **Fix:** PlanElementRow.tsx gelöscht (nicht von GardenPlanView oder anderen Nicht-Capture-Screens genutzt)
- **Files modified:** `app/src/components/PlanElementRow.tsx` (deleted)
- **Commit:** 1fd0c2e

**2. [Rule 1 - Bug] rowMappers.ts — aiResultId in planElementToLocal/ToDb**
- **Found during:** Task 2, TypeScript-Build-Verifikation
- **Issue:** `planElementToLocal` referenzierte `aiResultId` und `ai_result_id` — beide nicht mehr in `PlanElementRow` (nach Plan 01 entfernt) und nicht im DB-Typ `DbPlanElementRowLoose`
- **Fix:** `ai_result_id` aus `DbPlanElementRowLoose`, `aiResultId` aus `planElementToLocal` und `planElementToDb` entfernt
- **Files modified:** `app/src/lib/mappers/rowMappers.ts`
- **Commit:** 1fd0c2e

**3. [Rule 1 - Bug] packages/shared/src/index.ts — PhotoQueueRow + PlanElementCandidate Re-Exporte**
- **Found during:** Task 2, TypeScript-Build-Verifikation
- **Issue:** `index.ts` re-exportierte `PhotoQueueRow` und `PlanElementCandidate` aus `./types/entities` — beide wurden in Plan 01 aus entities.ts entfernt, Re-Exporte waren nicht bereinigt
- **Fix:** Beide Einträge aus dem `export type {}` Block entfernt
- **Files modified:** `packages/shared/src/index.ts`
- **Commit:** 1fd0c2e

**4. [Rule 1 - Bug] 7 AI-spezifische Test-Dateien mit broken Imports**
- **Found during:** Task 2, TypeScript-Build-Verifikation
- **Issue:** CaptureStepCard.test.tsx, ConfirmScreen.test.tsx, ReviewScreen.test.tsx, extractVereinsregeln.test.ts, photoResizer.test.ts, PhotoUploader.test.ts, photoQueueRepo.test.ts importierten gelöschte Module
- **Fix:** Alle 7 Test-Dateien gelöscht (keine testbaren Funktionen mehr)
- **Commit:** 1fd0c2e

**5. [Rule 1 - Bug] SyncTriggers.test.ts — uploadPending Tests**
- **Found during:** Task 2, TypeScript-Build-Verifikation
- **Issue:** Test importierte `uploadPending` aus gelöschtem `PhotoUploader.ts`; 3 Test-Cases prüften uploadPending-Aufrufe
- **Fix:** uploadPending-Import + Mock + 3 Test-Cases entfernt; syncAll-Tests behalten
- **Files modified:** `app/src/lib/sync/__tests__/SyncTriggers.test.ts`
- **Commit:** 1fd0c2e

**6. [Rule 1 - Bug] IndexedDbAdapter.rows.test.ts — photo_queue Entity**
- **Found during:** Task 2, TypeScript-Build-Verifikation
- **Issue:** Test nutzte `photo_queue` als Entity und `PhotoQueueRow` als Typ — beides nicht mehr in EntityName/shared
- **Fix:** Test-Case auf `plan_elements` / `PlanElementRow` umgestellt
- **Files modified:** `app/src/storage/__tests__/IndexedDbAdapter.rows.test.ts`
- **Commit:** 1fd0c2e

**7. [Rule 1 - Bug] gardenPlanRepo.test.ts — saveElements + aiResultId**
- **Found during:** Task 2, TypeScript-Build-Verifikation
- **Issue:** Test importierte `saveElements` (gelöscht) und `PlanElementCandidate` (nicht mehr in shared); Test-Fixtures nutzten `aiResultId` (nicht mehr in PlanElementRow)
- **Fix:** saveElements-Test-Block entfernt, PlanElementCandidate-Import entfernt, aiResultId aus Fixtures entfernt
- **Files modified:** `app/src/lib/__tests__/gardenPlanRepo.test.ts`
- **Commit:** 1fd0c2e

## Known Stubs

- `app/app/(app)/index.tsx` Empty-State: zeigt Platzhalter-Text "Import-Funktion kommt bald." — intentional bis Plan 05-03 (Import-Bridge) implementiert ist
- `app/app/(app)/profile/vereinsregeln/upload.tsx`: vollständiger Platzhalter-Screen — intentional bis Phase 10 (manuelle Eingabe)

## Threat Flags

Keine neuen Trust-Boundary-Einführungen. Bedrohungen aus Threat-Model mitigiert:
- T-05-04: Capture-Navigation komplett entfernt (kein Dead-Link mehr)
- T-05-05: README ohne AI-Call-Suggestions
- T-05-06: vereinsregeln/upload.tsx neu geschrieben ohne broken Imports

## Self-Check: PASSED

- `app/app/(app)/index.tsx`: EXISTS
- `app/app/(app)/profile/vereinsregeln/upload.tsx`: EXISTS
- Commit dedeb45: EXISTS (Task 1)
- Commit 1fd0c2e: EXISTS (Task 2)
- `npx tsc --noEmit`: 0 Fehler
- `grep -ri "anthropic|plantnet" app/src/ app/app/`: keine funktionalen Treffer
- `test ! -d app/app/(app)/capture`: PASS
