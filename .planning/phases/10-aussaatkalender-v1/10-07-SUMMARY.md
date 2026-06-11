---
phase: 10-aussaatkalender-v1
plan: "07"
subsystem: kalender-detail-screen
tags: [rules-of-hooks, fruchtfolge, beet-scoped, i18n, tdd, CR-01, WR-02, IN-01, IN-02, CAL-06]
dependency_graph:
  requires:
    - phase: 10-06
      provides: findPflanzenInBeet (beet-scoped PiP helper for WR-02 fix)
  provides:
    - Hook-stabiler PflanzenDetailScreen (Guard nach allen Hooks — kein Crash bei unbekanntem Slug)
    - CAL-06 Fruchtfolge beet-scoped via findPflanzenInBeet
    - kalender.nichtGefunden + kalender.hinzufuegenFehler in de.json
    - Not-found + Anderes-Beet Tests in PflanzenDetail.test.tsx
  affects: [10-08, 10-09]
tech_stack:
  added: []
  patterns:
    - "Hook-Reihenfolge: Early-Return-Guard immer NACH allen useMemo/useCallback-Hooks"
    - "findPflanzenInBeet(elements, beet) für per-Beet CAL-06-Scoping im Detail-Screen"
    - "t() mit vars-Parameter für i18n-Strings mit Platzhaltern ({slug})"
key_files:
  created: []
  modified:
    - app/app/(app)/kalender/[slug].tsx
    - packages/shared/src/i18n/de.json
    - app/src/components/kalender/__tests__/PflanzenDetail.test.tsx
key_decisions:
  - "CR-01 Fix: Guard 'if (!loading && !plant) return' verschoben nach handleAddToPlan (letzter useCallback) — Hook-Anzahl konstant über alle Render-Pfade"
  - "WR-02 Fix: findPflanzenInBeet(elements, beet).filter(eigener Slug) ersetzt plan-globale elements.filter in fruchtfolgeGrund useMemo — CAL-06-Spec 'gleiche Familie im Ziel-Beet' korrekt"
  - "TDD-Abweichung: WR-02-Implementation in Task 1 zusammen mit CR-01 committed (keine separaten RED/GREEN Commits für die Screen-Änderung) — Tests in Task 2 grün (GREEN-only, kein separater RED-Commit da Impl bereits committed)"
requirements_completed: [CAL-01, CAL-05, CAL-06]
duration: 3min
completed: "2026-06-11"
---

# Phase 10 Plan 07: CR-01/WR-02/IN-01/IN-02 Gap-Closure Summary

**Hook-stabiler PflanzenDetailScreen: CR-01 (Rules-of-Hooks-Crash bei unbekanntem Slug) und WR-02 (CAL-06 Fruchtfolge plan-global statt beet-scoped) geschlossen; toter Import und 2 hartkodierte Strings bereinigt.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-11T09:07:30Z
- **Completed:** 2026-06-11T09:10:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **CR-01 geschlossen:** `if (!loading && !plant) return` Guard steht jetzt nach allen `useMemo`/`useCallback`-Hooks (Zeile 129 > Zeile 112). Kein "Rendered fewer hooks than expected"-Crash mehr bei unbekanntem Slug.
- **WR-02 geschlossen:** `fruchtfolgeGrund` useMemo nutzt `findPflanzenInBeet(elements, beet)` aus Plan 10-06 statt plan-globaler `elements.filter`. CAL-06-Warnung erscheint jetzt nur wenn gleiche Familie IM Ziel-Beet liegt.
- **IN-01/IN-02 mitgenommen:** `getFensterFuerPflanze` aus Import entfernt; `kalender.nichtGefunden` und `kalender.hinzufuegenFehler` in `de.json` mit korrekten UTF-8-Umlauten; Banner-Strings über `t()`.
- **6 Tests grün:** 4 bestehende (a-d) + 2 neue (e: Anderes-Beet-kein-Warnung, f: Not-found-kein-Crash).

## Task Commits

1. **Task 1: CR-01 + IN-01 + IN-02 + WR-02 Screen-Fix** - `cb582d3` (fix)
2. **Task 2: TDD Tests — Not-found + Anderes-Beet + findPflanzenInBeet Mock** - `e97aded` (test)

## Files Created/Modified

- `app/app/(app)/kalender/[slug].tsx` — Guard nach Hooks verschoben; `findPflanzenInBeet` importiert und in `fruchtfolgeGrund` genutzt; `getFensterFuerPflanze` entfernt; Banner-Strings über `t()`
- `packages/shared/src/i18n/de.json` — Neue Keys `kalender.nichtGefunden` und `kalender.hinzufuegenFehler` mit UTF-8-Umlauten
- `app/src/components/kalender/__tests__/PflanzenDetail.test.tsx` — `findPflanzenInBeet: jest.fn()` im Mock; Test (d) angepasst; Test (e) Anderes-Beet-kein-Warnung neu; Test (f) Not-found-kein-Crash neu

## Decisions Made

- **CR-01:** Guard nach allen Hooks platziert. Die `useMemos` null-guarden `plant` intern (`if (!plant ...) return null`) — sie laufen also sicher wenn `plant === undefined`.
- **WR-02:** `findPflanzenInBeet(elements, beet).filter(e => getPlantSlug(e) !== plant.slug)` — exkludiert eigene Pflanze (T-10-10), überlässt Beet-Scoping dem PiP-Helper aus Plan 10-06.
- **TDD-Abweichung (dokumentiert):** WR-02 Screen-Änderung wurde in Task 1 zusammen mit CR-01 committed, nicht in separatem RED-Commit. Grund: alle drei Änderungen (CR-01, IN-01, IN-02) erfordern Edits an denselben Zeilenbereichen in `[slug].tsx`; das WR-02-Edit war logisch untrennbar. Task 2 liefert die entsprechenden Tests grün (GREEN-only-Commit).

## Deviations from Plan

### Auto-applied Task Grouping

**1. WR-02 Screen-Fix in Task 1 zusammengefasst (kein separater TDD RED-Commit)**

- **Found during:** Task 1 execution
- **Situation:** Task 1 (CR-01/IN-01/IN-02) und Task 2 (WR-02) editieren denselben `fruchtfolgeGrund`-Block in `[slug].tsx`. Beide Änderungen überlappen in denselben Zeilen.
- **Decision:** WR-02 Screen-Implementation in Task 1 Commit (cb582d3) committet. Task 2 liefert nur Tests (e97aded). Tests laufen direkt grün (GREEN-only).
- **Impact:** Plan spezifiziert TDD für Task 2. Der RED-Commit fehlt für die WR-02 Screen-Änderung. Alle Acceptance Criteria erfüllt; Tests grün; kein Scope-Creep.

---

**Total deviations:** 1 (Commit-Reihenfolge WR-02 — kein Correctness-Impact)
**Impact:** Minimal — alle Acceptance Criteria und Tests erfüllt.

## Verification Results

- `pnpm --filter app exec jest --testPathPattern="PflanzenDetail"` — 6/6 grün
- `pnpm --filter @spatenstich/shared exec jest i18n.kalender` — 7/7 grün
- `pnpm --filter app exec tsc --noEmit` — exit 0
- `grep -c "getFensterFuerPflanze" app/app/(app)/kalender/[slug].tsx` = 0
- `grep -c "nichtGefunden" packages/shared/src/i18n/de.json` = 1
- Guard-Zeile (129) > handleAddToPlan-Zeile (112)

## Known Stubs

Keine. Alle Änderungen sind vollständig implementiert und getestet.

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt.
- T-10-08 (Slug aus URL → undefined → nichtGefunden-Banner, kein Crash): geschlossen via CR-01 Fix.
- T-10-10 (getPlantSlug type-guard + familyBySlug.get in fruchtfolgeGrund): aktiv, unverändert.

## Self-Check: PASSED

- [x] `app/app/(app)/kalender/[slug].tsx` existiert; Guard nach Zeile 127 (handleAddToPlan)
- [x] `packages/shared/src/i18n/de.json` enthält `nichtGefunden` und `hinzufuegenFehler`
- [x] `app/src/components/kalender/__tests__/PflanzenDetail.test.tsx` enthält `findPflanzenInBeet` Mock + Tests (e) + (f)
- [x] Commit cb582d3 — verifiziert
- [x] Commit e97aded — verifiziert

---
*Phase: 10-aussaatkalender-v1*
*Completed: 2026-06-11*
