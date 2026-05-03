---
phase: 04-garten-erfassung-m1
plan: 03
subsystem: capture-flow-ui
tags: [capture, camera, gallery, dimensions, photo-review, expo-image-picker]
dependency_graph:
  requires: [04-01]
  provides: [capture_screens, capture_store, photo_review_ui, dimensions_ui, budget_warning_ui]
  affects: [04-04]
tech_stack:
  added: [expo-image-picker ~16.1.4]
  patterns: [captureStore-zustand-session, CaptureStepCard-overlay, ShapeSelector-2x2-grid, inline-delete-confirmation]
key_files:
  created:
    - app/app/(app)/capture/_layout.tsx
    - app/app/(app)/capture/step-overview.tsx
    - app/app/(app)/capture/step-north.tsx
    - app/app/(app)/capture/step-south.tsx
    - app/app/(app)/capture/review.tsx
    - app/app/(app)/capture/dimensions.tsx
    - app/src/components/CaptureStepCard.tsx
    - app/src/components/PhotoThumbnail.tsx
    - app/src/components/ShapeSelector.tsx
    - app/src/components/DimensionInput.tsx
    - app/src/components/BudgetWarningBanner.tsx
    - app/src/stores/captureStore.ts
    - app/src/components/__tests__/CaptureStepCard.test.tsx
    - app/src/components/__tests__/ReviewScreen.test.tsx
  modified:
    - app/package.json
    - app/jest.config.ts
    - app/src/__mocks__/react-native.ts
    - app/app/(app)/capture/step-south.tsx
    - pnpm-lock.yaml
decisions:
  - "expo-image-picker for unified camera+gallery (no separate expo-camera needed)"
  - "captureStore as Zustand session store for photo URIs across screens (not route params)"
  - "components jest project added to jest.config.ts for UI component tests"
  - "Image mock added to react-native.ts test stubs"
  - "Freehand shape: simplified to length+width bounding box for MVP (no canvas tap)"
  - "Budget check is UX-only (client-side), authoritative check remains in Edge Function (T-4-03-02)"
metrics:
  duration_minutes: 13
  completed: "2026-05-03T10:13:25Z"
  tasks: 2
  files_created: 14
  files_modified: 5
---

# Phase 04 Plan 03: Capture Flow UI Summary

Guided photo capture flow (5 screens) with expo-image-picker for camera/gallery, CaptureStepCard progress overlay, photo review grid with 1-photo warning, and dimensions screen with 4-shape selector + dynamic fields + budget pre-check.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install expo-image-picker + Create capture _layout + CaptureStepCard + Foto-Screens | cd1b38e | _layout.tsx, step-overview/north/south.tsx, CaptureStepCard.tsx, captureStore.ts |
| 2 | Photo Review Screen + Dimensions Screen + Supporting Components | e5ed16b | review.tsx, dimensions.tsx, PhotoThumbnail.tsx, ShapeSelector.tsx, DimensionInput.tsx, BudgetWarningBanner.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Jest 'components' project missing**
- **Found during:** Task 1 verification
- **Issue:** `src/components/__tests__/` path not matched by any Jest project in jest.config.ts
- **Fix:** Added 'components' project to jest.config.ts with same moduleNameMapper pattern as 'hooks' project
- **Files modified:** app/jest.config.ts
- **Commit:** cd1b38e

**2. [Rule 3 - Blocking] Image mock missing from react-native test stubs**
- **Found during:** Task 1 (CaptureStepCard test uses Image)
- **Issue:** CaptureStepCard renders Image component which was not in the react-native mock
- **Fix:** Added Image stub to `app/src/__mocks__/react-native.ts`
- **Files modified:** app/src/__mocks__/react-native.ts
- **Commit:** cd1b38e

**3. [Rule 3 - Blocking] Forward-route type error for review.tsx**
- **Found during:** Task 1 typecheck
- **Issue:** step-south.tsx references `/(app)/capture/review` route which didn't exist yet (created in Task 2)
- **Fix:** Temporary `as any` cast in Task 1, removed in Task 2 once review.tsx existed
- **Files modified:** app/app/(app)/capture/step-south.tsx
- **Commit:** e5ed16b (cleanup)

## Decisions Made

1. **expo-image-picker unified:** Covers both camera launch and gallery selection in one package, making expo-camera unnecessary.
2. **captureStore Zustand session:** Lightweight session-scoped store for photo URIs that persists across capture screens within one session. No AsyncStorage persistence needed.
3. **Freehand simplified to bounding box:** For MVP, freehand shape just collects width+height (not canvas tap-points). Full polygon editor deferred to Phase 5 interactive canvas.
4. **Budget client-side UX only:** The budget query (`ai_jobs` count) on dimensions screen is a UX convenience. The authoritative check lives in the Edge Function (Plan 02). Client cannot bypass server-side limit (T-4-03-02 accepted).

## Verification Results

- `pnpm tsc --noEmit`: 0 errors
- `jest --testPathPattern="CaptureStepCard|ReviewScreen"`: 9/9 tests passed
- All 5 capture screens navigable via expo-router Stack
- `app/package.json` contains `expo-image-picker: "~16.1.4"`

## Known Stubs

None. All screens are fully wired to their data sources (captureStore, gardenPlanRepo, photoQueueRepo, supabase). The `analysing` screen route is referenced but created in Plan 04 (next plan).

## Self-Check: PASSED
