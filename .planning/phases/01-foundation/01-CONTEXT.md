# Phase 1: Foundation - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure infrastructure phase — no user-visible features. Delivers:
- pnpm monorepo (app/, supabase/, packages/shared) that compiles cleanly
- StorageAdapter abstraction over expo-sqlite (native) and IndexedDB (web)
- Supabase migration 001: foundation tables only, RLS enabled on all tables
- pgmq queue for async AI jobs
- Feature flag system (Supabase table)
- EAS CI pipeline (iOS + Web, builds on merge to main)
- Edge Function consumer that picks up pgmq jobs and persists AI responses

Every subsequent phase depends on this foundation. No UI, no user flows — only the infrastructure other phases build on.

</domain>

<decisions>
## Implementation Decisions

### Schema — Migration 001

- **D-01:** Migration 001 scaffolds ONLY foundation tables: `feature_flags`, `ai_jobs`, `ai_results`. All other tables (garden_plans, seed_inventory, etc.) are added in their respective phases via separate migrations.
- **D-02:** RLS is enabled on all tables from migration 001 onward. Every table gets `user_id` FK + `auth.uid()` policy.
- **D-03:** Supabase is hosted on Supabase Cloud, EU region Frankfurt. No self-hosting.

### packages/shared Scope

- **D-04:** packages/shared contains four categories:
  1. **TypeScript types** — Database types (from Supabase codegen), domain interfaces (GardenPlan, SeedEntry, etc.), API response shapes
  2. **Constants & config** — Klimazonen lookup table, Archetyp definitions (6 types), pgmq queue name constants, feature flag key constants. Eliminates magic strings in app/ and supabase/.
  3. **Pure utility functions** — Framework-agnostic helpers (e.g. coordinate conversion, Klimazonen mapping). Shared between app/ and Edge Functions.
  4. **i18n strings** — `de.json` lives in packages/shared (NFR-06: UI strings centralised for future localisation)
- **D-05:** No shared Supabase DB client. app/ and supabase/ (Edge Functions) each initialise `@supabase/supabase-js` independently — Deno vs. React Native runtime differences make a shared client too risky.

### EAS CI Triggers & Environments

- **D-06:** EAS builds (iOS + Web) run only on merge to main. PRs run fast checks only (lint, TypeScript, unit tests). Conserves EAS free-tier build minutes for a solo developer.
- **D-07:** Two environments only: `dev` (local Supabase via Docker + EAS Preview profile) and `prod` (Supabase Cloud Frankfurt + EAS Production profile). No staging environment for MVP.

### StorageAdapter Interface

- **D-08:** StorageAdapter exposes CRUD only in Phase 1: `get`, `set`, `delete`, `list`. Transactions and richer query support deferred to Phase 3 (Offline & Sync) when requirements are concrete.
- **D-09:** Local schema migrations use version number + up-migration pattern. StorageAdapter stores a schema version; on app start it checks whether migrations are needed and runs them in order.

### Claude's Discretion

- Shared DB client: not included (Deno / React Native runtime incompatibility — each package initialises independently).
- Transaction support in StorageAdapter: deferred to Phase 3 when the offline sync requirements make the transaction model clear.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech Stack & Stack Decisions
- `CLAUDE.md` — Full recommended stack table, rejected libraries, and open questions. Defines exact versions for Expo SDK, Supabase JS, NativeWind, etc.
- `.planning/PROJECT.md` — Key Decisions table, constraints, core value, out-of-scope list
- `.planning/REQUIREMENTS.md` — FOUND-01 through FOUND-08, NFR-06, NFR-08 (the requirements this phase must satisfy)
- `.planning/ROADMAP.md` §Phase 1 — Success criteria that define done for this phase

### External Docs (critical for implementation)
- Expo Monorepo Guide: https://docs.expo.dev/guides/monorepos/ — pnpm hoisted config
- Supabase JS Metro issue: https://github.com/supabase/supabase-js/issues/1403 — `@supabase/supabase-js` must be >= 2.49.5 (ws/stream error with RN 0.79+)
- expo-sqlite web SharedArrayBuffer issue: https://github.com/expo/expo/issues/38481 — wrap behind StorageAdapter interface from day one

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — project not started. This phase creates all foundational assets from scratch.

### Established Patterns
- None yet — this phase establishes the patterns all subsequent phases follow.

### Integration Points
- packages/shared exports consumed by app/ (React Native + Web) and supabase/ (Deno Edge Functions)
- StorageAdapter interface defined in packages/shared, implemented in app/src/storage/
- pgmq queue names defined as constants in packages/shared/constants

</code_context>

<specifics>
## Specific Ideas

- EAS build should output a runnable iOS build AND a Web export — both are success criteria for this phase
- Feature flag `example_flag` must be toggleable in Supabase dashboard and readable via `useFlag()` in the app without a redeploy — this is the acceptance test for the flag system
- The pgmq end-to-end test: insert a test AI job manually → Edge Function consumer picks it up → raw response persisted in `ai_results` — Claude API key must NOT appear in any client bundle (verifiable via bundle inspection)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-15*
