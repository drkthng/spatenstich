---
phase: 8
slug: plant-db-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 8 — Validation Strategy

> Per-phase validation contract sourced from `08-RESEARCH.md §Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + ts-jest 29.1.2 (Node env in shared package; existing multi-project setup in `app/`) |
| **Config file** | `packages/shared/jest.config.ts` (existing) + new tests in `packages/shared/src/__tests__/` and `packages/shared/src/validators/__tests__/` + `app/jest.config.ts` already has `hooks` project |
| **Quick run command** | `pnpm --filter @spatenstich/shared exec jest --testPathPattern=plants` |
| **Full suite command** | `pnpm -r run test --passWithNoTests` |
| **Estimated runtime** | <2s (smoke + validator tests, no DB dependency) |

**Note on pnpm `--` forwarding bug** (Phase 6.5 P01): use `pnpm --filter <pkg> exec jest <args>` — never `pnpm test --`.

---

## Sampling Rate

- **After every task commit:** quick run command (smoke + validator)
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** full suite green + Edge Function deploy successful + manual seed verified
- **Max feedback latency:** ~2 seconds (data tests); ~30 seconds (hooks tests with TanStack Query setup)

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Wave |
|--------|----------|-----------|-------------------|-------------|------|
| PLANT-DB-01 | plants.json ≥80 plants, required fields populated | unit (smoke) | `pnpm --filter @spatenstich/shared exec jest plants.smoke` | ❌ W0 | 0/2 |
| PLANT-DB-02 | companions canonical (a<b), no self-refs, no duplicates | unit (smoke) | `pnpm --filter @spatenstich/shared exec jest plants.smoke -t "canonical\|self\|duplicate"` | ❌ W0 | 0/2 |
| PLANT-DB-03 | JSON validates against plant-db.v1 ajv schema | unit | `pnpm --filter @spatenstich/shared exec jest plant-db-v1` | ❌ W0 | 0/1 |
| PLANT-DB-04 | RLS policies + invariants exist after Migration 019 | integration (pgTAP) | `supabase test db --linked` after Wave 1 push | ❌ W1 | 1 |
| PLANT-DB-05 | Edge Function seed returns 200 + correct counts (≥80 plants, N companions) | manual (Wave 3 push gate) | `curl -X POST .../functions/v1/seed-plants` + assert response | ❌ W3 | 3 |
| PLANT-DB-06 | usePlants() returns initialData synchronously, refetches in background | unit (hooks project) | `pnpm --filter app exec jest --selectProjects hooks usePlants` | ❌ W3 | 3 |
| PLANT-DB-07 | plantRepo.loadCompanionsFor symmetric (a→b and b→a return same set) | unit (hooks project) | `pnpm --filter app exec jest --selectProjects hooks plantRepo` | ❌ W3 | 3 |
| PLANT-DB-08 | Anker-Tests (Tomate=Solanaceae, Bohne=nitrogenFixing, Apfel=perennial, Tomate+Basilikum=companion) | unit (smoke) | `pnpm --filter @spatenstich/shared exec jest plants.smoke -t "Tomate\|Erdbeere\|Buschbohne\|Apfel\|Basilikum"` | ❌ W0 | 0/2 |
| PLANT-DB-09 | Every dataSource in allowed enum (`gardeneus`/`garden-planner`/`own-research`/`merged`) — **`gartenplaner` literal FORBIDDEN** | unit (smoke, license-hygiene gate) | `pnpm --filter @spatenstich/shared exec jest plants.smoke -t "dataSource"` | ❌ W0 | 0/2 |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 mirrors Phase 6.5 P01 + Phase 7 P01 cadence: stubs + setup, no production-code imports yet.

- [ ] `packages/shared/src/validators/plant-db-v1.ts` — empty exports stub (filled in W1)
- [ ] `packages/shared/src/validators/__tests__/plant-db-v1.test.ts` — `it.todo()` stubs for schema-validation behaviors (ajv loading, valid/invalid payload detection, custom checks for slug uniqueness + canonical companions + self-companion forbidden)
- [ ] `packages/shared/src/__tests__/plants.smoke.test.ts` — `it.todo()` stubs for all PLANT-DB-01/02/08/09 anchors
- [ ] `packages/shared/src/data/plants.json` — minimal stub `{ "schemaVersion": "plant-db.v1", "plants": [], "companions": [] }` (data lands in W2)
- [ ] `packages/shared/src/types/plants.ts` — empty exports stub for `PlantRow`, `PlantCompanionRow`, `PlantDbBundle` (types filled in W1)
- [ ] `app/src/lib/__tests__/plantRepo.test.ts` — `it.todo()` stubs for PLANT-DB-07 (filled in W3)
- [ ] `app/src/hooks/__tests__/usePlants.test.ts` — `it.todo()` stubs for PLANT-DB-06 (filled in W3)
- [ ] `supabase/tests/plants_rls.sql` — pgTAP skeleton (filled W1 alongside Migration 019)

Total: 8 Wave-0 files (mix of code-stubs + test-stubs + data-stub).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge Function `seed-plants` cold-start succeeds + first invocation returns expected counts | PLANT-DB-05 | First-ever Edge Function deploy post-M07 — manual smoke required to validate `static_files` config + service-role auth + ON CONFLICT path | 1. After Wave 3 push gate completes, deploy: `supabase functions deploy seed-plants --project-ref vitrqkzxkiqvadqfzrcx`. 2. Invoke: `curl -X POST https://vitrqkzxkiqvadqfzrcx.supabase.co/functions/v1/seed-plants -H "Authorization: Bearer <service-role-key>"`. 3. Verify response: `{ status: "ok", plants_upserted: N≥80, companions_inserted: M }`. 4. Re-invoke immediately; expect idempotent same counts. 5. In Supabase dashboard SQL editor: `SELECT count(*) FROM plants; SELECT count(*) FROM plant_companions;` — match response. |
| Data quality review (Mischkultur-Beziehungen plausibel) | PLANT-DB-08 supplement | Companion data is opinion-mixed-with-fact across sources; visual review needed | 1. Open `packages/shared/src/data/plants.json` after Wave 2. 2. Spot-check 5 well-known pairs: Tomate+Basilikum=companion, Tomate+Fenchel=incompatible, Bohne+Möhre=companion, Möhre+Dill=companion, Kartoffel+Tomate=incompatible. 3. If a pair is wrong, fix JSON + re-run Wave 0 tests + re-deploy seed function. |
| German plant names spelling check | PLANT-DB-08 | UTF-8 Umlaute correctness (CLAUDE.md memory feedback_german_umlauts.md) | 1. Open JSON. 2. Grep für ASCII-Ersetzungen: `grep -E "(ae|oe|ue|ss)" packages/shared/src/data/plants.json | grep -v "://"` — should be 0 results in `nameDe`, `family`, `notesDe` fields. 3. Visual scan: Möhre (not Moehre), Kürbis (not Kuerbis), Blumenkohl, Süßkartoffel. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (8 files enumerated above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s (data tests) / <30s (hooks tests)
- [ ] License-hygiene gate active (PLANT-DB-09 blocks merge if `"gartenplaner"` literal appears in dataSource)
- [ ] `nyquist_compliant: true` set in frontmatter (toggle after Wave 0 lands)

**Approval:** pending
