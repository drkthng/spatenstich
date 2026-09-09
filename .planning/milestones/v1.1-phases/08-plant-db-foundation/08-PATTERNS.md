# Phase 8: Plant-DB Foundation - Pattern Map

**Mapped:** 2026-05-17
**Files analyzed:** 14 (1 modified config + 13 new files across 4 layers)
**Analogs found:** 11 / 14 (3 first-of-kind: Edge Function post-M07, validator in shared package, pgTAP tests directory entry)

## File Classification

### Migration + RLS Tests (Wave 1)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20260517000019_plants_and_companions.sql` | migration | schema-create (CREATE TABLE + RLS + DO-block invariants) | `supabase/migrations/20260513000018_plan_elements_layer.sql` (DO-block + sections) + `supabase/migrations/20260504000014_garden_plan.sql` (CREATE TABLE shape) | role-match (read-only global, NO LWW, NO garden_id — opposite of Migration 014) |
| `supabase/tests/plants_rls.sql` | test (pgTAP-style) | DDL+DML assertions | `supabase/tests/garden_plan_rls.sql` (set role authenticated + JWT claim pattern) | role-match (read-only assertions vs CRUD assertions) |

### Validator + Schema + JSON Bundle (Wave 0+1+2 — shared package)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/shared/src/validators/plant-db-v1.ts` | validator | pure transform (ajv compile + cross-ref check) | `app/src/lib/importValidator.ts` (Ajv2020 + module-level compile + cross-ref errors) | exact (function shape, ajv pattern, cross-ref pattern) |
| `packages/shared/src/schemas/plant-db.v1.json` | schema (JSON) | static | `schemas/spatenstich-import.v1.json` (root-level schemas/) | exact (same draft-2020-12 + `$id` convention) |
| `packages/shared/src/data/plants.json` | data (JSON) | static bundle | `packages/shared/src/i18n/de.json` (UTF-8 JSON exported via package `exports` map) | exact (same packaging, requires `exports` map update) |
| `packages/shared/src/data/LICENSES.md` | docs | static | (no analog — first-of-kind) | first-of-kind (PR review aid only, no code dependency) |
| `packages/shared/src/types/plants.ts` | type def | static | `packages/shared/src/types/entities.ts` (RowBase pattern, camelCase interface, exported through `index.ts`) | exact (extends-RowBase NOT used — plants are global, not LWW-managed) |
| `packages/shared/src/index.ts` (MOD) | barrel | static | self (lines 9-35, `export type { ... } from './types/entities'`) | exact (add `PlantRow`, `PlantCompanionRow`, `PlantDbBundle` to existing export block) |
| `packages/shared/package.json` (MOD) | config (exports map) | static | self (lines 7-10, `"./i18n/de": "./src/i18n/de.json"`) | exact (add `"./data/plants"` entry mirroring `./i18n/de`) |

### Edge Function (Wave 3 — first-of-kind post-M07)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/seed-plants/index.ts` | edge-function | request-response (POST → seed → JSON response) | `supabase/functions/extract-vereinsregeln/index.ts` (commit `cde46bb`, **deleted in M07 cleanup `0831320`**; still the most recent precedent for our Edge Function structure) | role-match (same imports header, env var pattern, Deno.serve+CORS skeleton; payload semantics differ entirely) |
| `supabase/functions/seed-plants/deno.json` | config | static | `supabase/functions/extract-vereinsregeln/deno.json` (commit `cde46bb`, deleted) | exact (same `nodeModulesDir: auto` + `imports` map shape) |
| `supabase/functions/seed-plants/README.md` | docs | static | (no analog — Pitfall-6 workflow doc is new requirement) | first-of-kind |
| `supabase/config.toml` (MOD: add `[functions.seed-plants]` block) | config | static | self (lines 364-376, `[edge_runtime]` block + comment about `verify_jwt = false`) | role-match (the existing config has the `edge_runtime` global block; per-function blocks must be added — first per-function block lives here) |

### App Repo + Hook + Tests (Wave 0+3 — app package)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/src/lib/plantRepo.ts` | repo | read-only (Supabase select-only) | `app/src/lib/gardenPlanRepo.ts` (assertAccount-pattern, rowFromDb mapper) **but PLANT-DB-07 forbids assertAccount** | role-match (similar shape, but read-only and no auth-mode guard — globally readable) |
| `app/src/hooks/usePlants.ts` | hook | request-response (TanStack Query) | `app/src/hooks/useFlag.ts` (only existing useQuery hook in repo: Supabase fetch + staleTime) | role-match (extends pattern with `initialData` + `initialDataUpdatedAt: 0` — JSON-bundle cold-start; `useFlag` does not use initialData) |
| `packages/shared/src/__tests__/plants.smoke.test.ts` | test (data smoke) | static JSON assertion | `app/src/lib/__tests__/i18n.review-keys.test.ts` (JSON-import + key-shape assertions + UTF-8 anchor checks) + `packages/shared/src/__tests__/i18n.test.ts` (existing shared-pkg pattern, jest.config.ts: node env) | exact (same anchor-test idiom; shared-pkg location not app/) |
| `packages/shared/src/validators/__tests__/plant-db-v1.test.ts` | test (unit) | mock-based | `app/src/lib/__tests__/importValidator.test.ts` (happy + reject + cross-ref + null-input cases) | exact (validator-test idiom is fully precedented) |
| `app/src/lib/__tests__/plantRepo.test.ts` | test (unit) | mock-based | `app/src/lib/__tests__/gardenPlanRepo.test.ts` (jest.mock storage + authStore + SyncTriggers; lazy import after mocks) | role-match (read-only test simpler; no writeWithOutbox; mocks `lib/supabase`) |
| `app/src/hooks/__tests__/usePlants.test.ts` | test (hook unit) | mock-based + QueryClientProvider | `app/src/hooks/__tests__/useFlag.test.ts` (renderHook + QueryClient wrapper + mock `lib/supabase`) | exact |

---

## Pattern Assignments

### `supabase/migrations/20260517000019_plants_and_companions.sql` (migration, schema-create)

**Analog:** `supabase/migrations/20260513000018_plan_elements_layer.sql` for DO-block + section style; `supabase/migrations/20260504000014_garden_plan.sql` for CREATE TABLE shape (not re-read here; see RESEARCH §Pattern 1 for full table DDL).
**Why this analog:** Migration 018 is the immediately preceding migration; same section divider, same atomicity rule, same invariant DO-block. Migration 019 differs by being a CREATE TABLE (not ALTER) and having read-only RLS (D-04).

**Header pattern** (Migration 018 lines 1-5) → adapt for 019:
```sql
-- Phase 8 Plan 02: plants + plant_companions (global plant reference DB)
-- Provides: 2 read-only tables + 2 RLS policies + indices + DO-block invariants
-- Follows: Migration 018 pattern (DO-block invariants, sections); Migration 014 pattern (CREATE TABLE + RLS)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.
--
-- DESIGN NOTES (D-01..D-04):
-- - Read-only for clients (RLS USING auth.uid() IS NOT NULL, no WRITE policies)
-- - No LWW triggers (data is service-role-managed via seed-plants Edge Function)
-- - No garden_id (global reference DB, not per-garden)
-- - plant_companions stores canonical (plant_a_id < plant_b_id); query layer UNIONs both directions
```

**Section divider pattern** (Migration 018 lines 7-9):
```sql
-- ──────────────────────────────────────────────────────────────
-- Section 1 — plants table
-- ──────────────────────────────────────────────────────────────
```
**For 019:** three sections — (1) plants table + RLS, (2) plant_companions table + RLS, (3) invariant DO-block.

**Full DDL:** copy verbatim from `08-RESEARCH.md` §"Pattern 1: Migration 019" lines 293-416. The research-side DDL is canonical and includes all CHECK constraints, indices, and RLS.

**Invariant DO-block pattern** (Migration 018 lines 41-56) — adapt structure for 019 (replicate exactly the loop style; assert ≥5 CHECK constraints + 2 tables + 2 policies):
```sql
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
    WHERE n.nspname='public' AND c.relname IN ('plants','plant_companions') AND c.relkind='r';
  IF cnt <> 2 THEN
    RAISE EXCEPTION 'migration_019_invariant: expected 2 tables, got %', cnt;
  END IF;
  -- ... other invariants ...
  RAISE NOTICE 'migration_019 ok: plants + plant_companions + RLS + CHECKs applied';
END $$;
```

**Push gate:** Pattern from Phase 6.5 P05 + Phase 7 P06 (CONTEXT D-15): `supabase migration list --linked` → `supabase db push --dry-run --yes` → real push → checkpoint:human-action on failure.

---

### `supabase/tests/plants_rls.sql` (pgTAP-style RLS test)

**Analog:** `supabase/tests/garden_plan_rls.sql` (lines 1-189).
**Why this analog:** Same Supabase RLS testing idiom in this repo — `SET LOCAL ROLE authenticated` + `SELECT set_config('request.jwt.claims', ...)` + DO-blocks with `RAISE EXCEPTION`/`RAISE NOTICE`. Differs from `rls_foundation.sql` (which uses ROLLBACK) by being a true assertion suite.

**Setup pattern** (garden_plan_rls.sql:13-48):
```sql
SELECT set_config('test.user_a', 'a0000000-0000-4000-a000-000000000001', true);
SELECT set_config('test.user_b', 'b0000000-0000-4000-b000-000000000002', true);

INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, ...)
VALUES
  (current_setting('test.user_a')::uuid, '00000000-0000-0000-0000-000000000000',
   'test-plants-a@example.com', '$2a$10$fake', 'authenticated', 'authenticated', ...)
ON CONFLICT (id) DO NOTHING;
```

**Role-switching pattern** (garden_plan_rls.sql:53-55):
```sql
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}',
  current_setting('test.user_a')), true);
```

**Tests Phase 8 needs (PLANT-DB-04):**
1. **TEST 1:** Authenticated user CAN SELECT from `plants` (after a seeded row exists; or assert just policy presence via `pg_policies`).
2. **TEST 2:** Authenticated user CAN SELECT from `plant_companions`.
3. **TEST 3:** Authenticated user CANNOT INSERT/UPDATE/DELETE on `plants` (no policy → 0 rows affected or error).
4. **TEST 4:** Anonymous (unauth, `auth.uid() IS NULL`) gets 0 rows from `plants` SELECT.
5. **TEST 5:** CHECK `plant_a_id < plant_b_id` is enforced (insert via service-role bypass; assert `check_violation` SQLSTATE 23514).

**Cleanup pattern** (garden_plan_rls.sql:168-185): symmetric DELETE of inserted rows + auth.users.

**Test invocation (CONTEXT D-16, VALIDATION PLANT-DB-04):** `supabase test db --linked` after Wave 1 push.

---

### `packages/shared/src/validators/plant-db-v1.ts` (validator, pure transform)

**Analog:** `app/src/lib/importValidator.ts` (lines 1-63).
**Why this analog:** Same library (`ajv@8.20.0`), same canonical import path that survives Metro (`ajv/dist/2020`), same module-level compile (Pitfall 3 in 06-RESEARCH), same `ValidationResult` discriminated union, same cross-ref pattern. The only structural difference is location (shared package instead of app).

**Imports + module-level compile** (importValidator.ts:1-15) — copy structure verbatim, swap schema path:
```typescript
// Phase 8 Plan 01: JSON Schema validation für plant-db.v1 bundles.
// Mirror of app/src/lib/importValidator.ts but located in shared package so both
// the build-time Jest smoke test AND the seed-plants Edge Function can import it.

import Ajv2020 from 'ajv/dist/2020'; // NOT default ajv import — Metro/Jest Kompat (Pitfall 3)
import addFormats from 'ajv-formats';
import schema from '../schemas/plant-db.v1.json';

// ── Module-level compilation (Pitfall: NICHT in Funktion) ─────────────────
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
```

**`ValidationResult` discriminated union** (importValidator.ts:17-21):
```typescript
export type PlantBundleValidationResult =
  | { ok: true; bundle: PlantDbBundle }
  | { ok: false; errors: string[] };
```

**Cross-ref check pattern** (importValidator.ts:33-62) — pattern same shape, different fields. Phase 8 cross-refs (per RESEARCH Pattern 3):
- Every `companion.plantASlug` and `plantBSlug` must exist in `plants[].slug`
- `plantASlug !== plantBSlug` (self-companion forbidden)
- Dedup check: canonical `(min,max)` pair appears at most once across both directions

Full reference implementation: copy from `08-RESEARCH.md` §"Pattern 3: ajv Validator for `plant-db.v1`" lines 580-630.

---

### `packages/shared/src/schemas/plant-db.v1.json` (JSON schema)

**Analog:** `schemas/spatenstich-import.v1.json` (root-level).
**Why this analog:** Already-established draft-2020-12 schema in this repo. Same `$schema` URL, same `$id`-based naming convention, same `additionalProperties: false` discipline, same enum pattern for sun_requirement / water_needs analogs.

**Header pattern** (spatenstich-import.v1.json:1-9):
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://spatenstich.app/schemas/plant-db.v1.json",
  "title": "Spatenstich Plant Database v1",
  "description": "Pflanzen-Referenzdatensatz und Mischkultur-Beziehungen für deutsche Kleingärten (Klimazone 7a-8a).",
  "type": "object",
  "required": ["schemaVersion", "plants", "companions"],
  "additionalProperties": false,
```

**Location decision:** Per RESEARCH §Recommended Project Structure, schema lives at `packages/shared/src/schemas/plant-db.v1.json` (NOT root-level `schemas/` as `spatenstich-import.v1.json` does). Reason: the validator is in the shared package, so `import schema from '../schemas/...'` is a relative path inside the package.

**Full schema:** copy from `08-RESEARCH.md` §"Code Examples → JSON Schema for plant-db.v1" lines 892-963.

---

### `packages/shared/src/data/plants.json` (data bundle)

**Analog:** `packages/shared/src/i18n/de.json` (file location + UTF-8 convention + package.json `exports` map).
**Why this analog:** Same shared-package JSON-bundling pattern. The `exports` map already has `"./i18n/de": "./src/i18n/de.json"` (package.json line 9) — Phase 8 adds `"./data/plants": "./src/data/plants.json"` (mirror entry).

**Existing package.json exports** (package.json:7-10):
```json
"exports": {
  ".": "./src/index.ts",
  "./i18n/de": "./src/i18n/de.json"
},
```
**Phase 8 addition (MOD):**
```json
"exports": {
  ".": "./src/index.ts",
  "./i18n/de": "./src/i18n/de.json",
  "./data/plants": "./src/data/plants.json"
},
```

**Jest moduleNameMapper** (already present in `app/jest.config.ts:30` for `de.json`):
```typescript
'^@spatenstich/shared/i18n/de$': '<rootDir>/../packages/shared/src/i18n/de.json',
```
**Mirror entry needed (MOD app/jest.config.ts:** add to `hooks` + `editor` + `components` project moduleNameMaps):
```typescript
'^@spatenstich/shared/data/plants$': '<rootDir>/../packages/shared/src/data/plants.json',
```

**Wave-0 stub content** (PLANT-DB-VALIDATION §Wave 0):
```json
{ "schemaVersion": "plant-db.v1", "plants": [], "companions": [] }
```
(W2 fills with ≥80 plants + companion pairs per CONTEXT D-05.)

**UTF-8 enforcement (CLAUDE.md feedback_german_umlauts):** Umlaute as native UTF-8 in `nameDe`/`family`/`notesDe` — NO ASCII replacements (no "Moehre", always "Möhre"). VALIDATION manual check #3 grep enforces this.

---

### `packages/shared/src/types/plants.ts` (TypeScript types)

**Analog:** `packages/shared/src/types/entities.ts` (interface style, camelCase convention, single-file exports through barrel).
**Why this analog:** Same shared-package types file. **Important divergence from analog:** `PlantRow` does NOT extend `RowBase` because plants are global / service-role-managed and have NO `updatedByUserId`/LWW semantics. `PlantRow` is a flat interface with only `createdAt`/`updatedAt` timestamps.

**Existing pattern** (entities.ts:19-26 for RowBase, entities.ts:66-82 for PlanElementRow as similar-shape row):
```typescript
/** Gemeinsame Basis-Felder für alle LWW-managed Rows */
export interface RowBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string | null;
  deletedAt: string | null;
}

export interface PlanElementRow extends RowBase {
  gardenId: string;
  // ... domain fields ...
}
```

**Target shape for plants.ts (CONTEXT D-08):**
```typescript
// Phase 8 Plan 01: Global plant reference DB types.
// NOT extending RowBase — plants have no LWW triggers, no updatedByUserId, no deletedAt.

export type PlantCategory = 'Gemüse' | 'Kraut' | 'Beere' | 'Obstbaum' | 'Blume';
export type SunRequirement = 'sonnig' | 'halb_schattig' | 'schattig';
export type WaterNeeds = 'niedrig' | 'mittel' | 'hoch';
export type CompanionRelationship = 'companion' | 'incompatible' | 'neutral';
export type DataSource = 'gardeneus' | 'garden-planner' | 'own-research' | 'merged';

export interface PlantRow {
  id: string; slug: string; nameDe: string; nameAltDe: string[]; nameBotanical: string | null;
  family: string; category: PlantCategory;
  // ... rest per CONTEXT D-08 ...
  dataSource: DataSource; createdAt: string; updatedAt: string;
}

export interface PlantCompanionRow {
  id: string; plantAId: string; plantBId: string;
  relationship: CompanionRelationship;
  source: DataSource; notes: string | null;
}

/** Wire-format for the JSON bundle (no UUIDs, slug-based cross-refs). */
export interface PlantDbBundle {
  schemaVersion: 'plant-db.v1';
  plants: Array<Omit<PlantRow, 'id' | 'createdAt' | 'updatedAt'>>;
  companions: Array<{
    plantASlug: string; plantBSlug: string;
    relationship: CompanionRelationship; source: DataSource; notes: string | null;
  }>;
}
```

**Barrel export pattern** (index.ts:10-34): add to existing `export type { ... } from './types/entities'` adjacent block:
```typescript
export type {
  PlantRow, PlantCompanionRow, PlantDbBundle,
  PlantCategory, SunRequirement, WaterNeeds,
  CompanionRelationship, DataSource,
} from './types/plants';
```

---

### `supabase/functions/seed-plants/index.ts` (edge-function, request-response)

**Analog:** `supabase/functions/extract-vereinsregeln/index.ts` from git commit `cde46bb` (deleted in commit `0831320` during Phase 5 M07 AI-removal).
**Why this analog:** The only Edge Function pattern in this codebase's history. Same imports header (`'jsr:@supabase/functions-js/edge-runtime.d.ts'` + `createClient` + `corsHeaders`), same env-var-on-module-load pattern (FOUND-06), same `Deno.serve(async (req) => {...})` skeleton with CORS preflight, same `json()` helper.

**Imports header pattern** (extract-vereinsregeln/index.ts:12-15):
```typescript
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
```
**For seed-plants:** Drop the Anthropic SDK import (no AI calls — per Phase 0 zero-outbound-AI constraint). Keep the rest.

**Env-var module-load pattern** (extract-vereinsregeln/index.ts:21-29):
```typescript
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLAUDE_KEY = Deno.env.get('CLAUDE_API_KEY')!;   // ⚠ drop this for Phase 8

if (!SUPABASE_URL || !SERVICE_ROLE || !CLAUDE_KEY) {  // ⚠ drop CLAUDE_KEY check
  throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CLAUDE_API_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
```
**For seed-plants:** Two env vars only (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) plus optional `SEED_PLANTS_TRIGGER_TOKEN` (RESEARCH §Pattern 2).

**Serve handler skeleton** (extract-vereinsregeln/index.ts:36-43):
```typescript
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    // ... handler logic ...
  } catch (err) {
    // ... error response ...
  }
});
```

**Full reference implementation:** copy from `08-RESEARCH.md` §"Pattern 2: Edge Function `seed-plants`" lines 420-563. Key Phase-8-specific bits:
- Static file load at module init: `await Deno.readTextFile('./plants.json')` (after `static_files` bundling)
- Two-step seed: `supabase.from('plants').upsert(payload, { onConflict: 'slug' })`, then DELETE+INSERT on `plant_companions`
- Slug→id resolution between the two steps via `supabase.from('plants').select('id, slug')`
- Defense-in-depth: skip self-references silently before INSERT (DB CHECK is final wall)

**CORS shared module:** `supabase/functions/_shared/cors.ts` already exists (lines 1-12). Reuse unchanged.

---

### `supabase/functions/seed-plants/deno.json` (function config)

**Analog:** `supabase/functions/extract-vereinsregeln/deno.json` (commit `cde46bb`, deleted).
**Why this analog:** Only Deno function config pattern in this codebase's history.

**Original deno.json** (commit `cde46bb`):
```json
{
  "nodeModulesDir": "auto",
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.103.2",
    "@anthropic-ai/sdk": "npm:@anthropic-ai/sdk@^0.90.0"
  }
}
```

**For seed-plants** (RESEARCH §Standard Stack lines 148-156): drop Anthropic; pin supabase-js to same version as `app/package.json` (2.49.5) for cognitive load reduction:
```json
{
  "nodeModulesDir": "auto",
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.49.5"
  }
}
```

---

### `supabase/functions/seed-plants/README.md` (workflow docs)

**Analog:** None — first-of-kind. Pitfall-6 mitigation from RESEARCH (bundle JSON drift between build-time validation and Edge Function deploy).

**Content shape** (RESEARCH §Pitfall 6 + CONTEXT D-17):
1. Workflow: edit `packages/shared/src/data/plants.json` → smoke test must be green → commit → `supabase functions deploy seed-plants --linked` → curl trigger.
2. Manual curl example: `curl -X POST https://vitrqkzxkiqvadqfzrcx.supabase.co/functions/v1/seed-plants -H "Authorization: Bearer <service-role-key>" -d '{"token":"<SEED_PLANTS_TRIGGER_TOKEN>"}'`
3. Expected response shape: `{ ok: true, plantsCount: N≥80, companionsCount: M, schemaVersion: "plant-db.v1" }`
4. Idempotency note: re-running yields identical counts (UPSERT by slug + DELETE+INSERT companions).
5. Troubleshooting: Pitfall-1 (`static_files` path resolution under `--use-api`); Pitfall-4 (slug renames orphan rows).

---

### `supabase/config.toml` (MOD — append `[functions.seed-plants]` block)

**Analog:** self (lines 364-376 — existing `[edge_runtime]` global block with documentation comment about `verify_jwt`).
**Why this analog:** No per-function blocks exist yet in this repo's `config.toml` post-M07. This will be the first one. The global `[edge_runtime]` block and its comments document the conventions.

**Existing context** (config.toml:364-384):
```toml
[edge_runtime]
enabled = true
policy = "per_worker"
inspector_port = 8083
deno_version = 2

# ── Edge Function overrides ──────────────────────────────────────────────
# verify_jwt = false lets the Supabase gateway forward OPTIONS preflight
# requests (which carry no Authorization header) to the function code,
# so the function's own CORS handler can respond with correct headers.
# Each function still validates auth inside its handler (defense-in-depth).
```

**Phase 8 addition** (RESEARCH §Pattern 2 config.toml block):
```toml
[functions.seed-plants]
verify_jwt = false  # Function uses SEED_PLANTS_TRIGGER_TOKEN env-var guard + service-role bypass
static_files = [ "../packages/shared/src/data/plants.json:./plants.json" ]
# static_files paths are relative to supabase/ dir. ":./plants.json" suffix
# remaps to function's working directory. Requires Supabase CLI >= 2.7.0.
```

**Verification gate** (RESEARCH §Pitfall 1): first deploy attempt must use Docker (not `--use-api`) to confirm `static_files` bundles correctly: `supabase functions deploy seed-plants --linked --debug`.

---

### `app/src/lib/plantRepo.ts` (repo, read-only)

**Analog:** `app/src/lib/gardenPlanRepo.ts` (read-only paths: `loadDimensions` lines 77-85, `loadAcceptedElements` lines 92-100).
**Why this analog:** Same general repo shape (named exports of async functions returning typed rows). **Critical divergence:** plantRepo is purely read-only — NO `assertAccount`, NO `writeWithOutbox`, NO `scheduleWriteDebounced`. PLANT-DB-07 (RESEARCH) explicitly forbids `assertAccount` here.

**Imports pattern (gardenPlanRepo.ts:1-12 — adapt by dropping write infrastructure):**
```typescript
// Phase 8 Plan 03: Read-only repo for the global plant reference DB.
// No assertAccount — plants are globally readable for authenticated users (D-04 RLS).
// Lokal-mode users get bundle data via usePlants() initialData (not through this repo).
// Pattern: gardenPlanRepo.ts but read-only — no storage layer, no outbox, no LWW.

import { supabase } from './supabase';
import type {
  PlantRow,
  PlantCompanionRow,
  CompanionRelationship,
} from '@spatenstich/shared';
```

**Read-function pattern** (gardenPlanRepo.ts:77-85, `loadDimensions` — short, no-side-effects):
```typescript
export async function loadDimensions(gardenId: string): Promise<GardenDimensionsRow | null> {
  const rows = await storage.getRowsByGarden<GardenDimensionsRow>('garden_dimensions', gardenId);
  return rows.length > 0 ? rows[0] : null;
}
```
**For plantRepo (RESEARCH §Pattern 5):**
```typescript
export async function loadAllPlants(): Promise<PlantRow[]> {
  const { data, error } = await supabase
    .from('plants').select('*').order('name_de', { ascending: true });
  if (error) throw error;
  return data.map(rowFromDb);
}

export async function loadPlantBySlug(slug: string): Promise<PlantRow | null> {
  const { data, error } = await supabase
    .from('plants').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? rowFromDb(data) : null;
}
```

**Symmetric companion lookup (RESEARCH §Pattern 5 lines 705-738):** UNION query handles both directions since storage is canonical (a<b); returns partitioned result `{ companions, incompatible, neutral }`.

**Fuzzy search pattern (RESEARCH lines 740-749):** `.or('name_de.ilike.%query%,name_alt_de.cs.{query}')` + `.limit(20)`.

**`rowFromDb` mapper pattern (gardenPlanRepo.ts has none — but importValidator.ts and rowMappers.ts establish snake→camel discipline):** Pattern source is `app/src/lib/mappers/rowMappers.ts` (in Phase 6.5 onward; not yet read here but referenced in 07-PATTERNS.md). For plants, a private `rowFromDb()` helper at the bottom of `plantRepo.ts` (RESEARCH lines 751-771) — keep it local to the file (no entry in shared rowMappers.ts since plants are a global new domain).

**Full reference implementation:** copy from `08-RESEARCH.md` §"Pattern 5: Repo Functions" lines 678-771.

---

### `app/src/hooks/usePlants.ts` (hook, request-response)

**Analog:** `app/src/hooks/useFlag.ts` (only existing TanStack Query hook in repo).
**Why this analog:** Same TanStack v5 `useQuery` shape, same `supabase`-based queryFn, same `staleTime` config. **Phase 8 extends** the pattern by adding `initialData` (Cold-Start fallback from JSON-bundle) + `initialDataUpdatedAt: 0` (force background refetch even when initialData is present — RESEARCH §Pitfall 2).

**Existing useFlag pattern** (useFlag.ts:1-31):
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FlagKey } from '@spatenstich/shared';

export function useFlag(flagKey: FlagKey | string): boolean {
  const { data } = useQuery({
    queryKey: ['feature_flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_key', flagKey)
        .maybeSingle();
      if (error) return false;
      return data?.enabled ?? false;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? false;
}
```

**For usePlants (RESEARCH §Pattern 4):**
```typescript
import { useQuery } from '@tanstack/react-query';
import plantsBundle from '@spatenstich/shared/data/plants';  // requires shared package exports map
import { loadAllPlants } from '../lib/plantRepo';
import type { PlantRow } from '@spatenstich/shared';

const QUERY_KEY = ['plants', 'all'] as const;

function initialDataFromBundle(): PlantRow[] {
  return plantsBundle.plants.map((p) => ({
    id: `bundle:${p.slug}`,
    slug: p.slug, nameDe: p.nameDe,
    // ... rest of mapping per CONTEXT D-08 ...
    createdAt: '1970-01-01T00:00:00Z',
    updatedAt: '1970-01-01T00:00:00Z',
  })) as PlantRow[];
}

export function usePlants() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: loadAllPlants,
    initialData: initialDataFromBundle,
    initialDataUpdatedAt: 0,                   // Pitfall 2: force background refetch
    staleTime: 1000 * 60 * 60 * 24,            // 24h (D-10)
    gcTime:    1000 * 60 * 60 * 24 * 7,        // 7d (D-10)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
```

**Full reference implementation:** copy from `08-RESEARCH.md` §"Pattern 4: TanStack Query Hook" lines 634-670.

---

### Tests — Wave 0 stubs + filled in W1/W2/W3

#### `packages/shared/src/__tests__/plants.smoke.test.ts` (data smoke test)

**Analog:** `app/src/lib/__tests__/i18n.review-keys.test.ts` (anchor-test idiom over imported JSON) + `packages/shared/src/__tests__/i18n.test.ts` (shared-pkg test location; node env per jest.config.ts).
**Why this analog:** Same "import bundle JSON + assert key shapes + anchor checks" pattern. Phase 8 differs by validating *count* (≥80 plants), *uniqueness* (slug), and *known anchors* (Tomate→Solanaceae, Erdbeere→Rosaceae, etc.).

**Pattern from i18n.review-keys.test.ts (lines 1-30):**
```typescript
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';
// (env stubs not strictly needed for shared-pkg test, but harmless)

import de from '@spatenstich/shared/i18n/de';

describe('i18n review-keys', () => {
  const review = (de as any).import?.review;
  it('defines de.import.review block', () => {
    expect(review).toBeDefined();
  });
  it('uses real UTF-8 umlauts (not ASCII replacements)', () => {
    expect(review.editForm.lengthPlaceholder).toMatch(/ä/);
  });
});
```

**Phase 8 shape (RESEARCH §"Wave-0 Smoke Test Skeleton" lines 1050-1100):**
```typescript
import bundle from '../data/plants.json';
import { validatePlantBundle } from '../validators/plant-db-v1';

describe('plants.json — Phase 8 smoke tests', () => {
  it('validates against plant-db.v1 schema (ajv)', () => {
    const result = validatePlantBundle(bundle);
    if (!result.ok) console.error('Validation errors:', result.errors);
    expect(result.ok).toBe(true);
  });
  it('contains at least 80 plants', () => {
    expect((bundle as any).plants.length).toBeGreaterThanOrEqual(80);
  });
  // ... PLANT-DB-01/02/08/09 anchors (D-16, RESEARCH lines 1083-1100) ...
});
```

**Test file location:** `packages/shared/src/__tests__/plants.smoke.test.ts` runs via `packages/shared/jest.config.ts` (node env, `testMatch: ['**/__tests__/**/*.test.ts']`).

**Quick command (VALIDATION):** `pnpm --filter @spatenstich/shared exec jest plants.smoke`.

**Wave-0 stubs (it.todo()) listed in VALIDATION §Wave 0:** ajv-valid, ≥80 count, unique slug, non-empty required fields, anchors Tomate/Erdbeere/Buschbohne/Apfel/Basilikum, dataSource enum (PLANT-DB-09 license gate).

---

#### `packages/shared/src/validators/__tests__/plant-db-v1.test.ts` (validator unit)

**Analog:** `app/src/lib/__tests__/importValidator.test.ts` (lines 1-137).
**Why this analog:** Same `validatePayload` → `validatePlantBundle` test shape. Same fixture-based test pattern (load fixtures, call validator, assert `ok: true/false` + error message content).

**Pattern from importValidator.test.ts (lines 13-95):**
```typescript
describe('importValidator', () => {
  describe('validatePayload', () => {
    it('accepts valid full payload', () => {
      const result = validatePayload(fullPayload);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload.schemaVersion).toBe('spatenstich-import.v1');
      }
    });

    it('rejects missing schemaVersion', () => {
      const invalid = { /* ... */ };
      const result = validatePayload(invalid);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        const errorText = result.errors.join(' ');
        expect(errorText).toMatch(/schemaVersion/);
      }
    });

    it('rejects plant with unknown bedRef', () => {  // ← Phase 8 analog: companion with unknown plantASlug
      const invalid = { /* ... */ };
      const result = validatePayload(invalid);
      expect(result.ok).toBe(false);
    });

    it('handles non-object input gracefully', () => {
      const result = validatePayload('not an object');
      expect(result.ok).toBe(false);
    });

    it('handles null input gracefully', () => {
      const result = validatePayload(null);
      expect(result.ok).toBe(false);
    });
  });
});
```

**Phase 8 test cases (VALIDATION §Wave 0 stubs + RESEARCH §Pattern 3):**
- Accepts valid full bundle (load from a `__fixtures__/plant-db-v1.full.json` mirror)
- Rejects missing `schemaVersion`
- Rejects invalid `category` enum value (e.g., `"Vegetable"` instead of `"Gemüse"`)
- Rejects companion with unknown `plantASlug` (cross-ref)
- Rejects self-companion (`plantASlug === plantBSlug`)
- Rejects duplicate canonical pair across both directions
- Rejects forbidden `dataSource: "gartenplaner"` (PLANT-DB-09 license gate)
- Handles non-object / null input gracefully

---

#### `app/src/lib/__tests__/plantRepo.test.ts` (repo unit)

**Analog:** `app/src/lib/__tests__/gardenPlanRepo.test.ts` (lines 1-80 read; full file is unit-style with `jest.mock` for storage + authStore).
**Why this analog:** Same mocking idiom (`jest.mock` before lazy-import; mock factories return jest.fn). **Phase 8 simplification:** drop `mockStorageWriteWithOutbox`, `mockScheduleWriteDebounced`, `mockStorageGetRowsByGarden` mocks (no writes, no storage layer). Instead, mock `lib/supabase` to return rows for `.from('plants').select('*')`.

**Mock pattern adaptation:**
```typescript
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: [/* fixture rows */], error: null }),
        eq: jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { /* row */ }, error: null }) })),
        or: jest.fn().mockResolvedValue({ data: [/* relations */], error: null }),
        in: jest.fn().mockResolvedValue({ data: [/* plants */], error: null }),
        limit: jest.fn().mockResolvedValue({ data: [/* search results */], error: null }),
      })),
    })),
  },
}));

import { loadAllPlants, loadPlantBySlug, loadCompanionsFor, searchPlants } from '../plantRepo';

describe('plantRepo', () => { /* ... */ });
```

**Test cases (VALIDATION PLANT-DB-07):**
- `loadAllPlants` returns mapped rows ordered by name_de
- `loadPlantBySlug` returns row or null
- `loadCompanionsFor` partitions correctly into `{companions, incompatible, neutral}`
- **Symmetry invariant:** `loadCompanionsFor(a)` and `loadCompanionsFor(b)` return each other (regardless of canonical storage direction)
- `searchPlants(query)` calls `.or(name_de.ilike + name_alt_de.cs)` and `.limit(20)`
- snake→camel mapping via `rowFromDb` is correct

---

#### `app/src/hooks/__tests__/usePlants.test.ts` (hook unit)

**Analog:** `app/src/hooks/__tests__/useFlag.test.ts` (lines 1-67).
**Why this analog:** Same `renderHook` + `QueryClientProvider` wrapper pattern, same supabase mock shape. Only existing hook test in the codebase that uses TanStack Query.

**Wrapper pattern (useFlag.test.ts:19-24):**
```typescript
function wrap(qc: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}
```

**Mock + renderHook pattern (useFlag.test.ts:27-31):**
```typescript
jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ select: jest.fn(() => ({ /* ... */ })) })) },
}));

it('returns true when feature_flags row has enabled=true', async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { result } = renderHook(() => useFlag('example_flag'), { wrapper: wrap(qc) });
  await waitFor(() => expect(result.current).toBe(true));
});
```

**Phase 8 additional cases (VALIDATION PLANT-DB-06):**
- `usePlants()` returns `initialData` synchronously on first render (length matches JSON-bundle.plants.length)
- `usePlants()` refetches in background (assert `queryFn` is called even though `initialData` is present — proves `initialDataUpdatedAt: 0` is set)
- After refetch resolves with new data, `result.current.data` reflects the Supabase response (not the bundle anymore)
- Errors don't throw; `result.current.data` falls back to bundle

**Mock for `@spatenstich/shared/data/plants` in test:** add jest.config.ts moduleNameMapper entry (see `plants.json` section above).

---

## Shared Patterns

### Migration: DO-block invariants + section dividers
**Source:** `supabase/migrations/20260513000018_plan_elements_layer.sql` lines 1-56
**Apply to:** Migration 019
**Sketch:**
```sql
-- Phase X Plan Y: <description>
-- Provides: <what this delivers>
-- Follows: Migration NNN pattern (DO-block invariants, ADD COLUMN IF NOT EXISTS)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.

-- ──────────────────────────────────────────────────────────────
-- Section N — <title>
-- ──────────────────────────────────────────────────────────────
<DDL>

DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM <metadata_view> WHERE <condition>;
  IF cnt <> <expected> THEN
    RAISE EXCEPTION 'migration_NNN_invariant: <reason>';
  END IF;
  RAISE NOTICE 'migration_NNN ok: <summary>';
END $$;
```

### Read-only RLS (NEW — Phase 8 establishes this pattern)
**Source:** RESEARCH §Pattern 1 (no prior analog — Migration 015 dropped tables that *would* have been the closest)
**Apply to:** `plants` + `plant_companions` only; later may extend to other global reference tables (Phase 13 saatgut-master).
**Sketch:**
```sql
ALTER TABLE public.<global_table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table>_read_authenticated" ON public.<global_table>
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
-- Intentionally no INSERT/UPDATE/DELETE policies → clients cannot mutate.
-- Only service-role (Edge Function) writes — service-role bypasses RLS by design.
```

### Edge Function: `_shared/cors.ts` reuse
**Source:** `supabase/functions/_shared/cors.ts` (lines 1-12)
**Apply to:** Every browser-invocable Edge Function. Phase 8 reuses unchanged.
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
```

### ajv validator: canonical import + module-level compile
**Source:** `app/src/lib/importValidator.ts` lines 6-15
**Apply to:** Every JSON Schema validator in this codebase. Phase 8 validator MUST follow this exact pattern.
```typescript
import Ajv2020 from 'ajv/dist/2020'; // NOT default ajv import — Metro/Jest Kompat
import addFormats from 'ajv-formats';
import schema from '<relative-path>/<name>.v1.json';

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);  // ← module level, NOT inside function (perf)
```

### TanStack Query hook with Supabase queryFn
**Source:** `app/src/hooks/useFlag.ts` lines 1-31
**Apply to:** `usePlants` (with `initialData` extension)
**Sketch:**
```typescript
const { data } = useQuery({
  queryKey: ['<resource>', ...keyParts] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from('<table>').select('...');
    if (error) /* fallback or throw */;
    return data;
  },
  staleTime: <ms>,
  // Phase 8 additions:
  initialData: <synchronous-fallback>,    // ← NEW: cold-start data
  initialDataUpdatedAt: 0,                // ← NEW: force background refetch
});
```

### Shared-package JSON export (i18n pattern → data pattern)
**Source:** `packages/shared/package.json` lines 7-10 + `app/jest.config.ts` line 30
**Apply to:** Every static JSON resource that lives in `packages/shared/src/<dir>/`.
**Two changes required for every new JSON bundle:**
1. `packages/shared/package.json` → add `"./data/plants": "./src/data/plants.json"` to `exports` map.
2. `app/jest.config.ts` (every project that imports it) → add `'^@spatenstich/shared/data/plants$': '<rootDir>/../packages/shared/src/data/plants.json'` to `moduleNameMapper`.

### Test mocks: jest.mock before lazy-import
**Source:** `app/src/lib/__tests__/gardenPlanRepo.test.ts` lines 9-38
**Apply to:** `plantRepo.test.ts` and any other repo test.
**Sketch:**
```typescript
const mockSupabaseFrom = jest.fn();
jest.mock('../supabase', () => ({ supabase: { from: (...a: unknown[]) => mockSupabaseFrom(...a) } }));
// ... other mocks ...

// Lazy import AFTER mocks
import { loadAllPlants } from '../plantRepo';
```

---

## No Analog Found

Files with no close match in the codebase (planner should rely on RESEARCH.md and the closest role-match analogs documented above):

| File | Role | Data Flow | Reason | Mitigation |
|------|------|-----------|--------|------------|
| `supabase/functions/seed-plants/index.ts` | edge-function | request-response | First Edge Function post-M07. Closest analog (`extract-vereinsregeln/index.ts`) is in git history `cde46bb`, deleted in `0831320`. | Use git-history file as structural template + RESEARCH §Pattern 2 for Phase-8-specific upsert logic. First deploy via Docker (not `--use-api`) per Pitfall 1. |
| `supabase/functions/seed-plants/deno.json` | config | static | (same — first Edge Function post-M07) | Use git-history file `cde46bb`; drop Anthropic SDK import. |
| `supabase/functions/seed-plants/README.md` | docs | static | Workflow doc is a new requirement (Pitfall 6 mitigation). | RESEARCH §Pitfall 6 + CONTEXT D-17 define content. |
| `packages/shared/src/data/LICENSES.md` | docs | static | License-attribution doc has no analog. | CONTEXT D-06 + PLANT-DB-09 dictate content. |
| `packages/shared/src/validators/__tests__/plant-db-v1.test.ts` | test | mock-based | Validators directory is empty (validators are in `app/src/lib/` not `packages/shared/src/validators/`). | Test idiom from `app/src/lib/__tests__/importValidator.test.ts` is fully applicable; only the file location differs. |
| `packages/shared/src/validators/plant-db-v1.ts` | validator | pure transform | (same — first validator in shared package) | Same — `importValidator.ts` is the pattern. |

---

## Metadata

**Analog search scope:**
- `supabase/migrations/*.sql` (18 files; closest: 014 + 017 + 018)
- `supabase/tests/*.sql` (15 files; closest: garden_plan_rls.sql)
- `supabase/functions/` (only `_shared/cors.ts` present; git history `cde46bb` for the structural template)
- `app/src/lib/*.ts` (15 files; closest: gardenPlanRepo.ts + importValidator.ts)
- `app/src/hooks/*.ts` (5 files; closest: useFlag.ts as only useQuery hook)
- `packages/shared/src/**/*.ts` (~13 files; closest: entities.ts + i18n.test.ts)
- `app/src/lib/__tests__/*` (10+ files; closest: importValidator.test.ts + gardenPlanRepo.test.ts + i18n.review-keys.test.ts)
- `app/src/hooks/__tests__/*` (1 file: useFlag.test.ts — exact analog)
- `app/jest.config.ts` (verified existing `hooks` + `node` projects)
- Git history (`git log --all -- 'supabase/functions/**'`) — found `cde46bb` `extract-vereinsregeln` precedent

**Files scanned:** ~62 candidates surveyed; 11 closely-matched analogs read in detail.

**Edge Function note:** `supabase/functions/extract-vereinsregeln/` was deleted in Phase 5 (commit `0831320`). The git-history files at `cde46bb` are the only Edge Function pattern available in this codebase. Phase 8's `seed-plants` is the first Edge Function to land post-M07; the structural shape comes from history, the upsert/seed logic comes from RESEARCH.md.

**Pattern extraction date:** 2026-05-17

---

## PATTERN MAPPING COMPLETE

**Phase:** 8 - Plant-DB Foundation
**Files classified:** 14 (1 modified + 13 new)
**Analogs found:** 11 / 14

### Coverage
- Files with exact analog: 7 (Migration, Validator-pattern, Schema, JSON-bundle, types, hook-test, repo-test)
- Files with role-match analog: 4 (RLS test, Repo, Hook, config.toml extension)
- Files with no analog: 3 (Edge Function index.ts + deno.json + README — Edge Function precedent only exists in git history `cde46bb`)

### Key Patterns Identified
- **Migration style is locked:** Section dividers + DO-block invariants + `RAISE NOTICE` summary line — same pattern Migrations 014/017/018 use; Migration 019 follows verbatim.
- **Read-only RLS is a NEW pattern** introduced by Phase 8: `auth.uid() IS NOT NULL` for SELECT only, no INSERT/UPDATE/DELETE policies → service-role-only writes via Edge Function. Will become the template for future global reference tables (Phase 13 saatgut-master).
- **ajv validator pattern is locked:** `import Ajv2020 from 'ajv/dist/2020'` + module-level compile + `ValidationResult` discriminated union + cross-ref errors after schema-validity. `app/src/lib/importValidator.ts` is the canonical reference.
- **TanStack Query with initialData** is a Phase 8 *extension* of the `useFlag.ts` pattern: same `useQuery` shape, but adds `initialData` (synchronous JSON-bundle fallback) + `initialDataUpdatedAt: 0` (force background refetch — Pitfall 2 mitigation).
- **Edge Function structure** is a *revival* of the pre-M07 `extract-vereinsregeln` pattern: same imports, same env-var guard, same `Deno.serve` skeleton. Phase 8 strips out all Anthropic/AI imports (zero outbound AI calls per project Constraint) and replaces business logic with idempotent UPSERT+REBUILD-companions logic.
- **JSON-bundle exports require dual-config** (package.json `exports` map + jest.config.ts `moduleNameMapper`): existing `de.json` pattern (`./i18n/de` entry) is the precedent — every new bundled JSON needs both entries.
- **Repo without `assertAccount`** is a Phase 8 first: every prior repo (gardenRepo, gardenPlanRepo, importRepo, profileRepo, vereinsregelnRepo, draftPromotionRepo) uses `assertAccount` because they all touch garden-scoped state. `plantRepo` is intentionally global → no auth-mode guard — but this MUST be documented explicitly in the file header to prevent future drift.

### File Created
`.planning/phases/08-plant-db-foundation/08-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns in PLAN.md files. Critical reminders for the planner:
1. **Wave 0** (test scaffolds) needs the 8 stub files enumerated in VALIDATION §Wave 0 — all use `it.todo()` placeholders.
2. **Wave 1** (Migration 019 + Types + Validator) — Migration 019 push-gate MUST use the dry-run pattern from Phase 7 P06.
3. **Wave 3** (Edge Function + Repo + Hook) — Edge Function first deploy MUST use Docker (not `--use-api`) to validate `static_files` bundling per Pitfall 1.
4. **Cross-cutting:** `package.json` exports + `jest.config.ts` moduleNameMapper changes are easy to forget — ensure both land in the same wave that introduces `plants.json`.
