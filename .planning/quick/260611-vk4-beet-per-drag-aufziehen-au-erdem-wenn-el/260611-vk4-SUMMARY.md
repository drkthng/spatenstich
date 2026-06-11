---
phase: quick-260611-vk4
plan: 01
subsystem: editor/web
tags: [drag-to-create, deselect-fix, ux, beet, web-editor]
dependency_graph:
  requires: [WebPlanEditor.tsx, editorStore.ts]
  provides: [Drag-to-create Beet, Deselect-on-background-click]
  affects: [app/src/components/editor/web/WebPlanEditor.tsx]
tech_stack:
  added: []
  patterns: [createDragRef-Pattern, window-level-useEffect-Listener, justCreatedRef-Suppression]
key_files:
  created:
    - app/src/components/editor/__tests__/WebPlanEditor.dragcreate.test.tsx
  modified:
    - app/src/components/editor/web/WebPlanEditor.tsx
decisions:
  - "handleCanvasMouseDown an Svg-Element (nicht div) — e.currentTarget ist direkt das SVG, kein querySelector nötig"
  - "onClick (Deselect/Platzierung) ebenfalls an Svg verschoben — konsistenter Handler-Ort, testID-zugänglich"
  - "Reiner Klick im Beet-Modus erzeugt KEIN Beet via Drag-Pfad; handleSvgClick-Fallback bleibt aktiv (Default-Größe)"
  - "getBoundingClientRect-Fallback {left:0,top:0} für jsdom-Tests ohne echtes SVG-DOM"
  - "justCreatedRef mit setTimeout(0) unterdrückt den nachfolgenden click nach Drag-to-create-mouseup"
metrics:
  duration: "~40 min"
  completed_date: "2026-06-11"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260611-vk4: Beet per Drag aufziehen + Deselect-Fix — Summary

**One-liner:** Drag-to-create für Beete via createDragRef/window-mouseup + zuverlässiger Deselect-on-background-click durch Early-Return-Entfernung in handleSvgClick.

## Objective

Zwei UX-Verbesserungen im `WebPlanEditor.tsx`:

1. **Beet per Drag aufziehen** — Press → Ziehen → Release erstellt Beet mit aufgezogenen Maßen (MIN_BEET_M=0,5m, Clamping, Vorschau-Rechteck).
2. **Deselect-Fix** — Klick auf leere Canvas-Fläche hebt Selektion zuverlässig auf (Early-Return entfernt).

## Tasks Executed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Drag-to-create Beet + Deselect-Fix implementieren | 52b5f7e, 5a46638 | WebPlanEditor.tsx |
| 2 | Tests für Drag-to-create + Deselect-on-background-click | 561cd68 | WebPlanEditor.dragcreate.test.tsx |

## Implementation Details

### Task 1: WebPlanEditor.tsx — Neue Konstante + Interfaces + Logik

**Neue Konstante:**
- `MIN_BEET_M = 0.5` — Mindest-Kantenlänge eines aufgezogenen Beetes

**Neue Interfaces:**
- `CreateDrag` — hält `startClientX/Y` + `startSvgX/Y` des Aufzieh-Starts
- `CreateRect` — Vorschau-Rechteck-State (px im SVG-Koordinatensystem)

**Neue Refs/State:**
- `createDragRef` — aktiver Aufzieh-Vorgang (analog `pendingDragRef`)
- `justCreatedRef` — Suppression-Flag verhindert Deselect unmittelbar nach Drag-to-create
- `createRect` State — gestricheltes Vorschau-Rechteck während Ziehen

**Neuer createDrag-useEffect:**
- window-level `mousemove`: aktualisiert Vorschau-State solange `createDragRef` gesetzt
- window-level `mouseup`: prüft Drag-Distanz (< MOUSE_DRAG_THRESHOLD_PX → Abbruch), berechnet widthM/heightM aus |dx|/|dy|/scale, klemmt auf MIN_BEET_M, clampet Center identisch zum Klick-Pfad, ruft genau einmal `addElement` + `setSelection` + `onPlaced`; KEIN `setGestureActive` nötig

**Handler-Refactor:**
- `handleCanvasMouseDown` am `<Svg>`-Element (nicht `<div>`) — `e.currentTarget` ist das SVG selbst
- `handleSvgClick` ebenfalls an `<Svg>` verschoben (spread-cast für TS-Kompatibilität)
- `onClick`/`onMouseDown` via `{...({} as any)}`-Spread wegen `SvgProps` ohne `onClick`-Deklaration

**Deselect-Fix:**
- Frühere Early-Return-Zeile `if (e.target !== e.currentTarget && !placingKind) return` entfernt
- Element-Klicks sind durch `e.stopPropagation()` in `handleElementMouseDown` geschützt
- Jeder Klick, der `handleSvgClick` erreicht, deselectiert (außer `justCreatedRef` gesetzt)

### Task 2: WebPlanEditor.dragcreate.test.tsx — 7 Tests

| Test | Beschreibung | Ergebnis |
|------|-------------|----------|
| Test A | Drag über Schwelle → addElement(Beet), setSelection, onPlaced | PASS |
| Test A (Maße) | widthM/heightM ≈ Drag-Abstand / scale | PASS |
| Test B | Drag < 5px → kein addElement via Drag-Pfad | PASS |
| Test C | Drag knapp über Schwelle → widthM/heightM >= MIN_BEET_M | PASS |
| Test D | Drag am Rand → Center geclampt in [size/2, dim-size/2] | PASS |
| Test E | Klick auf leere Canvas bei Selektion → setSelection(null) | PASS |
| Test F | Element-mousedown → setSelection(elementId), kein Deselect (Regression) | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] handleCanvasMouseDown: getBoundingClientRect undefined in Tests**
- **Found during:** Task 2 (Test A schlägt fehl mit TypeError)
- **Issue:** In jsdom mit react-native-svg-Mock hat `e.currentTarget` kein `getBoundingClientRect()`
- **Fix:** Optional-Chaining + Fallback `{left:0, top:0}` in `handleCanvasMouseDown`
- **Files modified:** WebPlanEditor.tsx
- **Commit:** 5a46638

**2. [Rule 3 - Blocking] onClick auf Svg-Typ nicht zuweisbar (TS2322)**
- **Found during:** Task 2 (tsc-Fehler nach Handler-Verschiebung an Svg)
- **Issue:** `react-native-svg` SvgProps deklariert `onClick` nicht; direktes Prop-Assignment schlägt fehl
- **Fix:** Spread-Cast `{...({onClick, onMouseDown} as any)}` für beide Handler
- **Files modified:** WebPlanEditor.tsx
- **Commit:** 5a46638

### Design Decisions (Dokumentiert)

**Reiner Klick im Beet-Modus:** Ein reiner Klick (< 5px Bewegung) im Beet-Modus löst den Drag-Pfad NICHT aus. `handleSvgClick` als Fallback platziert weiterhin ein Beet mit Default-Größe (2×1m) via Klick. Dieses Verhalten ist bewusst — konsistent mit dem PLAN ("KEIN Beet via Drag" bei reinem Klick, aber "Klick-Platzierungs-Pfad für Beet-Default trotzdem ... laufen lassen"). In Tests wird kein synthetisches `click`-Event nach `window.dispatchEvent(mouseup)` gefeuert, sodass Tests isoliert den Drag-Pfad verifizieren.

## Test Results

```
pnpm exec jest --selectProjects editor --testPathPattern=WebPlanEditor.dragcreate
Tests: 7 passed, 7 total

pnpm exec jest --selectProjects editor --testPathPattern=WebPlanEditor
Tests: 26 passed, 26 total (keine Regression in arrowkeys, dblclick, rotation)

pnpm exec tsc --noEmit -p tsconfig.json → 0 Fehler
```

## Known Stubs

Keine Stubs. Alle Drag-to-create-Maße werden aus echten Drag-Koordinaten berechnet.

## Threat Flags

Keine neuen Sicherheitsflächen. Implementierung der Mitigations aus dem Threat Register:
- T-vk4-01 (Tampering): Clamping + MIN_BEET_M-Untergrenze implementiert ✓
- T-vk4-02 (DoS): MOUSE_DRAG_THRESHOLD_PX-Guard implementiert ✓
- T-vk4-03 (Repudiation): bestehender Outbox-Pfad unverändert ✓

## Self-Check: PASSED

- `app/src/components/editor/web/WebPlanEditor.tsx` — vorhanden (createDragRef enthalten)
- `app/src/components/editor/__tests__/WebPlanEditor.dragcreate.test.tsx` — vorhanden
- Commits: 52b5f7e, 5a46638, 561cd68 — alle in git log vorhanden
- tsc: 0 Fehler
- Tests: 7/7 + 26/26 gesamt GREEN
