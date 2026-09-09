---
phase: quick-260611-ln5
plan: 01
subsystem: editor
tags: [keyboard, arrow-keys, gesture, persistence, tdd]
dependency_graph:
  requires: [quick-260611-l5y, quick-260611-kpl, quick-260611-jzl]
  provides: [arrow-key-move-web-editor]
  affects: [WebPlanEditor.tsx, editorStore gesture path]
tech_stack:
  added: []
  patterns: [Burst-Gesture-Wrapping, Debounce-Timer-Ref, TDD-RED-GREEN]
key_files:
  created:
    - app/src/components/editor/__tests__/WebPlanEditor.arrowkeys.test.tsx
  modified:
    - app/src/components/editor/web/WebPlanEditor.tsx

decisions:

  - "Pfeiltasten-useEffect eigenständig (kein Merge in Delete/Escape-Effekt) — Burst-Timer-Ref + Cleanup sauber gekapselt, keine Regression der frischen Fixes"
  - "Fokus-Guard dual: e.target.tagName + document.activeElement.tagName — robuster in jsdom (dispatchEvent setzt e.target auf window)"
  - "jest.useFakeTimers() lokal pro Test (try/finally) statt global in beforeEach — vermeidet Timeout-Fehler in @testing-library/react-native act()"

metrics:
  duration: "~15min"
  completed: "2026-06-11"
  tasks_completed: 2
  files_modified: 2
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-09
  status: unknown
---

# Phase quick-260611-ln5 Plan 01: Pfeiltasten-Move Summary

**One-liner:** Pfeiltasten-Move im Web-Plan-Editor via Burst-Gesture-Wrapping (ARROW_STEP_M=0.1m / ARROW_STEP_SHIFT_M=0.5m, 400ms Debounce → l5y-Flush).

## Was gebaut wurde

Selektiertes Element im Web/Desktop-Plan-Editor per Pfeiltasten (←↑→↓) verschieben, mit Shift-Modifier für großen Schritt. Persistenz über den bestehenden Gesture-End-Flush-Pfad (l5y), Key-Repeat-sicher durch Burst-Gesture-Wrapping (ein zundo-Snapshot pro Burst).

### Neue Konstanten in WebPlanEditor.tsx

```typescript
const ARROW_STEP_M = 0.1;        // kleine Schrittweite (Pfeil ohne Modifier)
const ARROW_STEP_SHIFT_M = 0.5;  // große Schrittweite (Shift+Pfeil)
const ARROW_COMMIT_DEBOUNCE_MS = 400; // Burst-Fenster
```

### Neuer keydown-useEffect in WebPlanEditor.tsx

Eigenständiger Effekt (getrennt vom Delete/Escape-Effekt) mit:

- Fokus-Guard: `e.target.tagName` + `document.activeElement.tagName` (INPUT/TEXTAREA) + `isContentEditable`
- Selektions-Guard: nur bei gesetzter Selektion + nicht-gelöschtem Element
- Richtungs-Mapping: ArrowLeft→xM--, ArrowRight→xM++, ArrowUp→yM--, ArrowDown→yM++ (Y wächst nach unten)
- Clamping identisch zum Maus-Drag-`onMove`
- Burst-Gesture-Wrapping: `arrowBurstActiveRef` + `arrowDebounceTimerRef` in `React.useRef`
- Cleanup: Timer clearen + `setGestureActive(false)` bei offenem Burst

## Commits

| Commit | Typ | Beschreibung |
|--------|-----|-------------|
| `173988a` | test (RED) | 7 failing Behaviors: kleiner/großer Schritt, Guards, Clamping, Persistenz-Pfad, Burst |
| `124bd20` | feat (GREEN) | Implementierung + Timer-Fix in Tests (lokale fake timers statt global) |

## Aufgaben

| # | Aufgabe | Status | Commit |
|---|---------|--------|--------|
| 1 | Pfeiltasten-Move-Listener + Regressionstest (TDD RED→GREEN) | Abgeschlossen | 173988a, 124bd20 |
| 2 | Volle Editor-Test-Suite grün — keine Regression | Abgeschlossen | — (keine Code-Änderung nötig) |

## Test-Ergebnisse

**Task 1 (arrowkeys):** 10/10 Tests grün

- Test 1 (ArrowRight/Left/Down/Up kleiner Schritt)
- Test 2 (Shift+Pfeil großer Schritt)
- Test 3 (Selektions-Guard: selection=null → kein updateElement)
- Test 4 (Fokus-Guard: INPUT als activeElement → kein updateElement, kein preventDefault)
- Test 5 (Clamping an der rechten Kante)
- Test 6 (Persistenz-Pfad: setGestureActive true→false nach Debounce)
- Test 7 (Key-Repeat Burst: setGestureActive(true) exakt EINMAL pro Burst)

**Task 2 (gesamte Editor-Suite):** 224/224 Tests grün, 31 Test-Suiten — keine Regression der Fixes l5y, kpl, jzl.

## Deviationen vom Plan

### Auto-fixte Probleme

**1. [Rule 1 - Bug] jest.useFakeTimers() global verursachte Timeout in @testing-library/react-native**

- **Gefunden während:** Task 1 TDD GREEN (Tests 6+7 timeouteten mit "Exceeded timeout of 5000 ms for a hook")
- **Problem:** `jest.useFakeTimers()` in `beforeEach` fakete React-interne Timer, was dazu führte, dass `render()` / `act()` in der Testing Library nicht abschloss
- **Fix:** Fake Timers lokal in Tests 6 und 7 via `jest.useFakeTimers()` / `jest.useRealTimers()` in `try/finally`-Block — kein globales `beforeEach/afterEach`
- **Dateien:** `app/src/components/editor/__tests__/WebPlanEditor.arrowkeys.test.tsx`
- **Commit:** `124bd20` (Teil des GREEN-Commits)

## TDD Gate Compliance

- RED-Commit: `173988a` (`test(quick-260611-ln5): RED — ...`)
- GREEN-Commit: `124bd20` (`feat(quick-260611-ln5): ...`)
- Gate-Sequenz korrekt: test → feat

## Known Stubs

Keine. Vollständige Implementierung mit echtem Persistenz-Pfad (setGestureActive → l5y-Flush).

## Threat Flags

Keine neuen sicherheitsrelevanten Flächen eingeführt. Der `e.preventDefault()`-Aufruf ist korrekt auf tatsächliche Verschiebungen beschränkt.

## Self-Check: PASSED

- `app/src/components/editor/web/WebPlanEditor.tsx` enthält `ARROW_STEP_M`, `ARROW_STEP_SHIFT_M`, `ARROW_COMMIT_DEBOUNCE_MS`, `ArrowLeft`-Behandlung: FOUND
- `app/src/components/editor/__tests__/WebPlanEditor.arrowkeys.test.tsx` existiert: FOUND
- Commits `173988a` und `124bd20` im git log: FOUND
- 224 Editor-Tests grün: VERIFIED
