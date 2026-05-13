---
phase: 07-plan-editor-drafts-integration-m2-m07-5
plan: 02
subsystem: schema-types-mappers
tags: [migration, schema, types, mappers, layer, tdd]

# Dependency graph
requires:
  - phase: 06.5-draft-sichtung-promotion
    provides: "PlanElementRow with importedFrom + provenance — extension pattern for Phase 7 layer column"
  - phase: 07-plan-editor-drafts-integration-m2-m07-5 (Plan 01)
    provides: "Wave-0 rowMappers.layer.test.ts stub (it.todo shells filled in this plan)"
provides:
  - "Migration 018: plan_elements.layer column (text NOT NULL DEFAULT 'infrastructure', CHECK ('infrastructure','seasonal'))"
  - "Backfill rule: existing plant rows (element_type='Pflanze', deleted_at IS NULL) promoted to layer='seasonal'"
  - "PlanElementRow.layer non-optional field (TS literal union)"
  - "Pitfall-8 lazy default in planElementToLocal — pre-018 synced rows derive layer from element_type"
  - "planElementToDb writes layer column for Migration 018 push"
  - "Filled-in rowMappers.layer.test.ts (8 tests, no it.todo remaining)"
  - "promoteBedDraft now sets layer='infrastructure', promotePlantDraft sets layer='seasonal'"
affects: [07-03 (editorStore + canvas can read layer), 07-04 (drafts tray + toolbar can filter by layer), 07-05 (Migration 018 push gate), 07-06 (final validation)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration analog (017 → 018): DO-block invariants, ALTER ADD COLUMN IF NOT EXISTS, CHECK constraint via guarded DO-block, optional plant backfill, RAISE NOTICE on success"
    - "Pitfall-8 lazy default: priority ladder explicit-DB-value > element_type-based-fallback > infrastructure-default. Same pattern available for any future column added between server-push and client-sync."
    - "TDD RED/GREEN commit split: failing test commit (6dc7737) precedes implementation commit (b1d8eae) — git log shows the discipline even when same author."

key-files:
  created:
    - "supabase/migrations/20260513000018_plan_elements_layer.sql (56 lines, committed not pushed)"
    - ".planning/phases/07-plan-editor-drafts-integration-m2-m07-5/deferred-items.md"
  modified:
    - "packages/shared/src/types/entities.ts (PlanElementRow gains layer field at end of interface)"
    - "app/src/lib/mappers/rowMappers.ts (DbPlanElementRowLoose + planElementToLocal Pitfall-8 default + planElementToDb writes layer)"
    - "app/src/lib/draftPromotionRepo.ts (promoteBedDraft layer='infrastructure', promotePlantDraft layer='seasonal')"
    - "app/src/lib/__tests__/rowMappers.layer.test.ts (8 it.todo shells → 8 real expect-assertions)"
    - "app/src/lib/__tests__/rowMappers.test.ts (2 PlanElementRow literals patched with layer)"
    - "app/src/lib/__tests__/gardenPlanRepo.test.ts (3 PlanElementRow literals patched with layer)"
    - "app/src/lib/__tests__/draftPromotionRepo.test.ts (1 fixtureBedElement patched)"
    - "app/src/lib/__tests__/draftPromotionRepo.layout.test.ts (1 bedAt helper patched)"
    - "app/src/lib/__tests__/draftPromotionRepo.idempotency.test.ts (4 PlanElementRow literals patched)"

key-decisions:
  - "[Phase 07 P02] PlanElementRow.layer is non-optional (no `| null`). Forces every constructor to be explicit about layer, matching the runtime CHECK constraint. Pre-018 DB rows have a lazy default in the mapper, so the type stays strict for the client side."
  - "[Phase 07 P02] Migration 018 NOT pushed in this plan — push remains gated to Plan 05 (Wave 5) to keep the schema-vs-code coordination point explicit. Plans 03-04 can reference `layer` in store/components because the TS type is already extended."
  - "[Phase 07 P02] Pitfall-8 lazy default uses 4-way priority (explicit-seasonal > explicit-infrastructure > Pflanze-implies-seasonal > default-infrastructure) instead of a simpler 2-way `(db.layer as 'infrastructure'|'seasonal') ?? defaultByType`. The explicit string comparisons guard against unexpected values landing in `db.layer` (defensive narrowing) before the CHECK constraint is live in remote DB."
  - "[Phase 07 P02] 3 pre-existing test failures (auth, migrateLocalToAccount.rowtables, useSyncStatus) confirmed via stash-pop baseline — not caused by Plan 02. Logged to deferred-items.md per GSD scope-boundary rule; no Rule 1-3 fix attempted."

patterns-established:
  - "TDD-RED-then-GREEN for non-trivial impl: RED-only commit first (`test(...)` only changes test file) — even though TDD wasn't strictly required (test file already existed as it.todo stubs), the explicit failing-test commit preserves the discipline visible in git log."
  - "Stash-pop-baseline diagnosis: `git stash push -- <only-my-files>` + `jest <same-tests>` proves whether a failure is caused by my changes or pre-existing. Then `git stash pop` to restore. Re-usable diagnostic for any 'is this my fault?' question during execution."

requirements-completed: [EDIT-08]  # layer-toggle requirement gets its schema + type + mapper foundation here; UI cycle work is Plan 04.

# Metrics
duration: ~25min
completed: 2026-05-13
---

# Phase 7 Plan 02: Wave 1 — Migration 018 + PlanElementRow.layer + Mappers Summary

**One-liner:** Migration 018 SQL committed (NOT pushed — Plan 05 owns), PlanElementRow.layer non-optional field added with Pitfall-8 lazy mapper default so pre-018 synced plant rows render in the seasonal layer client-side until next save; 8 rowMappers.layer tests green, 7 PlanElementRow-touching suites all green, typecheck clean.

## Performance

- **Duration:** ~25 min (2 tasks, TDD RED-GREEN split for Task 2)
- **Started:** 2026-05-13T~12:42Z
- **Completed:** 2026-05-13T~13:08Z
- **Tasks:** 2 / 2 complete
- **Commits:** 4 (1 schema, 1 RED test, 1 GREEN impl, 1 docs)
- **Files modified:** 9 (1 SQL created, 1 type extended, 1 mapper extended, 1 prod repo patched, 5 test files patched)

## Accomplishments

- **Migration 018 SQL committed.** `supabase/migrations/20260513000018_plan_elements_layer.sql` (56 lines) mirrors Migration 017's pattern verbatim: section headers, `ALTER TABLE ADD COLUMN IF NOT EXISTS`, CHECK constraint installed via guarded DO-block, plant backfill `UPDATE … SET layer='seasonal' WHERE element_type='Pflanze' AND deleted_at IS NULL AND layer='infrastructure'`, two DO-block invariants (column presence + CHECK constraint presence), `RAISE NOTICE 'migration_018 ok'`. NO top-level `BEGIN`/`COMMIT` (Supabase wraps file in implicit transaction). File committed but NOT pushed — Plan 05 owns push gate.
- **PlanElementRow.layer added as non-optional union.** `packages/shared/src/types/entities.ts` — single new line at end of interface: `layer: 'infrastructure' | 'seasonal'`. JSDoc above declares semantic: `'infrastructure'` = permanent, `'seasonal'` = plants. Forces every constructor to be explicit; type system catches missing layer in any new PlanElementRow literal.
- **Pitfall-8 lazy default in mapper.** `app/src/lib/mappers/rowMappers.ts` `planElementToLocal` now computes `layerValue` via 4-way priority before assembling the return object: `db.layer === 'seasonal'` → seasonal; `db.layer === 'infrastructure'` → infrastructure; else `db.element_type === 'Pflanze'` → seasonal; else infrastructure. This means rows synced before Migration 018 is pushed (where the server `layer` column does not yet exist) still render in the correct layer client-side.
- **planElementToDb writes layer.** Single new line `layer: local.layer` in the returned object — defense-in-depth for the post-push state where the column will be `NOT NULL` server-side.
- **draftPromotionRepo upgraded.** `promoteBedDraft` sets `layer: 'infrastructure'` (beds = static structure); `promotePlantDraft` sets `layer: 'seasonal'` (plants live in the seasonal layer per EDIT-08).
- **All 8 rowMappers.layer.test.ts assertions filled in (TDD GREEN).** Replaced 8 `it.todo()` shells with real `it()` blocks: 3 round-trip tests + 5 Pitfall-8 lazy-default tests covering all four ladder branches.
- **Constructor sites patched.** 11 PlanElementRow literal constructors across 5 test files and 1 production file now include `layer` — typecheck stays green.
- **TDD discipline preserved.** Committed RED phase (`6dc7737`) separately from GREEN (`b1d8eae`) — first commit lands the failing test, second lands the impl that makes it pass.

## Task Commits

Each task committed atomically:

1. **Task 1: Migration 018 SQL file** — `01a2943` (feat)
2. **Task 2 RED: Fill rowMappers.layer test assertions** — `6dc7737` (test) — tests fail TS compile because PlanElementRow lacks `layer`
3. **Task 2 GREEN: Add layer to types + mappers + repo + patch test fixtures** — `b1d8eae` (feat) — all 8 layer tests pass; typecheck green
4. **Plan metadata: deferred-items.md** — `1683daf` (docs) — 3 pre-existing test-suite failures logged

## Files Created/Modified

### Created (2)

- `supabase/migrations/20260513000018_plan_elements_layer.sql` — Migration 018: plan_elements.layer column + CHECK + plant backfill + invariants (56 lines)
- `.planning/phases/07-plan-editor-drafts-integration-m2-m07-5/deferred-items.md` — pre-existing test failures log (auth, migrateLocalToAccount, useSyncStatus)

### Modified (8 source + 1 SUMMARY)

- `packages/shared/src/types/entities.ts` — PlanElementRow gains `layer: 'infrastructure' | 'seasonal'`
- `app/src/lib/mappers/rowMappers.ts` — DbPlanElementRowLoose + planElementToLocal (Pitfall-8 default) + planElementToDb (write layer)
- `app/src/lib/draftPromotionRepo.ts` — promoteBedDraft `layer: 'infrastructure'`; promotePlantDraft `layer: 'seasonal'`
- `app/src/lib/__tests__/rowMappers.layer.test.ts` — 8 it.todo → 8 real assertions (TDD GREEN target)
- `app/src/lib/__tests__/rowMappers.test.ts` — 2 PlanElementRow literals patched with `layer: 'infrastructure'`
- `app/src/lib/__tests__/gardenPlanRepo.test.ts` — 3 PlanElementRow literals patched
- `app/src/lib/__tests__/draftPromotionRepo.test.ts` — `fixtureBedElement` patched with `layer: 'infrastructure'`
- `app/src/lib/__tests__/draftPromotionRepo.layout.test.ts` — `bedAt` helper patched
- `app/src/lib/__tests__/draftPromotionRepo.idempotency.test.ts` — 4 PlanElementRow literals patched (all beds → 'infrastructure')

## Decisions Made

- **PlanElementRow.layer is non-optional.** Forces every constructor literal to be explicit. The TS literal union (`'infrastructure' | 'seasonal'`) matches the runtime CHECK constraint, providing defense-in-depth.
- **Migration 018 file committed but NOT pushed.** Push is gated to Plan 05 (Wave 5) per plan-level coordination — the SQL file in git is sufficient for Plans 03 and 04 to reference `layer` in TS / store / components without waiting on remote schema.
- **Pitfall-8 lazy default uses 4-way priority ladder.** Explicit `db.layer === 'seasonal'`/`'infrastructure'` comparisons (not `db.layer as 'infrastructure'|'seasonal'`) — defensive narrowing against unexpected DB values, since the CHECK constraint isn't yet live in remote.
- **TDD RED commit kept separate from GREEN.** Even though the Wave-0 it.todo() stub already existed (could have argued the "test already exists, just needs assertions"), splitting the assertions-fill commit from the impl commit keeps the TDD discipline visible in git log. Plan 06.5 P05 established the pattern (`97a6b15` RED → `ad170c9` GREEN even for a one-liner).

## Deviations from Plan

### Auto-fixed (Rule N/A — within plan scope)

- **None** — all 11 PlanElementRow constructor sites listed in the plan's `<action>` section were patched as anticipated. The plan correctly enumerated them via `grep -rn "PlanElementRow" app/src/`.

### Pre-existing failures (out-of-scope per GSD scope-boundary rule)

3 jest suites failed at the pre-Plan-02 baseline (verified by stashing my Plan 02 edits and re-running). All pre-date Phase 7 entirely:

| Suite | Failures | Phase of origin |
|------|----------|-----------------|
| `auth.test.ts` | 2 (UUID persistence, canonical key storage) | Phase 02-01 |
| `migrateLocalToAccount.rowtables.test.ts` | 1 (bootstrapRowTables) | Phase 03-03 |
| `useSyncStatus.test.ts` | 2 (mockClear lifecycle, Test 5 + Test 7) | Phase 03-06 |

Logged to `deferred-items.md`. Not fixed — out of scope per "Only auto-fix issues DIRECTLY caused by current task's changes."

**Total deviations:** 0 (in-scope plan executed verbatim).
**Pre-existing items deferred:** 1 batch (3 suites / 5 tests).

## Issues Encountered

**One mid-flow snag:** During TDD-RED→GREEN diagnostic, I ran `git stash --include-untracked --keep-index` to test pre-existing failure baseline. The `--keep-index` flag on an empty index inadvertently stashed all my (still-unstaged) GREEN edits in addition to the untracked files. Recovery: `git stash pop` immediately restored the state. Lesson: when checking baseline-vs-current, use `git stash push -- <specific files>` not `git stash --keep-index` — the latter only protects staged changes.

No production-code bugs surfaced. No CLAUDE.md directives needed adjustment.

## Authentication Gates

None — Migration 018 is committed but not pushed; no Supabase auth/network interaction in this plan.

## Known Stubs

None. The 4-way priority ladder in `planElementToLocal` is the only intentional defensive branch — but it's not a stub: every branch is exercised by a test, and all 4 paths produce a strictly-typed return value. The Pitfall-8 default is documented in the inline comment as "Phase 7 Pitfall-8: if layer absent (pre-018 sync), derive from element_type."

## Threat Flags

No new threat surface introduced beyond what `<threat_model>` in 07-02-PLAN.md anticipated:

- T-07-05 (client writes invalid layer): **mitigated** as planned — TS literal union compile-time + CHECK constraint runtime (post Plan 05 push).
- T-07-06 (backfill exposes plant data): **accepted** as planned — same RLS access boundary.
- T-07-07 (backfill audit gap): **accepted** as planned — DO-block NOTICE logs the migration; subsequent writes carry updated_by_user_id from existing LWW.
- T-07-08 (pre-018 layer leak): **mitigated** as planned — Pitfall-8 lazy default in planElementToLocal.

No surface omitted from `<threat_model>`. Section: omitted.

## User Setup Required

None — no external service / credential / config changes. Plan 05 (Wave 5) will own the `supabase db push --linked --yes` for Migration 018; an auth checkpoint may surface there.

## Next Phase Readiness

**Ready for Plan 07-03** (canvas + gestures + editor store) — the layer field is now available throughout:

- `PlanElementRow.layer: 'infrastructure' | 'seasonal'` (non-optional)
- `planElementToLocal/Db` round-trip layer + apply Pitfall-8 lazy default
- `promoteBedDraft`/`promotePlantDraft` populate layer correctly
- `rowMappers.layer.test.ts` 8 tests green

Plan 03 can now reference `e.layer` in `useEditorStore` actions (layer-aware filtering for `plantSpacing`, layer-aware visibility in toolbar cycle), reference `layer` in component props, and import the `PlanElementRow` type with confidence the field exists. Plan 05's DB-push gate is the only remaining schema-side coordination.

No blockers from Plan 02. The 3 pre-existing test failures remain as background noise but are explicitly out of scope for Phase 7.

## Self-Check: PASSED

- [x] `supabase/migrations/20260513000018_plan_elements_layer.sql` exists (FOUND)
- [x] Commits exist: `01a2943` (Task 1 migration), `6dc7737` (Task 2 RED), `b1d8eae` (Task 2 GREEN), `1683daf` (deferred docs) — all verified via `git log --oneline -5`
- [x] `PlanElementRow.layer` literal in entities.ts (FOUND via diff)
- [x] `element_type === 'Pflanze'` literal in rowMappers.ts Pitfall-8 default (FOUND via diff)
- [x] `layer: local.layer` literal in planElementToDb (FOUND via diff)
- [x] `layer: 'infrastructure'` in promoteBedDraft, `layer: 'seasonal'` in promotePlantDraft (FOUND via diff)
- [x] No `it.todo(` remaining in rowMappers.layer.test.ts (replaced with 8 `it(` blocks)
- [x] `pnpm --filter app exec jest --testPathPattern='rowMappers.layer'` exits 0 — 8/8 pass
- [x] `pnpm --filter app exec jest --testPathPattern='rowMappers|draftPromotionRepo|gardenPlanRepo|IndexedDbAdapter.rows'` exits 0 — 7 suites / 69 tests all green
- [x] `pnpm --filter app typecheck` exits 0 — no TS errors
- [x] 3 pre-existing failures documented in `deferred-items.md` (out-of-scope, verified via stash-pop baseline)

---
*Phase: 07-plan-editor-drafts-integration-m2-m07-5*
*Plan: 02 (Wave 1 — Migration 018 + PlanElementRow.layer + Mappers)*
*Completed: 2026-05-13*

## PHASE-WORK COMPLETE
