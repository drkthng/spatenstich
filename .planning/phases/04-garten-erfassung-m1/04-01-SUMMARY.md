---
phase: 04-garten-erfassung-m1
plan: 01
subsystem: data-layer
tags: [schema, types, offline, i18n, resize]
dependency_graph:
  requires: []
  provides: [garden_dimensions_table, plan_elements_table, GardenDimensionsRow, PlanElementRow, PlanElementCandidate, gardenPlanRepo, photoResizer, capture_i18n_keys]
  affects: [04-02, 04-03, 04-04]
tech_stack:
  added: []
  patterns: [writeWithOutbox, LWW-trigger-trio, account-only-guard, toLocal/toDb-mapper]
key_files:
  created:
    - supabase/migrations/20260504000014_garden_plan.sql
    - supabase/tests/garden_plan_rls.sql
    - app/src/lib/photoResizer.ts
    - app/src/lib/gardenPlanRepo.ts
    - app/src/lib/__tests__/photoResizer.test.ts
    - app/src/lib/__tests__/gardenPlanRepo.test.ts
    - app/src/storage/index.ts
  modified:
    - packages/shared/src/types/entities.ts
    - packages/shared/src/index.ts
    - packages/shared/src/i18n/de.json
    - app/src/storage/migrations.ts
    - app/src/storage/SqliteAdapter.ts
    - app/src/storage/IndexedDbAdapter.ts
    - app/src/lib/mappers/rowMappers.ts
decisions:
  - "storage/index.ts shim added for Jest module resolution (Metro ignores due to .native/.web priority)"
  - "IndexedDB version bumped from 2 to 3 for v4 object stores"
  - "Confidence-based auto-acceptance: high/medium = accepted, low = rejected (D-06 discretion)"
metrics:
  duration_minutes: 15
  completed: "2026-05-03T09:49:00Z"
  tasks: 2
  files_created: 7
  files_modified: 7
---

# Phase 04 Plan 01: Data Layer + Utilities Summary

DB-Schema (garden_dimensions + plan_elements) mit RLS + LWW, shared Types, gardenPlanRepo CRUD mit Outbox-Pattern, photoResizer (1092px/0.85 JPEG), und 40+ i18n-Keys fuer den gesamten Capture-Flow.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | DB-Migration + Shared Types + Local Storage Migration | f863e38 | migration 014, entities.ts, migrations.ts, SqliteAdapter, IndexedDbAdapter, RLS tests |
| 2 | photoResizer + gardenPlanRepo + rowMappers + i18n | 9279687 | photoResizer.ts, gardenPlanRepo.ts, rowMappers.ts, de.json, tests |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] storage/index.ts shim for Jest resolution**
- **Found during:** Task 2 (tests failed with "Cannot find module '../../storage'")
- **Issue:** Platform-specific exports (index.native.ts / index.web.ts) are not resolvable by Jest's node-based module resolver without a generic index.ts
- **Fix:** Created `app/src/storage/index.ts` that re-exports from `index.web` -- Metro ignores it due to platform-specific file priority
- **Files modified:** app/src/storage/index.ts (created)
- **Commit:** 9279687

**2. [Rule 1 - Bug] RLS test UUID format fix**
- **Found during:** Task 1 verification
- **Issue:** Test UUID `g0000000-...` used invalid hex character 'g' (UUID allows only 0-9, a-f)
- **Fix:** Changed to `c0000000-...` (valid hex)
- **Files modified:** supabase/tests/garden_plan_rls.sql
- **Commit:** f863e38

**3. [Rule 1 - Bug] RAISE NOTICE outside DO block**
- **Found during:** Task 1 verification
- **Issue:** Bare `RAISE NOTICE` at end of SQL test file -- not valid outside PL/pgSQL block
- **Fix:** Wrapped in `DO $$ BEGIN ... END $$;`
- **Files modified:** supabase/tests/garden_plan_rls.sql
- **Commit:** f863e38

## Decisions Made

1. **storage/index.ts shim:** Added to fix Jest resolution. Metro runtime ignores it (platform-specific files take priority). This is the same pattern used in other projects with Platform.select exports.
2. **IndexedDB version bump (2 -> 3):** Required for new object stores. The `upgrade()` callback handles progressive upgrades via `oldVersion < 3` check.
3. **Confidence-based auto-acceptance (D-06):** `high` and `medium` confidence elements are pre-accepted; `low` confidence elements are pre-rejected. User can override both via toggle.

## Verification Results

- `supabase db push --linked`: Migration 014 applied successfully
- `supabase db query --linked -f supabase/tests/garden_plan_rls.sql`: All 6 tests passed (no ERROR in output)
- `pnpm test -- --testPathPattern="photoResizer|gardenPlanRepo"`: 8/8 tests passed
- Acceptance criteria: all 28 checks verified

## Self-Check: PASSED

All created files exist and both commits verified in git log.
