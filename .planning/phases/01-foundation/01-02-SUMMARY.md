---
phase: 01-foundation
plan: "02"
subsystem: backend
tags: [supabase, postgres, rls, pgmq, feature-flags, typescript, tanstack-query, tdd]

# Dependency graph
requires:
  - pnpm monorepo (01-01)
  - packages/shared types placeholder (01-01)
provides:
  - Supabase Foundation Schema: feature_flags + ai_jobs + ai_results (Migration 001, applied to Frankfurt)
  - RLS on all three tables with auth.uid() user isolation
  - pgmq queue 'ai_jobs' (idempotent create via pgmq.meta check)
  - app/src/lib/supabase.ts: typed createClient<Database> (D-05 standalone)
  - app/src/hooks/useFlag.ts: FOUND-04 feature-flag hook with 5-min TanStack Query cache
  - app/src/lib/enqueueAiJob.ts: FOUND-07 audit + pgmq_public RPC enqueue
  - packages/shared/src/types/database.ts: real generated types (replaces placeholder)
  - supabase/tests/rls_foundation.sql: RLS cross-user SQL test (verified passing)
affects: [01-03, all-phases]

# Tech tracking
tech-stack:
  added:
    - supabase CLI@2.90.0 (scoop, linked to vitrqkzxkiqvadqfzrcx Frankfurt)
    - react-native-url-polyfill (URL polyfill for Supabase in RN)
    - "@testing-library/react-native (hook unit tests)"
    - react-test-renderer@18.3.1 (pinned to match react@18.3.1)
  patterns:
    - D-05: standalone app/ Supabase client — no shared client with Edge Functions
    - pgmq_public schema for RPC (Pitfall 3: Dashboard + RLS compatibility)
    - jest 'hooks' project: ts-jest/node + RN mocks (avoids jest-expo setup.js crash)
    - RLS testing: SET LOCAL ROLE authenticated required in Management API context

key-files:
  created:
    - supabase/config.toml
    - supabase/.gitignore
    - supabase/.env.example
    - supabase/migrations/20260416000001_foundation.sql
    - supabase/seed.sql
    - supabase/tests/rls_foundation.sql
    - app/.env.example
    - app/src/lib/supabase.ts
    - app/src/hooks/useFlag.ts
    - app/src/lib/enqueueAiJob.ts
    - app/src/__mocks__/react-native.ts
    - app/src/__mocks__/react-native-url-polyfill.ts
  modified:
    - packages/shared/src/types/database.ts (placeholder → generated types)
    - app/jest.config.ts (added 'hooks' project for ts-jest/node env)
    - app/package.json (react-native-url-polyfill, @testing-library/react-native, react-test-renderer@18.3.1)
    - pnpm-lock.yaml

key-decisions:
  - "SET LOCAL ROLE authenticated required in supabase db query context — Management API runs as postgres superuser, which bypasses RLS without explicit role switch"
  - "jest 'hooks' project uses ts-jest/node (not jest-expo) — jest-expo setup.js calls Object.defineProperty on non-object in multi-project Node env"
  - "enqueueAiJob uses (supabase as any).schema('pgmq_public') — pgmq_public not in generated Database type; any-cast is intentional and documented"
  - "react-test-renderer pinned to 18.3.1 — jest-expo pulls in 19.0.0 which conflicts with react@18.3.1"
  - "supabase db query -f (not supabase db execute --file) — --file flag removed in CLI v2.90.0, replaced by -f shorthand"

requirements-completed: [FOUND-03, FOUND-04, FOUND-07, FOUND-08]

# Metrics
duration: 14min
completed: "2026-04-17"
---

# Phase 01 Plan 02: Supabase Foundation Schema + RLS + pgmq + Feature Flags Summary

**Supabase Foundation Schema live in Frankfurt: feature_flags/ai_jobs/ai_results with RLS, pgmq queue, useFlag() hook with 5-min cache, and verified cross-user isolation via SQL test**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-17T07:01:20Z
- **Completed:** 2026-04-17T07:15:11Z
- **Tasks:** 5 (1-02-01 through 1-02-05)
- **Files modified:** 18

## Accomplishments

- Migration 001 applied to `vitrqkzxkiqvadqfzrcx` (Supabase Cloud, eu-central-1 Frankfurt)
- Three Foundation tables with full RLS: `feature_flags` (global + user-scoped), `ai_jobs` (user audit), `ai_results` (service_role only)
- All STRIDE mitigations T-2-01 through T-2-06 implemented: RLS enabled, service_role-only INSERT/UPDATE on sensitive tables
- pgmq queue `ai_jobs` created idempotently via `pgmq.meta` existence check
- `packages/shared/src/types/database.ts` replaced: real generated types with `ai_jobs`, `ai_results`, `feature_flags` shapes
- `useFlag('example_flag')` hook: reads from `feature_flags`, caches 5 minutes via TanStack Query
- `enqueueAiJob()`: creates audit row in `ai_jobs` + sends pgmq message via `pgmq_public` schema RPC
- RLS SQL test verified: User B sees 0 rows of User A (`SET LOCAL ROLE authenticated` required for Management API)
- 14 tests pass (10 StorageAdapter + 4 useFlag); typecheck green

## Task Commits

1. **Task 1-02-01: Supabase init + link + env.example** - `e42b671` (chore)
2. **Task 1-02-02: Test stubs** - `ff1e1bb` (test)
3. **Task 1-02-03: Migration 001** - `84bdf0c` (feat)
4. **Task 1-02-04: Schema push + type generation** - `b1007dd` (feat)
5. **Task 1-02-05 RED: TDD tests + hooks jest project** - `6f26588` (test)
6. **Task 1-02-05 GREEN: supabase.ts + useFlag + enqueueAiJob + RLS SQL** - `ba45fdc` (feat)

## Files Created/Modified

- `supabase/config.toml` — project_id: spatenstich-dev, linked to vitrqkzxkiqvadqfzrcx
- `supabase/migrations/20260416000001_foundation.sql` — 3 tables, 3x RLS, pgmq.create, tg_set_updated_at trigger
- `supabase/seed.sql` — global example_flag (user_id=NULL, enabled=false)
- `supabase/tests/rls_foundation.sql` — cross-user isolation SQL test with SET LOCAL ROLE
- `app/.env.example` — EXPO_PUBLIC_SUPABASE_URL + ANON_KEY placeholders
- `supabase/.env.example` — ACCESS_TOKEN + PROJECT_REF documentation
- `app/src/lib/supabase.ts` — D-05 standalone typed createClient
- `app/src/hooks/useFlag.ts` — FOUND-04 hook with 5-min staleTime
- `app/src/lib/enqueueAiJob.ts` — FOUND-07 audit + pgmq_public RPC
- `packages/shared/src/types/database.ts` — supabase gen types output (real schema)
- `app/jest.config.ts` — added 'hooks' project (ts-jest/node, avoids jest-expo crash)
- `app/src/__mocks__/react-native.ts` — minimal Platform/NativeModules mock
- `app/src/__mocks__/react-native-url-polyfill.ts` — no-op polyfill mock

## Decisions Made

- **SET LOCAL ROLE authenticated in RLS tests**: Supabase Management API executes SQL as `postgres` superuser — RLS is bypassed without explicit `SET LOCAL ROLE authenticated`. Required for all RLS validation scripts.
- **jest 'hooks' project with ts-jest/node**: `jest-expo` preset's `setup.js` calls `Object.defineProperty` on non-object in multi-project Node context. Dedicated ts-jest project with RN mocks is the stable solution (extends the Plan 01 pattern).
- **`(supabase as any).schema('pgmq_public')`**: pgmq_public is an internal extension schema not included in the generated Database types. Type-casting is documented and intentional.
- **react-test-renderer@18.3.1 pinned**: jest-expo@53 pulls react-test-renderer@19.0.0 which conflicts with react@18.3.1. Pin is required until Expo SDK upgrade.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `supabase db execute --file` flag removed in CLI v2.90.0**
- **Found during:** Task 1-02-04 (seed execution)
- **Issue:** Plan specified `supabase db execute --file seed.sql` but CLI v2.90.0 uses `supabase db query -f`
- **Fix:** Used `supabase db query -f <absolute-path> --linked` for seed and RLS test execution
- **Commit:** b1007dd

**2. [Rule 1 - Bug] `supabase gen types` output included "Initialising login role..." prefix**
- **Found during:** Task 1-02-04 (type generation)
- **Issue:** CLI prints "Initialising login role..." to stdout before the TypeScript output, corrupting database.ts
- **Fix:** Removed prefix line via Edit tool after generating
- **Files modified:** packages/shared/src/types/database.ts
- **Commit:** b1007dd

**3. [Rule 1 - Bug] jest-expo setup.js crashes in multi-project node env (hooks tests)**
- **Found during:** Task 1-02-05 (TDD RED)
- **Issue:** `jest-expo` preset forces `setup.js` which calls `Object.defineProperty` on non-object in Node context — same root cause as Plan 01 StorageAdapter issue but in hooks context
- **Fix:** Added dedicated 'hooks' jest project using ts-jest/node preset with manual RN mocks (`src/__mocks__/react-native.ts`, `src/__mocks__/react-native-url-polyfill.ts`)
- **Files modified:** app/jest.config.ts, new mock files
- **Commit:** 6f26588

**4. [Rule 1 - Bug] react-test-renderer@19.0.0 conflicts with react@18.3.1**
- **Found during:** Task 1-02-05 (TDD GREEN)
- **Issue:** `@testing-library/react-native` detected `react-test-renderer@19.0.0` (pulled by jest-expo) but react is @18.3.1 — throws on import
- **Fix:** Pinned `react-test-renderer@18.3.1` in app/package.json devDependencies
- **Commit:** ba45fdc

**5. [Rule 1 - Bug] RLS SQL test: postgres superuser bypasses RLS**
- **Found during:** Task 1-02-05 (RLS test execution)
- **Issue:** First RLS test run failed with "RLS breach: user B sees 1 rows of user A". Root cause: `supabase db query --linked` runs as `postgres` superuser which ignores RLS policies regardless of `set_config` JWT claims
- **Fix:** Added `SET LOCAL ROLE authenticated` before INSERT so the query runs under the restricted role where RLS applies
- **Files modified:** supabase/tests/rls_foundation.sql
- **Commit:** ba45fdc

**6. [Rule 1 - Bug] enqueueAiJob type errors: payload Json mismatch + pgmq_public not in Database type**
- **Found during:** Task 1-02-05 (typecheck)
- **Issue 1:** `Record<string, unknown>` not assignable to Supabase `Json` type
- **Issue 2:** `schema('pgmq_public')` not in generated Database union type
- **Fix:** Cast payload as `Json`, cast supabase client as `any` for pgmq_public schema call with documented comment
- **Files modified:** app/src/lib/enqueueAiJob.ts
- **Commit:** ba45fdc

---

**Total deviations:** 6 auto-fixed (all Rule 1 bugs). No architectural changes needed.

## Known Stubs

None — all plan artifacts fully implemented and verified.

The `example_flag` seed row is a functional placeholder for FOUND-04 acceptance testing. It is intentional and expected to be toggled manually in the Dashboard for the acceptance test.

## Threat Flags

None — all new surfaces (feature_flags, ai_jobs, ai_results, pgmq) are covered by the plan's threat model (T-2-01 through T-2-07). No unplanned network endpoints or auth paths introduced.

---
*Phase: 01-foundation*
*Completed: 2026-04-17*

## Self-Check: PASSED

- supabase/config.toml: FOUND
- supabase/migrations/20260416000001_foundation.sql: FOUND
- supabase/tests/rls_foundation.sql: FOUND
- app/src/lib/supabase.ts: FOUND
- app/src/hooks/useFlag.ts: FOUND
- app/src/lib/enqueueAiJob.ts: FOUND
- packages/shared/src/types/database.ts: FOUND
- app/.env.example + supabase/seed.sql: FOUND
- All 6 task commits (e42b671, ff1e1bb, 84bdf0c, b1007dd, 6f26588, ba45fdc): FOUND
- RLS enabled in migration: FOUND
- pgmq.create in migration: FOUND
- Database type with feature_flags: FOUND
- staleTime in useFlag: FOUND
- pgmq_public in enqueueAiJob: FOUND
