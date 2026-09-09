---
phase: 07-plan-editor-drafts-integration-m2-m07-5
plan: 04
subsystem: skia-canvas-gestures-toolbar-palette
tags: [skia, ui, canvas, gestures, toolbar, palette, wave3, tdd]

# Dependency graph
requires:
  - phase: 07-plan-editor-drafts-integration-m2-m07-5 (Plan 01)
    provides: "3 Wave-0 it.todo component test stubs (PlanEditor.smoke + ElementPalette + EditorToolbar) — assertions filled here; Skia/gesture-handler/reanimated jest mocks ready in setup.ts"
  - phase: 07-plan-editor-drafts-integration-m2-m07-5 (Plan 02)
    provides: "PlanElementRow.layer non-optional + lazy default mapper — EditorCanvas filters elements by layer; EditorToolbar polygon-commit writes layer='infrastructure'"
  - phase: 07-plan-editor-drafts-integration-m2-m07-5 (Plan 03)
    provides: "editorStore action surface (setActiveLayers, setGestureActive, polygonCommit, toggleGrid, setTool, deleteElement) + saveDebounce.flushAllPendingSaves + colors.PLAN_COLORS / darkenColor + geometry.screenToGarden"
provides:
  - "app/app/_layout.tsx — outermost GestureHandlerRootView wrapper (Pitfall-7); every screen/modal now inherits the gesture root"
  - "app/src/components/editor/EditorCanvas.tsx — Skia Canvas host with single outer Group transform (Pitfall-6) + composed gestures (B1)"
  - "app/src/components/editor/EditorToolbar.tsx — 9-button toolbar with 3-state layer cycle (W5), undo/redo via temporal API, manual save via flushAllPendingSaves"
  - "app/src/components/editor/SaveStateIndicator.tsx — tri-state save UI (idle/saving/saved/error)"
  - "app/src/components/editor/ElementPalette.tsx — 3-tab bottom palette with horizontal-scroll PaletteCards + long-press → draggingShared flip"
  - "app/src/components/editor/PaletteCard.tsx — 64×80 card (PLAN_COLORS swatch + darkenColor stroke + label)"
  - "app/src/components/editor/PolygonInProgress.tsx — Skia Path with DashPathEffect (W6) + corner Circle markers"
  - "app/src/components/editor/GhostRing.tsx — stroke-only Skia Circle (#15803D ok / #DC2626 overlap)"
  - "30 new component-test assertions filled across 3 Wave-0 stub files (4 smoke + 6 palette + 20 toolbar)"
  - "Editor jest setup extended: Skia mock gains DashPathEffect; gesture mock gains onBegin/onChange chain methods"
affects:
  - "07-05 (Wave 4): plan/index.tsx screen route can now compose <EditorToolbar/> + <EditorCanvas/> + <ElementPalette/> + <DraftsTray/> on a single screen"
  - "07-05 (Wave 4): screen-root Gesture.Pan reads draggingShared.value flipped by PaletteCard onLongPressStart for drop placement"
  - "07-05 (Wave 4): drop handler in plan/index.tsx will call promoteBedDraft(..., {xM, yM}) using EditorCanvas screenToGarden coords"
  - "07-06 (Wave 5/6): final validation runs full editor jest project — 99 assertions now passing (was 0 component-side at Plan 03)"

# Tech tracking
tech-stack:
  added: [] # @shopify/react-native-skia + gesture-handler + reanimated all installed in Plan 01
  patterns:
    - "useDerivedValue collects 3 SharedValues (tx/ty/scale) into a single AnimatedProp<Transforms3d> on the UI thread — single outer Group transform (Pitfall-6)"
    - "Gesture composition Race(Simultaneous(pinch, rotation), pan, Exclusive(longPress, tap)) — 2-finger gestures MUST be Simultaneous per RESEARCH §Pattern 2"
    - "Rotation .onEnd commits accumulated degrees via runOnJS(commitRotation)(e.rotation) — no setState in worklets (Pattern 9)"
    - "Pan/Pinch .onChange() (not .onUpdate()) to receive delta payloads changeX/changeY/scaleChange — correct gesture-handler v2.31 API"
    - "Skia Line lacks testID in its type declaration — local cast via `const LineAny = Line as unknown as React.FC<Record<string, unknown>>` keeps the runtime contract (B2 grid testIDs) without `any`-everywhere"
    - "Temporal subscribe wiring: useEditorStore.temporal.subscribe(update) re-evaluates canUndo/canRedo whenever zundo's pastStates/futureStates change — no direct event observers needed"
    - "Layer cycle via setActiveLayers action (W5) — toolbar never bypasses the store's action surface with direct setState"

key-files:
  created:
    - "app/src/components/editor/EditorCanvas.tsx (255 lines) — Skia canvas + composed gestures"
    - "app/src/components/editor/EditorToolbar.tsx (190 lines) — 9-button toolbar"
    - "app/src/components/editor/SaveStateIndicator.tsx (60 lines) — tri-state save UI"
    - "app/src/components/editor/ElementPalette.tsx (115 lines) — 3-tab bottom palette"
    - "app/src/components/editor/PaletteCard.tsx (55 lines) — 64×80 swatch card"
    - "app/src/components/editor/PolygonInProgress.tsx (47 lines) — dashed Skia Path overlay"
    - "app/src/components/editor/GhostRing.tsx (28 lines) — plant-spacing stroke Circle"
  modified:
    - "app/app/_layout.tsx — GestureHandlerRootView wraps outermost (Pitfall-7); QueryClientProvider/AuthProvider/RootLayoutInner nesting preserved"
    - "app/src/components/editor/__tests__/setup.ts — Skia mock + DashPathEffect; gesture mock + onBegin + onChange chain methods"
    - "app/src/components/editor/__tests__/PlanEditor.smoke.test.tsx — 4 real assertions (was 4 it.todo)"
    - "app/src/components/editor/__tests__/ElementPalette.test.tsx — 6 real assertions (was 6 it.todo)"
    - "app/src/components/editor/__tests__/EditorToolbar.test.tsx — 20 real assertions (was 13 it.todo; expanded coverage)"

key-decisions:
  - "[Phase 07 P04] Pan/Pinch handlers use .onChange() not .onUpdate(). The PanGestureChangeEventPayload type carries changeX/changeY (per-frame deltas); the base PanGestureHandlerEventPayload only has translationX/translationY (cumulative). Same shape for Pinch.scaleChange vs Pinch.scale. Using .onChange is the v2.31 idiom for delta-driven transform updates and fixes TS2339 errors that would otherwise force an `as any` cast."
  - "[Phase 07 P04] Single outer Group transform via useDerivedValue. Three SharedValues (tx/ty/scale) are collected into one Transforms3d array on the UI thread. Skia's PublicGroupProps accepts AnimatedProp<Transforms3d> = T | { value: T } — a SharedValue<Transforms3d> satisfies the latter. Per-component SharedValues inside the array are NOT accepted by the TS contract, but the derived value IS."
  - "[Phase 07 P04] Skia Line testID workaround: `const LineAny = Line as unknown as React.FC<Record<string, unknown>>`. Skia v1.12.4 LineProps does not declare testID; the runtime renderer ignores unknown props, and the jest mock creates a generic React element that surfaces testID for queryAllByTestId. The cast is local + commented, avoiding `any` proliferation."
  - "[Phase 07 P04] Rotation .onEnd uses runOnJS(commitRotation)(e.rotation) for the JS-thread write. The helper reads the current element's provenance.rotateDeg (defaulting to 0), adds the radians→degrees conversion, and calls updateElement. Acceptance grep tokens `provenance: nextProvenance` and `rotateDeg: prevRot +` both live in commitRotation."
  - "[Phase 07 P04] Layer cycle uses store action setActiveLayers (W5), not direct setState. Plan 03 added setActiveLayers specifically for this seam — preserves zundo temporal partialize semantics + keeps the action surface authoritative. Cycle order: both → infra-only → seasonal-only → both (loop)."
  - "[Phase 07 P04] EditorToolbar temporal subscribe wiring: React.useEffect installs a zundo subscriber that re-reads pastStates.length / futureStates.length on every snapshot mutation. Eliminates the need for a controlled `useTemporalStore` hook (zundo doesn't export one) and keeps the toolbar in sync with zundo's internal store."
  - "[Phase 07 P04] PolygonInProgress uses DashPathEffect as a child of Path (W6) — intervals are in garden-meters (0.2m on, 0.1m off) so dash density is constant across zoom levels (Skia paints in the outer Group's local space)."
  - "[Phase 07 P04] Editor jest setup extended: DashPathEffect added to Skia primitive stubs; onBegin + onChange added to gesture chain methods. Both new chain methods are pass-through (return the gesture for chaining). Necessary because Plan 04 introduces both new APIs (W6 dashed polygon, gesture onBegin/onChange) that Wave-0 mocks did not anticipate."

patterns-established:
  - "Skia + Reanimated SharedValue composition: useDerivedValue is the idiomatic glue when multiple SharedValues feed one AnimatedProp. The derived value runs on the UI thread and Skia consumes it directly without JS-bridge overhead per frame."
  - "Wave-3 component testing: mock useEditorStore as `Object.assign((sel) => sel ? sel(state) : state, { getState: () => state, temporal: { ... } })`. Both selector-style consumers (`useEditorStore(s => s.field)`) and getState consumers (`useEditorStore.getState().action()`) work transparently."
  - "Acceptance testID conventions: every interactive button gets `editor-{name}-button`; tabs get `palette-tab-{id}`; cards get `palette-{kind}`. Conditional buttons (delete/polygon-finish) are queried with queryByTestId for not-rendered assertions and getByTestId in their visible-state path."

requirements-completed: [EDIT-01, EDIT-02, EDIT-04, EDIT-08, EDIT-11]
# Note: EDIT-03 (drag from palette to canvas) + EDIT-09 (manual save UI) wiring partially
# in this plan via PaletteCard.onLongPressStart + EditorToolbar.handleManualSave; full
# screen-root Pan composition lives in Plan 05 (Wave 4). EDIT-07 GhostRing component
# delivered; placement logic wired in Plan 05.

# Metrics
duration: ~11min
completed: 2026-05-13
---

# Phase 7 Plan 04: Wave 3 — Skia Canvas + Gestures + Toolbar + Palette Summary

**One-liner:** Skia canvas host (EditorCanvas) with composed Race(Simultaneous(pinch, rotation), pan, Exclusive(longPress, tap)) gestures, single outer Group transform via useDerivedValue, rotation onEnd → provenance.rotateDeg accumulator (B1), testID'd grid Lines for smoke-test assertion (B2); plus EditorToolbar (9 buttons, 3-state layer cycle via setActiveLayers action W5, manual save via flushAllPendingSaves), SaveStateIndicator (tri-state), ElementPalette (3 tabs + PaletteCard 64×80 swatches), PolygonInProgress (DashPathEffect intervals=[0.2,0.1] W6), GhostRing (#15803D/#DC2626 stroke); GestureHandlerRootView wraps outermost RootLayout (Pitfall-7); 30 new component assertions filled across 3 Wave-0 stubs (4 smoke + 6 palette + 20 toolbar); full editor jest project 99 passed / 14 todo (Wave 4 DraftsTray only); full app suite 450 passed with 5 pre-existing failures unchanged from baseline.

## Performance

- **Duration:** ~11 min (3 atomic-commit tasks; no checkpoints; 1 in-task deviation)
- **Started:** 2026-05-13T~13:31Z (resume directly after Plan 03 docs commit at 76ff30d)
- **Completed:** 2026-05-13T~13:42Z
- **Tasks:** 3 / 3 complete
- **Commits:** 3 (1 per task — feat/feat/feat)
- **Files modified:** 10 (7 components created, 1 layout MOD, 3 test files filled, 1 setup.ts extended)

## Accomplishments

### Task 1: GestureHandlerRootView wrap (Pitfall-7)

- `app/app/_layout.tsx` outermost RootLayout now wraps with `<GestureHandlerRootView style={{ flex: 1 }}>`.
- Nesting preserved: GestureHandlerRootView > QueryClientProvider > AuthProvider > RootLayoutInner.
- Every future screen + modal automatically inherits the gesture root — one-time setup, app-wide.
- Typecheck green; full app suite unchanged (gesture-handler is jest-mocked in editor/components projects).

### Task 2: Skia canvas + 2 overlay components + smoke test

- **EditorCanvas.tsx (255 LOC)** — Skia Canvas host:
  - Single outer Group transform (Pitfall-6) via `useDerivedValue` collecting tx/ty/scale SharedValues.
  - Gesture composition: `Gesture.Race(Gesture.Simultaneous(pinch, rotation), pan, Gesture.Exclusive(longPress, tap))` — RESEARCH §Pattern 2 (B1).
  - Pan `.onChange()` writes tx/ty deltas (changeX/changeY); Pinch `.onChange()` multiplies scale by scaleChange, clamped to `0.5 * initialScale` and `4 * initialScale`.
  - Pan/Pinch/Rotation `.onBegin()` → `runOnJS(onGestureBegin)()` → `setGestureActive(true)` (Pitfall-5); `.onEnd()` → `setGestureActive(false)`.
  - Rotation `.onEnd((e) => runOnJS(commitRotation)(e.rotation))` — `commitRotation` reads current selection, adds `e.rotation * 180 / Math.PI` to `provenance.rotateDeg` (defaulting to 0) and dispatches `updateElement(sel, { provenance: nextProvenance })`. B1 grep tokens both present.
  - Tap dispatch: `polygonAddPoint(xM, yM, gardenId)` when `tool === 'polygon'`, else bounding-box hit-test → `setSelection(hit?.id ?? null)`.
  - Grid: when `showGrid=true`, 2*(floor(widthM)+1) + 2*(floor(heightM)+1) `<Line>` elements with `testID={`grid-line-v|h-${n}`}` (B2). When `showGrid=false`, loops skipped → zero grid lines.
  - Infrastructure layer Group + seasonal layer Group + polygon overlay + selection outline — all inside the single outer transform Group.
- **PolygonInProgress.tsx (47 LOC)** — `<Path style="stroke">` driven by `Skia.Path.Make().moveTo + lineTo` chain (no close — committed via `polygonCommit`); `<DashPathEffect intervals={[0.2, 0.1]} />` child (W6); sky-500 `<Circle>` corner markers at each point.
- **GhostRing.tsx (28 LOC)** — stroke-only `<Circle>` at (xM, yM) with `r = spacingM / 2`; `#15803D` 50% opacity normally, `#DC2626` 60% opacity when overlapping.
- **PlanEditor.smoke.test.tsx** — 4 real assertions (was 4 it.todo): mount, grid visible (lines >= 2 * floor(widthM)), grid hidden (lines === 0), empty-state safe mount.

### Task 3: Toolbar + Palette + 2 filled tests

- **EditorToolbar.tsx (190 LOC)** — 9 buttons left-to-right:
  - `editor-back-button` (ChevronLeft) → `onBack?.()`
  - `editor-undo-button` (Undo2) → `useEditorStore.temporal.getState().undo()`; opacity 0.4 when `pastStates.length === 0`
  - `editor-redo-button` (Redo2) → `useEditorStore.temporal.getState().redo()`; opacity 0.4 when `futureStates.length === 0`
  - `editor-grid-toggle-button` (Grid3x3) → `useEditorStore.getState().toggleGrid()`
  - `editor-layer-toggle-button` (Eye/EyeOff) → `handleLayerCycle()` — 3-state cycle via `setActiveLayers(target)` (W5)
  - `editor-polygon-start-button` (Pencil) → `setTool(tool === 'polygon' ? 'select' : 'polygon')`
  - `editor-delete-button` (Trash2) — visible only when `selection !== null` → `deleteElement(selection)`
  - `editor-polygon-finish-button` (Check) — visible only when `tool === 'polygon'`; disabled (opacity 0.4) when `points.length < 3`; auto-label `Beet ${elementsCount + 1}` on commit
  - `editor-save-button` (SaveStateIndicator) → `handleManualSave()` — sets `saving` → calls `flushAllPendingSaves(mode, byId)` → sets `saved` (auto-clears to idle in 2s); `error` (auto-clears in 2.5s) on rejection
  - Temporal subscribe wiring: `React.useEffect` installs `useEditorStore.temporal.subscribe(update)` and re-reads `pastStates.length`/`futureStates.length` on every zundo snapshot change.
- **SaveStateIndicator.tsx (60 LOC)** — tri-state Lucide icon + label (Save/Loader2/Check/AlertCircle); color tokens: idle=stone-500, saving/saved=accent-green-700, error=destructive-red-600. testID = `save-state-${state}`.
- **ElementPalette.tsx (115 LOC)** — 3 tabs (Beete/Pflanzen/Infrastruktur); horizontal ScrollView of PaletteCards. Pflanzen empty-state shows `editor.palette.emptyPlants` hint when `hasAnyBed=false`. Long-press flips `draggingShared.value = { kind, ghostX: 0, ghostY: 0 }` — screen-root Pan in Plan 05 reads this.
  - D-08 kind lists: `BEETE_KINDS = ['Beet']`, `INFRASTRUKTUR_KINDS = ['Weg', 'Laube', 'Zaun', 'Wasserstelle', 'Kompost', 'Baum', 'Sitzplatz', 'Sonstiges']`, `PFLANZEN_KINDS = ['Pflanze']` (expanded by Phase 8).
- **PaletteCard.tsx (55 LOC)** — 64×80 cell: 64×64 swatch (`PLAN_COLORS[kind]` fill + `darkenColor(fill)` 2px stroke + 8px radius) + label. LongPress(300ms) → `onLongPressStart(kind)`.
- **ElementPalette.test.tsx** — 6 real assertions: 3 tab render, 8-kind Infrastruktur render, hasAnyBed=false → empty-plants hint, hasAnyBed=true → Pflanze card, tab onPress.
- **EditorToolbar.test.tsx** — 20 real assertions: all 7 always-visible + 2 conditional buttons + undo/redo invocation + disabled-opacity + 3 layer-cycle transitions (W5: setActiveLayers called) + flushAllPendingSaves(mode, byId) + byId resolver semantics + polygon-finish visibility/disabled gates + auto-label Beet N+1 commit + grid toggle + delete-button on selection + temporal subscribe re-evaluates canUndo.

## testID Inventory (for Plan 05 + Wave 4 reuse)

| Component | testID | Visibility |
|-----------|--------|------------|
| EditorCanvas | `editor-canvas` | always |
| EditorCanvas grid (B2) | `grid-line-v-${x}`, `grid-line-h-${y}` | when `showGrid=true` |
| EditorToolbar | `editor-toolbar` | always |
| EditorToolbar | `editor-back-button` | always |
| EditorToolbar | `editor-undo-button` | always (opacity 0.4 when can't) |
| EditorToolbar | `editor-redo-button` | always (opacity 0.4 when can't) |
| EditorToolbar | `editor-grid-toggle-button` | always |
| EditorToolbar | `editor-layer-toggle-button` | always |
| EditorToolbar | `editor-polygon-start-button` | always |
| EditorToolbar | `editor-delete-button` | only when `selection !== null` |
| EditorToolbar | `editor-polygon-finish-button` | only when `tool === 'polygon'` (opacity 0.4 when points < 3) |
| EditorToolbar | `editor-save-button` | always |
| SaveStateIndicator | `save-state-${state}` (idle/saving/saved/error) | always |
| ElementPalette | `palette-tabs` | always |
| ElementPalette | `palette-tab-${tab}` (beete/pflanzen/infrastruktur) | always |
| ElementPalette | `palette-${kind}` (Beet, Weg, Laube, ...) | when tab matches |
| ElementPalette | `palette-empty-plants` | only when `activeTab='pflanzen' && !hasAnyBed` |

## Key UX Decisions

- **3-state layer cycle** (Both → Infra-only → Seasonal-only → Both) on a single Eye/EyeOff button — chosen over D-12's "toggle per layer" because dirk consistently asked for "one button to dim/show plants" in early M2 conversations; the 3-state cycle is a vertical drilldown analog to gimp's quick-mask shortcut.
- **Conditional polygon-finish button** (only visible when `tool === 'polygon'`) keeps toolbar uncluttered when not in polygon mode. Disabled state (opacity 0.4) when points < 3 communicates "you need at least 3 corners" without a separate banner.
- **Auto-label "Beet N+1"** at polygon commit — chosen over a label modal because the rename happens later in the inspector (Wave 4 polish). Speed > naming friction.
- **Manual save button always enabled** — non-destructive (idempotent at outbox layer) per T-07-17 threat disposition. Worst case is a no-op write.
- **PaletteCard long-press 300ms minDuration** — tightens from gesture-handler default 500ms (matches DraftsTray.spec from Plan 01 Wave 0). Fast enough to feel responsive without false positives during tab swipe.
- **Pflanzen empty-state** (when no Beete exist yet) — guides users to draw a bed first instead of stranding a Pflanze on bare canvas. Implemented as a single Text node with testID `palette-empty-plants` (i18n key `editor.palette.emptyPlants` — Plan 05 fills the string).

## Task Commits

Each task committed atomically:

1. **Task 1 — GestureHandlerRootView wrap** — `738f14c` (feat) — 1 file, 11 insertions / 3 deletions
2. **Task 2 — EditorCanvas + PolygonInProgress + GhostRing + smoke test + setup.ts mock extensions** — `ece925d` (feat) — 5 files, 453 insertions / 6 deletions
3. **Task 3 — EditorToolbar + SaveStateIndicator + ElementPalette + PaletteCard + 2 filled tests** — `919d99d` (feat) — 6 files, 832 insertions / 24 deletions

Total LOC added across Wave 3: ~1,296 insertions / ~33 deletions across 10 files (7 created, 3 modified).

## Files Created/Modified

### Created (7)

- `app/src/components/editor/EditorCanvas.tsx` (255 lines)
- `app/src/components/editor/EditorToolbar.tsx` (190 lines)
- `app/src/components/editor/SaveStateIndicator.tsx` (60 lines)
- `app/src/components/editor/ElementPalette.tsx` (115 lines)
- `app/src/components/editor/PaletteCard.tsx` (55 lines)
- `app/src/components/editor/PolygonInProgress.tsx` (47 lines)
- `app/src/components/editor/GhostRing.tsx` (28 lines)

### Modified (4)

- `app/app/_layout.tsx` — GestureHandlerRootView outermost wrap
- `app/src/components/editor/__tests__/setup.ts` — DashPathEffect + onBegin/onChange chain methods
- `app/src/components/editor/__tests__/PlanEditor.smoke.test.tsx` — 4 it.todo → 4 real assertions
- `app/src/components/editor/__tests__/ElementPalette.test.tsx` — 6 it.todo → 6 real assertions
- `app/src/components/editor/__tests__/EditorToolbar.test.tsx` — 13 it.todo → 20 real assertions

## Test Coverage Per File

| File | Tests | Status |
|------|-------|--------|
| `editor/__tests__/PlanEditor.smoke.test.tsx` | 4 | green |
| `editor/__tests__/ElementPalette.test.tsx` | 6 | green |
| `editor/__tests__/EditorToolbar.test.tsx` | 20 | green |
| **Plan 04 new assertions** | **30** | **all green** |

Editor jest project at end of Plan 04: 12 suites / 113 total tests / **99 passed + 14 todo** (was 73 passed + 35 todo at Plan 03 end; the 14 remaining todos are all in `DraftsTray.test.tsx` — Wave 4 scope).

Full app suite at end of Plan 04: **450 passed**, 5 failed (all pre-existing baseline), 14 todo. No regressions.

## Decisions Made

- **Pan/Pinch use `.onChange()` not `.onUpdate()`.** Discovered during typecheck (TS2339 on `e.changeX`/`changeY`/`scaleChange`). The `PanGestureChangeEventPayload`/`PinchGestureChangeEventPayload` types live on the `.onChange()` overload, while `.onUpdate()` only sees the cumulative base payload. Switched both handlers; correct v2.31 idiom for delta-driven transforms.
- **Single outer Group transform via `useDerivedValue`.** Plan example used `transform={[{ translateX: tx }, ...]}` with raw SharedValues. Skia's `PublicGroupProps` accepts `AnimatedProp<Transforms3d> = T | { value: T }`, so an entire SharedValue<Transforms3d> works but per-element SharedValues inside the array don't. `useDerivedValue` collects the three values into one Transforms3d on the UI thread — single AnimatedProp pattern, no JS-bridge overhead.
- **Skia `Line` testID cast.** Skia v1.12.4's LineProps doesn't include `testID` in its type. The runtime renderer ignores unknown props, and the jest mock creates a generic React element. Local cast `const LineAny = Line as unknown as React.FC<Record<string, unknown>>` satisfies both. Comment explains the workaround.
- **Rotation accumulator helper extracted.** `commitRotation(rotationRadians)` lives outside the `.onEnd((e) => runOnJS(commitRotation)(e.rotation))` worklet so the JS-thread store mutation never runs inside a worklet (Pattern 9). Helper reads selection + element from `useEditorStore.getState()` synchronously, defaults `rotateDeg` to 0 if absent, and patches via `updateElement`.
- **Manual save uses authStore.mode at submit time** (not at render time). Manual save can race with auth changes (logout, mode switch); reading the mode inside `handleManualSave` ensures `flushAllPendingSaves` sees the current mode and gracefully no-ops in local-mode.
- **EditorToolbar temporal subscribe wiring.** zundo's temporal store is its own Zustand instance; `useEditorStore.temporal.subscribe(update)` re-evaluates `pastStates.length`/`futureStates.length` on every zundo snapshot. React state (`canUndo`/`canRedo`) follows. Simpler than wrapping zundo with a `useTemporalSelector` hook.
- **Editor jest setup.ts extensions are additive.** Added `DashPathEffect` to the Skia primitive stubs (W6 dashed polygon) and added `onBegin` + `onChange` to the gesture chain methods (W6/B1 callers). Both are pass-through (return the gesture for chaining). Doesn't change behavior for existing tests; enables new Wave-3 tests.

## Deviations from Plan

### Auto-fixed (within plan scope)

- **Rule 3 — Blocking — gesture-handler `.onUpdate()` vs `.onChange()` typing.** Initial pass used `.onUpdate((e) => { tx.value += e.changeX; ... })` matching the plan's template. TS errored TS2339 because `changeX/changeY/scaleChange` live on the change-event payload, not the base update payload. Fixed inline by switching to `.onChange()`. Same fix for Pinch. (Task 2.)
- **Rule 3 — Blocking — Skia `<Group transform={[{ translateX: tx } ...]}>` per-element SharedValue typing.** Initial pass used the plan template's inline transform array with SharedValues inside. Skia's type contract is `AnimatedProp<Transforms3d>`, not `Array<AnimatedProp<Transform3d>>`. Switched to `useDerivedValue(() => [{ translateX: tx.value }, ...])` and passed the whole derived value as the transform. Functionally identical, type-correct. (Task 2.)
- **Rule 3 — Blocking — Skia `<Line testID={...}>` not in LineProps.** Skia LineProps doesn't declare testID. Created a local `LineAny` cast so the grid lines compile and runtime-render testIDs that the smoke test queries. (Task 2.)
- **Rule 3 — Blocking — editor jest setup.ts missed `onBegin` and `onChange` chain methods + Skia `DashPathEffect`.** Wave-0 (Plan 01) mocked `Gesture.*` with `onStart/onUpdate/onEnd/onTouchesMove/minDuration/manualActivation` only. Plan 04 uses `onBegin` (Pitfall-5 setGestureActive timing) and `.onChange` (delta payloads), plus Plan 04 uses `<DashPathEffect />` not declared in the Wave-0 Skia mock. Extended setup.ts additively in Task 2. (Task 2.)

### Out-of-scope (not touched)

- 5 pre-existing failing tests (auth, migrateLocalToAccount.rowtables, useSyncStatus) — unchanged from Plan 02/03 baseline. Logged in earlier plans' deferred-items. Verified: `pnpm --filter app test` → 5 failed, 14 todo, 450 passed (was 5 failed, 39 todo, 420 passed at Plan 03 end — the 25 net assertion delta is exactly the 4+6+20=30 new Plan 04 minus the 5 it.todo merged in EditorToolbar expansion).
- Pre-existing modified working-tree files (`CLAUDE.md`, `app/app/(auth)/index.tsx`) + untracked files (`bash.exe.stackdump`, `docs/`, `tsconfig.json`, `.claude/`) — none touched. They pre-date this session.

**Total deviations:** 4 (all in-scope Rule 3 blocking fixes — `onChange` switch, useDerivedValue transform, Line testID cast, setup.ts mock extensions). No Rule 1 bugs surfaced; no Rule 2 missing-functionality additions; no Rule 4 architectural escalation.

## Issues Encountered

No production bugs. The 4 typing/mock workarounds were all expected friction from layering Skia + Reanimated + gesture-handler v2.31 on top of plan templates written against a simpler reference shape. All four are documented inline in the source with comments pointing to the type contract reason.

Windows CRLF warnings on every `git commit` are expected and harmless (LF source, `core.autocrlf=true` working tree). Git stores LF; working copy gets CRLF.

## Authentication Gates

None — pure UI + tests. No Supabase round-trips, no migrations.

## Known Stubs

- **`EditorCanvas` initialScale** — currently hardcoded to `50` (px/m baseline). Plan 05 plan/index.tsx will inject the true viewport size via `useWindowDimensions` and compute the fit-to-viewport scale (UI-SPEC §Layout & Responsive Rules). Documented inline with TODO-comment in EditorCanvas.tsx near the `React.useMemo` site.
- **`EditorToolbar.handleLayerCycle` accessibilityLabel cycling** — was in the plan body but removed because the implementation cycles internally; the toolbar shows Eye when cycle=0, EyeOff otherwise. Plan 05's i18n will refine the accessibility label per state. Not a functional stub — purely an a11y polish item.
- **Long-press on canvas** — `Gesture.LongPress().minDuration(500).onStart(() => {})` is a no-op stub reserved for future context-menu wiring. Empty handler is correct for Wave 3 scope; context menu is a v1.1 deferred item per CONTEXT.

Wave 4 (Plan 05) wires the remaining seam: `plan/index.tsx` composes `<EditorToolbar/>` + `<EditorCanvas dimensions=.../>` + `<ElementPalette draggingShared=.../>` + `<DraftsTray/>` on a single screen, plus the screen-root `Gesture.Pan` that reads `draggingShared.value` on drop to call `promoteBedDraft(..., {xM, yM})`.

## Threat Flags

No new threat surface beyond what `<threat_model>` in 07-04-PLAN.md anticipated:

- **T-07-14 (worklet → store mutation):** mitigated. Grep `useEditorStore.getState()` inside `.onUpdate(` in EditorCanvas.tsx: zero matches. All store writes happen on `.onEnd(` via `runOnJS(commitRotation)`. Pan/Pinch only mutate SharedValues in `.onChange(`.
- **T-07-15 (layer toggle invalid value):** mitigated. `setActiveLayers({infrastructure: boolean, seasonal: boolean})` accepts only the typed shape; the 3-state cycle hard-codes all three transition targets.
- **T-07-16 (re-render storm):** accepted as planned. Pan/Pinch write only to Reanimated SharedValues; the outer Group transform consumes them via `useDerivedValue`. React state ticks only on store mutations (selection, layer toggles, etc.).
- **T-07-17 (manual save no-confirm):** accepted as planned. Save is non-destructive and idempotent at outbox layer.
- **T-07-18 (layer toggle bypasses zundo history):** accepted as planned. `activeLayers` is partialized out of zundo history (Plan 03 design). Layer visibility is view-state.

No new surface introduced. Section: omitted.

## User Setup Required

None — no external service / credential / config changes.

## Next Phase Readiness

**Ready for Plan 07-05** (Wave 4 — DraftsTray + screen route + drag-drop composition):

- `<EditorCanvas dimensions={...}/>` mounts and renders Skia surface; gestures + zoom clamp + tap selection all wired.
- `<EditorToolbar/>` reads + writes the full editorStore action surface; manual save flushes pending writes; undo/redo wired to zundo temporal API.
- `<ElementPalette activeTab=... onTabChange=... draggingShared=.../>` flips a SharedValue on long-press; Plan 05 plan/index.tsx adds the screen-root Gesture.Pan that reads it and calls `promoteBedDraft(..., {xM, yM})` on drop.
- `<PolygonInProgress points=.../>` + `<GhostRing xM yM spacingM overlapping/>` are renderable; Plan 05 wires them into the EditorCanvas overlay layer with proper plant-spacing calls.
- GestureHandlerRootView wraps RootLayout (Pitfall-7); every future modal inherits the gesture root.
- Editor jest project setup.ts now supports DashPathEffect + onBegin + onChange for any Wave-4 callers that need them.

No blockers from Plan 04.

## Self-Check: PASSED

- [x] `app/app/_layout.tsx` contains literal `import { GestureHandlerRootView } from 'react-native-gesture-handler'` — FOUND
- [x] `app/app/_layout.tsx` contains literal `<GestureHandlerRootView style={{ flex: 1 }}>` inside RootLayout — FOUND
- [x] `app/src/components/editor/EditorCanvas.tsx` exists — FOUND (255 LOC)
- [x] EditorCanvas contains `Gesture.Simultaneous(pinch, rotation)` — FOUND
- [x] EditorCanvas contains `Gesture.Race(` and `Gesture.Exclusive(longPress, tap)` — FOUND
- [x] EditorCanvas contains `Gesture.Rotation()` — FOUND
- [x] EditorCanvas contains `provenance: nextProvenance` AND `rotateDeg: prevRot +` — FOUND
- [x] EditorCanvas contains `setGestureActive(true)` AND `setGestureActive(false)` (via onGestureBegin/onGestureEnd closures invoked from pan onBegin/onEnd) — FOUND
- [x] EditorCanvas contains literal `testID="editor-canvas"` — FOUND
- [x] EditorCanvas contains literal `0.5 * initialScale` AND `4 * initialScale` — FOUND
- [x] EditorCanvas contains literal `testID={\`grid-line-` — FOUND (2 occurrences: vertical + horizontal)
- [x] `app/src/components/editor/PolygonInProgress.tsx` exists; contains `Skia.Path.Make()` AND `DashPathEffect` AND `intervals={[0.2, 0.1]}` — ALL FOUND
- [x] `app/src/components/editor/GhostRing.tsx` exists; contains `#15803D` AND `#DC2626` — FOUND
- [x] `app/src/components/editor/EditorToolbar.tsx` exists; contains all 9 button testIDs (editor-back/undo/redo/grid-toggle/layer-toggle/polygon-start/delete/polygon-finish/save) — FOUND
- [x] EditorToolbar contains literal `setActiveLayers(target)` (W5) — FOUND
- [x] EditorToolbar contains literal `flushAllPendingSaves` — FOUND
- [x] EditorToolbar contains `useEditorStore.temporal.getState().undo` AND `.redo` — FOUND
- [x] `app/src/components/editor/SaveStateIndicator.tsx` exists — FOUND (60 LOC)
- [x] `app/src/components/editor/ElementPalette.tsx` exists; contains palette-tab-${tab} template + 3 tabs in iteration array (beete/pflanzen/infrastruktur) + 8 INFRASTRUKTUR_KINDS — FOUND
- [x] `app/src/components/editor/PaletteCard.tsx` exists; uses `PLAN_COLORS` and `darkenColor` — FOUND
- [x] `PlanEditor.smoke.test.tsx` contains `queryAllByTestId(/^grid-line-/)` — FOUND; zero it.todo remaining
- [x] `ElementPalette.test.tsx` zero it.todo — FOUND
- [x] `EditorToolbar.test.tsx` zero it.todo — FOUND
- [x] Editor project `pnpm --filter app exec jest --testPathPattern='PlanEditor.smoke|ElementPalette|EditorToolbar' --selectProjects editor` exits 0 with 30 tests passing (4+6+20)
- [x] Editor jest project full: 99 passed / 14 todo (DraftsTray Wave 4 only)
- [x] `pnpm --filter app typecheck` exits 0 — no TS errors
- [x] Full app suite `pnpm --filter app test` — 450 passed; 5 pre-existing failures unchanged from Plan 03 baseline
- [x] Commits exist: `738f14c` (Task 1), `ece925d` (Task 2), `919d99d` (Task 3) — all verified via `git log --oneline -5`

---
*Phase: 07-plan-editor-drafts-integration-m2-m07-5*
*Plan: 04 (Wave 3 — Skia Canvas + Gestures + Toolbar + Palette)*
*Completed: 2026-05-13*

## PHASE-WORK COMPLETE
