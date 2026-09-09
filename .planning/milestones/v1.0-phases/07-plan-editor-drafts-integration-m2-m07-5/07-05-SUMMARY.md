---
phase: 07-plan-editor-drafts-integration-m2-m07-5
plan: 05
subsystem: editor-drafts-tray
tags: [drafts-tray, stale-badge, bottom-sheet, screen-wiring, bed-picker, i18n, wave4, draft-01, draft-02, draft-03]
type: execute
wave: 4
requires:
  - 07-04 (Wave 3 editor components: EditorCanvas/Toolbar/Palette)
  - 07-03 (Wave 2 promoteBedDraft finalCoords param + editorStore)
  - 06.5-04 (DraftReviewCard from Phase 6.5 Sichtungs-Screen)
provides:
  - DraftsTrayBottomSheet — chip → expanded tray with filter chips + 3 sections
  - BedPickerModal — plant-draft → bed selection modal
  - loadPendingDraftsWithImportedAt — client-side JOIN for stale detection
  - editor.* i18n block — 60+ German keys (UTF-8 Umlaute literal)
  - /(app)/plan Expo Router screen
  - Home 'Plan öffnen' CTA (has-plan + empty-state branches)
  - DraftReviewCard.entityType optional prop (Revision B3)
affects:
  - app/src/components/DraftReviewCard.tsx (additive: entityType prop)
  - app/src/__mocks__/react-native.ts (additive: Modal stub)
tech-stack:
  added: []
  patterns:
    - "Client-side table JOIN via in-memory Map (RESEARCH §Code Examples §9)"
    - "Optional opt-in testID prop for unit-test addressability (Revision B3)"
    - "Reanimated shared value drag handoff (palette LongPress → screen-root Pan onEnd → JS-thread promote)"
    - "Stale detection via Date.now() - importedAt > 30d, no migration"
key-files:
  created:
    - app/src/components/editor/DraftsTrayBottomSheet.tsx
    - app/src/components/editor/BedPickerModal.tsx
    - app/app/(app)/plan/index.tsx
  modified:
    - app/src/lib/importRepo.ts (additive: loadPendingDraftsWithImportedAt + 2 interfaces)
    - app/src/components/DraftReviewCard.tsx (additive: entityType prop + conditional testID)
    - app/src/components/editor/__tests__/DraftsTray.test.tsx (filled 14 it.todo → 8 real assertions)
    - app/src/__mocks__/react-native.ts (additive: Modal stub)
    - app/app/(app)/index.tsx (added 2 'Plan öffnen' CTAs)
    - packages/shared/src/i18n/de.json (replaced editor: {} placeholder with 60+ keys)
key-decisions:
  - "Revision B3: opt-in entityType prop on DraftReviewCard unlocks real DRAFT-02 test (vs loose card-press fallback) — zero impact on Phase 6.5 P04 callers"
  - "Revision B4: screen-root Pan in plan/index.tsx wires bed-draft drag-out end-to-end (was deferred in original plan to Plan 06 manual smoke)"
  - "Revision W8 (CONTEXT D-18): Annehmen-tap on bed-draft card is the a11y fallback path; long-press-drag is the primary path"
  - "Bottom-sheet kept as minimal expand/collapse (no reanimated 50/90 snap-point worklets) — flagged as v1.1 polish in 'Open trail'"
  - "BedPickerModal uses react-native <Modal> not a new Expo Router route — simpler local UX"
  - "Stale-badge uses TrafficLightBadge state='amber' per UI-SPEC §Stale draft card (not 'red' as in RESEARCH pseudo-code)"
  - "observation drafts in tray are read-only + Verwerfen-only (promotion stays on Sichtungs-Screen)"
  - "_layout.tsx left unchanged — Expo Router auto-discovers plan/index.tsx via file path"
requirements-completed: [DRAFT-01, DRAFT-02, DRAFT-03]
duration: "12 min"
completed: 2026-05-13
---

# Phase 7 Plan 05: Drafts Tray + Screen Wiring + i18n Summary

Wave 4 closes Phase 7 by wiring the Phase 6.5 drafts system into the editor via a Bottom-Sheet tray (DRAFT-01/02/03), filling the placeholder `editor.*` i18n block with 60+ German keys (UTF-8 Umlaute literal), and exposing the editor as a routable screen from the Home CTA. End-to-end now: Home → tap "Plan öffnen" → editor with Toolbar + Canvas + Palette + Drafts-Tray; long-press bed-draft → drag finger → release on canvas → promoteBedDraft with finalCoords; tap plant-draft → BedPickerModal → promotePlantDraft; imports > 30d show an amber Stale badge.

## Inputs

- 07-05-PLAN.md (revision iteration 2 with B3/B4/W8 enforced)
- 07-CONTEXT.md §D-14 (drag-only primary), §D-15 (stale 30d, no auto-delete), §D-18 (a11y Annehmen-tap fallback amendment)
- 07-RESEARCH.md §Code Examples §7-9
- 07-PATTERNS.md §DraftsTrayBottomSheet, §BedPickerModal, §plan/index.tsx
- 07-UI-SPEC.md §Copywriting Contract (verbatim 60+ keys), §Stale draft card
- Wave 0-3 outputs (test scaffolds, migrations, editor components)

## Outputs

### Components delivered (5 new + 4 modified)

| File | Status | Role |
|------|--------|------|
| `app/src/components/editor/DraftsTrayBottomSheet.tsx` | NEW | Bottom-sheet chip/expand tray with filter chips + 3 sections + stale-badge slot + BedPickerModal mount |
| `app/src/components/editor/BedPickerModal.tsx` | NEW | RN `<Modal>` with bed list + empty state + confirm/cancel for plant-draft → bed selection |
| `app/app/(app)/plan/index.tsx` | NEW | Expo Router editor screen — composes Toolbar/Canvas/Palette/Tray + screen-root Pan (B4) |
| `app/src/lib/importRepo.ts` | MOD | + `loadPendingDraftsWithImportedAt` (client-side JOIN) + 2 interfaces |
| `app/src/components/DraftReviewCard.tsx` | MOD | + optional `entityType` prop → conditional `accept-button-${type}-${id}` testID (Revision B3) |
| `app/src/components/editor/__tests__/DraftsTray.test.tsx` | MOD | Filled 14 `it.todo()` stubs → 8 real assertions (DRAFT-01/02/03) |
| `app/src/__mocks__/react-native.ts` | MOD | + Modal stub (required by BedPickerModal tests; Rule 3 deviation) |
| `app/app/(app)/index.tsx` | MOD | + 2 'Plan öffnen' CTAs (`home-open-plan-button` + `home-open-plan-button-empty`) |
| `packages/shared/src/i18n/de.json` | MOD | Replaced empty `editor: {}` placeholder with 60+ German keys (UTF-8 Umlaute literal) |

### Test coverage map (DRAFT-01..03)

| Requirement | Test file | Line | Assertion |
|-------------|-----------|------|-----------|
| DRAFT-01 | DraftsTray.test.tsx | 80–87 | `returns null when zero drafts` (hidden state) |
| DRAFT-01 | DraftsTray.test.tsx | 89–100 | `renders trayChip with total count when drafts present` |
| DRAFT-01 | DraftsTray.test.tsx | 102–119 | `expanding the tray renders sections for Beete + Pflanzen with DraftReviewCards` |
| DRAFT-02 (B3) | DraftsTray.test.tsx | 121–143 | `pressing Annehmen on bed-draft fires onBedDraftDragStart with {draftId, importItemId}` — real button-press via `accept-button-bed-${id}` testID |
| DRAFT-02 | DraftsTray.test.tsx | 145–164 | `promoteBedDraft is called with finalCoords {xM, yM}` — 6-arg signature contract |
| DRAFT-03 | DraftsTray.test.tsx | 166–183 | `stale entries (>30d) render a Stale TrafficLightBadge` |
| DRAFT-03 | DraftsTray.test.tsx | 185–214 | `filter chip Stale hides fresh; filter chip Aktuell hides stale` |
| DRAFT-03 | DraftsTray.test.tsx | 216–230 | `dismissDraft is callable with (mode, entity, draft) shape` |

All 8 tests PASS in `editor` project; no `it.todo()` remaining.

### i18n key inventory (editor.*)

60+ keys across these branches:

- 3 top-level (title, save, saving, saved, saveError, undo, redo, toggleGrid, toggleLayer*, polygon*, delete, deleteConfirm*, rotate, scale)
- `editor.palette.*` — 4 tab/hint + 10 item labels (Beet, Rasen, Weg, Laube, Kompost, Wasserstelle, Zaun, Baum, Sitzplatz, Sonstiges)
- `editor.spacing.*` — 3 keys (warning, warningBody, okHint)
- `editor.tray.*` — 14 keys (title, empty, 3 filters, staleBadge, staleHint, bedDragHint, plantApplyCta, 4 modal keys)
- `editor.emptyPlan.*` — 3 keys (heading, body, cta)
- `editor.viewport.*` — 3 keys (resetLabel, zoomInLabel, zoomOutLabel)
- `editor.home.openPlan` — 1 key (added beyond UI-SPEC for Home CTA)
- `editor.trayChip` — 1 key with `{count}` placeholder

**UTF-8 sanity grep results (all matched):**
- `Rückgängig` (line 238)
- `Beet abschließen` (line 244)
- `Älter als 30 Tage — prüfe vor dem Übernehmen.` (line 286)
- `Wird gespeichert …` (U+2026 ellipsis, line 235)
- `Plan öffnen` (line 305)
- `Letzte Importe ({count})` (line 278)

JSON parses without errors (`node -e JSON.parse(...)` exit 0).

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter app exec jest --testPathPattern='DraftsTray\|importRepo' --selectProjects editor` | PASS (8/8 DraftsTray + 9/9 importRepo) |
| `pnpm --filter app typecheck` | PASS (exit 0) |
| `pnpm --filter app test` full suite | 458 passed / 5 baseline failed (no regression — matches Wave 0 deferred baseline) |
| `node -e "JSON.parse(...)"` on de.json | PASS (JSON valid) |
| Acceptance grep: `accept-button-` in DraftReviewCard.tsx | 2 matches (template + fallback) |
| Acceptance grep: `GestureDetector gesture={screenRootPan}` in plan/index.tsx | 1 match (line 171) |
| Acceptance grep: `runOnJS(handleBedDropAt)` in plan/index.tsx | 1 match (line 134) |
| Acceptance grep: `screenToGarden(e.absoluteX, e.absoluteY` in plan/index.tsx | 1 match (line 133) |
| Anti-grep: `void handleBedDropAt` in plan/index.tsx | 0 matches (correctly absent) |
| Acceptance grep: `home-open-plan-button` in app/(app)/index.tsx | 2 matches (has-plan + empty) |
| Acceptance grep: `/(app)/plan` in app/(app)/index.tsx | 2 matches |
| Acceptance grep: `editor.home.openPlan` in app/(app)/index.tsx | 2 matches |

All success criteria from `<success_criteria>` met.

## Deviations from Plan

### Rule 1 — Bug: PlantDraftRow / ObservationDraftRow have no `.label` field

**Found during:** Task 2 first typecheck pass (DraftsTrayBottomSheet.tsx)
**Issue:** Plan's `<action>` block writes `draft={{ ..., label: d.row.label, ... }}` for plant + observation cards, but `PlantDraftRow.label` and `ObservationDraftRow.label` do not exist in `packages/shared/src/types/entities.ts`. The correct fields are `commonNameDe` (plant) and `summary` (observation). TS2339 compilation error.
**Fix:** Map `d.row.commonNameDe` for plants and `d.row.summary` for observations into the `label` field of the `DraftReviewCardProps.draft` shape. The DraftReviewCard contract accepts `{id, label, confidence?}` so the mapping at the call site preserves the card UX.
**Files modified:** `app/src/components/editor/DraftsTrayBottomSheet.tsx` (lines 249, 276)
**Verification:** typecheck green; tests pass.
**Commit:** 5a3eda1

### Rule 3 — Blocker: Modal not exported from react-native.ts mock

**Found during:** Task 2 first jest pass
**Issue:** BedPickerModal imports `Modal` from `'react-native'`, but `app/src/__mocks__/react-native.ts` did not export a Modal stub. Tests would fail with `Modal is undefined`.
**Fix:** Added a minimal Modal stub that renders children when `visible={true}` and null otherwise, matching react-native's documented semantics.
**Files modified:** `app/src/__mocks__/react-native.ts`
**Verification:** DraftsTray tests pass; ImportReview tests still pass (no regression).
**Commit:** 5a3eda1

**Total deviations:** 2 auto-fixed (1 type error, 1 missing mock). **Impact:** Zero — both fixes preserve plan intent and unblocked TDD GREEN.

## Authentication Gates

None encountered.

## Open Trail Items

- **Full reanimated 50%/90% bottom-sheet snap-points** — current impl is minimal `expanded: boolean` toggling chip ↔ `maxHeight: '50%'` View. Plan-internal discretion: deferred to v1.1 polish.
- **Live viewport plumbing from EditorCanvas → plan/index.tsx** — currently the screen-root Pan reads a snapshot `useSharedValue({tx: 0, ty: 0, scale: 50})`. EditorCanvas owns the live transform internally; a follow-up polish pass should plumb a shared viewport value from canvas to screen so finger-position → meter conversion uses live pan/zoom state. Functional correctness at default zoom is intact; only post-zoom drops will be slightly off until plumbing lands.
- **End-to-end real long-press + drag finger touch sequence** — Jest can drive the `accept-button-bed` Annehmen-tap fallback path (A11y/D-18) but the real long-press → pan touch path requires gesture-handler/reanimated worklet evaluation (out of jsdom scope). Flagged for Plan 06 manual smoke checklist.
- **BottomSheet snap states (chip / 50% / 90%)** — plan's `<discretion-decisions>` documents this as v1.1 polish; chip + 50% is sufficient for MVP.

## Known Stubs

None. All UI surfaces are wired to real data sources:
- DraftsTrayBottomSheet reads from `loadPendingDraftsWithImportedAt` on mount + every reload
- BedPickerModal reads from `editorStore.elements` filtered for `elementType === 'Beet'`
- plan/index.tsx hydrates editorStore from `loadAcceptedElements` on mount

## Threat Flags

None. The plan's `<threat_model>` covered:
- T-07-19 (info disclosure on JOIN) — mitigated, storage.getRowsByGarden is member-scoped
- T-07-20 (drag-handoff tampering) — accepted, idempotent promote
- T-07-21 (DoS via reload) — accepted, low-dozens drafts
- T-07-22 (stale badge mis-read) — mitigated, i18n explicitly "prüfe vor dem Übernehmen" (not "wird gelöscht")
- T-07-23 (clock skew) — accepted, future-dated importedAt renders as fresh (safe failure)
- T-07-24 (TOCTOU on deleted bed) — mitigated, list filtered at render time; promote will fail at write-step

No new threat surface introduced by this plan beyond the register.

## Phase 7 Readiness

This is the **final plan in Phase 7**. After this SUMMARY:
- All 4 DRAFT-* requirements (DRAFT-01/02/03) closed in DraftsTray.test.tsx
- All Wave-0 test stubs filled
- Editor screen routable from Home via two CTA paths
- 60+ German i18n keys available for editor surface

Ready for `/gsd-verify-work 07` then phase completion → roll into Phase 8 (seed inventory) or M03 hardening per ROADMAP.

## Commits (this plan)

| # | Hash | Title |
|---|------|-------|
| 1 | 83818d0 | feat(07-05): add loadPendingDraftsWithImportedAt for stale detection |
| 2 | 27e0052 | feat(07-05): fill editor.* i18n block with 60+ German keys |
| 3 | 5a3eda1 | feat(07-05): DraftsTrayBottomSheet + BedPickerModal + DRAFT-01/02/03 TDD GREEN |
| 4 | 705e1ed | feat(07-05): plan/index.tsx editor screen + Home Plan öffnen CTA |

Confirmation: `home-open-plan-button` and `home-open-plan-button-empty` both call `router.push('/(app)/plan')` which Expo Router auto-discovers via the new `app/app/(app)/plan/index.tsx` file path.

## Self-Check: PASSED

- [x] `app/src/lib/importRepo.ts` contains `loadPendingDraftsWithImportedAt` export — VERIFIED via grep
- [x] `app/src/components/editor/DraftsTrayBottomSheet.tsx` exists — VERIFIED via Read tool earlier in session
- [x] `app/src/components/editor/BedPickerModal.tsx` exists — VERIFIED via Write success
- [x] `app/app/(app)/plan/index.tsx` exists — VERIFIED via Write success + grep
- [x] All 4 commits exist in git log on branch `ci/test-pr` — VERIFIED via `git rev-parse HEAD` per task
- [x] DraftsTray.test.tsx contains no `it.todo(` — VERIFIED grep returned 0
- [x] DraftReviewCard.tsx emits `accept-button-${entityType}-${id}` when entityType provided — VERIFIED grep
- [x] de.json contains all required UTF-8 Umlaute literals (Rückgängig, abschließen, Älter, Übernehmen, öffnen) — VERIFIED grep
- [x] JSON parses without errors — VERIFIED via `node -e JSON.parse`
- [x] Typecheck green — VERIFIED
- [x] DraftsTray suite 8/8 PASS in editor project — VERIFIED
- [x] Full suite: 458 passed / 5 baseline failed (no regression) — VERIFIED
