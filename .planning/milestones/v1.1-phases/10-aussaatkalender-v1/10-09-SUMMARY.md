---
phase: 10-aussaatkalender-v1
plan: "09"
subsystem: kalender-screen
tags: [bug-fix, tdd, wR-05, CAL-01, CAL-04, filter-chip, useEffect-override]
dependency_graph:
  requires: [10-08]
  provides: [chip-state-to-hook, no-useEffect-override]
  affects: []
tech_stack:
  added: []
  patterns: [userToggled-ref-pattern, single-source-of-truth-chip-state, tdd-red-green]
key_files:
  created:
    - app/src/components/kalender/__tests__/KalenderScreen.test.tsx
  modified:
    - app/app/(app)/kalender/index.tsx
decisions:
  - "WR-05: useKalenderData({ nurMeinePflanzen }) mit Chip-State aufgerufen — Single-Source-of-Truth statt screen-seitiger Doppelfilterung"
  - "userToggled-Ref (React.useRef) als Once-Guard — Sync-Effekt initialisiert Default nur einmal, kein Override nach Nutzer-Opt-out"
  - "testID='filter-chip-meine-pflanzen' zur Testbarkeit des Pressable hinzugefuegt"
  - "KalenderWochenCard erhaelt wochenAktionen direkt (kein screen-seitiger filteredAktionen-Wrapper)"
metrics:
  duration: "5 min"
  completed: "2026-06-11"
  tasks_completed: 1
  files_changed: 2
---

# Phase 10 Plan 09: KalenderScreen WR-05 Gap-Closure Summary

**One-liner:** WR-05 geschlossen — Filter-Chip "Nur meine Pflanzen" steuert KalenderWochenCard via `useKalenderData({ nurMeinePflanzen })`; userToggled-Ref verhindert useEffect-Override nach Nutzer-Opt-out.

## Tasks Completed

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 RED | WR-05 KalenderScreen Filter-Chip Tests (fehlschlagend) | 8aa1ba1 | grün |
| 1 GREEN | Chip-State an useKalenderData + userToggled-Override-Fix | 85d2d6c | grün |

## What Was Built

### WR-05: Chip-State an useKalenderData durchgereicht

`app/app/(app)/kalender/index.tsx` — Wochen-View Screen:

**Vorher (defekt):**
```tsx
const { wochenAktionen, ... } = useKalenderData();  // ohne Option
// Screen-seitige Doppelfilterung:
const filteredAktionen =
  nurMeinePflanzen && meinePflanzenslugs.size > 0
    ? wochenAktionen.filter(({ plant }) => meinePflanzenslugs.has(plant.slug))
    : wochenAktionen;
// useEffect überschreibt Opt-out bei jeder meinePflanzenslugs-Änderung:
React.useEffect(() => {
  if (meinePflanzenslugs.size > 0) setNurMeinePflanzen(true);
}, [meinePflanzenslugs.size]);
```
Der Hook filterte intern immer auf "meine Pflanzen" (Default). Die screen-seitige Filterung fiel bei Chip-OFF auf das bereits-gefilterte `wochenAktionen` zurück → KalenderWochenCard zeigte NIE alle Aktionen.

**Nachher (korrekt):**
```tsx
const [nurMeinePflanzen, setNurMeinePflanzen] = React.useState(false);
const userToggled = React.useRef(false);

// Chip-State an Hook durchgereicht — Hook filtert wochenAktionen korrekt:
const { wochenAktionen, ... } = useKalenderData({ nurMeinePflanzen });

// Chip-Default: nur einmal initialisieren (Once-Guard via userToggled-Ref):
React.useEffect(() => {
  if (!userToggled.current && meinePflanzenslugs.size > 0) {
    setNurMeinePflanzen(true);
  }
}, [meinePflanzenslugs.size]);

// Pressable onPress: Opt-out markieren
onPress={() => {
  userToggled.current = true;
  setNurMeinePflanzen((v) => !v);
}}

// KalenderWochenCard erhält wochenAktionen direkt (kein filteredAktionen-Wrapper):
<KalenderWochenCard aktionen={wochenAktionen} ... />
```

### Neue Tests: KalenderScreen.test.tsx

`app/src/components/kalender/__tests__/KalenderScreen.test.tsx`:

| Test | Beschreibung |
|------|--------------|
| (a) | Chip-Toggle OFF → `useKalenderData` mit `{ nurMeinePflanzen: false }` aufgerufen |
| (b) | Nach Opt-out bleibt Chip OFF trotz `meinePflanzenslugs`-Änderung (userToggled-Guard) |
| (c) | Default-ON beim ersten Laden mit ≥1 Plan-Pflanze (Regression) |
| (d) | Default-OFF ohne Plan-Pflanzen |

Mock-Muster: expo-router, usePlants, useKalenderData, KalenderWochenCard, PflanzenKalenderZeile per jest.mock() — analog PflanzenDetail.test.tsx.

## Verification

- `pnpm --filter app exec jest --testPathPattern="KalenderScreen"` — 4/4 Tests grün
- `pnpm --filter app exec jest` (full suite) — 684/684 Tests, 87 Suites grün
- `pnpm --filter app exec tsc --noEmit` — exit 0
- Acceptance Criteria:
  - `grep -c "useKalenderData({" app/app/(app)/kalender/index.tsx` = 2 (>= 1) ✓
  - `grep -c "filteredAktionen" app/app/(app)/kalender/index.tsx` = 0 ✓
  - `grep -c "userToggled" app/app/(app)/kalender/index.tsx` = 6 (>= 1) ✓
  - Test (a): Chip-Toggle OFF → useKalenderData({ nurMeinePflanzen: false }) — grün ✓
  - Test (b): Opt-out bleibt nach meinePflanzenslugs-Änderung (checked === false) — grün ✓

## Deviations from Plan

### Auto-fix: testID="filter-chip-meine-pflanzen" hinzugefügt (Rule 2)

**Found during:** Task 1 RED
**Issue:** `getByRole('checkbox')` in RNTL findet den Pressable nicht zuverlässig (RNTL-Eigenart bei Pressable + accessibilityRole). Plan empfahl `getByRole` als Query-Strategie, aber in der Praxis scheitert das.
**Fix:** `testID="filter-chip-meine-pflanzen"` zum Pressable-Chip hinzugefügt; Tests verwenden `getByTestId`. Dies ist eine kleine Testbarkeits-Verbesserung ohne Verhaltensänderung. Kein CLAUDE.md-Verstoß.
**Files modified:** `app/app/(app)/kalender/index.tsx`

## Known Stubs

Keine. WR-05 vollständig implementiert und getestet.

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt. T-10-09-01 (Filter-State-Konsistenz) mitigiert: Chip-State als Single-Source an den Hook durchgereicht → keine divergierende Doppelfilterung; WochenCard und Jahresübersicht zeigen konsistente Daten.

## Self-Check: PASSED

- [x] `app/app/(app)/kalender/index.tsx` — `useKalenderData({ nurMeinePflanzen })` aufgerufen; kein filteredAktionen; userToggled-Ref vorhanden; testID am Chip
- [x] `app/src/components/kalender/__tests__/KalenderScreen.test.tsx` — 4 Tests (a-d) alle grün
- [x] Commit 8aa1ba1 (RED) — verifiziert
- [x] Commit 85d2d6c (GREEN) — verifiziert
- [x] Full test suite: 684 Tests grün — keine Regressionen
