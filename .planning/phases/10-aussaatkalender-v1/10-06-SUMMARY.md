---
phase: 10-aussaatkalender-v1
plan: "06"
subsystem: kalender-geometrie
tags: [geometry, bug-fix, tdd, center-convention, wR-01, CAL-04, CAL-06]
dependency_graph:
  requires: []
  provides: [findPflanzenInBeet, beetToPolygon-center-fix]
  affects: [10-07, 10-08]
tech_stack:
  added: []
  patterns: [center-plus-minus-half, point-in-polygon, tdd-red-green]
key_files:
  created: []
  modified:
    - app/src/lib/kalenderBeete.ts
    - app/src/lib/__tests__/kalenderBeete.test.ts
decisions:
  - "beetToPolygon Fallback spiegelt useCompanionDetection.getBedPolygon exakt (center ± half-dimensions)"
  - "findBeeteForPlant Pflanze-Center: xM/yM direkt (konsistent mit findBedForPlant in useCompanionDetection.ts:91)"
  - "findPflanzenInBeet ohne Slug-Filterung — Aufrufer (Plan 10-07) filtert eigenen Slug separat heraus"
metrics:
  duration: "6 min"
  completed: "2026-06-11"
  tasks_completed: 2
  files_changed: 2
---

# Phase 10 Plan 06: kalenderBeete Center-Konvention Fix + findPflanzenInBeet Summary

**One-liner:** WR-01-Fix (Top-Left→CENTER bbox) + neuer beet-scoped Helper `findPflanzenInBeet` für CAL-06-Fruchtfolge-Scoping.

## Tasks Completed

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 RED | Center-Konvention-Fixtures + findPflanzenInBeet-Tests | d0f464e | grün |
| 1+2 GREEN | beetToPolygon fix + findPflanzenInBeet Implementation | 887d3f0 | grün |

## What Was Built

### WR-01: beetToPolygon — Center-Konvention

`app/src/lib/kalenderBeete.ts` — Fallback-Pfad (importierte Beete ohne `provenance.polygonPointsM`):

**Vorher (defekt):** `[{x: xM, y: yM}, {x: xM+widthM, y: yM}, ...]` — Top-Left-Rechteck, um `(+w/2, +h/2)` verschoben.

**Nachher (korrekt):**
```ts
const halfW = beet.widthM / 2;
const halfH = beet.heightM / 2;
return [
  { x: beet.xM - halfW, y: beet.yM - halfH },
  { x: beet.xM + halfW, y: beet.yM - halfH },
  { x: beet.xM + halfW, y: beet.yM + halfH },
  { x: beet.xM - halfW, y: beet.yM + halfH },
];
```
Spiegelt `useCompanionDetection.getBedPolygon` exakt (Phase 9 Source-of-Truth).

### WR-01: findBeeteForPlant — Pflanze-Center korrigiert

**Vorher:** `{x: pflanze.xM + pflanze.widthM/2, y: pflanze.yM + pflanze.heightM/2}`

**Nachher:** `{x: pflanze.xM, y: pflanze.yM}` — konsistent mit `findBedForPlant` (useCompanionDetection.ts:91).

### NEU: findPflanzenInBeet

```ts
export function findPflanzenInBeet(
  elements: PlanElementRow[],
  beet: PlanElementRow,
): PlanElementRow[]
```
Liefert alle nicht-gelöschten `elementType='Pflanze'`-Elemente, deren Mittelpunkt im Beet-Polygon liegt. Beet-scoped Gegenstück zur plan-globalen Filterung. Vorbedingung für Plan 10-07 (WR-02 Fix).

## Verification

- `pnpm --filter app exec jest --testPathPattern="kalenderBeete"` — 17/17 Tests grün
- `pnpm --filter app exec tsc --noEmit` — exit 0
- Acceptance Criteria alle erfüllt:
  - `grep -c "widthM / 2" kalenderBeete.ts` = 1 ✓
  - `grep -c "xM + widthM" kalenderBeete.ts` = 0 ✓
  - `grep -c "pflanze.xM + pflanze.widthM" kalenderBeete.ts` = 0 ✓
  - `grep -c "export function findPflanzenInBeet" kalenderBeete.ts` = 1 ✓

## Deviations from Plan

None — Plan exakt wie spezifiziert ausgeführt.

## Known Stubs

Keine. `findPflanzenInBeet` ist vollständig implementiert und getestet. Plan 10-07 konsumiert den Export.

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt. T-10-06-01 (degenerierte Polygon-Guard) aktiv: `Array.isArray(prov.polygonPointsM) && length >= 3`. T-10-06-02 (korrekte Beet-Membership) durch Center-Fix geschlossen.

## Self-Check: PASSED

- [x] `app/src/lib/kalenderBeete.ts` existiert und enthält `findPflanzenInBeet`
- [x] `app/src/lib/__tests__/kalenderBeete.test.ts` existiert mit 17 Tests
- [x] Commit d0f464e (RED) — verifiziert via `git log --oneline | grep d0f464e`
- [x] Commit 887d3f0 (GREEN) — verifiziert via `git log --oneline | grep 887d3f0`
