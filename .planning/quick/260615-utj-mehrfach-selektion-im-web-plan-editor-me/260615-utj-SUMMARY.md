---
phase: quick-260615-utj
plan: 01
subsystem: editor
tags: [multi-select, web-editor, marquee, group-move, store]
dependency_graph:
  requires: []
  provides: [multi-select-state, group-drag, marquee-selection, group-arrow-move, group-delete]
  affects: [editorStore, WebPlanEditor]
tech_stack:
  added: []
  patterns: [TDD RED-then-GREEN, defensive-fallback-for-mocks, incremental-delta-group-drag, AABB-overlap-test]
key_files:
  created:
    - app/src/stores/__tests__/editorStore.multiselect.test.ts
    - app/src/components/editor/__tests__/WebPlanEditor.multiselect.test.tsx
  modified:
    - app/src/stores/editorStore.ts
    - app/src/components/editor/web/WebPlanEditor.tsx
decisions:
  - "selectedIds als least-breaking Addition: setSelection hält selectedIds synchron (Backward-Compat)"
  - "Defensive ?? [] / typeof-Guards in WebPlanEditor für alte Test-Mocks (NICHT in Store)"
  - "lastMoveRef für inkrementale Gruppen-Drag-Deltas (kein kumulativer Drift)"
  - "act() in T-utj-web-06 notwendig um React-State-Updates (setDrag) vor zweitem mousemove zu flushen"
  - "AABB-Overlap-Test im Marquee liest direkt aus getState() (nicht aus closurem visibleElements)"
  - "Native (Skia) Multi-Select bewusst deferred — nur Web/Maus"
metrics:
  duration: ~45min
  completed: "2026-06-15"
  tasks_completed: 2
  files_changed: 4
---

# Phase quick-260615-utj Plan 01: Mehrfach-Selektion im Web-Plan-Editor — Summary

**One-liner:** Multi-Select via `selectedIds[]`-Store-Extension + Ctrl/Cmd-Toggle, Marquee-Rubber-Band, Gruppen-Drag/Pfeiltasten/Delete mit gruppenweitem Clamping im Web-Editor.

## Objective

Mehrfach-Selektion im Web-Plan-Editor: Elemente per Strg/Cmd-Klick additiv markieren, per Marquee (Rubber-Band-Aufziehen) mehrere berühren, und die Gruppe gemeinsam per Maus-Drag, Pfeiltasten oder Delete-Taste bearbeiten. Alle Gruppen-Aktionen fließen über den bestehenden Outbox-Persistenzpfad.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| TDD RED 1 | editorStore.multiselect.test.ts (RED) | `80dccc4` | editorStore.multiselect.test.ts |
| GREEN 1 | editorStore Multi-Select — selectedIds/toggle/setMany/clear/moveSelectedBy | `1c9537f` | editorStore.ts |
| TDD RED 2 | WebPlanEditor.multiselect.test.tsx (RED) | `2a58331` | WebPlanEditor.multiselect.test.tsx |
| GREEN 2 | WebPlanEditor Multi-Select-Wiring | `135f4e8` | WebPlanEditor.tsx, WebPlanEditor.multiselect.test.tsx |

## What Was Built

### Task 1: editorStore Multi-Select-State

**editorStore.ts** (`app/src/stores/editorStore.ts`):
- `EditorState.selectedIds: string[]` — Multi-Select-IDs, standardmäßig `[]`; NOT in zundo partialize (Pitfall-3)
- `setSelection(id)` — jetzt synchronisiert `selectedIds = id ? [id] : []` (Backward-Compat)
- `toggleSelection(id)` — additives Toggle; `selection` = letztes Element des resultierenden Arrays
- `setSelectedIds(ids)` — Ersetzt komplett; `selection` = letztes Element (oder null)
- `clearSelection()` — leert `selectedIds` + `selection`
- `moveSelectedBy(dxM, dyM)` — verschiebt alle `selectedIds`-Elemente (deletedAt===null) via `updateElement`; kein Clamping im Store
- undo/redo-Wrapper: setzt jetzt auch `selectedIds:[]` (stale-Pointer-Schutz)
- Persistenz: bestehende gestureActive-Flush-Subscription iteriert alle geänderten Element-Refs — Gruppen-Moves ohne Zusatzcode persistiert

**Test-Ergebnis:** 18 Store-Tests grün (T-utj-store-01..08 + 10 weitere Szenarien)

### Task 2: WebPlanEditor Multi-Select-Wiring

**WebPlanEditor.tsx** (`app/src/components/editor/web/WebPlanEditor.tsx`):
- `selectedIds = useEditorStore((s) => s.selectedIds) ?? []` — Selector + Fallback für alte Mocks
- `handleElementMouseDown`: Ctrl/Cmd → `toggleSelection(id)`; Gruppe-ohne-Modifier → selectedIds NICHT kollabieren
- `lastMoveRef` — inkrementaler Delta-Tracker für Gruppen-Drag (kein kumulativer Drift)
- Drag-useEffect: prüft `selectedIds.length > 1 && selectedIds.includes(drag.id)` → `moveSelectedBy(incrDx, incrDy)` mit Gruppen-Clamping; Einzel-Pfad unverändert
- Pfeiltasten-useEffect: `selectedIds.length > 1` → `moveSelectedBy()` mit Gruppen-Clamping; `length <= 1` → bestehender Einzel-`updateElement`-Pfad
- Delete-Effect: `selectedIds.length > 0` → alle löschen + `clearSelection()` (Gruppen-Delete)
- Escape: `clearSelection()`
- `handleCanvasMouseDown`: jetzt auch Marquee starten bei `!placingKind`
- Marquee-useEffect (neu): AABB-Overlap-Test → `setSelectedIds(matchingIds)`; Schwellwert 5px; `justMarqueeRef` verhindert sofortiges Deselect
- `handleDivClick`: `justMarqueeRef`-Guard ergänzt
- Rendering: `selected = selectedIds.includes(el.id)` (Outline an ALLEN selektierten); Handles bleiben am primären `selectedEl`
- Marquee-Vorschau-Rect gerendert (gestrichelt, halbtransparent)
- Defensive `typeof`-Guards für `clearSelection`, `toggleSelection`, `setSelectedIds` → Rückwärtskompatibilität mit bestehenden Test-Mocks

**Test-Ergebnis:** 10 Component-Tests grün (T-utj-web-01..10)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Defensive Fallbacks] Bestehende Test-Mocks haben kein `selectedIds`**
- **Found during:** GREEN Task 2, Regressions-Check
- **Issue:** Alte Test-Mocks (clickSelect, arrowkeys, dblclick, dragcreate, rotation) definieren keinen `selectedIds`-Schlüssel → `selectedIds.includes()` → `TypeError: Cannot read properties of undefined`
- **Fix:** `?? []` Fallback am Selector + `typeof`-Guards für alle neuen Store-Aktionen in WebPlanEditor.tsx
- **Files modified:** `WebPlanEditor.tsx`
- **Rationale:** Keine Änderung an allen bestehenden Test-Dateien nötig — defensive Guards in der Produktionskomponente

**2. [Rule 1 - Bug] `clearSelection` nicht in alten Test-Mocks**
- **Found during:** GREEN Task 2, Regressions-Check
- **Issue:** `handleDivClick` und Delete-Effect riefen `clearSelection()` direkt — wirft `TypeError` wenn Mock die Funktion nicht kennt
- **Fix:** `typeof s.clearSelection === 'function' ? s.clearSelection() : s.setSelection(null)` Pattern in beiden Aufrufsfeldern

**3. [Rule 3 - Test] `act()` für T-utj-web-06 erforderlich**
- **Found during:** GREEN Task 2, erster Testlauf
- **Issue:** Drag-useEffect registriert sich erst nach React-Re-Render (nach `setDrag()`). Ohne `act()` zwischen den `mousemove`-Events ist der Drag-Effekt beim zweiten Event noch nicht aktiv.
- **Fix:** Test auf `async` + `await act(async () => {...})` umgestellt. Entspricht der realen Browser-Situation wo Renders vor dem nächsten Event flushen.

## Test Results

### New Tests (this plan)
- `editorStore.multiselect.test.ts`: **18/18 grün** (T-utj-store-01..08 + Varianten)
- `WebPlanEditor.multiselect.test.tsx`: **10/10 grün** (T-utj-web-01..10)

### Regression Check (Full Suite)
- `pnpm --filter app exec jest`: **766/766 Tests grün** — 0 Regressionen
- TypeScript Typecheck: **exit 0** (kein Fehler)

### Pre-existing Warning
- "A worker process has failed to exit gracefully" — pre-existing (open handles in Timer-Tests); nicht durch diesen Quick-Task eingeführt

## Known Stubs

Keine. Alle Multi-Select-Pfade sind vollständig implementiert und getestet. Native (Skia) Multi-Select ist bewusst deferred (User fragte explizit nach Maus/Web).

## Threat Flags

Keine neuen Bedrohungsflächen. Multi-Select operiert ausschließlich auf dem lokalen editorStore — keine neuen Netzwerk-Endpunkte, keine neuen Auth-Pfade.

## Commits

| Hash | Message |
|------|---------|
| `80dccc4` | test(quick-260615-utj): TDD RED — editorStore.multiselect.test.ts |
| `1c9537f` | feat(quick-260615-utj): editorStore Multi-Select — selectedIds, toggleSelection, setSelectedIds, clearSelection, moveSelectedBy |
| `2a58331` | test(quick-260615-utj): TDD RED — WebPlanEditor.multiselect.test.tsx |
| `135f4e8` | feat(quick-260615-utj): WebPlanEditor Multi-Select-Wiring |

## Self-Check: PASSED

- [x] `app/src/stores/editorStore.ts` — exists and modified
- [x] `app/src/stores/__tests__/editorStore.multiselect.test.ts` — exists (189 lines)
- [x] `app/src/components/editor/web/WebPlanEditor.tsx` — exists and modified
- [x] `app/src/components/editor/__tests__/WebPlanEditor.multiselect.test.tsx` — exists (462+ lines)
- [x] Commits 80dccc4, 1c9537f, 2a58331, 135f4e8 — alle in git log vorhanden
- [x] Full app jest suite: 766/766 grün (exit 0)
- [x] TypeScript typecheck: exit 0
