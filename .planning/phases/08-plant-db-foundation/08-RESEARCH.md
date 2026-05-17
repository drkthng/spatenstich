# Phase 8: Plant-DB Foundation — Research

**Researched:** 2026-05-12
**Domain:** PostgreSQL schema design (read-only reference data), Supabase Edge Functions with static file bundling, JSON Schema validation via ajv, TanStack Query with `initialData` from in-bundle JSON fallback, source-license hygiene for botanical data
**Confidence:** HIGH (stack/architecture verified against codebase and Supabase docs); MEDIUM (data-quality conflict patterns are heuristic; some companion-relationship sources are unclear-license)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Datenmodell**
- **D-01:** Supabase als Source-of-Truth + JSON-Bundle als Offline-Fallback. Zwei `plants`-bezogene Tabellen in Supabase. `packages/shared/src/data/plants.json` enthält gleichen Datensatz für Cold-Start. TanStack Query lädt aus Supabase und cached lokal nach First-Launch.
- **D-02:** `plants`-Tabelle Schema (Migration 019, Section 1) — exakte Felder siehe CONTEXT.md. Kanonische Spalten: `id uuid PK`, `slug text UNIQUE`, `name_de text`, `name_alt_de text[]`, `name_botanical`, `family`, `category` (enum), `min_spacing_cm`, `row_spacing_cm`, `depth_cm`, `sun_requirement`, `water_needs`, `climate_zone_min/max`, sow/plant/harvest DOY-Bereiche, `days_to_harvest`, `nitrogen_fixing`, `perennial`, `notes_de`, `icon_emoji`, `data_source`, timestamps.
- **D-03:** `plant_companions`-Tabelle Schema (Migration 019, Section 2): `id`, `plant_a_id`, `plant_b_id`, `relationship` in (`'companion'`,`'incompatible'`,`'neutral'`), `source`, `notes`, `UNIQUE (plant_a_id, plant_b_id)`, `CHECK (plant_a_id < plant_b_id)`. **Kanonische Speicher-Konvention:** kleinere UUID first.
- **D-04:** Read-only RLS für `plants` und `plant_companions` mit Policy `auth.uid() IS NOT NULL`. Keine Mutationen vom Client.

**Daten-Inhalt**
- **D-05:** 100–120 Einträge fokussiert auf deutsche Kleingärten (Klimazone 7a–8a, Mitteldeutschland inkl. Leipzig). Verteilung: ~45 Gemüse, ~20 Kräuter, ~10 Beeren, ~8 Obstbäume, ~5 Mischkultur-Begleiter.
- **D-06:** Quellen-Mix mit License-Hygiene: Gardeneus (MIT, frei) + garden-planner (MIT, frei) + Gartenplaner CSV (License unclear ⚠ — nur als FAKTENQUELLE, niemals verbatim copy; deutsche Pflanzennamen + Beziehungen sind Fakten, nicht copyrightbar) + eigene Recherche. `data_source` pro Eintrag dokumentiert.
- **D-07:** Konflikt-Resolution konservativ: Wenn Quelle A sagt "companion", Quelle B sagt "incompatible" → `relationship = 'neutral'` mit erklärendem `notes`.

**Code-Architektur**
- **D-08:** TypeScript-Types in `packages/shared/src/types/plants.ts` (exakte Interface-Definition siehe CONTEXT.md). `category` ist Single-String-Enum, kein Array (Arrays deferred zu Phase 13).
- **D-09:** Repo in `app/src/lib/plantRepo.ts` mit Funktionen `loadAllPlants()`, `loadPlantBySlug(slug)`, `loadCompanionsFor(plantId)` (returns `{companions, incompatible, neutral}`), `searchPlants(query)`.
- **D-10:** Hook in `app/src/hooks/usePlants.ts` mit TanStack Query. Erste Query lädt JSON-Bundle synchron (instant via `initialData`), parallel Supabase-Request; bei Erfolg merged. Cache: 24h stale, 7 Tage gc.
- **D-11:** JSON-Bundle bei `packages/shared/src/data/plants.json`, versioniert mit `{ "schemaVersion": "plant-db.v1", "plants": [...], "companions": [...] }`. Build-Zeit-Validation via ajv (gleiche Pattern wie spatenstich-import.v1).

**Migration + Seed**
- **D-12:** Migration 019 = Schema only (CREATE TABLE plants + plant_companions + Indizes + RLS).
- **D-13:** Seed via separate Edge Function `seed-plants`. JSON wird vom Function aus `packages/shared/src/data/plants.json` gelesen (kopiert ins Function-Deployment via `static_files`).
- **D-14:** Idempotenz: `INSERT ... ON CONFLICT (slug) DO UPDATE SET ...` für `plants`; für `plant_companions` clear-and-rebuild.
- **D-15:** Migration-Push-Gate-Pattern wie Phase 7 P06: `migration list --linked` → `db push --dry-run --yes` → real push. Bei Fehler `checkpoint:human-action`.

**Daten-Qualität**
- **D-16:** Smoke-Tests in Wave-0 (Jest): JSON parst gegen ajv-Schema, ≥80 Pflanzen, unique slug, non-empty nameDe/family/category, Anker-Tests (Tomate=Solanaceae, Erdbeere=Rosaceae, Buschbohne=nitrogenFixing, Apfel=perennial, Tomate.companions enthält Basilikum), keine Self-Companions (`a !== b`), kanonische Ordnung (`a < b`).
- **D-17:** Daten-Pflege-Workflow: JSON editieren → PR → Smoke-Tests grün → merge → Edge Function neu deployen → `seed-plants` manuell triggern. Nicht direkt im Supabase Dashboard editieren.

### Claude's Discretion
- Exakte Pflanzenliste-Reihenfolge (alphabetisch im JSON für Diff-Lesbarkeit empfohlen)
- Genaue DOY-Werte pro Pflanze (Mitteldeutschland-Standardwerte; spätere Klimazonenspezifische Variation in Phase 10)
- icon_emoji-Auswahl pro Pflanze (Unicode 14+ unterstützt fast alles)
- Wave-Aufteilung — diese Research **empfiehlt** unten 4 Waves (W0 Tests, W1 Migration+Types, W2 JSON-Daten, W3 Edge-Function+Hook+Repo+Push)

### Deferred Ideas (OUT OF SCOPE)
- Pflanzen-Sorten/Varietäten (z.B. "Tomate Brandywine") → Phase 13 v1.2 Saatgut-Inventar
- Klimazone-spezifische Aussaatdaten → Phase 10 via Offset zu Frost-Daten
- Multilingual (Englisch/Polnisch) → nur Deutsch in v1.x
- Bilder pro Pflanze (emoji als Placeholder) → vielleicht Phase 14
- Pl@ntNet / Foto-ID → explizit per M07-Pivot ausgeschlossen — nie
- User-Custom-Pflanzen → eventuell Phase 17
- Companion-Stärke (schwach/stark) → in v1 binary (companion/incompatible/neutral)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **SEED-02** (carried) | Texteingabe mit Autocomplete gegen Sorten-DB | `searchPlants(query)` fuzzy auf `name_de` + `name_alt_de` — Foundation gelegt, Autocomplete-UI später (Phase 13). Phase 8 sichert dass die DB existiert. |
| **PLANT-DB-01** | `plants` Supabase-Tabelle mit ≥80 (Ziel: 100–120) Pflanzen + reichem Schema | Migration 019 Section 1 (siehe Pattern Migration 014); seed via Edge Function `seed-plants` |
| **PLANT-DB-02** | `plant_companions` Tabelle mit kanonischer (a<b) UUID-Ordnung, UNIQUE-Pair, relationship-CHECK | Migration 019 Section 2; symmetrische Query via `loadCompanionsFor` UNION |
| **PLANT-DB-03** | JSON-Bundle in `packages/shared/src/data/plants.json` mit `schemaVersion: "plant-db.v1"`, validiert gegen ajv | Schema-File analog `schemas/spatenstich-import.v1.json`; ajv Validierung in `packages/shared/src/validators/plant-db-v1.ts` |
| **PLANT-DB-04** | Read-only RLS Policy `plants_read_all` USING `auth.uid() IS NOT NULL` für beide Tables; FOR SELECT TO authenticated | Vorbild: removed `ai_tables` Pattern, Phase 5 Migration 015 (read-only-Konzept dokumentiert) |
| **PLANT-DB-05** | Edge Function `seed-plants` idempotent (upsert plants on slug, rebuild companions); static-file-bundled JSON | Pattern: `supabase/functions/extract-vereinsregeln/index.ts` (in agent-a3038016 worktree); CLI `static_files` Feature in config.toml |
| **PLANT-DB-06** | `usePlants()` Hook mit TanStack-Query `initialData` aus JSON-Bundle für Cold-Start-Fallback | TanStack Query v5 `initialData` mit `staleTime: 24h`, `gcTime: 7d` — Pattern verified |
| **PLANT-DB-07** | `plantRepo.ts` reine Read-Funktionen, KEIN assertAccount (Pflanzen sind global lesbar nach D-04 RLS) | gardenPlanRepo.ts hat assertAccount-Pattern; plantRepo darf das NICHT erben — globale Tabelle |
| **PLANT-DB-08** | Smoke-Test-Suite (Wave 0) deckt 6 Invarianten ab (D-16) | `packages/shared/src/__tests__/plants.smoke.test.ts` + `plant-db-v1.validator.test.ts` |
| **PLANT-DB-09** | Quellen-Lizenz-Hygiene dokumentiert; Gartenplaner CSV NUR als Faktenquelle | `data_source` Enum pro Row; `LICENSES.md`-Eintrag in shared/data/ |
</phase_requirements>

---

## Summary

Phase 8 ist eine **reine Daten-Phase** — keine UI, keine User-Flows, keine garden-scoped State. Sie liefert die globale Pflanzendatenbank, die Phase 9 (Companion-Hinweise im Plan-Editor) und Phase 10 (Aussaatkalender) benötigen, und legt das Fundament für Phase 13 (Saatgut-Inventar-Autocomplete) und Phase 15 (Fruchtfolge-Familien-Memory).

Drei Architekturentscheidungen prägen die Phase:

1. **Dual Source-of-Truth** (D-01): Supabase ist authoritative, JSON-Bundle ist Cold-Start-Garantie. Die App startet IMMER mit Pflanzen verfügbar — auch im lokalen Modus, auch ohne Netz. TanStack Query `initialData` macht den JSON-Bundle synchron verfügbar während der Supabase-Request im Hintergrund läuft. Dieser Ansatz vermeidet einen "Loading…"-State auf einem so grundlegenden Datensatz.

2. **Edge Function `seed-plants` mit `static_files`-Bundling** (D-13, D-14): Statt SQL-embedded JSON (unhandlich für ~50KB strukturierter Daten) oder COPY-FROM (fragil, schwer idempotent zu machen), liest die Edge Function das gleiche `plants.json` aus dem packages/shared/data-Ordner — gebundled via Supabase CLI 2.7+ `static_files`-Feature in `config.toml`. Single Source of Truth: die JSON-Datei.

3. **Kanonische Companion-Storage** (D-03): `plant_a_id < plant_b_id` + UNIQUE-Constraint speichert jede Beziehung exakt einmal. Self-Companions sind implizit verboten (strict <). Symmetrische Queries via `getCompanionsFor(plantId)` mit UNION der beiden Richtungen.

**Edge Function vs. SQL Embedded-JSON Recommendation:** **Edge Function gewinnt** (siehe §"Architecture Patterns" für Begründung). Maintainability schlägt Simplicity bei strukturierten Daten >40KB. SQL-Migration mit embedded JSON würde unlesbar werden, und Re-Seed wäre ein neuer Migration-File pro Daten-Update — nicht akzeptabel bei einer expected hohen Edit-Rate während v1.0/v1.1 Aufbau.

**Primary recommendation:** Wave-Struktur 4 Waves: **W0** Test-Scaffold (ajv-Schema + Smoke-Test-Stubs) → **W1** Migration 019 (Schema only) + Types + Validator → **W2** JSON-Datenpflege (100–120 Einträge, all sources merged, Companion-Konflikte resolviert) → **W3** Edge Function `seed-plants` + Repo + Hook + Push-Gate + Trigger.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pflanzen-Datensatz (authoritative) | API / Backend (Supabase Postgres) | Client (JSON-Bundle Cold-Start) | RLS-gated read; einzige authoritative Quelle nach erstem Sync |
| Pflanzen-Datensatz (Cold-Start) | Client (Static JSON Asset in packages/shared) | — | Offline-first; App MUSS Pflanzen kennen vor erstem Netzkontakt |
| Schema-Validation (build-time) | Tooling (ajv + Jest in shared package) | — | Verhindert dass eine kaputte JSON ins git landet |
| Schema-Validation (runtime) | — (NICHT validiert at runtime) | — | Build-time sufficient; runtime check würde startup verlangsamen |
| Bulk seed/upsert | Edge Function (Deno, service-role) | — | RLS bypass nötig; service-role-key never client-side (FOUND-06) |
| Read-Query (UI integration) | Client (TanStack Query Hook) | — | Standard pattern; hook → repo → Supabase OR JSON fallback |
| Companion-Lookup (symmetric) | Client repo (UNION 2 directions) | DB stores 1 direction canonical | Storage canonical; query layer hides asymmetry from callers |
| Konflikt-Resolution (Daten-Pflege) | Human (Dirk via JSON-PR) | Tooling (ajv reject malformed) | Konservativer "neutral" für conflicting sources; nicht automatisch heuristisch lösbar |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **@supabase/supabase-js** | 2.49.5 (already installed) | Service-role client in Edge Function für Upsert; auch im App-Client für Read | Already pinned in `app/package.json` and worktree `extract-vereinsregeln/deno.json` shows `npm:@supabase/supabase-js@2.103.2` for Edge Functions (pattern source) [VERIFIED: codebase + npm view, latest 2.105.4] |
| **@tanstack/react-query** | 5.62.7 (already installed) | `usePlants()` Hook mit `initialData` + 24h staleTime + 7d gcTime | Already in `app/package.json`; v5 `initialData` API is the canonical pattern for "static fallback + async refresh" [VERIFIED: codebase] |
| **ajv** | 8.20.0 (available in node_modules root) | JSON Schema draft-2020-12 validation für `plant-db.v1` Bundle | Same lib used by `app/src/lib/importValidator.ts` for `spatenstich-import.v1`; reuse exact pattern (`import Ajv2020 from 'ajv/dist/2020'`) [VERIFIED: pnpm-lock + npm view, latest 8.20.0] |
| **ajv-formats** | 3.0.1 (available in node_modules root) | `format: "date-time"` for `updatedAt` timestamps (optional) | Same lib used by existing validator; verify version matches root install [VERIFIED: npm view, latest 3.0.1] |
| **TypeScript** | 5.8.3 (app), 6.0.2 (shared package devDep) | Type-safe row interfaces, enum unions for category/sunRequirement | Already pinned; ts-jest 29.1.2 runs `resolveJsonModule: true` (Jest config verified) [VERIFIED: codebase] |

### Supporting (Edge Function only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Deno standard runtime** | bundled via Supabase CLI 2.90.0 (local) | Edge Function runtime | All Edge Functions; `Deno.readFile` to read bundled `plants.json` static asset |
| **jsr:@supabase/functions-js/edge-runtime.d.ts** | bundled | Edge-runtime types | Pattern from `extract-vereinsregeln/index.ts` line 12 — first import |
| **`_shared/cors.ts`** | already present | Reusable CORS headers | CORS preflight pattern; reuse existing file |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge Function `seed-plants` | SQL migration with embedded JSON | **Rejected.** ~50KB JSON inline in a `.sql` file is unreadable in PR review. Every data update would require a NEW migration file (write-only history) — violates D-17 ("editieren → re-seed"). |
| Edge Function `seed-plants` | SQL migration with `jsonb_to_recordset` reading from `pg_read_server_files()` | **Rejected.** Requires file system access via superuser; Supabase managed Postgres does not expose this. |
| Edge Function `seed-plants` | Local script `scripts/seed-plants.ts` connecting with service-role-key | **Rejected.** Service-role-key must NEVER leave the server boundary (FOUND-06). A local script with the key in env-var is acceptable for one-off bootstrap but not for routine re-seed; Edge Function is the cleaner pattern. |
| `static_files` bundling of JSON | Inline JSON in `index.ts` as `const PLANTS_DATA = {...}` | **Rejected.** Same JSON in two places → diff drift inevitable. The function MUST read from the same `packages/shared/src/data/plants.json` that the JSON-bundle in the app imports. |
| `static_files` bundling of JSON | Fetch JSON from a public URL (e.g. GitHub raw) | **Rejected.** Network dependency at deploy time; cold-start now hits external service; data exposure unnecessary. |
| TanStack Query `initialData` | TanStack Query `placeholderData` | **`initialData` preferred** — `initialData` is treated as "real data" and is cached/persisted; `placeholderData` is treated as transient (refetches immediately regardless of staleTime). For our use case JSON-bundle IS real data, just possibly stale. |
| `slug` as primary lookup key | UUID as lookup key | **Slug preferred** for client API surface — stable, human-readable, diff-friendly in JSON. UUIDs only internal (FK references in `plant_companions`). |

**Installation:**

```bash
# At the workspace root — ajv and ajv-formats are transitive, but we make them explicit in shared:
pnpm --filter @spatenstich/shared add ajv@8.20.0 ajv-formats@3.0.1

# No new deps in app/ — TanStack Query, supabase-js already pinned.

# Edge Function deno.json (created in W3) pins its own deps:
# {
#   "nodeModulesDir": "auto",
#   "imports": {
#     "@supabase/supabase-js": "npm:@supabase/supabase-js@2.49.5"
#   }
# }
```

**Version verification (done 2026-05-12):**

| Package | Pinned | Latest | Decision |
|---------|--------|--------|----------|
| `ajv` | 8.20.0 (transitive in lock) | 8.20.0 [VERIFIED: `npm view ajv version`] | Matches latest |
| `ajv-formats` | 3.0.1 | 3.0.1 [VERIFIED: `npm view ajv-formats version`] | Matches latest |
| `@supabase/supabase-js` (app) | 2.49.5 | 2.105.4 [VERIFIED: `npm view @supabase/supabase-js version`] | **Stay on 2.49.5** — CLAUDE.md explicitly pins 2.49.5+ because RN 0.79+ has a `ws/stream` ESM resolution issue; upgrade only intentionally |
| `@supabase/supabase-js` (Edge Function) | 2.49.5 (recommended) | 2.105.4 | Edge Functions run Deno, not Metro, so the Metro-specific bug doesn't apply, but pinning to the same as the app reduces cognitive load |
| `@tanstack/react-query` | 5.62.7 | 5.x | No change needed |
| Supabase CLI (local) | 2.90.0 [VERIFIED: `supabase --version`] | 2.98.2 | Above the 2.7.0 threshold required for `static_files` feature; OK |

---

## Architecture Patterns

### System Architecture Diagram

```
                                Build-time
                                ───────────
                                                                                  
   packages/shared/src/data/plants.json  ──┐                                          
   (schemaVersion: "plant-db.v1")          │                                          
                                           │                                          
                                  ┌────────▼─────────┐                                
                                  │ ajv validator    │                                
                                  │ (Jest smoke      │   FAIL → block PR / commit
                                  │  + smoke tests)  │                                
                                  └────────┬─────────┘                                
                                           │ PASS                                     
                                           ▼                                          
                                       ┌───────┐                                      
                                       │  git  │                                      
                                       └───┬───┘                                      
                                           │ deploy                                    
                                           │                                          
                          ┌────────────────┴─────────────────┐                        
                          │                                  │                        
                          ▼                                  ▼                        
            Edge Function bundle                    App bundle (Metro)               
            (Supabase CLI:                          (Expo Web/iOS/Android)            
             static_files = [                        imports JSON via                 
              "../../packages/shared/                @spatenstich/shared/             
               src/data/plants.json"])               data/plants                      
                          │                                  │                        
              ┌───────────┘                                  │                        
              ▼                                              │                        
       seed-plants Edge Function                             │                        
       (Deno, service-role key)                              │                        
              │                                              │                        
       1. Deno.readFile static asset                         │                        
       2. ajv validate (defense in depth)                    │                        
       3. SQL transaction:                                   │                        
          a) UPSERT plants ON CONFLICT (slug)                │                        
          b) DELETE FROM plant_companions                    │                        
          c) INSERT plant_companions                         │                        
       4. Return { ok, plantsCount, companionsCount }        │                        
              │                                              │                        
              ▼                                              │                        
       ┌──────────────────────────────────────┐              │                        
       │ Supabase Postgres                    │              │                        
       │  - plants  (Migration 019 Section 1) │              │                        
       │  - plant_companions  (Section 2)     │              │                        
       │  - RLS: auth.uid() IS NOT NULL       │              │                        
       └──────────────┬───────────────────────┘              │                        
                      │                                      │                        
                  Runtime                                    │                        
                  ───────                                    │                        
                      │                                      │                        
                      │      ┌───────────────────────────────┘                        
                      │      │                                                        
                      │      ▼                                                        
                ┌─────┴──────────────┐                                                
                │ usePlants() Hook   │                                                
                │ (TanStack Query)   │  initialData = JSON-bundle (synchronous)       
                │                    │  queryFn   = supabase.from('plants').select()  
                │ staleTime: 24h     │  staleTime hit? → return cache                 
                │ gcTime:    7d      │  stale?         → refetch in background        
                └────────┬───────────┘                                                
                         │                                                            
                         ▼                                                            
                  plantRepo.ts                                                        
                  (loadAllPlants, loadPlantBySlug,                                   
                   loadCompanionsFor, searchPlants)                                  
                         │                                                            
                         ▼                                                            
                  Phase 9/10/13/15 UI                                                 
                  (consumers — out of scope here)                                     
```

### Recommended Project Structure

```
packages/shared/
├── src/
│   ├── data/                         # NEW — Phase 8 reference data
│   │   ├── plants.json               # The 100–120-entry bundle (D-11)
│   │   └── LICENSES.md               # Source-license attribution (D-06)
│   ├── schemas/                      # NEW — JSON Schemas owned by shared
│   │   └── plant-db.v1.json          # ajv-validated schema for plants.json
│   ├── validators/                   # NEW — shared validators
│   │   ├── plant-db-v1.ts            # Mirror of importValidator.ts pattern
│   │   └── __tests__/
│   │       ├── plant-db-v1.test.ts   # Happy + edge cases for the validator
│   │       └── plants.smoke.test.ts  # Data-quality smoke tests (D-16)
│   ├── types/
│   │   └── plants.ts                 # NEW — PlantRow, PlantCompanionRow (D-08)
│   └── index.ts                      # Add plants exports

app/
├── src/
│   ├── hooks/
│   │   └── usePlants.ts              # NEW — TanStack Query hook (D-10)
│   └── lib/
│       └── plantRepo.ts              # NEW — loadAllPlants etc. (D-09)

supabase/
├── migrations/
│   └── 20260514000019_plants_schema.sql   # NEW — Migration 019 (D-12)
├── functions/
│   ├── _shared/cors.ts               # already exists — reuse
│   └── seed-plants/                  # NEW (D-13)
│       ├── deno.json
│       ├── index.ts
│       └── __tests__/
│           └── seedPlants.test.ts    # Optional — manual local test
└── config.toml                       # MODIFY — add [functions.seed-plants] block
                                      # with static_files pointing to plants.json
```

### Pattern 1: Migration 019 — Schema with RLS + Indices

Follows Phase 4 (Migration 014) for table+RLS+invariants and Phase 7 (Migration 018) for DO-block invariant style. **Key difference from prior migrations:** `plants` and `plant_companions` have NO LWW triggers (no garden-scoped collaborative edits) and NO `garden_id` column (global tables).

```sql
-- supabase/migrations/20260514000019_plants_schema.sql
-- Phase 8 Migration 019: plants + plant_companions tables
-- Provides: Global plant reference DB + companion relationships + read-only RLS
-- Follows: Migration 014 pattern (table+RLS+invariants), Migration 018 (DO-block pattern)
--
-- DESIGN NOTES:
-- - Read-only for clients (RLS USING auth.uid() IS NOT NULL, no WRITE policies)
-- - No LWW triggers (data is service-role-managed, not collaboratively edited)
-- - No garden_id (global reference DB, not per-garden)
-- - plant_companions stores canonical (plant_a_id < plant_b_id) — query layer
--   UNIONs both directions for symmetric companion lookup
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.

-- ──────────────────────────────────────────────────────────────
-- Section 1 — plants table
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plants (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique not null,
  name_de                text not null,
  name_alt_de            text[] not null default '{}',
  name_botanical         text,
  family                 text not null,
  category               text not null check (category in
                           ('Gemüse','Kraut','Beere','Obstbaum','Blume')),
  min_spacing_cm         integer,
  row_spacing_cm         integer,
  depth_cm               numeric,
  sun_requirement        text not null check (sun_requirement in
                           ('sonnig','halb_schattig','schattig')),
  water_needs            text not null check (water_needs in
                           ('niedrig','mittel','hoch')),
  climate_zone_min       integer,
  climate_zone_max       integer,
  sow_outdoor_doy_start  integer,
  sow_outdoor_doy_end    integer,
  sow_indoor_doy_start   integer,
  sow_indoor_doy_end     integer,
  plant_doy_start        integer,
  plant_doy_end          integer,
  harvest_doy_start      integer,
  harvest_doy_end        integer,
  days_to_harvest        integer,
  nitrogen_fixing        boolean not null default false,
  perennial              boolean not null default false,
  notes_de               text,
  icon_emoji             text,
  data_source            text not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_plants_family    ON public.plants (family);     -- Phase 15
CREATE INDEX IF NOT EXISTS idx_plants_category  ON public.plants (category);   -- UI filter
-- Note: plants_slug_key UNIQUE index is created automatically by UNIQUE constraint

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plants_read_authenticated" ON public.plants
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
-- No INSERT/UPDATE/DELETE policy: clients cannot mutate. Only service-role
-- (Edge Function) can write — service-role bypasses RLS by design.

-- ──────────────────────────────────────────────────────────────
-- Section 2 — plant_companions table (canonical a<b storage)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plant_companions (
  id           uuid primary key default gen_random_uuid(),
  plant_a_id   uuid not null references public.plants(id) on delete cascade,
  plant_b_id   uuid not null references public.plants(id) on delete cascade,
  relationship text not null check (relationship in
                 ('companion','incompatible','neutral')),
  source       text not null,
  notes        text,
  created_at   timestamptz not null default now(),
  UNIQUE (plant_a_id, plant_b_id),
  CHECK (plant_a_id < plant_b_id)
);

CREATE INDEX IF NOT EXISTS idx_plant_companions_a ON public.plant_companions (plant_a_id);
CREATE INDEX IF NOT EXISTS idx_plant_companions_b ON public.plant_companions (plant_b_id);

ALTER TABLE public.plant_companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_companions_read_authenticated" ON public.plant_companions
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ──────────────────────────────────────────────────────────────
-- Section 3 — Post-migration Invariant-Assertions
-- ──────────────────────────────────────────────────────────────
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
    WHERE n.nspname='public' AND c.relname IN ('plants','plant_companions') AND c.relkind='r';
  IF cnt <> 2 THEN
    RAISE EXCEPTION 'migration_019_invariant: expected 2 tables (plants, plant_companions), got %', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM pg_policies
    WHERE schemaname='public'
      AND policyname IN ('plants_read_authenticated','plant_companions_read_authenticated');
  IF cnt <> 2 THEN
    RAISE EXCEPTION 'migration_019_invariant: expected 2 RLS read policies, got %', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name IN (
        'plants_category_check',
        'plants_sun_requirement_check',
        'plants_water_needs_check',
        'plant_companions_relationship_check',
        'plant_companions_check'  -- the a<b CHECK
      );
  IF cnt < 5 THEN
    RAISE EXCEPTION 'migration_019_invariant: expected >=5 CHECK constraints, got %', cnt;
  END IF;

  RAISE NOTICE 'migration_019 ok: plants + plant_companions + RLS + CHECKs applied';
END $$;
```

### Pattern 2: Edge Function `seed-plants` — Idempotent Upsert + Companion Rebuild

```typescript
// supabase/functions/seed-plants/index.ts
// Phase 8 D-13: Idempotent seed of plants + plant_companions from static-bundled JSON.
// Reads plants.json (bundled via config.toml static_files), validates against the same
// plant-db.v1 schema as the build-time test, then performs:
//   1. Bulk UPSERT plants ON CONFLICT(slug) DO UPDATE
//   2. DELETE FROM plant_companions + INSERT (rebuild — table is small, simpler than diff)
// Both steps in the same logical request; failures are logged and returned actionable.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Read the bundled JSON at module init (cold-start one-time cost).
// Path is relative to the function's working directory inside the deno deploy bundle.
const PLANTS_BUNDLE_PATH = './plants.json';
let bundle: { schemaVersion: string; plants: any[]; companions: any[] };
try {
  const txt = await Deno.readTextFile(PLANTS_BUNDLE_PATH);
  bundle = JSON.parse(txt);
  if (bundle.schemaVersion !== 'plant-db.v1') {
    throw new Error(`Unexpected schemaVersion: ${bundle.schemaVersion}`);
  }
} catch (e) {
  throw new Error(`Failed to load plants bundle: ${e instanceof Error ? e.message : e}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Optional caller-supplied trigger-token guard — only Dirk should trigger this.
    const expectedTrigger = Deno.env.get('SEED_PLANTS_TRIGGER_TOKEN');
    if (expectedTrigger) {
      const body = await req.json().catch(() => ({}));
      if (body?.token !== expectedTrigger) {
        return json({ error: 'forbidden' }, 403);
      }
    }

    // 1. UPSERT plants by slug (idempotent re-run safe)
    const plantsPayload = bundle.plants.map((p: any) => ({
      slug:                   p.slug,
      name_de:                p.nameDe,
      name_alt_de:            p.nameAltDe ?? [],
      name_botanical:         p.nameBotanical ?? null,
      family:                 p.family,
      category:               p.category,
      min_spacing_cm:         p.minSpacingCm ?? null,
      row_spacing_cm:         p.rowSpacingCm ?? null,
      depth_cm:               p.depthCm ?? null,
      sun_requirement:        p.sunRequirement,
      water_needs:            p.waterNeeds,
      climate_zone_min:       p.climateZoneMin ?? null,
      climate_zone_max:       p.climateZoneMax ?? null,
      sow_outdoor_doy_start:  p.sowOutdoorDoyStart ?? null,
      sow_outdoor_doy_end:    p.sowOutdoorDoyEnd ?? null,
      sow_indoor_doy_start:   p.sowIndoorDoyStart ?? null,
      sow_indoor_doy_end:     p.sowIndoorDoyEnd ?? null,
      plant_doy_start:        p.plantDoyStart ?? null,
      plant_doy_end:          p.plantDoyEnd ?? null,
      harvest_doy_start:      p.harvestDoyStart ?? null,
      harvest_doy_end:        p.harvestDoyEnd ?? null,
      days_to_harvest:        p.daysToHarvest ?? null,
      nitrogen_fixing:        p.nitrogenFixing ?? false,
      perennial:              p.perennial ?? false,
      notes_de:               p.notesDe ?? null,
      icon_emoji:             p.iconEmoji ?? null,
      data_source:            p.dataSource,
      updated_at:             new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from('plants')
      .upsert(plantsPayload, { onConflict: 'slug' });
    if (upsertErr) return json({ error: 'plants_upsert_failed', detail: upsertErr.message }, 500);

    // 2. Resolve slugs → ids for companion FK references
    const { data: plantsAll, error: readErr } = await supabase
      .from('plants').select('id, slug');
    if (readErr || !plantsAll) {
      return json({ error: 'plants_read_failed', detail: readErr?.message }, 500);
    }
    const idBySlug = new Map(plantsAll.map((p: any) => [p.slug, p.id]));

    // 3. Build canonical companion rows from slug pairs
    const companionRows: any[] = [];
    const seen = new Set<string>();  // dedup safety
    for (const c of bundle.companions) {
      const aId = idBySlug.get(c.plantASlug);
      const bId = idBySlug.get(c.plantBSlug);
      if (!aId || !bId) continue;  // skip silently — JSON validator catches this at build time
      if (aId === bId) continue;  // defense — schema CHECK also rejects this
      const [lo, hi] = aId < bId ? [aId, bId] : [bId, aId];
      const key = `${lo}:${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);
      companionRows.push({
        plant_a_id:   lo,
        plant_b_id:   hi,
        relationship: c.relationship,
        source:       c.source,
        notes:        c.notes ?? null,
      });
    }

    // 4. Rebuild: DELETE + INSERT (small table, idempotent, no diff logic needed)
    const { error: delErr } = await supabase
      .from('plant_companions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) return json({ error: 'companions_delete_failed', detail: delErr.message }, 500);

    if (companionRows.length > 0) {
      const { error: insErr } = await supabase.from('plant_companions').insert(companionRows);
      if (insErr) return json({ error: 'companions_insert_failed', detail: insErr.message }, 500);
    }

    return json({
      ok: true,
      plantsCount: plantsPayload.length,
      companionsCount: companionRows.length,
      schemaVersion: bundle.schemaVersion,
    }, 200);
  } catch (err) {
    console.error('seed-plants failed', err);
    return json({ error: err instanceof Error ? err.message : 'internal_error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
```

**config.toml addition (Pattern 2 sibling):**

```toml
# Append to supabase/config.toml
[functions.seed-plants]
verify_jwt = false  # We use SEED_PLANTS_TRIGGER_TOKEN env var instead — function is service-role anyway
static_files = [ "../packages/shared/src/data/plants.json:./plants.json" ]
# Source path is relative to supabase/ directory; the :./plants.json suffix
# remaps it to the function's working directory. CLI 2.7.0+ supports this remap syntax.
```

> **Note on static_files path:** Supabase CLI's `static_files` array accepts paths relative to the project root (the directory containing `supabase/`). The colon-suffix `:dest` syntax is the canonical way to remap to a specific filename in the function's bundle. **[ASSUMED]** the exact remap-syntax may need confirmation via `supabase functions deploy --debug` on first attempt — if the bundle path differs, fall back to a direct path resolution using `import.meta.url`. The CLI may also require Docker for `static_files` to be bundled (the `--use-api` flag has a known limitation per [GitHub Discussion #32815](https://github.com/orgs/supabase/discussions/32815)).

### Pattern 3: ajv Validator for `plant-db.v1`

Mirror of `app/src/lib/importValidator.ts` but lives in shared package (build-time + Edge Function can both call it):

```typescript
// packages/shared/src/validators/plant-db-v1.ts
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '../schemas/plant-db.v1.json';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

export type PlantBundleValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validatePlantBundle(raw: unknown): PlantBundleValidationResult {
  const valid = validate(raw);
  if (!valid) {
    const errors = (validate.errors ?? []).map((e) => {
      const path = e.instancePath || '(root)';
      return `${path}: ${e.message ?? 'ungültig'}`;
    });
    return { ok: false, errors };
  }

  // Cross-reference checks (analogous to plant.bedRef check in importValidator):
  const bundle = raw as { plants: { slug: string }[]; companions: { plantASlug: string; plantBSlug: string }[] };
  const slugs = new Set(bundle.plants.map((p) => p.slug));
  const crossRefErrors: string[] = [];
  for (const c of bundle.companions) {
    if (!slugs.has(c.plantASlug)) crossRefErrors.push(`companion references unknown plantASlug "${c.plantASlug}"`);
    if (!slugs.has(c.plantBSlug)) crossRefErrors.push(`companion references unknown plantBSlug "${c.plantBSlug}"`);
    if (c.plantASlug === c.plantBSlug) crossRefErrors.push(`self-companion forbidden: "${c.plantASlug}"`);
  }
  // Dedup check (canonical pair appears at most once):
  const pairCounts = new Map<string, number>();
  for (const c of bundle.companions) {
    const key = c.plantASlug < c.plantBSlug
      ? `${c.plantASlug}:${c.plantBSlug}`
      : `${c.plantBSlug}:${c.plantASlug}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  for (const [key, n] of pairCounts) {
    if (n > 1) crossRefErrors.push(`duplicate companion pair (any direction): ${key} (count=${n})`);
  }

  if (crossRefErrors.length > 0) return { ok: false, errors: crossRefErrors };
  return { ok: true };
}
```

### Pattern 4: TanStack Query Hook with JSON-Bundle `initialData`

```typescript
// app/src/hooks/usePlants.ts
import { useQuery } from '@tanstack/react-query';
import plantsBundle from '@spatenstich/shared/data/plants.json';  // requires shared package export
import { loadAllPlants } from '../lib/plantRepo';
import type { PlantRow } from '@spatenstich/shared';

const QUERY_KEY = ['plants', 'all'] as const;

// JSON-bundle is the source of "initial truth" — instantly available, even offline,
// even pre-auth (lokaler Modus).
function initialDataFromBundle(): PlantRow[] {
  return plantsBundle.plants.map((p) => ({
    // Mapping from JSON-shape (slug-based) → row-shape (id-bearing):
    // - JSON has no UUID; we synthesize a deterministic stable id from slug for the
    //   bundle case (sha-256 truncated, or just `bundle:${slug}` if FK refs not needed).
    // - On first successful Supabase fetch, this synthetic id is replaced by the real UUID.
    // - Companion lookups against bundle-only data use slug-based matching, not id.
    id: `bundle:${p.slug}`,
    slug: p.slug,
    nameDe: p.nameDe,
    // ... rest of mapping
  })) as PlantRow[];
}

export function usePlants() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: loadAllPlants,
    initialData: initialDataFromBundle,           // Synchronous instant data
    initialDataUpdatedAt: 0,                       // Force refetch on mount (treat bundle as stale)
    staleTime: 1000 * 60 * 60 * 24,                // 24h (D-10)
    gcTime:    1000 * 60 * 60 * 24 * 7,            // 7d (D-10)
    refetchOnWindowFocus: false,                   // Static reference data; no need to refetch on focus
    refetchOnReconnect: true,                      // Do refetch when network comes back
  });
}
```

**Why `initialDataUpdatedAt: 0`?** TanStack Query treats `initialData` with no `updatedAt` as "fresh as now", which would prevent the background refetch. Setting it to 0 (epoch) makes the data immediately stale → background refetch fires while the bundle data is already rendered. Pattern source: [TanStack Docs](https://tanstack.com/query/v5/docs/framework/react/guides/initial-query-data#initial-data-function).

### Pattern 5: Repo Functions

```typescript
// app/src/lib/plantRepo.ts
// Phase 8 D-09: Read-only repo for global plant DB. NO assertAccount —
// plants are globally readable (D-04) for authenticated users; lokal-mode
// users get bundle fallback through the hook.

import { supabase } from './supabase';
import type { PlantRow, PlantCompanionRow } from '@spatenstich/shared';

export async function loadAllPlants(): Promise<PlantRow[]> {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .order('name_de', { ascending: true });
  if (error) throw error;
  return data.map(rowFromDb);  // snake_case → camelCase mapper
}

export async function loadPlantBySlug(slug: string): Promise<PlantRow | null> {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? rowFromDb(data) : null;
}

export async function loadCompanionsFor(plantId: string): Promise<{
  companions: PlantRow[];
  incompatible: PlantRow[];
  neutral: PlantRow[];
}> {
  // UNION query — covers both directions, since storage is canonical (a<b).
  const { data: relations, error } = await supabase
    .from('plant_companions')
    .select('plant_a_id, plant_b_id, relationship')
    .or(`plant_a_id.eq.${plantId},plant_b_id.eq.${plantId}`);
  if (error) throw error;

  // Resolve the "other" plant per relation
  const otherIds = relations.map((r) =>
    r.plant_a_id === plantId ? r.plant_b_id : r.plant_a_id
  );
  if (otherIds.length === 0) return { companions: [], incompatible: [], neutral: [] };

  const { data: plants, error: plantsErr } = await supabase
    .from('plants').select('*').in('id', otherIds);
  if (plantsErr) throw plantsErr;
  const byId = new Map(plants.map((p) => [p.id, rowFromDb(p)]));

  const result = { companions: [] as PlantRow[], incompatible: [] as PlantRow[], neutral: [] as PlantRow[] };
  for (const rel of relations) {
    const otherId = rel.plant_a_id === plantId ? rel.plant_b_id : rel.plant_a_id;
    const plant = byId.get(otherId);
    if (!plant) continue;
    if (rel.relationship === 'companion')    result.companions.push(plant);
    else if (rel.relationship === 'incompatible') result.incompatible.push(plant);
    else                                          result.neutral.push(plant);
  }
  return result;
}

export async function searchPlants(query: string): Promise<PlantRow[]> {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const { data, error } = await supabase
    .from('plants').select('*')
    .or(`name_de.ilike.%${q}%,name_alt_de.cs.{${q}}`)
    .limit(20);
  if (error) throw error;
  return data.map(rowFromDb);
}

function rowFromDb(r: any): PlantRow {
  // snake_case → camelCase mapping
  return {
    id: r.id, slug: r.slug, nameDe: r.name_de,
    nameAltDe: r.name_alt_de ?? [], nameBotanical: r.name_botanical,
    family: r.family, category: r.category,
    minSpacingCm: r.min_spacing_cm, rowSpacingCm: r.row_spacing_cm,
    depthCm: r.depth_cm,
    sunRequirement: r.sun_requirement, waterNeeds: r.water_needs,
    climateZoneMin: r.climate_zone_min, climateZoneMax: r.climate_zone_max,
    sowOutdoorDoyStart: r.sow_outdoor_doy_start, sowOutdoorDoyEnd: r.sow_outdoor_doy_end,
    sowIndoorDoyStart:  r.sow_indoor_doy_start,  sowIndoorDoyEnd:  r.sow_indoor_doy_end,
    plantDoyStart: r.plant_doy_start, plantDoyEnd: r.plant_doy_end,
    harvestDoyStart: r.harvest_doy_start, harvestDoyEnd: r.harvest_doy_end,
    daysToHarvest: r.days_to_harvest,
    nitrogenFixing: r.nitrogen_fixing, perennial: r.perennial,
    notesDe: r.notes_de, iconEmoji: r.icon_emoji,
    dataSource: r.data_source,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
```

### Anti-Patterns to Avoid

- **Embedded JSON in SQL migration file.** Will balloon the migration file past readable size, and every data revision becomes a new migration with no rollback path. Use Edge Function with `static_files` instead.
- **Duplicating JSON data between the app bundle and the Edge Function.** Will drift. Bundle the SAME `packages/shared/src/data/plants.json` to BOTH consumers via the workspace path.
- **Runtime ajv validation on every app launch.** Build-time test catches schema drift; runtime check is wasted CPU at every cold start. Build-time only.
- **`assertAccount` in `plantRepo.ts`.** Plants are global (D-04). The lokal-mode read path uses the JSON-bundle through the hook — the repo functions only fire for account-mode users. No assertion needed.
- **Using PostgreSQL `bigserial` for plant id.** UUIDs are required so Edge Function inserts can pre-compute ids client-side if needed; matches the rest of the schema.
- **Companion rows stored both directions (`a→b` and `b→a`).** Doubles storage, doubles index size, and creates a class of bugs ("did I get both rows?"). The CHECK `a<b` enforces single-direction storage; query layer UNIONs.
- **Fuzzy-matching companion data from sources before storing.** Sources disagree often (D-07); store `'neutral'` with explanatory notes rather than guessing which source is right. Phase 9 UI shows neither red nor green banner for `neutral`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema validation | Custom property-by-property type checks | `ajv@8.20.0` (already in node_modules) + `ajv-formats@3.0.1` | Same library as `spatenstich-import.v1`; draft-2020-12 support; cross-ref check pattern is established (see `importValidator.ts`) |
| Bulk SQL upsert | Building INSERT statements by hand and concatenating | `supabase.from('plants').upsert(payload, { onConflict: 'slug' })` | supabase-js handles batching, error semantics, and parameterization. Pattern: a single `.upsert()` call is fine up to ~1000 rows ([VERIFIED: Supabase docs]) |
| Symmetric companion lookup | Storing both directions and dedup-ing on read | DB CHECK `a<b` + UNION query | Storage stays 50% smaller; pair-uniqueness enforced at schema level, not application level |
| Async data hydration with offline fallback | Manual `loading/data/error` state machine in component | TanStack Query `initialData` + `staleTime` | initialData makes "render instantly, refetch in background" a 5-line pattern |
| CSV parsing from German Gartenplaner sources | Custom CSV parser for facts extraction | Manual data entry (the CSV is only 28 rows of companion pairs + 84 rows aussaatkalender) | Re-research from public sources is required anyway (D-06 license hygiene) — manual entry is the audit step |
| Bundling static JSON for an Edge Function | Embedding JSON as a const in `index.ts` | Supabase CLI `static_files` (config.toml) | Single source of truth between app bundle and Edge Function; CLI 2.7.0+ feature confirmed |
| Test framework | Custom assertions | Existing Jest 29.7.0 + ts-jest 29.1.2 in `packages/shared` + `app/src/lib/__tests__` | Both `node` and `hooks` Jest projects exist and accept new test files automatically |
| German plant-name spelling validation | Custom regex for umlauts | Standard UTF-8 in JSON; ajv `pattern` for slug ASCII validation only | de.json pattern (de_umlauts feedback in MEMORY) — keep UTF-8 throughout; only slugs are ASCII |

**Key insight:** Phase 8 has very little novel surface area — everything has a well-trodden pattern in the codebase (ajv validator from Phase 6, Edge Function from removed `extract-vereinsregeln`, migration from Migration 014/018, repo from `gardenPlanRepo`, hook from TanStack Query usage in `importStore`). The **data curation work** (the 100–120 plant entries) is the actual labor, and that's manual research, not code.

---

## Runtime State Inventory

> Phase 8 is a **greenfield** phase — no rename, no refactor, no existing live data being migrated. Skipping per spec.

**Verified that nothing applies:**
- No `plants` table existed before Migration 019 — confirmed by listing all `supabase/migrations/*.sql` files [VERIFIED: `ls supabase/migrations/`].
- No prior Edge Function or scheduled job references "plants" or "plant_companions" — confirmed by grep in `supabase/functions/` (only `_shared/` exists).
- No env vars need adding except `SEED_PLANTS_TRIGGER_TOKEN` (optional, recommended for the Edge Function), and `SUPABASE_SERVICE_ROLE_KEY` (already exists for prior functions in the worktree history).

---

## Common Pitfalls

### Pitfall 1: `static_files` Path Resolution Differs Between `--use-api` and Docker Deploy

**What goes wrong:** Edge Function deploys but `Deno.readFile('./plants.json')` returns ENOENT at runtime.
**Why it happens:** [VERIFIED: [GitHub Discussion #32815](https://github.com/orgs/supabase/discussions/32815)] reports that `--use-api` flag has not historically bundled `static_files` correctly — Docker-based deploy is needed. The 2.90.0 CLI installed locally may or may not have the fix.
**How to avoid:**
1. First deploy attempt: `supabase functions deploy seed-plants --linked --debug` (no `--use-api`) — this requires Docker Desktop running on Windows.
2. Verify in deploy logs that `plants.json` appears in the bundle manifest.
3. If `--use-api` is desired (Docker not available), fall back to: read the JSON via `await fetch(new URL('./plants.json', import.meta.url))` — Deno supports relative URL imports of bundled assets.
**Warning signs:** Cold-start error `NotFound: ./plants.json`; or function loads but `bundle.plants.length === 0`.

### Pitfall 2: TanStack Query `initialData` Treated as Fresh, No Refetch

**What goes wrong:** App shows JSON-bundle plants forever; Supabase data never loaded even after first successful network.
**Why it happens:** Default behavior: TanStack Query treats `initialData` as "freshly fetched right now" → respects `staleTime` and skips refetch.
**How to avoid:** Always set `initialDataUpdatedAt: 0` (epoch) when using `initialData` as offline fallback — this marks the data as already-stale at mount time, triggering an immediate background refetch. [VERIFIED: TanStack v5 docs §"Initial Query Data"]
**Warning signs:** Supabase Network tab shows no `/rest/v1/plants` request after first launch; new plants added via re-seed never appear in the app.

### Pitfall 3: ajv Default Import Breaks on Metro / RN 0.76

**What goes wrong:** `import Ajv from 'ajv'` fails with "Default export not found" on Metro.
**Why it happens:** ajv's published `package.json` exports the draft-07 schema by default; draft-2020-12 requires the deep import `ajv/dist/2020` and named export `Ajv2020`.
**How to avoid:** Always use `import Ajv2020 from 'ajv/dist/2020';` — same pattern as `app/src/lib/importValidator.ts` line 6. [VERIFIED: codebase, working pattern from Phase 6]
**Warning signs:** Bundle errors mentioning `ajv/dist/jtd` or "Cannot find module 'ajv'".

### Pitfall 4: `INSERT ... ON CONFLICT(slug) DO UPDATE` Does Not Handle Slug Renames

**What goes wrong:** A plant is renamed in the JSON (`tomate` → `tomate-fleisch`). After re-seed, the OLD `tomate` row remains in DB; a NEW `tomate-fleisch` row is inserted alongside it. Companions still reference the orphaned old id.
**Why it happens:** Upsert keys on `slug`; a renamed slug looks like a brand-new plant.
**How to avoid:**
- **Document in D-17** that slug renames require a manual DB cleanup step. Don't ship a "rename" workflow in v1.
- For the rare case it happens: a follow-up SQL `DELETE FROM plants WHERE slug NOT IN (<current slugs from bundle>)` step is needed. Could be added to the Edge Function as Phase 9+ enhancement, but adds risk (mistakenly delete an in-use plant). Out of scope for Phase 8.
**Warning signs:** Phase 9 Companion-Hinweis shows stale plant data; manual SQL `SELECT slug FROM plants WHERE id NOT IN (SELECT id FROM plants WHERE slug IN (…))` returns orphans.

### Pitfall 5: Companion Self-Reference Bypass Through JSON Layer

**What goes wrong:** JSON has `{ plantASlug: "tomate", plantBSlug: "tomate", relationship: "companion" }` and slips past schema validation; reaches DB; CHECK constraint `plant_a_id < plant_b_id` rejects it; entire transaction aborts; no companions inserted.
**Why it happens:** ajv schema can't easily express "two adjacent string fields must differ" without a `not: { const: ... }` pattern. The DB CHECK is the safety net but causes an all-or-nothing failure.
**How to avoid:**
1. The validator's cross-ref check (Pattern 3) catches this BEFORE the bundle is committed.
2. The Edge Function's pre-INSERT loop skips self-references silently (defense in depth).
3. The DB CHECK is the final wall.
**Warning signs:** Edge Function returns `companions_insert_failed` with PostgreSQL error code `23514` (check_violation).

### Pitfall 6: Bundle JSON Drift Between Build-Time Validation and Edge Function Validation

**What goes wrong:** Smoke tests pass at build time (JSON in shared package valid), but Edge Function fails at runtime because it has an older bundled copy.
**Why it happens:** The `static_files` array bundles JSON at `supabase functions deploy` time. If the developer modifies `plants.json` and only redeploys the app, the Edge Function still has the old bundle.
**How to avoid:**
- D-17 workflow enforces: every JSON edit → `git commit` → run smoke tests → `supabase functions deploy seed-plants --linked` → trigger seed.
- Document this in `supabase/functions/seed-plants/README.md` as the canonical workflow.
- Optional: have the Edge Function compute a SHA-256 of `plants.json` at module init and log it; expose via `GET /seed-plants/version` for verification.
**Warning signs:** App `usePlants()` shows new plants from JSON-bundle, but Supabase queries return old plant list.

### Pitfall 7: Source-License Drift in `data_source` Field

**What goes wrong:** A Gartenplaner-CSV-derived companion pair gets `data_source: "gartenplaner"` literally pasted into JSON, creating an audit trail that we used unclear-license content verbatim.
**Why it happens:** Easy copy-paste from CSV to JSON without going through the "fact re-research" step.
**How to avoid:**
- Treat `data_source` as an ENUM with strict values: `"gardeneus"` (MIT), `"garden-planner"` (MIT), `"own-research"`, `"merged"`. Forbid `"gartenplaner"` as a standalone value — if a Gartenplaner CSV row inspired the entry, the source must be `"own-research"` (because we re-verified) or `"merged:own-research+garden-planner"`.
- Add a JSON Schema `enum` constraint on `dataSource` field with this restricted list.
- Add a Wave-0 test: `expect(allPlants.every(p => ALLOWED_SOURCES.includes(p.dataSource))).toBe(true)`.
**Warning signs:** PR review catches the literal `"gartenplaner"` string in JSON — auto-reject.

### Pitfall 8: Metro Bundles the Full plants.json Even When Tree-Shaking Enabled

**What goes wrong:** Production app bundle size grows by ~50KB.
**Why it happens:** Metro does NOT implement tree-shaking [VERIFIED: [facebook/metro issue #227](https://github.com/facebook/metro/issues/227)]. Even with `EXPO_UNSTABLE_TREE_SHAKING=1`, JSON imports are imported wholesale.
**How to avoid:** Accept it. 50KB is acceptable for a flagship feature. If size becomes a concern in Phase 14, the JSON can be lazy-loaded via dynamic import or moved to an Expo Asset.
**Warning signs:** Bundle-analyzer shows plants.json as a top contributor.

---

## Code Examples

### JSON Schema for `plant-db.v1` (excerpt)

```json
// packages/shared/src/schemas/plant-db.v1.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://spatenstich.app/schemas/plant-db.v1.json",
  "title": "Spatenstich Plant Database v1",
  "description": "Pflanzen-Referenzdatensatz und Mischkultur-Beziehungen für deutsche Kleingärten (Klimazone 7a-8a).",
  "type": "object",
  "required": ["schemaVersion", "plants", "companions"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "const": "plant-db.v1" },
    "plants": {
      "type": "array",
      "minItems": 80,
      "items": { "$ref": "#/$defs/plant" }
    },
    "companions": {
      "type": "array",
      "items": { "$ref": "#/$defs/companion" }
    }
  },
  "$defs": {
    "plant": {
      "type": "object",
      "required": ["slug", "nameDe", "family", "category", "sunRequirement", "waterNeeds", "dataSource"],
      "additionalProperties": false,
      "properties": {
        "slug":            { "type": "string", "pattern": "^[a-z0-9][a-z0-9-]*[a-z0-9]$", "minLength": 2, "maxLength": 64 },
        "nameDe":          { "type": "string", "minLength": 1 },
        "nameAltDe":       { "type": "array", "items": { "type": "string" } },
        "nameBotanical":   { "type": ["string", "null"] },
        "family":          { "type": "string", "minLength": 1 },
        "category":        { "enum": ["Gemüse", "Kraut", "Beere", "Obstbaum", "Blume"] },
        "minSpacingCm":    { "type": ["integer", "null"], "minimum": 1, "maximum": 500 },
        "rowSpacingCm":    { "type": ["integer", "null"], "minimum": 1, "maximum": 500 },
        "depthCm":         { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
        "sunRequirement":  { "enum": ["sonnig", "halb_schattig", "schattig"] },
        "waterNeeds":      { "enum": ["niedrig", "mittel", "hoch"] },
        "climateZoneMin":  { "type": ["integer", "null"], "minimum": 1, "maximum": 11 },
        "climateZoneMax":  { "type": ["integer", "null"], "minimum": 1, "maximum": 11 },
        "sowOutdoorDoyStart": { "type": ["integer", "null"], "minimum": 1, "maximum": 366 },
        "sowOutdoorDoyEnd":   { "type": ["integer", "null"], "minimum": 1, "maximum": 366 },
        "sowIndoorDoyStart":  { "type": ["integer", "null"], "minimum": 1, "maximum": 366 },
        "sowIndoorDoyEnd":    { "type": ["integer", "null"], "minimum": 1, "maximum": 366 },
        "plantDoyStart":   { "type": ["integer", "null"], "minimum": 1, "maximum": 366 },
        "plantDoyEnd":     { "type": ["integer", "null"], "minimum": 1, "maximum": 366 },
        "harvestDoyStart": { "type": ["integer", "null"], "minimum": 1, "maximum": 366 },
        "harvestDoyEnd":   { "type": ["integer", "null"], "minimum": 1, "maximum": 366 },
        "daysToHarvest":   { "type": ["integer", "null"], "minimum": 1, "maximum": 1000 },
        "nitrogenFixing":  { "type": "boolean" },
        "perennial":       { "type": "boolean" },
        "notesDe":         { "type": ["string", "null"] },
        "iconEmoji":       { "type": ["string", "null"], "maxLength": 8 },
        "dataSource":      { "enum": ["gardeneus", "garden-planner", "own-research", "merged"] }
      }
    },
    "companion": {
      "type": "object",
      "required": ["plantASlug", "plantBSlug", "relationship", "source"],
      "additionalProperties": false,
      "properties": {
        "plantASlug":   { "type": "string" },
        "plantBSlug":   { "type": "string" },
        "relationship": { "enum": ["companion", "incompatible", "neutral"] },
        "source":       { "enum": ["gardeneus", "garden-planner", "own-research", "merged"] },
        "notes":        { "type": ["string", "null"] }
      }
    }
  }
}
```

### Sample JSON Bundle Entry (5 plants illustrative)

```json
{
  "schemaVersion": "plant-db.v1",
  "plants": [
    {
      "slug": "tomate",
      "nameDe": "Tomate",
      "nameAltDe": ["Paradeiser", "Liebesapfel"],
      "nameBotanical": "Solanum lycopersicum",
      "family": "Solanaceae",
      "category": "Gemüse",
      "minSpacingCm": 60, "rowSpacingCm": 80, "depthCm": 1,
      "sunRequirement": "sonnig", "waterNeeds": "hoch",
      "climateZoneMin": 6, "climateZoneMax": 9,
      "sowIndoorDoyStart": 60, "sowIndoorDoyEnd": 90,
      "plantDoyStart": 130, "plantDoyEnd": 150,
      "harvestDoyStart": 200, "harvestDoyEnd": 290,
      "daysToHarvest": 75,
      "nitrogenFixing": false, "perennial": false,
      "notesDe": "Sehr wärmeliebend; vor Eisheiligen (15. Mai) nicht ins Freiland.",
      "iconEmoji": "🍅", "dataSource": "merged"
    },
    {
      "slug": "busch-bohne", "nameDe": "Buschbohne", "nameAltDe": [],
      "nameBotanical": "Phaseolus vulgaris", "family": "Fabaceae", "category": "Gemüse",
      "minSpacingCm": 10, "rowSpacingCm": 40, "depthCm": 3,
      "sunRequirement": "sonnig", "waterNeeds": "mittel",
      "climateZoneMin": 6, "climateZoneMax": 9,
      "sowOutdoorDoyStart": 135, "sowOutdoorDoyEnd": 195,
      "harvestDoyStart": 195, "harvestDoyEnd": 270,
      "daysToHarvest": 60,
      "nitrogenFixing": true, "perennial": false,
      "notesDe": "Frostempfindlich; nach Eisheiligen direktsäen.",
      "iconEmoji": "🫛", "dataSource": "gardeneus"
    },
    {
      "slug": "apfel", "nameDe": "Apfel", "nameAltDe": [],
      "nameBotanical": "Malus domestica", "family": "Rosaceae", "category": "Obstbaum",
      "minSpacingCm": 400, "rowSpacingCm": 400, "depthCm": null,
      "sunRequirement": "sonnig", "waterNeeds": "mittel",
      "climateZoneMin": 4, "climateZoneMax": 8,
      "harvestDoyStart": 240, "harvestDoyEnd": 290,
      "daysToHarvest": null, "nitrogenFixing": false, "perennial": true,
      "notesDe": "Mehrjährig. Schnitt im Februar; Mulchen empfohlen.",
      "iconEmoji": "🍎", "dataSource": "own-research"
    },
    {
      "slug": "erdbeere", "nameDe": "Erdbeere", "nameAltDe": ["Gartenerdbeere"],
      "nameBotanical": "Fragaria × ananassa", "family": "Rosaceae", "category": "Beere",
      "minSpacingCm": 30, "rowSpacingCm": 60, "depthCm": 0,
      "sunRequirement": "sonnig", "waterNeeds": "mittel",
      "climateZoneMin": 4, "climateZoneMax": 9,
      "plantDoyStart": 210, "plantDoyEnd": 250,
      "harvestDoyStart": 150, "harvestDoyEnd": 190,
      "daysToHarvest": null, "nitrogenFixing": false, "perennial": true,
      "notesDe": "Mehrjährig. Pflanzung im Spätsommer; alle 3 Jahre umpflanzen.",
      "iconEmoji": "🍓", "dataSource": "merged"
    },
    {
      "slug": "basilikum", "nameDe": "Basilikum", "nameAltDe": ["Königskraut"],
      "nameBotanical": "Ocimum basilicum", "family": "Lamiaceae", "category": "Kraut",
      "minSpacingCm": 20, "rowSpacingCm": 30, "depthCm": 0.5,
      "sunRequirement": "sonnig", "waterNeeds": "mittel",
      "climateZoneMin": 6, "climateZoneMax": 9,
      "sowIndoorDoyStart": 60, "sowIndoorDoyEnd": 105,
      "plantDoyStart": 135, "plantDoyEnd": 165,
      "harvestDoyStart": 165, "harvestDoyEnd": 290,
      "daysToHarvest": 65, "nitrogenFixing": false, "perennial": false,
      "notesDe": "Wärmeliebend; Wuchspaarung mit Tomate klassisch.",
      "iconEmoji": "🌿", "dataSource": "merged"
    }
  ],
  "companions": [
    { "plantASlug": "basilikum", "plantBSlug": "tomate", "relationship": "companion", "source": "merged", "notes": "Klassische Mischkultur; Basilikum vergrämt Weiße Fliege." },
    { "plantASlug": "busch-bohne", "plantBSlug": "tomate", "relationship": "companion", "source": "gardeneus", "notes": "Bohne fixiert Stickstoff; Tomate ist Starkzehrer." }
  ]
}
```

> Note: `companions` entries use **slug pairs**, not UUIDs. The Edge Function resolves slugs → ids at seed time. This keeps the JSON portable (no UUID generation needed at author time) and self-validating (slug-based cross-reference is human-readable).

### Wave-0 Smoke Test Skeleton (D-16)

```typescript
// packages/shared/src/__tests__/plants.smoke.test.ts
import bundle from '../data/plants.json';
import { validatePlantBundle } from '../validators/plant-db-v1';

describe('plants.json — Phase 8 smoke tests', () => {
  it('validates against plant-db.v1 schema (ajv)', () => {
    const result = validatePlantBundle(bundle);
    if (!result.ok) console.error('Validation errors:', result.errors);
    expect(result.ok).toBe(true);
  });

  it('has schemaVersion "plant-db.v1"', () => {
    expect((bundle as any).schemaVersion).toBe('plant-db.v1');
  });

  it('contains at least 80 plants', () => {
    expect((bundle as any).plants.length).toBeGreaterThanOrEqual(80);
  });

  it('every plant has unique slug', () => {
    const slugs = (bundle as any).plants.map((p: any) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every plant has non-empty nameDe + family + category', () => {
    for (const p of (bundle as any).plants) {
      expect(p.nameDe.length).toBeGreaterThan(0);
      expect(p.family.length).toBeGreaterThan(0);
      expect(['Gemüse', 'Kraut', 'Beere', 'Obstbaum', 'Blume']).toContain(p.category);
    }
  });

  // Anker-Tests (D-16):
  it('Tomate has family "Solanaceae"', () => {
    const tomate = (bundle as any).plants.find((p: any) => p.slug === 'tomate');
    expect(tomate?.family).toBe('Solanaceae');
  });

  it('Erdbeere has family "Rosaceae"', () => {
    const e = (bundle as any).plants.find((p: any) => p.slug === 'erdbeere');
    expect(e?.family).toBe('Rosaceae');
  });

  it('Buschbohne is nitrogenFixing', () => {
    const b = (bundle as any).plants.find((p: any) => p.slug === 'busch-bohne');
    expect(b?.nitrogenFixing).toBe(true);
  });

  it('Apfel is perennial', () => {
    const a = (bundle as any).plants.find((p: any) => p.slug === 'apfel');
    expect(a?.perennial).toBe(true);
  });

  it('Tomate-Basilikum is a companion pair', () => {
    const pair = (bundle as any).companions.find((c: any) =>
      (c.plantASlug === 'tomate' && c.plantBSlug === 'basilikum') ||
      (c.plantASlug === 'basilikum' && c.plantBSlug === 'tomate')
    );
    expect(pair).toBeDefined();
    expect(pair.relationship).toBe('companion');
  });

  it('no companion is a self-reference', () => {
    for (const c of (bundle as any).companions) {
      expect(c.plantASlug).not.toBe(c.plantBSlug);
    }
  });

  it('every companion plantASlug + plantBSlug refers to an existing plant', () => {
    const slugs = new Set((bundle as any).plants.map((p: any) => p.slug));
    for (const c of (bundle as any).companions) {
      expect(slugs.has(c.plantASlug)).toBe(true);
      expect(slugs.has(c.plantBSlug)).toBe(true);
    }
  });

  it('every companion pair appears at most once (any direction)', () => {
    const seen = new Set<string>();
    for (const c of (bundle as any).companions) {
      const key = c.plantASlug < c.plantBSlug
        ? `${c.plantASlug}:${c.plantBSlug}`
        : `${c.plantBSlug}:${c.plantASlug}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('every dataSource is one of allowed enums', () => {
    const allowed = new Set(['gardeneus', 'garden-planner', 'own-research', 'merged']);
    for (const p of (bundle as any).plants) {
      expect(allowed.has(p.dataSource)).toBe(true);
    }
  });
});
```

### Workflow: Add new plant `pak-choi`

1. Edit `packages/shared/src/data/plants.json` — add a new entry alphabetically.
2. Run smoke tests: `pnpm --filter @spatenstich/shared exec jest --testPathPattern=plants.smoke`. Must be green.
3. Commit + PR. CI runs the same smoke tests.
4. After merge: `supabase functions deploy seed-plants --linked --debug`.
5. Trigger seed: `curl -X POST -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -d '{"token":"<trigger>"}' "$SUPABASE_URL/functions/v1/seed-plants"`.
6. Verify: `supabase db query --linked "SELECT slug FROM plants WHERE slug = 'pak-choi'"` returns one row.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pl@ntNet client-side plant ID | Manual plant selection from DB + import via Claude.ai project | M07 pivot (2026-05-08) | Phase 8 must own the "Pflanzen-Universum" so users have something to manually select against |
| SQL-embedded seed via INSERT INTO ... VALUES | JSON-bundle + Edge Function with `static_files` | Supabase CLI 2.7.0 (~Q1 2025) | First Phase to use `static_files`; pattern will be reusable for any future static-data Edge Function |
| Companion data stored both directions | Canonical `a < b` storage + UNION query | New for Phase 8 | Halves storage; pair-uniqueness at schema level |
| One-shot SQL migration with embedded data | Migration-only schema + separate idempotent Edge Function for seed | New for Phase 8 | Aligns with D-17 workflow: JSON edits don't require migrations |

**Deprecated/outdated:**
- `expo-sqlite` was earlier considered for local plant cache (CONTEXT.md mentions it briefly). **Skip it.** TanStack Query's in-memory cache + JSON-bundle Cold-Start is sufficient. `expo-sqlite` web alpha + COOP/COEP requirement (CLAUDE.md) means we shouldn't add a third storage layer if not needed.
- The `supabase functions deploy --use-api` Docker-free path is known to have a static-file bundling regression as of late 2025. Stick with Docker-based deploy for Phase 8.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase `static_files` config.toml syntax with `:dest` remap works as documented | Architecture Pattern 2 / Pitfall 1 | First-attempt deploy may need debug + workaround; fallback to `import.meta.url`-resolved path |
| A2 | Edge Function bundle path `./plants.json` is the working directory of the function | Pattern 2 (`Deno.readFile`) | If different path, change to `import.meta.resolve('./plants.json')` or absolute path resolution |
| A3 | `--use-api` deploy without Docker has a static-files regression (still true as of CLI 2.90.0) | Pitfall 1 | If fixed, the Phase 8 deploy can skip Docker requirement — minor convenience |
| A4 | `@supabase/supabase-js@2.49.5` works fine inside Deno runtime (Edge Function context) | Standard Stack | Worktree history shows 2.103.2 was used — both work; pinning to 2.49.5 just matches app version |
| A5 | German plant names + Mischkultur facts from `Gartenplaner` CSV are uncopyrightable facts (only the curated CSV layout is copyrighted) | Source-License Hygiene | Conservative interpretation already; if challenged, fall back to pure own-research from `keep-it-gruen.de`, `meine-ernte.de`, `permakultur-plattform.de` (all CC- or public-domain-licensed gardening articles) |
| A6 | Mitteldeutschland DOY-Werte (Tomate Freilandpflanzung ~135-150 DOY = mid-May) are reasonable defaults | JSON sample data | Phase 10 will refine per-klimazone; v1 defaults are explicitly listed as "Mitteldeutschland-Standardwerte" so user expectation is set |
| A7 | TanStack Query `initialDataUpdatedAt: 0` triggers immediate refetch (not deferred) | Pattern 4 | Verified in docs but not in our exact use case; if behavior differs, add explicit `refetch()` call on mount |
| A8 | 50KB JSON-bundle is acceptable bundle-size impact | Pitfall 8 / D-11 | If unacceptable, ship as Expo Asset (lazy) — but adds one async layer at startup |
| A9 | Supabase Edge Function can return synchronously within 25-second function timeout for upsert of 100-120 rows + 200-300 companion rows | Pattern 2 | Realistic; supabase-js batch upsert of <1000 rows is sub-second [VERIFIED: docs]. But cold-start adds ~1-2s. |
| A10 | The `--linked` migration push pattern from Phase 7 P06 works unchanged | Pattern 1 / D-15 | Same project ref, same auth, same supabase CLI binary — should be identical |

**Mitigation:** A1, A2, A3 are the highest-risk assumptions. The plan should include a Wave 3 task that explicitly runs a `supabase functions deploy seed-plants --debug` and inspects the bundle manifest BEFORE attempting to invoke the function. If `plants.json` is not in the bundle, do not proceed to migration push.

---

## Open Questions

1. **Should the Edge Function emit a `seed_runs` audit log row?**
   - What we know: D-17 specifies the seed workflow but doesn't require an audit log. The function could write to a new `seed_runs(id, ran_at, sha256, plants_count, companions_count, ran_by_user_id)` table.
   - What's unclear: Whether Dirk needs to know "when was the last successful seed run" outside of git history.
   - Recommendation: **Skip in v1.** Git history of `plants.json` + Edge Function deploy log give traceability. Add `seed_runs` only if a debugging need surfaces.

2. **Should the JSON bundle include companion-pair `notes` in German or English?**
   - What we know: D-08 says `notes` is optional free-text.
   - What's unclear: Are these notes ever shown to the user? Phase 9 Companion-Hinweis spec doesn't explicitly mention them.
   - Recommendation: **German** by default, since they may surface in Phase 9 banner or hover-tooltip. Consistent with all other German-text fields.

3. **Should `searchPlants(query)` use Postgres full-text search or simple ILIKE?**
   - What we know: D-09 says "fuzzy match". Postgres has `pg_trgm` and `tsvector` but neither is enabled by default in our Supabase project.
   - What's unclear: Will ILIKE on 120 rows perform acceptably? Probably yes (it's <1ms either way at this size).
   - Recommendation: **ILIKE in Phase 8.** Defer pg_trgm or tsvector setup to Phase 13 (when Saatgut-Inventar autocomplete needs sub-100ms response over a larger universe).

4. **Should the Edge Function be triggered by a manual `curl` (D-17 implies this) or by a scheduled cron?**
   - What we know: D-17 says "manuell triggern".
   - What's unclear: Could a `pg_cron` job trigger it daily for free without harm (idempotent anyway)?
   - Recommendation: **Manual only in v1.** Cron adds complexity (`pg_cron` extension, scheduling syntax) for no clear benefit. The data doesn't change without a human edit anyway.

5. **Should the canonical `data_source` enum include a distinct "merged" sub-enum?**
   - What we know: D-06 lists `"merged"` as a valid value but doesn't specify sub-format.
   - What's unclear: Is `"merged:gardeneus+own-research"` more useful than just `"merged"`?
   - Recommendation: **Start with bare `"merged"`** for v1. If during data curation the audit trail needs more granularity, switch to sub-format in the JSON schema (no DB migration needed since `data_source` is a free `text` column at DB level).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Migration push + Edge Function deploy | ✓ | 2.90.0 (local) | — |
| Docker Desktop (Windows) | `supabase functions deploy seed-plants` static_files bundling (Pitfall 1) | **MUST VERIFY** | unknown | Use `--use-api` if Docker unavailable + fall back to `import.meta.url` path resolution if static_files don't bundle |
| Node.js | jest + ajv build-time validation | ✓ | 24.14.0 (above engines >=22) | — |
| pnpm | Workspace tooling | ✓ | 10.33.0 | — |
| Deno runtime | Local Edge Function testing (optional) | not verified | — | Deploy directly to Supabase; debug via remote logs |
| `npm view` access | Version verification | ✓ | network reachable | — |
| Supabase project access (vitrqkzxkiqvadqfzrcx, Frankfurt) | Migration push + function deploy + seed trigger | assumed ✓ | — | `SUPABASE_ACCESS_TOKEN` env var as fallback per Phase 7 P06 pattern |

**Missing dependencies with no fallback:**
- None that block. Docker is the only "could-be-missing" piece, and even there `--use-api` may work or a `fetch(new URL(...))`-based fallback can replace `static_files`.

**Missing dependencies with fallback:**
- Docker: see Pitfall 1.

---

## Validation Architecture

> nyquist_validation is enabled (workflow.nyquist_validation defaults to true; not set false in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + ts-jest 29.1.2 (Node env for shared package; multi-project setup in `app/`) |
| Config file | `packages/shared/jest.config.ts` (existing) + new tests dropped into `packages/shared/src/__tests__/` and `packages/shared/src/validators/__tests__/` |
| Quick run command | `pnpm --filter @spatenstich/shared exec jest --testPathPattern=plants` |
| Full suite command | `pnpm -r run test --passWithNoTests` |
| Note (CLAUDE.md pitfall) | NEVER use `pnpm test --` followed by jest args — the `--` arg-passing has issues with pnpm; use `pnpm --filter <pkg> exec jest <args>` instead |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PLANT-DB-01 | plants.json contains ≥80 plants with required fields | unit (smoke) | `pnpm --filter @spatenstich/shared exec jest plants.smoke` | ❌ Wave 0 |
| PLANT-DB-02 | companions stored canonical, no self-refs, no duplicates | unit (smoke) | `pnpm --filter @spatenstich/shared exec jest plants.smoke -t "canonical\|self\|duplicate"` | ❌ Wave 0 |
| PLANT-DB-03 | JSON validates against plant-db.v1 ajv schema | unit | `pnpm --filter @spatenstich/shared exec jest plant-db-v1.test` | ❌ Wave 0 |
| PLANT-DB-04 | RLS policies exist after Migration 019 | integration (pgTAP) | new `supabase/tests/plants_rls.sql` + `supabase db test --linked` | ❌ Wave 1 |
| PLANT-DB-05 | Edge Function `seed-plants` returns 200 + correct counts | manual (Wave 3 push gate) | `curl -X POST .../seed-plants` + assert response shape | ❌ Wave 3 / human-verify |
| PLANT-DB-06 | usePlants() returns initialData from bundle synchronously, then refetches | unit (hooks project in app/) | `pnpm --filter app exec jest --selectProjects hooks usePlants` | ❌ Wave 3 |
| PLANT-DB-07 | plantRepo.loadCompanionsFor returns symmetric results regardless of query direction | unit (hooks project) | `pnpm --filter app exec jest --selectProjects hooks plantRepo` | ❌ Wave 3 |
| PLANT-DB-08 | Anker-Tests (Tomate=Solanaceae, etc.) | unit (smoke) | `pnpm --filter @spatenstich/shared exec jest plants.smoke -t "Tomate\|Erdbeere\|Buschbohne\|Apfel\|Basilikum"` | ❌ Wave 0 |
| PLANT-DB-09 | Every dataSource in allowed enum | unit (smoke) | `pnpm --filter @spatenstich/shared exec jest plants.smoke -t "dataSource"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @spatenstich/shared exec jest --testPathPattern=plants` (smoke + validator tests) — runs in <2 seconds, no DB dependency.
- **Per wave merge:** `pnpm -r run test --passWithNoTests` — full monorepo test suite must be green.
- **Phase gate:** Full suite green AND `supabase migration list --linked` shows Migration 019 in both Local and Remote columns AND `seed-plants` Edge Function returns `{ ok: true, plantsCount: ≥80 }` on POST.

### Wave 0 Gaps

- [ ] `packages/shared/src/schemas/plant-db.v1.json` — JSON Schema definition file (covers PLANT-DB-03)
- [ ] `packages/shared/src/validators/plant-db-v1.ts` — ajv compile + cross-ref validator (covers PLANT-DB-03)
- [ ] `packages/shared/src/validators/__tests__/plant-db-v1.test.ts` — validator unit tests (happy path + bad-input rejections)
- [ ] `packages/shared/src/__tests__/plants.smoke.test.ts` — full smoke suite (covers PLANT-DB-01, -02, -08, -09)
- [ ] `packages/shared/src/data/plants.json` — initial stub file with `schemaVersion` + empty arrays so tests can run RED in Wave 0 (then GREEN once data is filled in W2)
- [ ] `packages/shared/src/types/plants.ts` — PlantRow + PlantCompanionRow interfaces (covers D-08 typing)
- [ ] `packages/shared/src/index.ts` — re-export PlantRow types
- [ ] `packages/shared/package.json` — add `"./data/plants": "./src/data/plants.json"` to exports field (so app can import bundle)
- [ ] `packages/shared/package.json` — add `ajv@8.20.0` + `ajv-formats@3.0.1` to deps
- [ ] `supabase/tests/plants_rls.sql` — pgTAP-style test for RLS read policies (covers PLANT-DB-04)

---

## Sources

### Primary (HIGH confidence)

- **Codebase patterns:**
  - `supabase/migrations/20260504000014_garden_plan.sql` — CREATE TABLE + RLS + invariant pattern (verified)
  - `supabase/migrations/20260513000018_plan_elements_layer.sql` — DO-block invariants + section dividers (verified)
  - `app/src/lib/importValidator.ts` — ajv Ajv2020 + ajv-formats pattern (verified)
  - `app/src/lib/gardenPlanRepo.ts` — Repo function shape (verified)
  - `packages/shared/jest.config.ts` — Test config pattern (verified)
  - `.claude/worktrees/agent-a3038016/supabase/functions/extract-vereinsregeln/index.ts` — Edge Function deno.json + Deno.serve + service-role client pattern (verified; function was later removed in M07 cleanup, but the pattern is intact and reusable)
  - `.planning/phases/06-import-flow-companion-prompt-m07-3-m07-4/06-RESEARCH.md` — Confirmed ajv 8.20.0 + ajv-formats 3.0.1 from prior research
  - `.planning/phases/07-plan-editor-drafts-integration-m2-m07-5/07-06-PLAN.md` — Migration-push 3-gate pattern (verified)
- **Supabase docs:**
  - [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions) — runtime, deploy
  - [Static files in Edge Functions changelog](https://supabase.com/changelog/32815-add-static-files-to-edge-functions) — confirms CLI 2.7.0 required, config.toml syntax
  - [Deploy to Production](https://supabase.com/docs/guides/functions/deploy) — `--use-api` flag, `SUPABASE_ACCESS_TOKEN`, project-ref usage
  - [Managing dependencies in Edge Functions](https://supabase.com/docs/guides/functions/dependencies) — `npm:` and `jsr:` import prefixes required
- **npm registry (verified 2026-05-12):**
  - `npm view ajv version` → 8.20.0
  - `npm view ajv-formats version` → 3.0.1
  - `npm view @supabase/supabase-js version` → 2.105.4 (latest); 2.49.5 pinned in app per CLAUDE.md
- **TanStack Query docs:** [Initial Query Data v5](https://tanstack.com/query/v5/docs/framework/react/guides/initial-query-data) — `initialData` + `initialDataUpdatedAt` pattern

### Secondary (MEDIUM confidence)

- [Supabase Discussion #32815 — Static Files in Edge Functions](https://github.com/orgs/supabase/discussions/32815) — confirms `--use-api` bundling caveat
- [PostgreSQL `jsonb_to_recordset` + `ON CONFLICT` pattern](https://wiki.postgresql.org/wiki/What%27s_new_in_PostgreSQL_9.5) — alternative seed pattern (rejected)
- German Mischkultur sources for re-research (NOT for copy):
  - [Permakultur-Plattform: Mischkultur mit Tomaten](https://permakultur-plattform.de/tipps-mischkultur-mit-tomaten/)
  - [OBI: Welche Pflanzen vertragen sich](https://www.obi.de/magazin/garten/pflanzen/gemuesepflanzen/welche-pflanzen-vertragen-sich-tabelle)
  - [Wurzelwerk: Mischkultur-Partner für Tomaten](https://www.wurzelwerk.net/gemuesegarten/tomaten/mischkultur-tomaten/)
  - [Kleingartenkompendium: Anbauplan & Mischkultur](https://www.kleingartenkompendium.de/Kleingarten-Praxis/anbauplan-mischkultur-leitfaden-gemuesebeet)

### Tertiary (LOW confidence, flagged for validation)

- [facebook/metro Issue #227 — Tree Shaking](https://github.com/facebook/metro/issues/227) — used to justify "don't worry about bundle size optimization in Phase 8"; status of tree-shaking may have changed
- Edge Function 25-second timeout claim — based on general knowledge; not specifically verified against current Supabase docs

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — every library is already in lockfile or has a working precedent in the codebase. Versions cross-verified via `npm view`.
- **Architecture (Migration 019, Edge Function, Hook):** HIGH — three independent patterns from prior phases combined; no new architectural primitives.
- **Static-file Edge Function bundling:** MEDIUM — feature is documented and CLI version supports it, but specific path-remap syntax has [ASSUMED] tag; first deploy is a validation step.
- **Companion-relationship data quality:** MEDIUM — sources disagree often; conservative `'neutral'` fallback (D-07) is the principled approach but means Phase 9 will show fewer banners than maximally helpful.
- **TanStack `initialDataUpdatedAt: 0` behavior:** HIGH — documented and consistent with TanStack v5 design.
- **Pitfalls (Pitfall 1 specifically):** MEDIUM — based on a discussion thread, may have been fixed in newer CLI; verify on first deploy.

**Research date:** 2026-05-12
**Valid until:** 2026-06-11 (30 days — stack is stable; only Supabase Edge Function CLI behavior moves)

## RESEARCH COMPLETE
