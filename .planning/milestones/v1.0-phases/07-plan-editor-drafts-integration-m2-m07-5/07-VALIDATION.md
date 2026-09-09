---
phase: 7
slug: plan-editor-drafts-integration-m2-m07-5
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-12
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from `07-RESEARCH.md §Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + ts-jest 29.1.2 + @testing-library/react-native 13.3.3 |
| **Config file** | `app/jest.config.ts` (5 projects: node, hooks, stores, photos, components) |
| **Quick run command** | `pnpm --filter app exec jest --testPathPattern='editor\|geometry\|stale-badge'` |
| **Full suite command** | `pnpm --filter app test` |
| **Estimated runtime** | ~90 seconds (quick: ~15s; full ~90s based on 6.5 P05 baseline) |

**Note on pnpm `--` forwarding bug** (Phase 6.5 P01 lesson): `pnpm --filter app test -- --testPathPattern=…` swallows the second `--`. Use `pnpm --filter app exec jest --testPathPattern=…` instead.

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

> Mapped from RESEARCH §Validation Architecture. Plan IDs (01, 02 …) finalized by gsd-planner; this map locks the requirement → test relationship and the Wave 0 dependency.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Wave |
|--------|----------|-----------|-------------------|-------------|------|
| EDIT-01 | Grid renders at 1m intervals; toggle hides/shows | unit (component) | `pnpm --filter app exec jest --testPathPattern='PlanEditor.smoke'` | ❌ W0 | 0/3 |
| EDIT-02 | Palette renders 3 tabs with kind list | unit (component) | `pnpm --filter app exec jest --testPathPattern='ElementPalette'` | ❌ W0 | 0/3 |
| EDIT-03 | LongPress→Pan handoff adds element on drop | unit (store + mocked gesture) | `pnpm --filter app exec jest --testPathPattern='editorStore.dragdrop'` | ❌ W0 | 0/3 |
| EDIT-04 | Rotation gesture writes new `rotateDeg` in element | unit (store) | `pnpm --filter app exec jest --testPathPattern='editorStore.transform'` | ❌ W0 | 0/3 |
| EDIT-05 | Polygon commit ≥3 points yields Beet element with bbox + points in provenance | unit (store + geometry) | `pnpm --filter app exec jest --testPathPattern='editorStore.polygon\|geometry.bedLayout'` | ❌ W0 | 0/4 |
| EDIT-06 | Coord round-trip pxToM/mToPx symmetric within 1e-9 | unit (pure) | `pnpm --filter app exec jest --testPathPattern='geometry.viewMatrix'` | ❌ W0 | 0/3 |
| EDIT-07 | Ghost-ring overlap returns true when neighbour within spacing | unit (pure) | `pnpm --filter app exec jest --testPathPattern='geometry.plantSpacing'` | ❌ W0 | 0/3 |
| EDIT-08 | Layer toggle hides seasonal group; `layer` column persists via mapper | unit (component + mapper) | `pnpm --filter app exec jest --testPathPattern='EditorToolbar\|rowMappers'` | ❌ W0 | 0/1+3 |
| EDIT-09 | 5s debounce fires once per element after last mutation; flush cancels | unit (timer) | `pnpm --filter app exec jest --testPathPattern='editorSaveDebounce'` | ❌ W0 | 0/2 |
| EDIT-11 | 20-step undo limit; partialize excludes selection/viewport | unit (store) | `pnpm --filter app exec jest --testPathPattern='editorStore.undoredo'` | ❌ W0 | 0/2 |
| EDIT-12 | 60fps with 200 elements on real iPhone | **manual smoke** | (manual — record perf trace, document in human-verify) | ❌ Manual | 5 |
| DRAFT-01 | Tray renders pending drafts grouped | unit (component) | `pnpm --filter app exec jest --testPathPattern='DraftsTray'` | ❌ W0 | 0/4 |
| DRAFT-02 | Bed-draft drop calls `promoteBedDraft` with finalCoords | unit (component + mocked repo) | `pnpm --filter app exec jest --testPathPattern='DraftsTray'` | ❌ W0 | 0/4 |
| DRAFT-03 | Stale-badge appears when `imported_at` > 30 days; filter `Stale` excludes fresh | unit (component) | `pnpm --filter app exec jest --testPathPattern='stale-badge'` | ❌ W0 | 0/4 |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 mirrors Phase 6.5 Plan 01 cadence: a single `editor` jest project with scaffolded stubs (`it.todo()`) and shared mock setup, then incremental files. From RESEARCH §Validation Architecture.

- [ ] `app/jest.config.ts` — add `editor` project that scopes to `app/src/components/editor/**` + `app/src/lib/geometry/**` + `app/src/lib/editor/**` (transformIgnorePatterns covers skia/gesture-handler)
- [ ] `app/src/components/editor/__tests__/setup.ts` — mock `@shopify/react-native-skia` (return primitive components), `react-native-gesture-handler` (passthrough `Gesture.*`), `react-native-reanimated` (already mocked globally in 6.5 P05)
- [ ] `app/src/lib/geometry/__tests__/viewMatrix.test.ts` — `it.todo()` stubs for pxToM/mToPx round-trip (EDIT-06)
- [ ] `app/src/lib/geometry/__tests__/plantSpacing.test.ts` — `it.todo()` for overlap detection (EDIT-07)
- [ ] `app/src/lib/geometry/__tests__/bedLayout.test.ts` — `it.todo()` for polygon → bbox (EDIT-05)
- [ ] `app/src/lib/editor/__tests__/editorSaveDebounce.test.ts` — `it.todo()` for 5s debounce + flush (EDIT-09)
- [ ] `app/src/stores/__tests__/editorStore.transform.test.ts` — `it.todo()` for rotate/scale ops (EDIT-04)
- [ ] `app/src/stores/__tests__/editorStore.dragdrop.test.ts` — `it.todo()` for drag-drop mutation (EDIT-03)
- [ ] `app/src/stores/__tests__/editorStore.polygon.test.ts` — `it.todo()` for polygon commit (EDIT-05)
- [ ] `app/src/stores/__tests__/editorStore.undoredo.test.ts` — `it.todo()` for zundo 20-step + partialize (EDIT-11)
- [ ] `app/src/components/editor/__tests__/PlanEditor.smoke.test.tsx` — `it.todo()` for grid + canvas mount (EDIT-01)
- [ ] `app/src/components/editor/__tests__/ElementPalette.test.tsx` — `it.todo()` for 3-tab palette (EDIT-02)
- [ ] `app/src/components/editor/__tests__/EditorToolbar.test.tsx` — `it.todo()` for layer toggle (EDIT-08)
- [ ] `app/src/components/editor/__tests__/DraftsTray.test.tsx` — `it.todo()` for tray render + drop callbacks + stale-badge (DRAFT-01, DRAFT-02, DRAFT-03)
- [ ] `app/src/lib/__tests__/rowMappers.layer.test.ts` — `it.todo()` for `layer` field round-trip in `planElementToDb` / `planElementFromDb`
- [ ] `packages/shared/src/i18n/de.json` — `editor.*` keys placeholder (toolbar labels, polygon prompts, toast strings; concrete strings finalized in Wave 4)

Total: 15 Wave-0 files.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 60fps @ 200 elements on real iPhone | EDIT-12 | Performance budget; CI has no real device. Phase 6.5 P05 established the human-verify deferred pattern. | 1. Build dev client on iPhone (TestFlight or local). 2. Seed garden with 200 mixed elements (script in W5). 3. Open editor, pan/pinch for 60s. 4. Record Xcode Instruments trace or in-app FPS counter (Skia `useFrameCallback` debug overlay). 5. Verify median ≥ 58 fps; document in HUMAN-VERIFY.md. |
| Auto-save survives app crash | EDIT-09 | Crash simulation is unreliable in CI. | 1. Place element. 2. Force-quit app within 4s. 3. Re-open. 4. Confirm element NOT present (write didn't fire). 5. Place again, wait 6s. 6. Force-quit. 7. Re-open. 8. Confirm element IS present. |
| Bed-draft drag-to-canvas places element at finger position | DRAFT-02 | Touch-coordinate correctness only manually confirmable. | 1. Import a bed draft via Phase 6.5 flow. 2. Open editor. 3. Open drafts tray. 4. Long-press bed draft card → drag to specific canvas location. 5. Release. 6. Confirm: element appears at finger position (within ±0.5 m tolerance), `imported_from = draftId`, draft marked `promoted`. |
| Stale-import filter visual sanity | DRAFT-03 | UX/visual review of badge + filter chip. | 1. Insert mock import with `imported_at = now - 31d`. 2. Open editor → drafts tray. 3. Confirm stale-badge visible on card. 4. Toggle filter `Stale` — only stale draft visible. Toggle `Aktuell` — stale draft hidden. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (15 files enumerated above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter (toggle after Wave 0 lands)

**Approval:** pending
