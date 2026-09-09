---
quick: 260611-l5y
phase: quick
plan: 260611-l5y
subsystem: editor-store
tags: [bug-fix, tdd, persistence, gesture, autosave]
dependency_graph:
  requires: [editorStore.ts, saveDebounce.ts]
  provides: [gesture-end-persist, regression-test]
  affects: [WebPlanEditor.tsx, WebResizeHandle.tsx, WebRotationHandle.tsx, EditorCanvas.tsx]
tech_stack:
  added: []
  patterns: [gesture-snapshot-diff, tdd-red-green]
key_files:
  created:
    - app/src/stores/__tests__/editorStore.gestureCommitPersist.test.ts
  modified:
    - app/src/stores/editorStore.ts

decisions:

  - Snapshot elements on gestureActive true→false; diff on false→true; flush via scheduleSaveElement only
  - No new persistence path — exclusively reuses scheduleSaveElement → writePlanElement → writeWithOutbox
  - Module-local variable gestureStartElements avoids store contamination

metrics:
  duration: 8min
  completed: 2026-06-11
  tasks_completed: 2
  files_modified: 2
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-09
  status: unknown
---

# Quick 260611-l5y: Persistenz-Bug Gesten-Ende (SUMMARY)

**One-liner:** Gesture-end flush via module-local elements snapshot diffed against scheduleSaveElement on gestureActive true→false transition — fixes move/resize/rotate position loss after reload.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Regression-Test RED | 761e8b8 | editorStore.gestureCommitPersist.test.ts (created) |
| 2 | Gesten-Ende-Flush GREEN | 42fa000 | editorStore.ts (modified) |

## Root Cause (confirmed by RED test)

`editorStore.ts` Autosave-Subscription (Zeile 192-203) hat zwei frühe Returns:

1. `if (state.gestureActive) return;` — korrekt (Pitfall-5: kein Save während Geste)
2. `if (state.elements === prev.elements) return;` — korrekt für gestenfreie Edits

**Problem:** `WebPlanEditor.tsx` `onUp` (Zeile 161-164) ruft NUR `setGestureActive(false)` — kein finales `updateElement`. Im `setGestureActive(false)`-Set-Call ändert sich `elements` nicht → Return 2 greift → kein Save.

Identisches Muster in `WebResizeHandle.tsx` und `WebRotationHandle.tsx` (Resize/Rotate).

## Fix

`editorStore.ts` — `gestureActive`-Subscription erweitert:

- Bei `true→false` (Geste beginnt): Snapshot von `prev.elements` in `gestureStartElements` (Modul-Variable).
- Bei `false→true` (Geste endet): Iteriert `state.elements`, ruft `scheduleSaveElement(mode, el)` für jedes Element, dessen Referenz sich gegenüber dem Snapshot geändert hat. Snapshot wird zurückgesetzt.
- Pitfall-5 bleibt intakt: Autosave-Subscription (Zeile 192-203) läuft unverändert — keine Doppelverarbeitung, da `elements` sich im Release-Set-Call nicht ändert.

## Test Results

```
stores project: 54 passed (inkl. 4 neue gestureCommitPersist-Tests + bestehende dragdrop/gesturePause)
editor project: 54 passed (gleiche Tests — beide Projekte picken editorStore.*.test.ts)
```

RED (761e8b8): Tests 1/2/4 schlug fehl — beweist Root Cause (scheduleSaveElement wurde 0x aufgerufen).
GREEN (42fa000): Alle 54 Tests grün — Pitfall-5, Resize, Rotate, Multi-Element alle korrekt.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — Änderung ist rein intern im editorStore (keine neuen Netzwerkendpunkte, kein neuer Auth-Pfad).

## Self-Check: PASSED

- `app/src/stores/__tests__/editorStore.gestureCommitPersist.test.ts` exists: FOUND
- `app/src/stores/editorStore.ts` modified: FOUND
- Commit 761e8b8 (RED): FOUND
- Commit 42fa000 (GREEN): FOUND
- 54/54 tests pass in both stores + editor projects: VERIFIED
