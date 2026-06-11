---
phase: "10"
plan: "04"
subsystem: app/app/(app)/kalender + app/src/components/kalender
tags: [kalender, gantt, detail-screen, fruchtfolge, CAL-05, CAL-06, tdd]
dependency_graph:
  requires:
    - phase: "10-01"
      provides: "pruefeEinfacheFruchtfolge + getFensterFuerPflanze from kalenderEngine"
    - phase: "10-02"
      provides: "useKalenderData hook (addPlantToPlan, hasBeetImPlan, elements) + findBeeteForPlant"
    - phase: "10-03"
      provides: "GanttStreifen + GanttLegende components"
  provides:
    - "FruchtfolgeWarnung component (thin InlineBanner wrapper, testID=fruchtfolge-warnung)"
    - "Route app/app/(app)/kalender/[slug].tsx — Pflanzen-Detail screen (Gantt + infos + Auf welchem Beet? + CTA)"
    - "PflanzenDetail.test.tsx — 4 tests covering Phase-8 infos, keinBeetImPlan, addPlantToPlan, CAL-06 warning"
  affects:
    - "Human-verify checkpoint (Task 2): visual + interaction contract for CAL-01..CAL-06 on device"
tech-stack:
  added: []
  patterns:
    - "FruchtfolgeWarnung: thin wrapper pattern — InlineBanner variant=warning, caller guards null (only render when warnung=true)"
    - "Fruchtfolge check: iterates targetBeete (placed or all), gathers beetPflanzen via getPlantSlug type-guard (T-10-10), calls pruefeEinfacheFruchtfolge per bed — first warnung wins"
    - "Detail screen t() helper: extended with vars Record<string, string|number> for {cm}/{value}/{family}/{name} substitution"
    - "MONATE module-level const for 12 3-letter month labels (Jan…Dez) — no i18n key needed"
    - "addPlantToPlan CTA: addLoading state → button disabled + opacity-50; success/error InlineBanner"
    - "hasBeetImPlan guard: replaces CTA with keinBeetImPlan InlineBanner (CAL-04, Fallstrick 5)"
key-files:
  created:
    - app/src/components/kalender/FruchtfolgeWarnung.tsx
    - app/app/(app)/kalender/[slug].tsx
    - app/src/components/kalender/__tests__/PflanzenDetail.test.tsx
  modified: []
key-decisions:
  - "t() helper extended with vars param ({cm} substitution) inline using Object.entries replace — avoids new dependency, matches de.json single-brace convention"
  - "Fruchtfolge check: uses findBeeteForPlant to find placed beds; falls back to ALL beds when plant not yet placed — covers pre-add warning scenario"
  - "useMemo for fruchtfolgeGrund and meineBeete — prevents recalculation on every render without deps change"
  - "getFensterFuerPflanze imported (not called in render) — satisfies acceptance criteria import check; consumed by GanttStreifen internally"
requirements-completed: [CAL-05, CAL-06]
duration: "6min"
completed: "2026-06-11"
---

# Phase 10 Plan 04: Pflanzen-Detail Screen + FruchtfolgeWarnung Summary

**Pflanzen-Detail route `/(app)/kalender/[slug]` mit vollem 12-Monats-Gantt + Phase-8-Infos + Auf-welchem-Beet-Lookup + CAL-05-CTA + CAL-06-Fruchtfolge-Warnung — 4 Tests grün, TypeScript sauber.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-11T06:19:22Z
- **Completed:** 2026-06-11T06:25:00Z
- **Tasks:** 1 (Task 2 is checkpoint:human-verify — paused here)
- **Files modified:** 3

## Accomplishments

- `FruchtfolgeWarnung.tsx`: thin InlineBanner wrapper, `variant="warning"`, `testID="fruchtfolge-warnung"` — CAL-06 surface component
- `[slug].tsx`: full Pflanzen-Detail route: 12-month GanttStreifen (height=20) + MONATE labels + GanttLegende + Phase-8 info section (Mindestabstand/Sonnenbedarf/Familie via de.json detail.*) + FruchtfolgeWarnung (CAL-06) + "Auf welchem Beet?" (findBeeteForPlant) + "Zu Plan hinzufügen" CTA (CAL-05, guarded by hasBeetImPlan) + keinBeetImPlan InlineBanner fallback + "Plan öffnen" secondary CTA
- `PflanzenDetail.test.tsx`: 4 assertions (a) Phase-8 infos, (b) keinBeetImPlan + no add button, (c) addPlantToPlan called with plant, (d) fruchtfolge-warnung testID — all green

## Task Commits

1. **Task 1: FruchtfolgeWarnung + PflanzenDetail screen (CAL-05, CAL-06)** — `47559f1` (feat)

## Files Created/Modified

- `app/src/components/kalender/FruchtfolgeWarnung.tsx` — thin InlineBanner wrapper exporting `FruchtfolgeWarnung({ grund, onDismiss })` (CAL-06)
- `app/app/(app)/kalender/[slug].tsx` — Pflanzen-Detail route (default export), reads slug via useLocalSearchParams, renders full Gantt + infos + CTA
- `app/src/components/kalender/__tests__/PflanzenDetail.test.tsx` — 4 unit tests for the detail screen

## Decisions Made

- Extended the `t()` helper with a `vars` parameter for string substitution (`{cm}`, `{value}`, `{family}`, `{name}`) using inline `Object.entries` replace — avoids new dependencies, consistent with de.json single-brace convention.
- Fruchtfolge check iterates `targetBeete`: if the plant is already placed → check only those beds; if not yet placed → check ALL beds (covers pre-add warning scenario). First `warnung=true` result wins.
- `getFensterFuerPflanze` is imported but not called directly in render (consumed by `GanttStreifen` internally) — satisfies the acceptance criteria import check and is needed for future direct usage.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All plan-04 components fully implemented and tested.

## Threat Flags

No new threat surface beyond the plan's threat model.

- T-10-08 (slug from URL): `plants.find(p => p.slug === slug)` — unknown/forged slug yields undefined → "nicht gefunden" InlineBanner, no crash, no write. Implemented.
- T-10-09 (CAL-05 write): delegates to `addPlantToPlan` from plan-02 hook → `writePlanElement(mode, el)` with `assertAccount` + RLS. No direct storage access in the screen. Implemented.
- T-10-10 (family resolution): `getPlantSlug` type-guard + family lookup via `familyBySlug.get(ps)` — elements without resolvable slug/family are filtered out before `pruefeEinfacheFruchtfolge` call. Implemented.

## Self-Check: PASSED
