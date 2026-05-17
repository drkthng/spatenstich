---
phase: 09-companion-hinweis
plan: 02
subsystem: hooks, detection, draftPromotion
tags: [companion-detection, useCompanionDetection, plantSlug, TDD]
dependency_graph:
  requires: [pointInPolygon, InlineBanner-variants, companion-i18n-keys]
  provides: [useCompanionDetection, buildCompanionMap, computeConflicts, computeToastForElement, findBedForPlant, getBedPolygon, bestEffortSlugFromLabel, plantSlug-in-provenance]
  affects: [Plan-03-CompanionToast, Plan-04-canvas-overlays]
tech_stack:
  added: []
  patterns: [editorStore-subscription, useMemo-derived-conflict-state, bestEffortSlug-silent-upgrade]
key_files:
  created:
    - app/src/hooks/useCompanionDetection.ts
    - app/src/hooks/__tests__/useCompanionDetection.test.ts
  modified:
    - app/src/lib/draftPromotionRepo.ts
decisions:
  - "toastState in React.useState NOT editorStore — avoids undo/redo pollution (Pitfall-3)"
  - "findBedForPlant: parentBedId fast path with PiP fallback when bed missing/deleted (T-09-03)"
  - "enrichPlantSlug silent upgrade via editorStore.updateElement — D-15 best-effort migration"
  - "resolveSlugFromLabel in draftPromotionRepo: module-level helper, bundle-based lookup"
metrics:
  duration_seconds: 634
  completed: "2026-05-17T14:10:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Phase 9 Plan 02: Companion Detection Hook Summary

useCompanionDetection hook with 7 pure exported functions, 18 tests GREEN, plantSlug provenance write in draftPromotionRepo

## Task Results

| Task | Name | Type | Commit(s) | Status |
|------|------|------|-----------|--------|
| 1 | useCompanionDetection hook + tests | auto (tdd) | e6a304b (RED), 871ab39 (GREEN) | DONE |
| 2 | plantSlug in promotePlantDraft provenance | auto | 100327d | DONE |

## What Was Built

### Task 1: useCompanionDetection hook (TDD RED/GREEN)

**Pure exported functions (testable without React):**
- `buildCompanionMap(bundle)` — bidirectional slug->Set lookup from PlantDbBundle companions, skips neutral
- `getBedPolygon(bed)` — extracts provenance.polygonPointsM, falls back to bbox rectangle
- `findBedForPlant(plant, beds)` — parentBedId fast path + PiP fallback (T-09-03 mitigated)
- `bestEffortSlugFromLabel(label, plantByName)` — case-insensitive nameDe/nameAltDe match (D-15)
- `computeConflicts(elements, plantBySlug, companionMap)` — groups plants by bed, cross-checks companion map, returns Set of conflicting element IDs
- `computeToastForElement(changed, allElements, plantBySlug, companionMap)` — single-element toast with conflict priority (D-08)

**Hook function `useCompanionDetection()`:**
- Subscribes to editorStore elements via useMemo-derived conflict set
- Toast state in React.useState (NOT editorStore — Pitfall-3: no undo/redo pollution)
- Subscribe to element changes for toast trigger on placement/move
- enrichPlantSlug silent upgrade for pre-Phase-9 elements (D-15)
- Returns `{ conflictElementIds, toastState, dismissToast }`

**Tests:** 18 test cases across 7 describe blocks:
- buildCompanionMap bidirectional lookup
- getBedPolygon with/without polygonPointsM
- findBedForPlant: parentBedId, PiP fallback, outside all beds
- bestEffortSlugFromLabel: nameDe, nameAltDe, unknown
- computeConflicts: kartoffel+tomate conflict, tomate+basilikum no conflict, outside beds, no plantSlug (D-14), multiple conflicts
- computeToastForElement: success variant, conflict priority (D-08), outside bed null
- Hook integration: returns expected shape

### Task 2: plantSlug in promotePlantDraft provenance

- Added `resolveSlugFromLabel(label)` helper to draftPromotionRepo.ts — case-insensitive lookup against plants.json bundle nameDe + nameAltDe
- `promotePlantDraft` provenance now includes `plantSlug: resolveSlugFromLabel(draft.commonNameDe)` (D-13)
- All 21 existing draftPromotion tests remain GREEN

## Verification

- `pnpm --filter app exec npx jest --selectProjects hooks --testPathPattern="useCompanionDetection" --no-coverage --forceExit` — 18 passed, 0 failed
- `pnpm --filter app exec npx jest --selectProjects hooks --testPathPattern="draftPromotion" --no-coverage` — 21 passed, 0 failed

## TDD Gate Compliance

- RED gate: e6a304b (`test(09-02): add failing useCompanionDetection tests (RED)`)
- GREEN gate: 871ab39 (`feat(09-02): implement useCompanionDetection hook (GREEN)`)
- REFACTOR gate: not needed (implementation clean as-is)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functionality is complete and wired.

## Self-Check: PASSED

All 3 files found, all 3 commits found, 7 exported functions confirmed, 2 exported interfaces confirmed, plantSlug in provenance confirmed, resolveSlugFromLabel confirmed.
