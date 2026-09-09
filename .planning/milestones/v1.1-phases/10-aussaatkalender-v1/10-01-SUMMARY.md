---
phase: "10"
plan: "01"
subsystem: packages/shared/lib + i18n + app test stubs
tags: [kalender, engine, i18n, tdd, CAL-02, CAL-03, CAL-06]
dependency_graph:
  requires: [Phase 8 PlantRow types, Phase 2 profileStore.klimazone]
  provides: [kalenderEngine.ts, KalenderFenster, AktionsTyp, de.json/kalender.*, i18n.kalender.test.ts, useKalenderData stub, GanttStreifen stub]
  affects: [Phase 10 Plans 02/03/04 — all consume kalenderEngine exports and kalender i18n keys]
tech_stack:
  added: []
  patterns:
    - "Pure TS engine module (no React/RN) mirroring klimazonen.ts pattern"
    - "doyToIsoKw: 6-line UTC ISO-week arithmetic (no date-fns)"
    - "zoneOffset guard: !klimazone || <1 || >7 → return 0 (Zone 4 baseline)"
    - "DOY clamp Math.max(1,Math.min(365,...)) + KW clamp Math.min(53,...)"
    - "pruefeEinfacheFruchtfolge: single-season family-match, self-slug excluded"
    - "Wave-0 it.todo stub pattern: no production imports, pass immediately"
key_files:
  created:
    - packages/shared/src/lib/kalenderEngine.ts
    - packages/shared/src/lib/__tests__/kalenderEngine.test.ts
    - packages/shared/src/__tests__/i18n.kalender.test.ts
    - app/src/hooks/__tests__/useKalenderData.test.ts
    - app/src/components/kalender/__tests__/GanttStreifen.test.tsx
  modified:
    - packages/shared/src/index.ts
    - packages/shared/src/i18n/de.json
    - app/jest.config.ts
decisions:
  - "doyToIsoKw implemented as 6-line UTC arithmetic — no date-fns/dayjs (RESEARCH recommendation; no new packages needed)"
  - "zoneOffset guard uses !klimazone || klimazone < 1 || klimazone > 7 — handles null/NaN/0/out-of-range, returns 0 (Zone 4 offset = baseline)"
  - "DOY clamp 1..365 + KW clamp 1..53 applied in addWindow closure (Fallstrick 1+4)"
  - "GanttStreifen.test.tsx placed in components/kalender/__tests__/ (plan-specified path); jest.config.ts components project testMatch extended to include kalender subdir (Rule 3 deviation)"
  - "pruefeEinfacheFruchtfolge: single-season check only, self-slug excluded (CAL-06 MVP scope per plan)"
metrics:
  duration: "8 minutes"
  completed: "2026-06-11"
  tasks: 2
  files: 8
---

# Phase 10 Plan 01: Kalender-Engine + i18n Grundgerüst Summary

**One-liner:** Pure DOY-to-ISO-KW engine (kalenderEngine.ts) mit Klimazonenoffset-Guard + de.json kalender.* Schlüsselbaum + Wave-0 Test-Stubs für Downstream-Plans.

## What Was Built

### Task 1: kalenderEngine.ts (TDD RED then GREEN)

`packages/shared/src/lib/kalenderEngine.ts` — pure TypeScript module, kein React/RN-Import.

Exports:
- `type AktionsTyp = 'Vorkultur' | 'Direktsaat' | 'Auspflanzen' | 'Ernte'`
- `interface KalenderFenster { typ, startDoy, endDoy, startKw, endKw }`
- `getFensterFuerPflanze(plant, klimazone): KalenderFenster[]` — DOY → KW mit Klimazonenoffset
- `getAktuelleKw(): number` — aktuelle ISO-KW
- `filterAktiveAktionen(fenster, kw): KalenderFenster[]` — Wochen-Filter
- `pruefeEinfacheFruchtfolge(neuePflanze, beetPflanzen): { warnung, grund }` — CAL-06

Architektur-Highlights:
- `LAST_FROST_DOY` Tabelle: Zonen 1–7, Zone 4 = Baseline (DOY 96)
- `zoneOffset()` Security Guard (T-10-01): `!klimazone || <1 || >7 → return 0`
- `doyToIsoKw()`: 6-Zeilen UTC-Arithmetik (Spot-Checks: DOY 60→KW9, 130→KW19, 200→KW29)
- `addWindow()` closure: DOY-Clamp 1..365 (Fallstrick 1) + KW-Clamp 1..53 (Fallstrick 4)

Test-Ergebnisse: 15/15 Tests grün.

`packages/shared/src/index.ts` erhält `export * from './lib/kalenderEngine';` nach `vereinsregeln`-Export.

### Task 2: de.json kalender.* + i18n Test + Stubs

`packages/shared/src/i18n/de.json` — neues Top-Level-Objekt `"kalender"` mit:
- 18 String-Keys (title, kwLabel, dieseWoche, jahresuebersicht, filterMeinePflanzen, klimazoneLabel, aufWelchemBeet, zuPlanHinzufuegen, planOeffnen, hinzugefuegtBanner, nochNichtImPlan, plzFehlt, plzJetztEingeben, keinBeetImPlan, keineAktionenDieseWoche, keinePflanzenImPlan, keinePflanzenImPlanBody, ohneKalenderDaten)
- `legende.*` (4 Aktionstypen: Vorkultur, Direktsaat, Auspflanzen, Ernte)
- `detail.*` (mindestabstand mit {cm}, sonnenbedarf mit {value}, familie mit {family})
- UTF-8 Umlaute literal (ä, ö, ü, ß) — keine ASCII-Ersetzungen

`packages/shared/src/__tests__/i18n.kalender.test.ts` — 7 Assertions grün.

Stub-Dateien (nur it.todo, keine Production-Imports):
- `app/src/hooks/__tests__/useKalenderData.test.ts` — 4 todos (CAL-04, CAL-05, filter, null klimazone)
- `app/src/components/kalender/__tests__/GanttStreifen.test.tsx` — 1 todo (CAL-01)

## Verification

- `pnpm --filter @spatenstich/shared exec jest kalenderEngine i18n.kalender` — 22 passed
- `pnpm --filter app exec jest --testPathPattern="useKalenderData|GanttStreifen"` — 5 todo (no failures)
- `pnpm --filter @spatenstich/shared typecheck` — exit 0 (clean)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jest.config.ts components project testMatch extended for kalender subdir**
- **Found during:** Task 2 verification
- **Issue:** `GanttStreifen.test.tsx` platziert in `app/src/components/kalender/__tests__/` per Plan-Spezifikation. Die bestehende testMatch-Regel `**/src/components/__tests__/**` matching verlangt `__tests__` als direktes Kind von `components`, deckt keine Sub-Verzeichnisse wie `kalender/__tests__` ab.
- **Fix:** `app/jest.config.ts` components-Projekt erhält zusätzlichen testMatch-Eintrag `**/src/components/kalender/__tests__/**/*.test.ts?(x)`
- **Files modified:** `app/jest.config.ts`
- **Commit:** 46e020f

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `it.todo('placement: returns valid xM/yM...')` | `app/src/hooks/__tests__/useKalenderData.test.ts` | 8 | Plan 02 füllt useKalenderData-Hook (CAL-04) |
| `it.todo('add plant: writes PlanElementRow...')` | `app/src/hooks/__tests__/useKalenderData.test.ts` | 11 | Plan 02 füllt useKalenderData-Hook (CAL-05) |
| `it.todo('filter: nur meine Pflanzen...')` | `app/src/hooks/__tests__/useKalenderData.test.ts` | 14 | Plan 02 |
| `it.todo('returns empty when klimazone is null')` | `app/src/hooks/__tests__/useKalenderData.test.ts` | 17 | Plan 02 |
| `it.todo('renders a bar per Aktionstyp window')` | `app/src/components/kalender/__tests__/GanttStreifen.test.tsx` | 7 | Plan 03 füllt GanttStreifen-Komponente (CAL-01) |

Diese Stubs sind intentional (Wave-0-Strategie) — sie sind keine Regression, sondern Platzhalter für Downstream-Plans 02/03.

## Threat Flags

No new threat surface beyond the plan's threat model. `kalenderEngine.ts` contains no network endpoints, no auth paths, no file access. The `zoneOffset()` guard (T-10-01) is implemented and tested.

## Self-Check: PASSED
