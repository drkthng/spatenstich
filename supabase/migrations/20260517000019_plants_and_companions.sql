-- Phase 8 Plan 02: plants + plant_companions tables (global plant reference DB)
-- Provides: 2 read-only tables + 2 RLS policies + 4 indices + DO-block invariants
-- Follows: Migration 018 pattern (DO-block invariants, section dividers, RAISE NOTICE summary)
--          Migration 014 pattern (CREATE TABLE + RLS shape)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.
--
-- DESIGN NOTES (08-CONTEXT D-01..D-04):
-- - Read-only for clients (RLS USING auth.uid() IS NOT NULL, no WRITE policies)
-- - No LWW triggers (data is service-role-managed via seed-plants Edge Function)
-- - No garden_id (global reference DB, not per-garden)
-- - plant_companions stores canonical (plant_a_id < plant_b_id); query layer UNIONs

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

CREATE INDEX IF NOT EXISTS idx_plants_family    ON public.plants (family);
CREATE INDEX IF NOT EXISTS idx_plants_category  ON public.plants (category);

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plants_read_authenticated" ON public.plants
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
-- No INSERT/UPDATE/DELETE policy: clients cannot mutate. Only service-role
-- (Edge Function) writes — service-role bypasses RLS by design.

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
  CONSTRAINT plant_companions_canonical_check CHECK (plant_a_id < plant_b_id)
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
        'plant_companions_canonical_check'
      );
  IF cnt < 5 THEN
    RAISE EXCEPTION 'migration_019_invariant: expected >=5 CHECK constraints, got %', cnt;
  END IF;

  RAISE NOTICE 'migration_019 ok: plants + plant_companions + RLS + CHECKs applied';
END $$;
