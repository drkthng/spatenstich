---
phase: "10"
plan: "02"
subsystem: app/src/hooks + app/src/lib
tags: [kalender, hooks, data-layer, CAL-04, CAL-05, pip-geometry, tdd]
dependency_graph:
  requires: [Phase 10 Plan 01 — kalenderEngine exports, Phase 8 usePlants/PlantRow, Phase 7 writePlanElement/gardenPlanRepo, Phase 6.5 nextFreeBedSlot/draftPromotionRepo, Phase 9 pointInPolygon/bedLayout]
  provides: [useKalenderData hook, findBeeteForPlant, getPlantSlug (re-exported)]
  affects: [Phase 10 Plans 03/04 — KalenderWochenCard + Kalender-Screen consume useKalenderData]
tech_stack:
  added: []
  patterns:
    - "useKalenderData loads via gardenPlanRepo.loadAcceptedElements (NOT editorStore) — matches Home screen pattern"
    - "Klimazone null-guard: early-return [] in wochenAktionen when !klimazone (Fallstrick 2)"
    - "meinePflanzenslugs: useMemo Set from non-deleted Pflanze elements via getPlantSlug type-guard (Fallstrick 3)"
    - "hasBeetImPlan guard prevents addPlantToPlan on empty plan (Fallstrick 5)"
    - "addPlantToPlan: account-guarded via writePlanElement which calls assertAccount (T-10-03)"
    - "findBeeteForPlant: PiP geometry reuse via pointInPolygon from lib/geometry/bedLayout"
    - "beetToPolygon: provenance.polygonPointsM primary, 4-corner rectangle fallback"
    - "useAuthStore mock with .getState() method for both hook and imperative usage in tests"
key_files:
  created:
    - app/src/lib/kalenderBeete.ts
    - app/src/lib/__tests__/kalenderBeete.test.ts
    - app/src/hooks/useKalenderData.ts
    - app/src/hooks/__tests__/useKalenderData.test.ts (replaced Wave-0 it.todo stubs)
  modified: []
decisions:
  - "useKalenderData loads elements via loadAcceptedElements(activeGardenId) + loadDimensions — mirrors Home screen useEffect pattern, never reads editorStore"
  - "useAuthStore mock: function with .getState() method (Object.assign pattern) to handle both hook (selector) and imperative (getState) usage in the same test file"
  - "category: 'Gemüse' (UTF-8 literal) required by PlantCategory type — caught by TypeScript strict mode in test fixture"
  - "beetToPolygon uses top-left-corner coordinates (xM,yM) for rectangle fallback per plan spec action §Muster 4 — consistent with how beds are stored post-polygonToBbox center approximation"
  - "nurMeinePflanzen option defaults to true when meinePflanzenslugs.size > 0, false (all plants) when empty — per RESEARCH §Open Question 3"
metrics:
  duration: "8 minutes"
  completed: "2026-06-11"
  tasks: 2
  files: 4
---

# Phase 10 Plan 02: Kalender-Daten-Layer (useKalenderData + findBeeteForPlant) Summary

**One-liner:** `useKalenderData` hook mit loadAcceptedElements-Datenpfad + `findBeeteForPlant` PiP-Helper — füllt Wave-0 Stubs für CAL-04/CAL-05.

## What Was Built

### Task 1: findBeeteForPlant pure helper + tests

`app/src/lib/kalenderBeete.ts` — reines TypeScript-Modul ohne React/RN-Importe.

Exports:
- `getPlantSlug(el: PlanElementRow): string | null` — type-guard für `provenance.plantSlug` (T-10-04); nicht-string/fehlend → null
- `findBeeteForPlant(elements: PlanElementRow[], plantSlug: string): PlanElementRow[]` — CAL-04 "Auf welchem Beet?"-Lookup

Algorithmus (10-RESEARCH.md §Muster 4):
1. Filtert aktive (nicht gelöschte) Elemente
2. Findet Pflanze-Elemente mit matching plantSlug
3. Berechnet Mittelpunkt jeder Pflanze (xM + widthM/2, yM + heightM/2)
4. Rekonstruiert Beet-Polygon (provenance.polygonPointsM oder 4-Ecken-Fallback)
5. PiP-Test via `pointInPolygon` aus `lib/geometry/bedLayout` (Phase 9 Wiederverwendung)
6. Dedupliziert Beete nach id

`app/src/lib/__tests__/kalenderBeete.test.ts` — 11 Tests:
- Rechteck-Containment (Pflanze innen → Beet zurückgegeben)
- Außerhalb des Beets → leeres Array
- Soft-deleted Beet → ausgeschlossen
- Soft-deleted Pflanze → ausgeschlossen
- Kein passender plantSlug → leeres Array
- Dedup: mehrere Pflanzinstanzen gleichen Slugs → Beet nur einmal
- Leere Elemnte-Liste → leeres Array
- Dreieck-Polygon via provenance.polygonPointsM → korrekte PiP-Auswertung

Test-Ergebnis: 11/11 grün.

### Task 2: useKalenderData Hook + Tests (Wave-0 Stubs gefüllt)

`app/src/hooks/useKalenderData.ts` — React Hook der alle Kalender-Daten-Quellen verbindet.

Datenquellen:
- `usePlants()` → `PlantRow[]` (TanStack Query + bundle initialData)
- `useProfileStore(s => s.klimazone)` → `Klimazone | null`
- `useAuthStore(s => s.activeGardenId)` + `useAuthStore(s => s.mode)`
- `Promise.all([loadDimensions, loadAcceptedElements])` via useEffect (NOT editorStore)

Berechnete Werte (useMemo):
- `meinePflanzenslugs`: Set der plantSlugs aus nicht-gelöschten Pflanze-Elementen (Fallstrick 3)
- `aktuelleKw`: ISO-Kalenderwoche (gecacht, einmal pro Render-Session)
- `hasBeetImPlan`: boolean guard für CAL-04/05 (Fallstrick 5)
- `wochenAktionen`: leer wenn klimazone null (Fallstrick 2); flatMap über plants → getFensterFuerPflanze → filterAktiveAktionen

CAL-05 `addPlantToPlan(plant)`:
- Guard: `hasBeetImPlan && dimensions && activeGardenId` (sonst throw)
- `nextFreeBedSlot(elements, dimensions, {0.3, 0.3})` für xM/yM
- Baut `PlanElementRow` mit elementType='Pflanze', layer='seasonal', isAccepted=true, provenance={plantSlug}
- `writePlanElement(mode, element)` — account-guard via `assertAccount` in gardenPlanRepo (T-10-03)
- `await refresh()` danach

Engine-Imports: `getFensterFuerPflanze`, `filterAktiveAktionen`, `getAktuelleKw` aus `'@spatenstich/shared'` (Root-Export, kein Subpath).

`app/src/hooks/__tests__/useKalenderData.test.ts` — Wave-0 `it.todo` Stubs ersetzt durch 8 echte Tests:
- `hasBeetImPlan === true` wenn Beete vorhanden
- `hasBeetImPlan === false` wenn keine Beete
- `addPlantToPlan` schreibt Row mit elementType='Pflanze', layer='seasonal', provenance.plantSlug=slug, xM/yM aus nextFreeBedSlot
- `addPlantToPlan` wirft wenn kein Beet vorhanden (Fallstrick 5)
- `meinePflanzenslugs` enthält plantSlugs nicht-gelöschter Pflanze-Elemente
- Soft-deleted Pflanze → nicht in meinePflanzenslugs
- `nurMeinePflanzen=true` → wochenAktionen enthält nur Plan-Pflanzen
- `klimazone === null` → `wochenAktionen.length === 0` (kein NaN)

Test-Ergebnis: 8/8 grün. `pnpm --filter app exec tsc --noEmit` exit 0.

## Verification

- `pnpm --filter app exec jest --testPathPattern="useKalenderData|kalenderBeete"` — 19/19 passed
- `pnpm --filter app exec tsc --noEmit` — exit 0 (kein Fehler)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript TS2783: Duplicate property in factory function (test file)**
- **Found during:** Task 1 test run
- **Issue:** `makeBeet()` und `makePflanze()` factory functions bauten `PlanElementRow` mit expliziten Feldern (xM, yM, ...) UND `...overrides`, was TypeScript strict mode als "doppelt angegeben" ablehnte.
- **Fix:** Factory-Funktionen auf "base + spread overrides" Pattern umgestellt (base-Objekt erst erstellen, dann `{ ...base, ...overrides }` zurückgeben).
- **Files modified:** `app/src/lib/__tests__/kalenderBeete.test.ts`
- **Commit:** f029e9d

**2. [Rule 1 - Bug] TypeScript TS2322: PlantCategory 'Gemuese' nicht zuweisbar**
- **Found during:** Task 2 first test run
- **Issue:** Test-Fixture hatte `category: 'Gemuese'` (ASCII) statt `category: 'Gemüse'` (UTF-8) — Verletzung des `PlantCategory = 'Gemüse' | ...` Union Types und der project-weiten Umlaut-Policy.
- **Fix:** `'Gemuese'` → `'Gemüse'` in MOCK_PLANT fixture.
- **Files modified:** `app/src/hooks/__tests__/useKalenderData.test.ts`
- **Commit:** 570f8cc

**3. [Rule 1 - Bug] useAuthStore mock: Doppelte identifier durch get-accessor**
- **Found during:** Task 2 first test run
- **Issue:** Erster Mock-Versuch nutzte sowohl eine Property `useAuthStore:` als auch einen `get useAuthStore()` Accessor im gleichen Objekt-Literal — TypeScript TS2300 + TS1119. Der Hook braucht `useAuthStore` sowohl als Funktion (React-Hook-Selektor) als auch als `useAuthStore.getState()` (imperative Verwendung in addPlantToPlan).
- **Fix:** `jest.mock` Factory definiert eine benannte Funktion `hookFn` mit `.getState`-Methode via `hookFn.getState = () => ...` und exportiert nur `{ useAuthStore: hookFn }`. Closes-over die module-level let-Variablen korrekt bei Call-Time.
- **Files modified:** `app/src/hooks/__tests__/useKalenderData.test.ts`
- **Commit:** 570f8cc

## Known Stubs

| Stub | File | Line | Grund |
|------|------|------|-------|
| `it.todo('renders a bar per Aktionstyp window')` | `app/src/components/kalender/__tests__/GanttStreifen.test.tsx` | 7 | Plan 03 füllt GanttStreifen-Komponente (CAL-01) — unverändert aus Plan 01 |

Die `useKalenderData` Wave-0 Stubs (4x `it.todo`) sind vollständig durch echte Tests ersetzt.

## Threat Flags

No new threat surface beyond the plan's threat model.

- T-10-03 (addPlantToPlan write): `writePlanElement(mode, el)` ruft intern `assertAccount(mode)` — bereits implementiert und getestet in gardenPlanRepo.
- T-10-04 (provenance.plantSlug Tampering): `getPlantSlug` type-guard `typeof prov.plantSlug === 'string'` — implementiert und in 3 Tests verifiziert.
- T-10-05 (addPlantToPlan bei leerem Plan): `hasBeetImPlan` guard — implementiert und durch Throw-Test verifiziert.

## Self-Check: PASSED
