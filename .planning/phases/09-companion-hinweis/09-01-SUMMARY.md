---
phase: 09-companion-hinweis
plan: 01
subsystem: geometry, components, i18n
tags: [pointInPolygon, InlineBanner, companion-hints, TDD]
dependency_graph:
  requires: []
  provides: [pointInPolygon, InlineBanner-variants, companion-i18n-keys]
  affects: [Plan-02-useCompanionDetection, Plan-03-CompanionToast]
tech_stack:
  added: []
  patterns: [ray-casting-PiP, variant-styles-map]
key_files:
  created:
    - app/src/components/__tests__/InlineBanner.test.tsx
  modified:
    - app/src/lib/geometry/bedLayout.ts
    - app/src/lib/geometry/__tests__/bedLayout.test.ts
    - app/src/components/InlineBanner.tsx
    - packages/shared/src/i18n/de.json
decisions:
  - "pointInPolygon returns false (not throw) for polygon.length < 3 — silent fail per D-05"
  - "VARIANT_STYLES map replaces hardcoded amber styles — extensible for future variants"
metrics:
  duration_seconds: 176
  completed: "2026-05-17T13:50:17Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 4
---

# Phase 9 Plan 01: Foundation Utilities Summary

Ray-casting pointInPolygon for bed membership + InlineBanner error/success variants + companion i18n keys

## Task Results

| Task | Name | Type | Commit(s) | Status |
|------|------|------|-----------|--------|
| 1 | pointInPolygon TDD | auto (tdd) | e6e47b8 (RED), 89b663d (GREEN) | DONE |
| 2 | InlineBanner variants + i18n | auto | ef60c69 | DONE |

## What Was Built

### Task 1: pointInPolygon ray-casting utility
- Added `pointInPolygon(point, polygon)` to `bedLayout.ts` using standard ray-casting algorithm
- O(n) vertex traversal, returns boolean
- Guard: `polygon.length < 3` returns `false` (not throw) — malformed provenance silently fails per D-05
- 5 new tests: <3 points guard, inside square, outside square, vertex behavior, concave L-shape
- TDD gates: RED commit (e6e47b8) then GREEN commit (89b663d)
- All 10 bedLayout tests pass (5 existing polygonToBbox + 5 new PiP)

### Task 2: InlineBanner multi-variant + companion i18n
- Extended `variant` prop from `'warning'` to `'warning' | 'error' | 'success'`
- Added `VARIANT_STYLES` map with per-variant border color, background, icon color, and icon component
- Replaced hardcoded amber styles with dynamic `vs.border`, `vs.bg`, `vs.iconColor`, `<vs.Icon>`
- Added `AlertTriangle` (error) and `CheckCircle` (success) icon imports
- Created 4 InlineBanner component tests (default warning, error variant, success variant, dismiss)
- Added `companion.*` i18n keys to de.json (5 sub-keys: conflict_single, conflict_multi, good_single, good_multi, dismiss)
- UTF-8 characters used for warning sign and checkmark per project convention

## Verification

- `pnpm --filter app exec npx jest --selectProjects editor components --testPathPattern="bedLayout|InlineBanner" --no-coverage` — 14 passed, 0 failed
- de.json validated as valid JSON via Node.js parser

## TDD Gate Compliance

- RED gate: e6e47b8 (`test(09-01): add failing pointInPolygon tests`)
- GREEN gate: 89b663d (`feat(09-01): implement pointInPolygon ray-casting utility`)
- REFACTOR gate: not needed (implementation clean as-is)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functionality is complete and wired.

## Self-Check: PASSED

All 5 files found, all 3 commits found, pointInPolygon export confirmed, companion keys confirmed, VARIANT_STYLES confirmed.
