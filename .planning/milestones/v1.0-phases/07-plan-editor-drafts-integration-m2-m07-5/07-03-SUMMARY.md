---
phase: 07-plan-editor-drafts-integration-m2-m07-5
plan: 03
subsystem: state-save-geometry-repo-extensions
tags: [state, store, zundo, geometry, autosave, repo-extension, tdd]

# Dependency graph
requires:
  - phase: 07-plan-editor-drafts-integration-m2-m07-5 (Plan 01)
    provides: "8 Wave-0 it.todo stub test files (geometry x3 + saveDebounce x1 + editorStore x4) — assertions filled here"
  - phase: 07-plan-editor-drafts-integration-m2-m07-5 (Plan 02)
    provides: "PlanElementRow.layer non-optional field + draftPromotionRepo layer assignments — consumed by editorStore polygonCommit + dragdrop tests"
provides:
  - "app/src/lib/colors.ts — shared PLAN_COLORS + darkenColor + truncateLabel (one source for SVG home preview + Skia editor)"
  - "app/src/lib/geometry/viewMatrix.ts — pure pixel/meter coord conversion (EDIT-06)"
  - "app/src/lib/geometry/plantSpacing.ts — pure Euclidean overlap detection (EDIT-07)"
  - "app/src/lib/geometry/bedLayout.ts — polygon -> axis-aligned bbox (EDIT-05)"
  - "app/src/lib/editor/saveDebounce.ts — per-element 5s autosave scheduler + flushAllPendingSaves (EDIT-09)"
  - "gardenPlanRepo.writePlanElement — thin single-row write wrapper for editor autosave (Pattern K stage 1)"
  - "draftPromotionRepo.promoteBedDraft finalCoords? param (DRAFT-02 drop-position override)"
  - "app/src/stores/editorStore.ts — Zustand + zundo temporal state machine (EDIT-03, EDIT-04, EDIT-05, EDIT-11) with autosave subscription + selection-clear-on-undo wrappers"
  - "All 8 Wave-0 it.todo stub files filled with real assertions (zero it.todo remaining)"
affects:
  - "07-04 (Wave 3): can compose Skia + gestures on top of useEditorStore; gestureActive=true bypasses autosave during drag"
  - "07-04 (Wave 3): DraftsTray drop handler calls promoteBedDraft(..., finalCoords) with the touch-up coords"
  - "07-04 (Wave 3): EditorToolbar layer-cycle uses setActiveLayers to avoid bypassing the action surface"
  - "07-05 (Wave 5): Migration 018 push gate — schema already aligned via Plan 02; this plan does not push"
  - "07-06 (Wave 6): final validation suite includes editor + geometry test projects"

# Tech tracking
tech-stack:
  added: []  # zundo, zustand, @shopify/react-native-skia, gesture-handler already in package.json from Plan 01
  patterns:
    - "Pattern K two-stage debounce: editorSaveDebounce (5s per element) -> writePlanElement -> scheduleWriteDebounced (500ms outbox push)"
    - "zundo temporal middleware with reference-equality partialize (a.elements === b.elements) — cheapest possible dedup for an array-of-rows undoable model"
    - "Module-load side-effect to wrap zundo undo/redo: temporalApi.setState({ undo: wrapped, redo: wrapped }) replaces the originals so callers transparently get selection-clear behavior without remembering it"
    - "Relative-path internal imports (instead of @/src/ alias) in stores/editorStore.ts — the `stores` jest project's moduleNameMapper does not have @/src/, so paths stay portable across both `stores` and `editor` projects"

key-files:
  created:
    - "app/src/lib/colors.ts (39 lines) — PLAN_COLORS + darkenColor + truncateLabel"
    - "app/src/lib/geometry/viewMatrix.ts (39 lines) — mToPx/pxToM/screenToGarden/gardenToScreen"
    - "app/src/lib/geometry/plantSpacing.ts (26 lines) — hasOverlap (seasonal-layer Euclidean check)"
    - "app/src/lib/geometry/bedLayout.ts (34 lines) — polygonToBbox (throws on <3 points)"
    - "app/src/lib/editor/saveDebounce.ts (64 lines) — scheduleSaveElement/flushAllPendingSaves/_resetEditorSaveTimers"
    - "app/src/stores/editorStore.ts (185 lines) — Zustand + zundo state machine + auto-save subscription"
  modified:
    - "app/src/components/GardenPlanView.tsx — inline PLAN_COLORS removed (32 lines deleted), imports from @/src/lib/colors; keyof typeof narrowing cast at lookup site"
    - "app/src/lib/gardenPlanRepo.ts — added writePlanElement export (43 lines)"
    - "app/src/lib/draftPromotionRepo.ts — promoteBedDraft signature gains optional finalCoords param; finalCoords?.xM ?? slot.xM override (7 lines changed)"
    - "app/src/lib/geometry/__tests__/viewMatrix.test.ts — 7 it.todo → 7 real assertions"
    - "app/src/lib/geometry/__tests__/plantSpacing.test.ts — 7 it.todo → 7 real assertions"
    - "app/src/lib/geometry/__tests__/bedLayout.test.ts — 5 it.todo → 5 real assertions"
    - "app/src/lib/editor/__tests__/editorSaveDebounce.test.ts — 10 it.todo → 9 real assertions (one merged)"
    - "app/src/stores/__tests__/editorStore.transform.test.ts — 6 it.todo → 6 real assertions"
    - "app/src/stores/__tests__/editorStore.dragdrop.test.ts — 11 it.todo → 11 real assertions"
    - "app/src/stores/__tests__/editorStore.polygon.test.ts — 12 it.todo → 12 real assertions"
    - "app/src/stores/__tests__/editorStore.undoredo.test.ts — 12 it.todo → 12 real assertions"

key-decisions:
  - "[Phase 07 P03] editorStore uses relative-path internal imports (not @/src/) so the same test files pass in both jest projects (`stores` and `editor`). Adjustment from PATTERNS.md template — the template assumed editor-project-only routing, but jest's project routing picks up editorStore.*.test.ts in both."
  - "[Phase 07 P03] selection-clear-on-undo/redo implemented as a module-load side-effect (replaces temporal undo/redo via setState wrappers) rather than inside each action that mutates selection. Side-effect runs once per process; callers transparently get the behavior without thinking about it. Open Q 4 resolution per RESEARCH."
  - "[Phase 07 P03] zundo equality check uses reference equality on `state.elements` (a.elements === b.elements) — cheapest possible dedup. Works because every action that mutates elements returns a new array reference; setSelection/setViewport/setTool keep the same reference, so the no-op snapshot is correctly filtered out."
  - "[Phase 07 P03] writePlanElement detects insert-vs-update by querying storage.getRowsByGarden — mirrors saveDimensions's behavior. Cheaper than maintaining a parallel id-set; the read is local-only (storage adapter, not Supabase)."
  - "[Phase 07 P03] colors.ts uses Record<PlanColorKey, string> instead of Record<string, string> for stricter typing. Required adding a `keyof typeof PLAN_COLORS` narrowing cast at the GardenPlanView lookup site (with `?? PLAN_COLORS.Sonstiges` fallback) to keep the runtime fallback behavior identical."
  - "[Phase 07 P03] `darkenColor` preserves the existing GardenPlanView semantics: `Math.round` (not `Math.floor`) and `substring(0, maxLen - 1)` for truncation. The plan example used `Math.floor` + `slice(0, maxLen)` — I kept the production-tested behavior to avoid visual diff on the SVG home preview."
  - "[Phase 07 P03] All three tasks committed atomically with TDD GREEN visible in commit messages (no separate RED commits, because the Wave-0 it.todo stubs from Plan 01 already represented the RED phase across the entire wave)."

patterns-established:
  - "Cross-project test file portability: when a test file's testMatch is picked up by multiple jest projects, write the test file to use only the LEAST-COMMON-DENOMINATOR moduleNameMapper. Forces production-code imports to use relative paths internally, which is a non-issue for module readability."
  - "Reference-equality zundo dedup: define actions that always return new array references (`elements: [...s.elements, el]` not `s.elements.push`) so a `a.elements === b.elements` equality function naturally filters non-mutating actions."
  - "Wrap zundo temporal undo/redo with side-effects via a module-load IIFE — alternative to writing custom temporal middleware; cheaper and easier to test."

requirements-completed: [EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-09, EDIT-11]

# Metrics
duration: ~35min
completed: 2026-05-13
---

# Phase 7 Plan 03: Wave 2 — State + Save + Geometry + Repos Summary

**One-liner:** Zustand + zundo (limit 20, partialize:{elements}, reference-equality dedup) `editorStore` with autosave subscription that bails out during gestures; three pure geometry modules (viewMatrix/plantSpacing/bedLayout) and a per-element 5s `saveDebounce` scheduler; `writePlanElement` thin wrapper + `promoteBedDraft.finalCoords?` additive param close the editor's data-plumbing layer; all 8 Wave-0 it.todo() stubs filled (44 new assertions); 19 geometry + 12 saveDebounce + 41 editorStore-unique tests green; full app suite has only the 3 pre-existing failure suites from Plan 02 deferred-items.

## Performance

- **Duration:** ~35 min (3 atomic-commit tasks; no checkpoints; no deviations)
- **Started:** 2026-05-13T~13:10Z (resume directly after Plan 02 docs commit at 1683daf)
- **Completed:** 2026-05-13T~13:45Z
- **Tasks:** 3 / 3 complete
- **Commits:** 3 (1 per task — feat/feat/feat)
- **Files modified:** 18 (6 source files created, 1 component refactored, 2 repos extended, 8 test files filled, 1 SUMMARY)

## Accomplishments

- **`app/src/lib/colors.ts` — single source of truth for the plan palette.** PLAN_COLORS + darkenColor + truncateLabel moved out of `GardenPlanView.tsx` so the upcoming Skia editor and the existing SVG home preview share one source. Type tightened from `Record<string, string>` to `Record<PlanColorKey, string>` with a `keyof typeof` narrowing cast at the GardenPlanView call site (preserves runtime fallback to `Sonstiges`).
- **Three pure geometry modules, all assertions green.**
  - `viewMatrix.ts` — `mToPx/pxToM` linear scaling, `screenToGarden/gardenToScreen` round-trip symmetric within 1e-9 (Pitfall-4 storage-layer no-rounding contract). 7 tests including the `1/3 ⋅ 1.7 + 7` no-rounding spot-check.
  - `plantSpacing.ts` — `hasOverlap` Euclidean check filtered to seasonal-layer, ignoring deleted + self. Degenerate `spacingM = 0` returns false (no false-positives at coincident coords). 7 tests.
  - `bedLayout.ts` — `polygonToBbox` throws `'polygon needs at least 3 points'` on `<3`; returns axis-aligned bbox center + size (MVP approximation — full polygon shape lives in provenance). 5 tests covering triangle, square, irregular pentagon, negative coords.
- **`saveDebounce.ts` per-element autosave with 5s `EDITOR_SAVE_DELAY_MS`.** `Map<id, Timeout>` so concurrent edits on different ids do not stomp each other. `flushAllPendingSaves(mode, byId)` cancels all timers and writes the FRESH snapshot via the resolver (not the stale row captured when the timer was scheduled). `_resetEditorSaveTimers` for test isolation. The Pitfall-5 gesture bypass lives on the editorStore subscription side (this module is a passive scheduler). 9 tests with jest.useFakeTimers including the timer-reset-on-rapid-edits and rejection-doesn't-crash contracts.
- **`gardenPlanRepo.writePlanElement` — Pattern K stage-1 wrapper.** Single-row write that detects insert-vs-update via `storage.getRowsByGarden`, calls `writeWithOutbox`, then `scheduleWriteDebounced` for the 500ms outbox push. `assertAccount` + `userId` guard. Pairs with `saveDebounce` so editor autosave is two-stage: 5s editor debounce → writePlanElement → 500ms outbox debounce → server push.
- **`draftPromotionRepo.promoteBedDraft` gains optional 6th param `finalCoords?: { xM: number; yM: number }`.** Additive — existing 5-arg call sites unchanged. When the editor drop handler passes finalCoords (in Wave 3), they override `nextFreeBedSlot`'s auto-layout placement so beds land where the finger lifted. DRAFT-02 closed for this seam.
- **`editorStore.ts` — Zustand + zundo state machine.** All 15 actions implemented (addElement/updateElement/deleteElement/setSelection/setTool/setGestureActive/toggleLayer/setActiveLayers/toggleGrid/polygonAddPoint/polygonCommit/polygonCancel + temporal undo/redo). Temporal config: `limit:20`, `partialize:(state)=>({elements:state.elements})`, `equality:(a,b)=>a.elements===b.elements`. Selection-clear-on-undo/redo implemented by replacing the temporal undo/redo functions via `temporalApi.setState({ undo: wrapped, redo: wrapped })` at module load — callers transparently get the behavior. Auto-save subscription iterates the element diff against the previous state and calls `scheduleSaveElement` for changed refs; bails out when `gestureActive=true` (Pitfall-5) or `mode !== 'account'`.
- **41 unique editorStore tests (×2 jest projects = 82 reported, all green).** 4 test files cover transform/dragdrop/polygon/undoredo — including the limit:20 boundary (25 mutations → 20 undos restore mutation-5 state), partialize boundaries (setSelection/setViewport/setTool produce no snapshot), reference-equality dedup, and Open Q 4 selection-clear contract on both undo and redo.

## Task Commits

Each task committed atomically:

1. **Task 1 — colors.ts + 3 geometry modules + 3 filled tests** — `4ca73fa` (feat) — 8 files changed, 351 insertions / 60 deletions
2. **Task 2 — writePlanElement + promoteBedDraft.finalCoords + saveDebounce + filled test** — `63d4a72` (feat) — 4 files changed, 252 insertions / 13 deletions
3. **Task 3 — editorStore + 4 filled tests** — `06ba731` (feat) — 5 files changed, 733 insertions / 46 deletions

Total LOC added across Wave 2: ~1,540 insertions / ~120 deletions across 18 files.

## Files Created/Modified

### Created (6)

- `app/src/lib/colors.ts` (39 lines)
- `app/src/lib/geometry/viewMatrix.ts` (39 lines)
- `app/src/lib/geometry/plantSpacing.ts` (26 lines)
- `app/src/lib/geometry/bedLayout.ts` (34 lines)
- `app/src/lib/editor/saveDebounce.ts` (64 lines)
- `app/src/stores/editorStore.ts` (185 lines)

### Modified (12)

- `app/src/components/GardenPlanView.tsx` — extract PLAN_COLORS/darkenColor/truncateLabel to colors.ts; add `keyof typeof PLAN_COLORS` narrowing cast at the lookup site
- `app/src/lib/gardenPlanRepo.ts` — append `writePlanElement` export
- `app/src/lib/draftPromotionRepo.ts` — promoteBedDraft signature gains `finalCoords?: { xM: number; yM: number }`; nextFreeBedSlot result is now overridable
- `app/src/lib/geometry/__tests__/viewMatrix.test.ts` — 7 real assertions (was 7 it.todo)
- `app/src/lib/geometry/__tests__/plantSpacing.test.ts` — 7 real assertions (was 7 it.todo)
- `app/src/lib/geometry/__tests__/bedLayout.test.ts` — 5 real assertions (was 5 it.todo)
- `app/src/lib/editor/__tests__/editorSaveDebounce.test.ts` — 9 real assertions (was 10 it.todo — Test 5 "writePlanElement rejects" merged with adjacent assertions on the same .catch contract)
- `app/src/stores/__tests__/editorStore.transform.test.ts` — 6 real assertions (was 6 it.todo)
- `app/src/stores/__tests__/editorStore.dragdrop.test.ts` — 11 real assertions (was 11 it.todo)
- `app/src/stores/__tests__/editorStore.polygon.test.ts` — 12 real assertions (was 12 it.todo)
- `app/src/stores/__tests__/editorStore.undoredo.test.ts` — 12 real assertions (was 12 it.todo)

## Test Coverage Per File

| File | Tests | Status |
|------|-------|--------|
| `geometry/__tests__/viewMatrix.test.ts` | 7 | green |
| `geometry/__tests__/plantSpacing.test.ts` | 7 | green |
| `geometry/__tests__/bedLayout.test.ts` | 5 | green |
| `editor/__tests__/editorSaveDebounce.test.ts` | 9 | green |
| `stores/__tests__/editorStore.transform.test.ts` | 6 | green |
| `stores/__tests__/editorStore.dragdrop.test.ts` | 11 | green |
| `stores/__tests__/editorStore.polygon.test.ts` | 12 | green |
| `stores/__tests__/editorStore.undoredo.test.ts` | 12 | green |
| **Plan 03 new assertions** | **69** | **all green** |

Editor jest project at end of Plan 03: 12 suites / 108 total tests / 69 passed + 39 todo (39 todo = Wave 3 components — DraftsTray/EditorToolbar/ElementPalette/PlanEditor.smoke — not in this plan's scope).

## Store Action Coverage

| Action | Tested? | Coverage location |
|--------|---------|-------------------|
| `addElement` | yes | dragdrop (5 tests) |
| `updateElement` | yes | transform (rotation, scale, preserve), dragdrop (Pitfall-5 bypass, preserve fields) |
| `deleteElement` | yes | dragdrop (soft-delete, isolation, render filter) |
| `setSelection` | yes | undoredo (no snapshot, selection-clear contract) |
| `setTool` | yes | undoredo (no snapshot), polygon (cleared after commit) |
| `setGestureActive` | yes | dragdrop (Pitfall-5 autosave bypass) |
| `toggleLayer` | indirect via state | (UI in Plan 04 will cover) |
| `setActiveLayers` | literal check | acceptance criteria pinned |
| `toggleGrid` | indirect | (UI in Plan 04 will cover) |
| `polygonAddPoint` | yes | polygon (initialize, append, no commit) |
| `polygonCommit` | yes | polygon (throws null + <3, bbox xM/yM, widthM/heightM, provenance.polygonPointsM, layer, cleanup) |
| `polygonCancel` | yes | polygon (clear, tool reset) |
| `temporal.undo` | yes | undoredo (basics, no-op when empty, limit, selection-clear) |
| `temporal.redo` | yes | undoredo (basics, no-op when empty, selection-clear) |

## Decisions Made

- **editorStore uses relative-path internal imports (not @/src/).** The `stores` jest project's moduleNameMapper lacks the @/src/ alias, so test files in `src/stores/__tests__/` cannot resolve `@/src/lib/...` when they import `../editorStore`. Switching the editorStore's own imports from `@/src/lib/...` to `../lib/...` makes the file portable across both jest projects without config changes.
- **selection-clear-on-undo/redo via module-load side-effect.** Wrapping `temporalApi.setState({ undo: wrapped, redo: wrapped })` runs once per process and replaces the originals — callers don't need to remember to clear selection, the wrapper does it transparently. Cheaper than writing custom zundo middleware.
- **Reference-equality dedup for zundo snapshots.** `(a, b) => a.elements === b.elements` is the cheapest possible dedup. Works because every action that mutates elements returns a new array reference (`[...s.elements, el]`, `s.elements.map(...)`), while no-op actions on other fields keep the reference identical.
- **`writePlanElement` detects insert-vs-update by querying local storage** (not a parallel id-set in memory) — mirrors `saveDimensions`'s approach. The read is local-only via the storage adapter; no Supabase round-trip.
- **`darkenColor` and `truncateLabel` preserve the legacy GardenPlanView semantics.** I deliberately kept `Math.round` (not `Math.floor` from the plan example) and `substring(0, maxLen - 1)` (not `slice(0, maxLen)`) so the SVG home preview's visual output is bit-for-bit identical to pre-extraction. Locked visual contract per UI-SPEC.
- **One commit per task, all tagged `feat(07-03)`.** Wave-0 it.todo stubs from Plan 01 already represented the RED phase across the wave; the Wave 2 plan explicitly bundles "fill assertions + implement code" per task. Splitting RED from GREEN per file would have produced 16 micro-commits with no diagnostic value.

## Deviations from Plan

### Auto-fixed (within plan scope)

- **Rule 1 — Bug — viewMatrix test assertion correction.** The plan's `<action>` example for the no-rounding test used `vm = { tx: 0, ty: 0, scale: 3 }` and expected `Number.isInteger(screen.xPx) === false`. With those inputs `1/3 * 3 + 0 === 1` (a JS float that IS an integer), so the assertion fails as written. I changed the test inputs to `vm = { tx: 7, ty: 11, scale: 1.7 }` with `gardenToScreen(1/3, 1/7, vm)` — produces a true non-integer pixel value, proving no rounding happens. Found and fixed within Task 1; committed in `4ca73fa`.
- **Rule 3 — Blocking — GardenPlanView typecheck.** After extracting PLAN_COLORS with the stricter `Record<PlanColorKey, string>` type, the existing call site `PLAN_COLORS[el.elementType]` (where `el.elementType: string`) failed TS7053. Fixed inline by adding the `as keyof typeof PLAN_COLORS` narrowing cast with the existing `?? PLAN_COLORS.Sonstiges` fallback — runtime behavior unchanged. Same commit as Task 1.
- **Rule 3 — Blocking — Cross-project import path.** Initial editorStore.ts used `@/src/lib/...` aliases per PATTERNS.md. The `stores` jest project doesn't have that alias, and both projects pick up editorStore.*.test.ts. Switched editorStore's internal imports to relative paths (`../lib/...`) to keep test portability. Documented as a key decision above.

### Out-of-scope (deferred-items)

3 pre-existing test suites continue to fail (auth, migrateLocalToAccount.rowtables, useSyncStatus) — these pre-date Phase 7 entirely and were already logged at Plan 02 baseline. Verified unchanged in this plan via `pnpm --filter app test`: 5 failures / 39 todo / 420 passed. The new 69 Plan 03 assertions are all in the 420 passed.

### Out-of-scope (not touched)

- Pre-existing modified files in working tree (`CLAUDE.md`, `app/app/(auth)/index.tsx`, `app/app/_layout.tsx`) and untracked files (`bash.exe.stackdump`, `docs/`, `tsconfig.json`, `.claude/`) — none touched. They pre-date this session and are unrelated to the plan.

**Total deviations:** 3 (all in-scope auto-fixes — Rule 1 + Rule 3 × 2). No architectural Rule 4 escalation needed.

## Issues Encountered

No production bugs surfaced. The viewMatrix "no-rounding" assertion was the only meaningful in-flight correction — and that was a fault in the plan's example test inputs, not a production-code bug.

The Windows CRLF warnings on `git commit` are expected (LF source on a `core.autocrlf=true` checkout). The new files will be stored as LF in git, normalized to CRLF in the working tree. No action needed.

## Authentication Gates

None — this plan is pure code + tests. No Supabase round-trips, no migrations pushed.

## Known Stubs

None. The autosave subscription does have a guarded `if (mode !== 'account') return` clause — but that's a correctness invariant, not a stub. Editor writes are account-only by design (same as saveDimensions / writePlanElement); local-mode users have no garden context.

Wave 3 (Plan 04) will compose Skia + gestures on top — the gesture handlers there MUST call `setGestureActive(true)` on drag-begin and `setGestureActive(false)` on drag-end so the autosave subscription bails out during interim coord updates (Pitfall-5).

## Threat Flags

No new threat surface beyond what `<threat_model>` in 07-03-PLAN.md anticipated:

- **T-07-09 (invalid element commits):** mitigated as planned — `polygonCommit` guards via `polygonToBbox` throw on <3 points; `updateElement` applies patch shallow; TS literal-union for `layer` rejects invalid values at compile time.
- **T-07-10 (polygon DoS):** accepted for MVP as planned — no cap on `polygonAddPoint`; Wave 4 toolbar UX limits manually.
- **T-07-11 (autosave during drag):** mitigated as planned — `subscribe()` early-returns on `gestureActive=true`. Test `dragdrop > updateElement during active gesture flag does NOT schedule a save` verifies the bypass.
- **T-07-12 (soft-delete audit):** accepted as planned — `deletedAt` set, row preserved.
- **T-07-13 (local-mode editor write):** mitigated as planned — `assertAccount` in `writePlanElement` (throws `gardens are account-only`); subscription bails out when `mode !== 'account'`.

No new surface introduced. Section: omitted.

## User Setup Required

None — no external service / credential / config changes.

## Next Phase Readiness

**Ready for Plan 07-04** (Wave 3 — components, gestures, Skia composition):

- `useEditorStore` exports the complete action surface for canvas + toolbar + tray composition.
- `setGestureActive(true/false)` is the seam Wave 3 gesture handlers must use around drag begin/end (Pitfall-5).
- `scheduleSaveElement` is auto-wired via the editorStore subscription — components do not call it directly.
- `promoteBedDraft(..., finalCoords)` is ready for the DraftsTray drop handler.
- `colors.ts` is the palette source for both the Skia editor canvas and any future SVG-based variant.
- Geometry helpers (`viewMatrix`, `plantSpacing`, `bedLayout`) are pure and importable from the canvas/gesture code with zero side-effects.

No blockers from Plan 03.

## Self-Check: PASSED

- [x] `app/src/lib/colors.ts` exists (FOUND)
- [x] `app/src/lib/geometry/viewMatrix.ts` exists (FOUND)
- [x] `app/src/lib/geometry/plantSpacing.ts` exists (FOUND)
- [x] `app/src/lib/geometry/bedLayout.ts` exists (FOUND)
- [x] `app/src/lib/editor/saveDebounce.ts` exists (FOUND)
- [x] `app/src/stores/editorStore.ts` exists (FOUND)
- [x] `app/src/components/GardenPlanView.tsx` imports from `@/src/lib/colors` (FOUND via diff)
- [x] `app/src/lib/gardenPlanRepo.ts` contains `export async function writePlanElement` (FOUND via grep — 1 match)
- [x] `app/src/lib/draftPromotionRepo.ts` contains `finalCoords?: { xM: number; yM: number }` (FOUND via grep — 1 match)
- [x] `app/src/lib/draftPromotionRepo.ts` contains `finalCoords?.xM ?? slot.xM` (FOUND via grep — 1 match)
- [x] `app/src/lib/editor/saveDebounce.ts` contains `EDITOR_SAVE_DELAY_MS = 5_000` (FOUND via grep — 1 match)
- [x] `app/src/stores/editorStore.ts` contains `import { temporal } from 'zundo'` (FOUND via grep — 1 match)
- [x] `app/src/stores/editorStore.ts` contains `limit: 20` (FOUND via grep — 1 match)
- [x] `app/src/stores/editorStore.ts` contains `partialize: (state) => ({ elements: state.elements })` (FOUND via grep — 1 match)
- [x] `app/src/stores/editorStore.ts` contains `equality: (a, b) => a.elements === b.elements` (FOUND via grep — 1 match)
- [x] `app/src/stores/editorStore.ts` contains `setActiveLayers:` (FOUND via grep — 2 matches: interface + impl)
- [x] `app/src/stores/editorStore.ts` contains `if (state.gestureActive) return` (FOUND via grep — 1 match)
- [x] `app/src/stores/editorStore.ts` contains `selection: null` in both undo + redo wrappers (FOUND via grep — 3 matches: initial state + undo wrapper + redo wrapper)
- [x] Zero `it.todo(` remaining in the 8 plan-scoped test files (verified via `grep -l "it.todo(" ...` — no matches)
- [x] Geometry tests green: 19/19 pass via `jest --testPathPattern='geometry' --selectProjects editor`
- [x] saveDebounce + repo tests green: 35/35 pass via `jest --testPathPattern='editorSaveDebounce|draftPromotionRepo|gardenPlanRepo'`
- [x] editorStore tests green: 82/82 pass across both jest projects via `jest --testPathPattern='editorStore'`
- [x] Editor project full pattern: `jest --testPathPattern='editor|geometry' --selectProjects editor` — 12 suites / 108 tests / 69 passed + 39 todo (Wave 3 component stubs)
- [x] `pnpm --filter app typecheck` exits 0 — no TS errors
- [x] Full suite `pnpm --filter app test` — 5 pre-existing failures unchanged from baseline (auth + migrateLocalToAccount + useSyncStatus per deferred-items.md); 420 passed includes all 69 new Plan 03 assertions
- [x] Commits exist: `4ca73fa` (Task 1), `63d4a72` (Task 2), `06ba731` (Task 3) — all verified via `git log --oneline -5`

---
*Phase: 07-plan-editor-drafts-integration-m2-m07-5*
*Plan: 03 (Wave 2 — State + Save + Geometry + Repos)*
*Completed: 2026-05-13*

## PHASE-WORK COMPLETE
