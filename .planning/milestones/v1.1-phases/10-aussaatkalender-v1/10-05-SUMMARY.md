---
phase: 10-aussaatkalender-v1
plan: "05"
subsystem: kalender-engine
tags: [bug-fix, tdd, calendar, wrap-normalization, dst-fix]
dependency_graph:
  requires: []
  provides: [getAktuelleKw-dst-safe, wrap-normalization, gantt-guard]
  affects: [GanttStreifen, useKalenderData, KalenderWochenCard]
tech_stack:
  added: []
  patterns: [UTC-basierte ISO-KW-Berechnung, Kantenpinning für ISO-Wrap, Defensiver null-Return-Guard]
key_files:
  created:
    - app/src/components/kalender/__tests__/GanttStreifen.guard.test.tsx
  modified:
    - packages/shared/src/lib/kalenderEngine.ts
    - packages/shared/src/lib/__tests__/kalenderEngine.test.ts
    - app/src/components/kalender/GanttStreifen.tsx
    - app/src/components/kalender/__tests__/GanttStreifen.test.tsx
decisions:
  - "WR-03: Direkte UTC-Arithmetik statt DOY-Umweg — eliminiert DST-Drift (CET/CEST ±1h) die Math.ceil/-floor beim Local-Zeit-Diff verursachen"
  - "WR-04 Engine: Kantenpinning-Strategie (s<=7 → startKw=1; e>=359 → endKw=53) per REVIEW-Empfehlung"
  - "WR-04 Komponente: Separates Testmodul GanttStreifen.guard.test.tsx mit Modul-Level-Mock damit echte Engine-Tests in GanttStreifen.test.tsx unberührt bleiben"
metrics:
  duration: "6 Minuten"
  completed: "2026-06-11"
  tasks: 2
  files: 5
requirements: [CAL-01, CAL-02]
---

# Phase 10 Plan 05: WR-03/WR-04 Gap-Closure — Engine-Defekte + Gantt-Guard Summary

**One-liner:** DST-sichere UTC-KW-Berechnung + ISO-Wrap-Kantenpinning in kalenderEngine; defensiver Breiten-Guard in GanttStreifen

## What Was Built

Zwei Engine-Defekte aus dem Phase-10 Code-Review (WR-03, WR-04) geschlossen, beide mit vollständigem TDD RED→GREEN-Zyklus.

### Task 1: WR-03 + WR-04 in kalenderEngine.ts (TDD)

**WR-03 (getAktuelleKw Off-by-one):** Die bisherige Implementierung berechnete den DOY über `(now.getTime() - new Date(year,0,0).getTime()) / 86400000` mit `Math.ceil`. In der Zeitzone CEST (UTC+2) erzeugt der Jahresanfang (CET, UTC+1) eine 1-Stunden-Verschiebung, sodass `diffDays` z.B. `165.958` statt `166` ergibt und `Math.ceil` den falschen DOY 166 statt 165 liefert — oder umgekehrt an Sonntagen `Math.ceil` den DOY des Folgetages gibt.

**Fix:** Statt DOY-Umweg direkte UTC-basierte ISO-KW-Berechnung (identische Arithmetik wie `doyToIsoKw`): lokale Datumskomponenten über `Date.UTC(year, month, date)` in UTC konvertieren, dann ISO-Woche via Thursday-Verschiebung berechnen. Neuer optionaler Parameter `now: Date = new Date()` für Testbarkeit ohne Breaking Change.

**WR-04 (ISO-Wochen-Wrap in addWindow):** `doyToIsoKw()` gibt die echte ISO-KW zurück, die an Jahresgrenzen wrappt. Früh-Januar-DOYs (z.B. durch Zone-1-Offset −30 Tage) können ISO-KW 52/53 des Vorjahres ergeben (`startKw = 52 > endKw = 3`). Spät-Dezember-DOYs können ISO-KW 1 des Folgejahres ergeben.

**Fix:** Nach KW-Konvertierung Wrap-Invariante prüfen. `let` statt `const` für `startKw`/`endKw`. Wenn `startKw > endKw`: `if (s <= 7) startKw = 1` (Früh-Januar → KW 1 pinnen); `if (e >= 359) endKw = 53` (Spät-Dez → KW 53 pinnen). DOY-Clamp (1..365) und KW-Clamp (`Math.min(53)`) bleiben erhalten.

### Task 2: WR-04 Komponenten-Hälfte — GanttStreifen.tsx (TDD)

**Defensiver Guard:** In der `fenster.map`-Schleife nach Berechnung von `clampedStart`/`clampedEnd`: `if (clampedEnd < clampedStart) return null;`. Verhindert negative `width`-Prozentwerte (`width = (clampedEnd - clampedStart + 1) / TOTAL_KW * 100` würde negativ werden und das Layout beschädigen).

**Testinfrastruktur:** Neues separates Testmodul `GanttStreifen.guard.test.tsx` mit Modul-Level-`jest.mock('@spatenstich/shared')` das `getFensterFuerPflanze` mit einem invertierten Fenster (startKw=30 > endKw=5) plus einem gültigen Fenster mockt. Ohne Guard: 2 Balken. Mit Guard: 1 Balken. Die 4 bestehenden Tests in `GanttStreifen.test.tsx` nutzen weiterhin die echte Engine.

## Verification Results

- `pnpm --filter @spatenstich/shared exec jest kalenderEngine` — 19/19 grün (15 bestehend + 4 neu)
- `pnpm --filter app exec jest --testPathPattern="GanttStreifen"` — 6/6 grün (4 bestehend + 2 neu)
- `pnpm --filter @spatenstich/shared typecheck` — exit 0
- `pnpm --filter app exec tsc --noEmit` — exit 0

## Commits

| Hash | Type | Beschreibung |
|------|------|--------------|
| 723fe4d | test | RED: failing tests WR-03 Sonntag/Montag + WR-04 Wrap-Invariante |
| e3e25bc | feat | GREEN: UTC-basierte KW-Berechnung + ISO-Wrap-Kantenpinning |
| a8d55f4 | test | RED: failing guard test für invertiertes Fenster in GanttStreifen |
| 21c59ba | feat | GREEN: Breiten-Guard clampedEnd < clampedStart in GanttStreifen |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Math.floor-Ansatz funktioniert nicht in CEST/CET-Umgebung**
- **Found during:** Task 1 GREEN-Phase (Test schlägt fehl: Montag liefert KW 24 statt 25)
- **Issue:** `Math.floor((now.getTime() - new Date(year,0,0)) / 86400000)` hat das gleiche DST-Problem wie `Math.ceil` — in CEST (UTC+2) ist Jan-0 in CET (UTC+1), der Diff ist 165.958 Tage statt 166, also `Math.floor = 165` (falscher DOY)
- **Fix:** Direkte UTC-Arithmetik analog zu `doyToIsoKw`: `Date.UTC(year, month, date)` eliminiert DST-Drift vollständig. Review-Empfehlung "compute the ISO week directly from now with the same UTC arithmetic as doyToIsoKw" umgesetzt.
- **Files modified:** `packages/shared/src/lib/kalenderEngine.ts`
- **Commit:** e3e25bc

**2. [Rule 2 - Test-Infrastruktur] Separates Testmodul für Guard-Test statt jest.mock in beforeEach**
- **Found during:** Task 2 RED-Phase (jest.mock() Hoisting verhindert dynamisches Mocking in beforeEach)
- **Issue:** `jest.mock()` wird an den Modulanfang gehoisted und kann nicht in `beforeEach` zur Laufzeit dynamisch gesetzt werden
- **Fix:** Separates Testmodul `GanttStreifen.guard.test.tsx` mit Modul-Level-Mock — jest.mock() Hoisting sichert korrekte Anwendung. Plan empfahl bereits diesen Ansatz als bevorzugte Variante.
- **Files modified/created:** `app/src/components/kalender/__tests__/GanttStreifen.guard.test.tsx`
- **Commit:** a8d55f4

## TDD Gate Compliance

- RED gate (Task 1): commit 723fe4d — `test(10-05):` Präfix vorhanden
- GREEN gate (Task 1): commit e3e25bc — `feat(10-05):` Präfix vorhanden
- RED gate (Task 2): commit a8d55f4 — `test(10-05):` Präfix vorhanden
- GREEN gate (Task 2): commit 21c59ba — `feat(10-05):` Präfix vorhanden

Alle vier TDD-Gates korrekt eingehalten.

## Known Stubs

Keine. Alle Fixes sind vollständig implementiert und durch Tests verifiziert.

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt. Reine Berechnungs- und Rendering-Logik; kein neuer Input-Pfad, keine DB-Mutation, kein Netzwerk. T-10-05-02 (GanttStreifen DoS durch Fehl-Fenster) durch Guard mitigiert.

## Self-Check: PASSED

- packages/shared/src/lib/kalenderEngine.ts — vorhanden
- packages/shared/src/lib/__tests__/kalenderEngine.test.ts — vorhanden (19 Tests grün)
- app/src/components/kalender/GanttStreifen.tsx — vorhanden (Guard eingebaut)
- app/src/components/kalender/__tests__/GanttStreifen.guard.test.tsx — vorhanden (2 Guard-Tests grün)
- Commits 723fe4d, e3e25bc, a8d55f4, 21c59ba — alle vorhanden in git log
