---
phase: quick-260611-jzl
plan: "01"
subsystem: editor
tags: [bugfix, rotation, web, skia, tdd]
dependency_graph:
  requires: []
  provides: [BUGFIX-ROT-JUMP]
  affects: [WebRotationHandle, RotationHandle]
tech_stack:
  added: []
  patterns: [start-offset-capture, runOnJS-pattern-9, useRef-offset, SharedValue-offset]
key_files:
  created: []
  modified:
    - app/src/components/editor/web/WebRotationHandle.tsx
    - app/src/components/editor/RotationHandle.tsx
    - app/src/components/editor/__tests__/WebRotationHandle.test.tsx
    - app/src/components/editor/__tests__/RotationHandle.test.tsx
decisions:
  - "WebRotationHandle: offsetDegRef (useRef) captures pointerStartDeg - currentRotateDeg at mousedown; subtracted in onMove before snapRotation."
  - "RotationHandle: offsetDeg (SharedValue) computed via runOnJS(initOffset)() in onBegin (Pattern 9: JS-only store access). initOffset also replaces onGestureBegin for setGestureActive(true)."
  - "Both handles use numeric/finite guard (fallback 0) for provenance.rotateDeg, matching WebPlanEditor.tsx:353-354 pattern."
  - "rotationSnap.ts unchanged — snap applies to the offset-corrected rawDeg, not raw absolute angle."
metrics:
  duration: "~8 minutes"
  completed: "2026-06-11"
  tasks_completed: 2
  files_modified: 4
---

# Quick Task 260611-jzl: Editor Bug — Erste Rotation springt um ~90°/270° Summary

**One-liner:** Start-Offset-Erfassung beim Drag-Start in WebRotationHandle (useRef) und RotationHandle (SharedValue + runOnJS) behebt den 270°-Sprung beim ersten Handle-Greifen.

## Tasks Completed

| Task | Type | Name | Commits |
|------|------|------|---------|
| 1 | TDD RED+GREEN | Web-Handle Start-Offset (WebRotationHandle) | 82711c3 (RED), fccfdc2 (GREEN) |
| 2 | TDD RED+GREEN | Skia-Handle Start-Offset (RotationHandle) | 37b3070 (RED), 98a75d0 (GREEN) |

## What Was Built

### Root Cause

Both handles computed the **absolute** atan2 angle from pointer to element center and assigned it directly as `rotateDeg` — without a start-offset. The rotation handle sits at the top-center of the element (12-Uhr-Position). In screen coordinates (y-down), a point directly above center gives `atan2(negative, 0) = -90°`, which `snapRotation` normalizes to **270°**. This is the exact "~90°/270°" jump observed.

### Fix: Start-Offset Pattern

At drag start, compute `offsetDeg = pointerStartDeg - currentRotateDeg`. During drag, apply `snapRotation(rawDeg - offsetDeg, ...)` so the first move event produces ~0° delta, not a fixed absolute angle.

**WebRotationHandle (web/WebRotationHandle.tsx):**
- Added `offsetDegRef = useRef(0)`
- `onMouseDown`: reads `provenance.rotateDeg` from store (numeric/finite guard, fallback 0), computes `atan2(clientY - cy, clientX - cx)` at the grab point, stores `offsetDeg = pointerStartDeg - currentRotateDeg`
- `onMove`: changed to `snapRotation(rawDeg - offsetDegRef.current, isShiftDown)`

**RotationHandle (Skia/native — RotationHandle.tsx):**
- Added `offsetDeg = useSharedValue(0)`
- New `initOffset()` callback (replaces `onGestureBegin`): runs on JS thread via `runOnJS` (Pattern 9 — no store access in worklets), reads `provenance.rotateDeg`, computes `atan2(yM - centerYM, xM - centerXM)` in garden-meter space, sets `offsetDeg.value = pointerStartDeg - currentRotateDeg`, calls `setGestureActive(true)`
- `onBegin`: replaces `runOnJS(onGestureBegin)()` with `runOnJS(initOffset)()`
- `onChange`: changed to `snapRotation(rawDeg - offsetDeg.value, false)`

## Test Results

| Test File | Before | After |
|-----------|--------|-------|
| WebRotationHandle.test.tsx | 5 passing | 6 passing (+ regression test) |
| RotationHandle.test.tsx | 2 passing | 3 passing (+ regression test) |
| rotationSnap.test.ts | 7 passing | 7 passing (unchanged) |
| **Total** | **14 passing** | **16 passing** |

### TDD Gate Compliance

- RED commits precede GREEN commits for both handles
- Task 1: `82711c3` (test RED) → `fccfdc2` (fix GREEN)
- Task 2: `37b3070` (test RED) → `98a75d0` (fix GREEN)

## Deviations from Plan

### Auto-consolidated: onGestureBegin merged into initOffset

**Found during:** Task 2 (RotationHandle)

**Issue:** The plan said `initOffset()` should capture the offset AND call `setGestureActive(true)`. The old `onGestureBegin` callback also called `setGestureActive(true)`. Keeping both would call `setGestureActive(true)` twice.

**Fix:** `initOffset` absorbs `setGestureActive(true)` and `onGestureBegin` is removed. Single call via `runOnJS(initOffset)()` in `onBegin`. `onGestureEnd` and `commitRotationAbsolute` (Pitfall 8 try/finally) remain unchanged.

## Known Stubs

None — both handles are fully implemented and wired.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `app/src/components/editor/web/WebRotationHandle.tsx` — FOUND
- `app/src/components/editor/RotationHandle.tsx` — FOUND
- `app/src/components/editor/__tests__/WebRotationHandle.test.tsx` — FOUND
- `app/src/components/editor/__tests__/RotationHandle.test.tsx` — FOUND
- Commit `82711c3` (RED WebRotationHandle test) — FOUND
- Commit `fccfdc2` (GREEN WebRotationHandle fix) — FOUND
- Commit `37b3070` (RED RotationHandle test) — FOUND
- Commit `98a75d0` (GREEN RotationHandle fix) — FOUND
