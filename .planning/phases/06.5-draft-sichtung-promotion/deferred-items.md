# Phase 06.5 — Deferred Items

Items discovered during plan execution that are out-of-scope for the current plan. Tracked for later resolution.

## Plan 02 (schema-foundation)

### DEFERRED-1: packages/shared/src/types/supabase.ts has stray "Initialising login role..." header line

**Discovered:** 2026-05-12 during Plan 02 Task 2 verification (`pnpm --filter shared typecheck`)

**Issue:** First line of `packages/shared/src/types/supabase.ts` reads `Initialising login role...` (not a comment, not valid TS). This is leftover stdout from `supabase gen types` that was accidentally checked in. Triggers 4 TS1434/TS1128 errors and blocks `pnpm --filter shared typecheck` from exiting 0.

**Pre-existing:** Confirmed via `git show HEAD:packages/shared/src/types/supabase.ts | head -3` — the bad first line is in the committed file at HEAD~0. Bug pre-dates Plan 02; not caused by Plan 02 changes.

**Root commit:** `7fb99f9` (chore(05-01): Shared Types bereinigen — AI-Relikte entfernen) — the stdout snippet was accidentally retained when cleanup happened.

**Why deferred:** Scope boundary — Plan 02 only touches `entities.ts` (PlanElementRow). The `supabase.ts` regression is in a sibling file, was introduced 6 commits earlier, and fixing it has no connection to the Schema Foundation work. App-level `pnpm --filter app typecheck` is green; production builds via Metro do not parse `supabase.ts` first-line as TS (it's only loaded via the package entry `src/index.ts`).

**Recommended fix:** Quick task — delete the first line of `packages/shared/src/types/supabase.ts`. Should be a 1-line commit.

**Confirmed not-blocking:** Plan 02 success criterion "PlanElementRow type-driven mappers" verified via app-package typecheck + rowMappers Jest run (both green).
