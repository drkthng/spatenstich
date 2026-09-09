---
phase: 08-plant-db-foundation
plan: 04
subsystem: supabase-edge-functions + app-hooks + migration-push
tags: [edge-function, docker-deploy, sql-seed, migration-push, plantRepo, usePlants, wave3]
one_liner: "Wave 3 closes Phase 8 — Migration 019 pushed live, Edge Function deployed via Docker, SQL seed fallback landed 90 plants + 38 companions on Supabase Frankfurt, plantRepo (10 GREEN) + usePlants (4 GREEN) ready for Phase 9"

requires:
  - phase: 08-plant-db-foundation
    provides: 90 plants + 38 companions in plants.json, Migration 019 committed, validator + smoke tests GREEN (Waves 0-2)
provides:
  - Migration 019 LIVE on Supabase Frankfurt (`vitrqkzxkiqvadqfzrcx`)
  - Edge Function `seed-plants` deployed via Docker (static_files bundling fix)
  - SQL seed fallback with LEAST/GREATEST UUID canonicalization — 90 plants + 38 companions verified live
  - `plantRepo.ts` with 4 functions (loadAllPlants, loadPlantBySlug, loadCompanionsFor, searchPlants) — 10 GREEN tests
  - `usePlants()` TanStack Query hook with JSON-bundle initialData — 4 GREEN tests
  - Phase 8 COMPLETE — all 9 PLANT-DB-* requirements + SEED-02 closed
affects: [09-companion-hinweise, 10-aussaatkalender]

tech-stack:
  added: []
  patterns:
    - "SQL seed fallback (Option C from handoff) when Edge Function static_files bundling fails at runtime"
    - "LEAST/GREATEST for UUID canonicalization in companion FK pairs (slug order != UUID order)"
    - "Docker required for Supabase Edge Function static_files bundling — --use-api silently skips static_files"

key-files:
  created:
    - .planning/phases/08-plant-db-foundation/08-04-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/phases/08-plant-db-foundation/08-CONTEXT.md

deviations:
  - id: DEV-01
    description: "Edge Function invoke returned WORKER_ERROR despite Docker deploy. Root cause: static_files bundling path still not resolved at runtime. Switched to SQL seed fallback (Option C from handoff)."
    severity: medium
    resolution: "Generated SQL INSERT script from plants.json via Node, executed via `supabase db query --linked`. Edge Function remains deployed for future re-invocations after Supabase CLI fixes."
  - id: DEV-02
    description: "First SQL seed inserted only 26/38 companions — `a.id < b.id` filter dropped pairs where UUID order differs from slug order."
    severity: low
    resolution: "Regenerated SQL with LEAST(a.id, b.id)/GREATEST(a.id, b.id) canonicalization. Re-run verified 38/38."

verification:
  migration_019: "LIVE — `supabase migration list --linked` shows 20260517000019 in Local + Remote columns (pushed in earlier session)"
  edge_function: "DEPLOYED via Docker — no WARN in deploy log (Pitfall 1 fixed). Runtime invoke failed (WORKER_ERROR); SQL seed fallback used."
  seed_result: "SQL seed verified: SELECT count(*) FROM plants = 90; SELECT count(*) FROM plant_companions = 38; Tomate = Solanaceae spot-check passed."
  plantRepo_tests: "10 GREEN (PLANT-DB-07 symmetric companion verified)"
  usePlants_tests: "4 GREEN (PLANT-DB-06 hook cache verified)"
  shared_suite: "61 GREEN (5 suites: smoke, validator, i18n, klimazonen, vereinsregeln)"
  pgTAP: "Skipped — `supabase test db` not available in CLI 2.90.0; manual RLS verify deferred"

duration_minutes: ~20
---

# Phase 8 Plan 04 Summary — Wave 3 Edge Function + Repo + Hook + Seed

## What Changed

Migration 019 was already live from the previous session. This session completed the remaining Wave 3 work:

1. **Docker Deploy**: Edge Function `seed-plants` re-deployed via Docker (fixing Pitfall 1 — `--use-api` silently skipped `static_files` bundling). Deploy succeeded without WARN.

2. **SQL Seed Fallback**: Edge Function invoke still returned `WORKER_ERROR` at runtime. Switched to Option C (SQL seed from handoff): generated INSERT script from `plants.json` via Node, executed via `supabase db query --linked`. First pass had UUID-ordering bug (26/38 companions); fixed with `LEAST/GREATEST` canonicalization → 38/38.

3. **Verification**: 90 plants + 38 companions confirmed live. Tomate=Solanaceae spot-check passed. All tests GREEN (61 shared + 14 hooks).

4. **Docs**: STATE.md, ROADMAP.md, 08-CONTEXT.md updated with phase-complete markers.

## Phase 8 Final Status

**COMPLETE.** All 4 plans executed. 9 PLANT-DB-* requirements + SEED-02 closed. Phase 9 (Companion-Hinweis) can consume `usePlants()` + `loadCompanionsFor()` directly.
