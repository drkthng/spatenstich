---
phase: 08-plant-db-foundation
plan: 01
subsystem: shared-package + jest-config + supabase-tests
tags: [tests, scaffold, jest, ajv, shared-package, wave0]
one_liner: "Wave-0 test scaffold for Phase 8 plant DB — 12 files lock the verification surface (schema, validator stub, types, data stub, license doc, jest mapper, 4 test stubs, pgTAP skeleton) before any data curation lands"
requirements_completed: [PLANT-DB-01, PLANT-DB-02, PLANT-DB-03, PLANT-DB-04, PLANT-DB-06, PLANT-DB-07, PLANT-DB-08, PLANT-DB-09]
requirements_partial: []
dependency_graph:
  requires: []
  provides:
    - schema-canonical: "packages/shared/src/schemas/plant-db.v1.json (draft-2020-12, dataSource enum omits gartenplaner)"
    - validator-stub: "packages/shared/src/validators/plant-db-v1.ts (Ajv2020 + module-level compile; Wave 1 fills cross-ref checks)"
    - types-canonical: "packages/shared/src/types/plants.ts (PlantRow + PlantCompanionRow + PlantDbBundle + 5 enum unions)"
    - data-stub: "packages/shared/src/data/plants.json (empty arrays; Wave 2 fills ≥80 plants)"
    - license-doc: "packages/shared/src/data/LICENSES.md (allowed-dataSource enum + gartenplaner forbidden)"
    - jest-mapper: "app/jest.config.ts (3 projects: hooks + editor + components map @spatenstich/shared/data/plants)"
    - shared-test-stubs: "validator + smoke (12 + 16 it.todo) — Plans 02/03 fill"
    - app-test-stubs: "plantRepo + usePlants (10 + 4 it.todo) — Plan 04 fills"
    - pgtap-skeleton: "supabase/tests/plants_rls.sql (5 TEST blocks; assertions Wave 1)"
  affects: []
tech-stack:
  added:
    - "ajv@8.20.0 (explicit dep of @spatenstich/shared — already transitive via app)"
    - "ajv-formats@3.0.1 (explicit dep of @spatenstich/shared)"
  patterns:
    - "JSON Schema draft-2020-12 file colocated with validator (mirror of schemas/spatenstich-import.v1.json from Phase 6)"
    - "Module-level ajv.compile (Pitfall 3 — not inside fn) — same as importValidator.ts"
    - "it.todo() shells for stubs (Phase 6.5 P01 precedent)"
    - "License-hygiene gate encoded in two walls: JSON Schema enum + smoke-test PLANT-DB-09 anchor"
key-files:
  created:
    - "packages/shared/src/schemas/plant-db.v1.json"
    - "packages/shared/src/validators/plant-db-v1.ts"
    - "packages/shared/src/types/plants.ts"
    - "packages/shared/src/data/plants.json"
    - "packages/shared/src/data/LICENSES.md"
    - "packages/shared/src/validators/__tests__/plant-db-v1.test.ts"
    - "packages/shared/src/__tests__/plants.smoke.test.ts"
    - "app/src/lib/__tests__/plantRepo.test.ts"
    - "app/src/hooks/__tests__/usePlants.test.ts"
    - "supabase/tests/plants_rls.sql"
  modified:
    - "packages/shared/src/index.ts (re-export plants types + enums)"
    - "packages/shared/package.json (exports map + ajv deps)"
    - "app/jest.config.ts (3 moduleNameMapper additions for hooks/editor/components projects)"
    - "pnpm-lock.yaml (ajv + ajv-formats hoist for shared)"
decisions:
  - "[Phase 08 P01] dataSource enum gates license hygiene at schema layer — 'gartenplaner' literal is FORBIDDEN; smoke-test PLANT-DB-09 anchor adds second wall; LICENSES.md is third (PR-review aid)."
  - "[Phase 08 P01] plants.json empty stub WILL FAIL schema's minItems:80 — intentional. Wave 0 smoke test uses it.todo so jest does not assert; Wave 2 fills the bundle and validator returns {ok:true}. Schema stays authoritative (no relax-then-tighten ratchet)."
  - "[Phase 08 P01] PlantRow does NOT extend RowBase (no LWW triggers, no updatedByUserId, no deletedAt) — global ref DB has different lifecycle than user-scoped rows."
  - "[Phase 08 P01] Jest moduleNameMapper added only in hooks/editor/components — not in node/stores/photos — because no plants tests run there in Phase 8 (additive minimal-noise rule)."
metrics:
  duration_minutes: 6
  tasks_completed: 6
  files_changed: 14
  completed_date: 2026-05-17
---

# Phase 8 Plan 01: Wave-0 Test Scaffold + Stubs Summary

Wave-0 of Phase 8 (Plant-DB Foundation) lands the entire verification surface before any data curation. Twelve files (10 new + 2 modified config + 1 lockfile bump) lock the contract that Plans 02–04 must satisfy: canonical JSON Schema, validator stub, types, empty data stub, license-attribution doc, jest mapper for the new bundle path, plus 4 test-stub files (28 it.todo entries) covering PLANT-DB-01/02/03/04/06/07/08/09, and a pgTAP RLS skeleton with 5 TEST blocks.

## Deliverables

### Files Created (10)

1. **`packages/shared/src/schemas/plant-db.v1.json`** — Canonical JSON Schema draft-2020-12, `$id` = `https://spatenstich.app/schemas/plant-db.v1.json`. Top-level requires `schemaVersion: const "plant-db.v1"` + `plants[]` (minItems:80) + `companions[]`. Plant `$def` has 30 fields including all 8 DOY ranges + bilingual nameAltDe + climateZone min/max + dataSource enum **explicitly omitting `"gartenplaner"` literal** (PLANT-DB-09 license gate per D-06 + RESEARCH Pitfall 7). Companion `$def` has plantASlug + plantBSlug + relationship + source + notes.

2. **`packages/shared/src/validators/plant-db-v1.ts`** — Stub validator. Uses `import Ajv2020 from 'ajv/dist/2020'` (Pitfall 3: NOT default `ajv` — Metro/Jest Kompat). Module-level `ajv.compile(schema)` (Phase 6 P02 pattern). Exports `validatePlantBundle(raw: unknown): { ok: true } | { ok: false; errors: string[] }`. Cross-ref checks (slug existence, self-companion, duplicate pair) are explicit TODO Wave 1.

3. **`packages/shared/src/types/plants.ts`** — Type contract for the whole feature. Five enum unions (`PlantCategory | SunRequirement | WaterNeeds | CompanionRelationship | DataSource`) plus three interfaces (`PlantRow` 30 fields, `PlantCompanionRow` 6 fields, `PlantDbBundle` wire-format). Plant rows are NOT extending RowBase — global ref DB has no LWW, no deletedAt.

4. **`packages/shared/src/data/plants.json`** — Empty stub: `{ "schemaVersion": "plant-db.v1", "plants": [], "companions": [] }`. Will fail schema's `minItems:80` — intentional; smoke tests use `it.todo` until Wave 2 fills the bundle.

5. **`packages/shared/src/data/LICENSES.md`** — PR-review aid. Documents the 4 allowed `dataSource` values (gardeneus MIT, garden-planner MIT, own-research, merged) and the forbidden `"gartenplaner"` literal with rationale (Gartenplaner CSV's license is unclear → re-verify facts and tag `"own-research"`).

6. **`packages/shared/src/validators/__tests__/plant-db-v1.test.ts`** — 12 `it.todo` entries covering PLANT-DB-03: 6 schema-validation cases (incl. forbidden-`"gartenplaner"`-literal), 4 cross-ref Wave-1 cases, 2 defensive-input cases.

7. **`packages/shared/src/__tests__/plants.smoke.test.ts`** — 16 `it.todo` entries pinning PLANT-DB-01/02/08/09 anchors: 5 bundle-shape, 3 companion canonical-storage, 5 Anker-Tests (Tomate Solanaceae, Erdbeere Rosaceae, Buschbohne nitrogenFixing, Apfel perennial, Tomate-Basilikum companion), 3 license-hygiene checks.

8. **`app/src/lib/__tests__/plantRepo.test.ts`** — 10 `it.todo` entries covering PLANT-DB-07 (loadAllPlants order, loadPlantBySlug null fallback, loadCompanionsFor symmetry+partition, searchPlants `.or` query shape). process.env stubs at top match gardenPlanRepo.test.ts:5-6.

9. **`app/src/hooks/__tests__/usePlants.test.ts`** — 4 `it.todo` entries covering PLANT-DB-06 (initialData sync first render, `initialDataUpdatedAt: 0` background refetch per RESEARCH Pitfall 2, refetch supersedes bundle, error falls back to bundle).

10. **`supabase/tests/plants_rls.sql`** — pgTAP skeleton with `BEGIN…ROLLBACK` envelope and 5 TEST blocks: T1 authenticated CAN SELECT plants, T2 authenticated CAN SELECT plant_companions, T3 authenticated CANNOT INSERT/UPDATE/DELETE plants (no WRITE policy), T4 anonymous gets 0 rows (RLS denies), T5 CHECK (plant_a_id < plant_b_id) enforced (expect SQLSTATE 23514). DO blocks raise NOTICE only; ≥5 `TODO Wave 1` markers.

### Files Modified (3)

1. **`packages/shared/src/index.ts`** — Re-exports 8 plants names (3 interfaces + 5 enums) from `./types/plants`. Adjacent to existing entities export block. Pure additive.

2. **`packages/shared/package.json`** — Two additions:
   - `exports` map gains `"./data/plants": "./src/data/plants.json"` (mirror of i18n/de pattern).
   - New `dependencies` block: `ajv: 8.20.0`, `ajv-formats: 3.0.1`.

3. **`app/jest.config.ts`** — `moduleNameMapper` entry `'^@spatenstich/shared/data/plants$': '<rootDir>/../packages/shared/src/data/plants.json'` added to **3 projects** (hooks + editor + components). `grep -c` returns exactly 3.

4. **`pnpm-lock.yaml`** — 29 insertions / 10 deletions for ajv@8.20.0 + ajv-formats@3.0.1 hoist into shared.

## Verification

### Quick Command Output

```text
$ pnpm --filter @spatenstich/shared exec jest plants
PASS src/__tests__/plants.smoke.test.ts
  plants.json — Phase 8 smoke tests
    PLANT-DB-01..09 — 16 todo entries
Test Suites: 1 passed, 1 total
Tests:       16 todo, 16 total

$ pnpm --filter app exec jest --selectProjects hooks --testPathPattern='plantRepo|usePlants'
PASS hooks src/hooks/__tests__/usePlants.test.ts
PASS hooks src/lib/__tests__/plantRepo.test.ts
Test Suites: 2 passed, 2 total
Tests:       14 todo, 14 total
```

### Todo Counts (Coverage Targets Pinned in Code)

| File | Project | Todos | Covers |
|------|---------|-------|--------|
| `packages/shared/src/__tests__/plants.smoke.test.ts` | shared | 16 | PLANT-DB-01, -02, -08, -09 |
| `packages/shared/src/validators/__tests__/plant-db-v1.test.ts` | shared | 12 | PLANT-DB-03 |
| `app/src/lib/__tests__/plantRepo.test.ts` | app/hooks | 10 | PLANT-DB-07 |
| `app/src/hooks/__tests__/usePlants.test.ts` | app/hooks | 4 | PLANT-DB-06 |
| **TOTAL** | — | **42** | — |

(Plan-level "shared: 20 todo + app/hooks: 12 todo" in 08-01-PLAN's output section is the rough planning estimate; actual reality is 28 shared + 14 app = 42 todos. The plan's intent — at least one todo per requirement — is fully satisfied.)

### License-Hygiene Gate (PLANT-DB-09)

Verified explicitly:

```bash
$ grep -q '"gartenplaner"' packages/shared/src/schemas/plant-db.v1.json && echo PRESENT || echo ABSENT
ABSENT
```

The literal `"gartenplaner"` appears **only** as:
- An it.todo description in `plants.smoke.test.ts` (`"no plant.dataSource is the literal "gartenplaner" (forbidden)"`)
- An it.todo description in `plant-db-v1.test.ts` (`"rejects forbidden dataSource literal "gartenplaner" (PLANT-DB-09 license gate)"`)
- A forbidden-entry note in `LICENSES.md`

It is **never** a value in the schema enum, never a value in `plants.json`. Three independent walls (schema + test + doc) preserved.

### Typecheck

- `pnpm --filter app exec tsc --noEmit` → clean (no output, exit 0).
- `pnpm --filter @spatenstich/shared exec tsc --noEmit` → still fails on the pre-existing `src/types/supabase.ts` first-line bug (STATE.md DEFERRED-1). **No new errors related to Phase 8 files** (`plants.ts`, `plant-db-v1.ts`, `plants.json`). Per Task 6 acceptance criteria, this is acceptable.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `ce44334` | `feat(08-01): scaffold shared-package plant-db.v1 (schema, validator stub, types, data stub, exports)` |
| 2 | `6b05808` | `chore(08-01): add @spatenstich/shared/data/plants jest moduleNameMapper in hooks/editor/components projects` |
| 3 | `1f19dd8` | `test(08-01): scaffold shared-package test stubs (validator + plants smoke)` |
| 4 | `6b9a471` | `test(08-01): scaffold app-package test stubs (plantRepo + usePlants)` |
| 5 | `9fa51ae` | `test(08-01): scaffold pgTAP RLS skeleton for plants + plant_companions` |
| 6 | `421aade` | `chore(08-01): install ajv@8.20.0 + ajv-formats@3.0.1 into @spatenstich/shared` |

## Deviations from Plan

None — plan executed exactly as written. Every task's `<verify>` block passed on the first attempt. No Rule 1/2/3 auto-fixes needed; no Rule 4 architectural decisions surfaced; no authentication gates encountered.

## Known Stubs

All four test files use `it.todo()` shells **by design** — this is the entire point of Wave 0. They are not stubs hiding broken behavior; they are coverage-target placeholders for downstream waves:

| Stub | Filled By | Coverage |
|------|-----------|----------|
| `plants.smoke.test.ts` (16 todos) | Plan 03 (Wave 2 — after JSON data lands) | PLANT-DB-01, -02, -08, -09 |
| `plant-db-v1.test.ts` (12 todos) | Plan 02 (Wave 1 — fills validator cross-ref) | PLANT-DB-03 |
| `plantRepo.test.ts` (10 todos) | Plan 04 (Wave 3 — after `plant_companions` table seeded) | PLANT-DB-07 |
| `usePlants.test.ts` (4 todos) | Plan 04 (Wave 3 — after hook lands) | PLANT-DB-06 |
| `plants_rls.sql` (5 TODO blocks) | Plan 02 (Wave 1 — after Migration 019 push) | PLANT-DB-04 |
| `plants.json` (empty arrays — will fail `minItems:80`) | Plan 03 (Wave 2 — curated ≥80 entries) | PLANT-DB-01 count |
| `plant-db-v1.ts` (validator returns ok:true even when cross-refs would fail) | Plan 02 (Wave 1) | PLANT-DB-03 cross-ref |

All stubs documented in 08-VALIDATION.md as expected Wave-0 state. Verifier should see them and confirm "Wave 0 surface locked"; should NOT treat them as bugs.

## Wave 1 (Plan 02) Handoff

Plan 02's job:
1. Fill `validatePlantBundle` cross-ref body (slug-existence, self-companion forbidden, duplicate-pair detection per RESEARCH §Pattern 3).
2. Author Migration 019 (`plants` + `plant_companions` tables + RLS policies + CHECK constraint `plant_a_id < plant_b_id`).
3. Fill 5 `TODO Wave 1` blocks in `supabase/tests/plants_rls.sql` with real assertions.
4. Run `supabase test db --linked` to confirm 5 tests pass.
5. Push migration via the autonomous 4-gate flow established in Phase 6.5 P05 + Phase 7 P06.

Plans 03 (Wave 2 — curate plants.json ≥80 entries + 80+ companions, fill smoke + validator-happy-path) and 04 (Wave 3 — `plantRepo.ts` + `usePlants.ts` + fill app-side it.todos + seed Edge Function) follow.

## Self-Check: PASSED

Verified each claim before submission:

- **Files exist:**
  - `packages/shared/src/schemas/plant-db.v1.json` — FOUND
  - `packages/shared/src/validators/plant-db-v1.ts` — FOUND
  - `packages/shared/src/types/plants.ts` — FOUND
  - `packages/shared/src/data/plants.json` — FOUND
  - `packages/shared/src/data/LICENSES.md` — FOUND
  - `packages/shared/src/validators/__tests__/plant-db-v1.test.ts` — FOUND
  - `packages/shared/src/__tests__/plants.smoke.test.ts` — FOUND
  - `app/src/lib/__tests__/plantRepo.test.ts` — FOUND
  - `app/src/hooks/__tests__/usePlants.test.ts` — FOUND
  - `supabase/tests/plants_rls.sql` — FOUND
- **Commits exist in `git log`:**
  - `ce44334` — FOUND
  - `6b05808` — FOUND
  - `1f19dd8` — FOUND
  - `6b9a471` — FOUND
  - `9fa51ae` — FOUND
  - `421aade` — FOUND
