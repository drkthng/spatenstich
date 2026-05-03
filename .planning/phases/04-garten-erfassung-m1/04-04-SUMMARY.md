---
phase: 04-garten-erfassung-m1
plan: 04
subsystem: capture-results-ui
tags: [analysis-loading, element-confirmation, svg-plan, home-screen, tanstack-query]
dependency_graph:
  requires: [04-01, 04-02, 04-03]
  provides: [analysing_screen, confirm_screen, plan_screen, garden_plan_view, home_screen_plan_display]
  affects: []
tech_stack:
  added: [react-native-svg ^15.15.4]
  patterns: [TanStack-Query-polling, inline-confirmation-expansion, react-native-svg-static-plan]
key_files:
  created:
    - app/src/components/AnalysisLoader.tsx
    - app/src/components/ConfidenceBadge.tsx
    - app/src/components/PlanElementRow.tsx
    - app/src/components/GardenPlanView.tsx
    - app/app/(app)/capture/analysing.tsx
    - app/app/(app)/capture/confirm.tsx
    - app/app/(app)/capture/plan.tsx
    - app/src/components/__tests__/ConfirmScreen.test.tsx
    - app/src/components/__tests__/setup.ts
    - app/src/__mocks__/react-native-css-interop.ts
    - app/tsconfig.jest-components.json
  modified:
    - app/app/(app)/index.tsx
    - app/package.json
    - app/jest.config.ts
    - pnpm-lock.yaml
decisions:
  - "react-native-svg added as direct dep (was transitive via lucide/nativewind) for explicit GardenPlanView usage"
  - "NativeWind css-interop jest mock + dedicated tsconfig.jest-components.json (jsx:react) resolves NativeWind jsx-runtime conflict in component test env"
  - "analysing.tsx gets jobId from local photo_queue (StorageAdapter) not from Supabase remote — photo_queue is local-only table"
  - "Edge Function invoked directly via supabase.functions.invoke for immediate processing (handles no-pg_cron case)"
  - "confirm.tsx handles both snake_case (from Claude Vision API response) and camelCase field names for element mapping"
metrics:
  duration_minutes: 21
  completed: "2026-05-03T10:38:00Z"
  tasks: 2
  files_created: 11
  files_modified: 4
---

# Phase 04 Plan 04: Analysis Results + Plan View Summary

Analysis loading screen with TanStack Query job-polling (3s/120s timeout), element confirmation screen with toggle list and confidence badges, static SVG garden plan renderer (react-native-svg, sketch-warm palette), and home screen conditional plan display.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | AnalysisLoader + Analysing Screen + PlanElementRow + ConfidenceBadge + Confirm Screen | c162851 | AnalysisLoader.tsx, ConfidenceBadge.tsx, PlanElementRow.tsx, analysing.tsx, confirm.tsx |
| 2 | GardenPlanView (SVG Renderer) + Plan Screen + Home Screen Update | d76e2a4 | GardenPlanView.tsx, plan.tsx, index.tsx |

## Pending: Task 3 (Human-Verify Checkpoint)

**Status:** Pending human verification

**What was built:** Kompletter Garten-Erfassungs-Flow: Foto-Capture (3 Winkel + Extras) -> Resize (1.15 MP) -> Upload -> Claude Vision Analyse -> Element-Bestaetigung (Toggle-Liste) -> Schematischer 2D-Plan (SVG, skizzenhaft-warm). Home-Screen zeigt Plan oder Einstieg.

**Verification steps:**
1. App starten (iOS Simulator oder Web-Export): `cd app && pnpm start`
2. Einloggen mit bestehendem Account (account-mode erforderlich)
3. Home-Screen: "Garten erfassen" Button sichtbar (Empty-State)
4. Capture-Flow durchlaufen: Step 1-3, Review, Dimensions
5. "Analyse starten" Button: Ladescreen erscheint mit Spinner
6. Warte 30-60s auf Claude Vision Analyse
7. Element-Bestaetigung: Elemente mit Konfidenz-Badges, Toggles
8. Plan-Ansicht: SVG-Plan im skizzenhaft-warmen Stil, Raster-Toggle
9. Zurueck zum Home-Screen: Plan wird inline angezeigt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] analysing.tsx photo_queue access via StorageAdapter**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Plan assumed `photo_queue` is in Supabase remote database. It's actually a local-only table managed via StorageAdapter (SQLite/IndexedDB).
- **Fix:** Changed from `supabase.from('photo_queue')` to `storage.getRowsByGarden<PhotoQueueRow>('photo_queue', ...)` using local storage API
- **Files modified:** app/app/(app)/capture/analysing.tsx
- **Commit:** c162851

**2. [Rule 3 - Blocking] NativeWind css-interop jsx-runtime conflict in component tests**
- **Found during:** Task 1 test verification
- **Issue:** NativeWind 4.x patches jsx-runtime via `react-native-css-interop`. When ts-jest compiles component tsx files, the css-interop runtime tries to access `Appearance.getColorScheme()` which doesn't exist in test env.
- **Fix:** Created dedicated `tsconfig.jest-components.json` with `jsx: "react"` (forces React.createElement instead of jsx-runtime), added css-interop mock, setup file, and changed test environment to jsdom
- **Files modified:** app/jest.config.ts, app/tsconfig.jest-components.json (new), app/src/__mocks__/react-native-css-interop.ts (new), app/src/components/__tests__/setup.ts (new)
- **Commit:** c162851

**3. [Rule 3 - Blocking] react-native-svg not a direct dependency**
- **Found during:** Task 2 implementation
- **Issue:** react-native-svg was only a transitive dependency (via lucide-react-native/nativewind) — not explicitly listed in app/package.json
- **Fix:** Added `react-native-svg: "^15.15.4"` as direct dependency
- **Files modified:** app/package.json, pnpm-lock.yaml
- **Commit:** d76e2a4

## Decisions Made

1. **StorageAdapter for photo_queue:** The `photo_queue` is a local-only outbox table (not synced to Supabase DB). The analysing screen queries it via the local storage interface to find the jobId.
2. **Edge Function direct invoke:** On the analysing screen, `supabase.functions.invoke('ai-job-consumer')` is called directly after upload to handle the case where pg_cron is not configured (RESEARCH.md Open Question 1).
3. **confirm.tsx dual field-name handling:** Claude Vision API responses may use snake_case (`element_type`, `x_m`) or camelCase (`elementType`, `xM`). The confirm screen maps both to the camelCase PlanElementCandidate type.
4. **jsx:react for component tests:** A dedicated tsconfig overrides the jsx mode to `react` (from `react-native`) so that ts-jest produces `React.createElement` calls instead of loading NativeWind's patched jsx-runtime. This resolves the css-interop initialization crash in test environments.

## Verification Results

- `pnpm tsc --noEmit`: 0 errors
- `jest --testPathPattern="ConfirmScreen"`: 8/8 tests passed
- All acceptance criteria verified for both tasks
- react-native-svg resolves correctly

## Known Stubs

None. All screens are fully wired to their data sources (gardenPlanRepo, supabase ai_jobs/ai_results, captureStore). The "Zum Editor" button on plan.tsx navigates home (Phase 5 not yet built — documented in plan as expected behavior).

## Self-Check: PASSED
