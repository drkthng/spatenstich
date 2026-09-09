---
phase: quick-260611-kpl
plan: "01"
subsystem: web-editor
tags: [ux, drag, text-selection, web, editor]
dependency_graph:
  requires: [quick-260611-jzl]
  provides: [drag-text-selection-fix]
  affects: [WebRotationHandle, WebResizeHandle, WebPlanEditor]
tech_stack:
  added: []
  patterns: [preventDefault-on-mousedown, userSelect-none-on-canvas]
key_files:
  created: []
  modified:
    - app/src/components/editor/web/WebRotationHandle.tsx
    - app/src/components/editor/web/WebResizeHandle.tsx
    - app/src/components/editor/web/WebPlanEditor.tsx
    - app/src/components/editor/__tests__/WebRotationHandle.test.tsx
    - app/src/components/editor/__tests__/WebResizeHandle.test.tsx

decisions:

  - "e.preventDefault?.() (optional chaining) used in production code so partial mock events in tests (ohne preventDefault-Methode) nicht crashen"
  - "userSelect:none permanent auf Canvas-Container (kein mousedown/mouseup-Toggle) — Canvas enthaelt nur SVG-Render, keinen nutzer-selektierbaren Lauftext"
  - "preventDefault vor early-return in WebResizeHandle damit es auch bei fruehzeitigem return aufgerufen wird"

metrics:
  duration: "5min"
  completed: "2026-06-11"
  tasks_completed: 2
  files_changed: 5
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-09
  status: unknown
---

# Quick 260611-kpl: Web-Editor Text-Selektion beim Drag unterbinden — Summary

**One-liner:** `e.preventDefault?.()` in allen drei Web-Drag-mousedown-Handlern plus `userSelect:'none'` auf Canvas-Container unterbindet native Browser-Text-Selektion beim Rotieren, Resizen und Verschieben.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | preventDefault + userSelect:none in allen drei Drag-Handlern | 8f5d230 | WebRotationHandle.tsx, WebResizeHandle.tsx, WebPlanEditor.tsx |
| 2 | preventDefault-Spy-Assertions in Handle-Tests | adce1b3 | WebRotationHandle.test.tsx, WebResizeHandle.test.tsx |

## Changes

### Task 1 — Produktion-Code

**WebRotationHandle.tsx (Zeile 88):**
`e.preventDefault?.();` nach `e.stopPropagation();` im `onMouseDown`-Callback.

**WebResizeHandle.tsx (Zeile 142):**
`e.preventDefault?.();` nach `e.stopPropagation();` im `onMouseDown`-Callback, VOR dem early-return-Check auf `el.deletedAt`.

**WebPlanEditor.tsx (Zeile 253):**
`e.preventDefault?.();` nach `e.stopPropagation();` im `handleElementMouseDown`-Callback (Move-Drag-Pfad).

**WebPlanEditor.tsx cursorStyle (Zeilen 285-287):**
Beide Zweige (placing/default) um `userSelect: 'none'` und `WebkitUserSelect: 'none'` erweitert.

### Task 2 — Tests

Zwei neue `it(...)` Tests (je einer pro Handle-Test-Datei):

- Mock-Event mit `preventDefault: jest.fn()` + `stopPropagation: jest.fn()`
- `act(() => views[0].props.onMouseDown(evt))`
- `expect(evt.preventDefault).toHaveBeenCalled()`

## Verification

- TypeScript: `pnpm --filter app exec tsc --noEmit` — gruen, kein Output
- Jest: `pnpm --filter app exec jest --testPathPattern="WebRotationHandle|WebResizeHandle"` — 15/15 gruen (13 bestehend + 2 neu)
  - REGRESSION quick-260611-jzl first-move-Offset-Test: GRUEN
  - REGRESSION quick-260610-jtf rotated-resize-Tests (rotateDeg=0/45/90): GRUEN

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — rein defensives UX-Fix ohne neue Netzwerk-Endpunkte oder Auth-Pfade.

## Self-Check: PASSED

- [x] app/src/components/editor/web/WebRotationHandle.tsx — FOUND
- [x] app/src/components/editor/web/WebResizeHandle.tsx — FOUND
- [x] app/src/components/editor/web/WebPlanEditor.tsx — FOUND
- [x] app/src/components/editor/__tests__/WebRotationHandle.test.tsx — FOUND
- [x] app/src/components/editor/__tests__/WebResizeHandle.test.tsx — FOUND
- [x] Commit 8f5d230 — FOUND
- [x] Commit adce1b3 — FOUND
