-- Phase 6 Plan 01 Task 02: imports + import_items + bed_drafts + plant_drafts + observation_drafts
-- Provides: 5 draft tables for import flow (M07.4) + RLS + indexes
-- Follows: Migration 014 pattern (sections, RLS, zz_set_updated_at trigger)
-- NOTE: NO LWW triggers (drafts are write-once per D-19). No aa_lww_guard, no mm_set_updated_by.
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.

-- ──────────────────────────────────────────────────────────────
-- Section 1 — imports: Import-Header, one row per JSON payload received
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.imports (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id              uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  source                 text NOT NULL DEFAULT 'claude-ai-project',
  imported_at            timestamptz NOT NULL,
  chat_reference         text,
  payload_schema_version text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id     uuid REFERENCES auth.users(id),
  deleted_at             timestamptz
);

CREATE INDEX IF NOT EXISTS idx_imports_garden_id ON public.imports (garden_id) WHERE deleted_at IS NULL;

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imports_member_all" ON public.imports
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));

CREATE TRIGGER zz_set_updated_at_imports BEFORE UPDATE ON public.imports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Section 2 — import_items: Detail rows, one per entity in the payload
-- Write-once (no updated_at, no LWW triggers)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.import_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id   uuid NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
  garden_id   uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  item_type   text NOT NULL CHECK (item_type IN ('bed','plant','observation')),
  local_id    text NOT NULL,
  payload     jsonb NOT NULL,
  confidence  double precision,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_import_items_import_id ON public.import_items (import_id) WHERE deleted_at IS NULL;

ALTER TABLE public.import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_items_member_all" ON public.import_items
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));

-- ──────────────────────────────────────────────────────────────
-- Section 3 — bed_drafts: Imported bed entities awaiting promotion
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.bed_drafts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_item_id     uuid NOT NULL REFERENCES public.import_items(id) ON DELETE CASCADE,
  garden_id          uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  label              text NOT NULL,
  length_cm          double precision,
  width_cm           double precision,
  sun_exposure       text,
  soil_notes         text,
  confidence         double precision,
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','promoted','dismissed')),
  promoted_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid REFERENCES auth.users(id),
  deleted_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bed_drafts_garden_id ON public.bed_drafts (garden_id) WHERE deleted_at IS NULL;

ALTER TABLE public.bed_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bed_drafts_member_all" ON public.bed_drafts
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));

CREATE TRIGGER zz_set_updated_at_bed_drafts BEFORE UPDATE ON public.bed_drafts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Section 4 — plant_drafts: Imported plant entities awaiting promotion
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.plant_drafts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_item_id     uuid NOT NULL REFERENCES public.import_items(id) ON DELETE CASCADE,
  garden_id          uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  bed_draft_id       uuid REFERENCES public.bed_drafts(id),
  scientific_name    text,
  common_name_de     text NOT NULL,
  stage_estimate     text,
  health_notes       text,
  confidence         double precision,
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','promoted','dismissed')),
  promoted_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid REFERENCES auth.users(id),
  deleted_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_plant_drafts_garden_id ON public.plant_drafts (garden_id) WHERE deleted_at IS NULL;

ALTER TABLE public.plant_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_drafts_member_all" ON public.plant_drafts
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));

CREATE TRIGGER zz_set_updated_at_plant_drafts BEFORE UPDATE ON public.plant_drafts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Section 5 — observation_drafts: Imported observations awaiting promotion
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.observation_drafts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_item_id     uuid NOT NULL REFERENCES public.import_items(id) ON DELETE CASCADE,
  garden_id          uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  bed_ref_local_id   text,
  kind               text NOT NULL CHECK (kind IN ('pest','disease','weather','soil','structural','other')),
  summary            text NOT NULL,
  suggested_actions  text[],
  confidence         double precision,
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','promoted','dismissed')),
  promoted_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid REFERENCES auth.users(id),
  deleted_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_observation_drafts_garden_id ON public.observation_drafts (garden_id) WHERE deleted_at IS NULL;

ALTER TABLE public.observation_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "observation_drafts_member_all" ON public.observation_drafts
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));

CREATE TRIGGER zz_set_updated_at_observation_drafts BEFORE UPDATE ON public.observation_drafts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Section 6 — Post-migration Invariant-Assertions
-- ──────────────────────────────────────────────────────────────
DO $$ DECLARE cnt int;
BEGIN
  -- Assertion 1: imports table exists
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'imports' AND c.relkind = 'r';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_016_invariant: imports table missing';
  END IF;

  -- Assertion 2: import_items table exists
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'import_items' AND c.relkind = 'r';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_016_invariant: import_items table missing';
  END IF;

  -- Assertion 3: bed_drafts table exists
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'bed_drafts' AND c.relkind = 'r';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_016_invariant: bed_drafts table missing';
  END IF;

  -- Assertion 4: plant_drafts table exists
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'plant_drafts' AND c.relkind = 'r';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_016_invariant: plant_drafts table missing';
  END IF;

  -- Assertion 5: observation_drafts table exists
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'observation_drafts' AND c.relkind = 'r';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_016_invariant: observation_drafts table missing';
  END IF;

  -- Assertion 6: All 5 RLS policies exist
  SELECT count(*) INTO cnt FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'imports_member_all',
        'import_items_member_all',
        'bed_drafts_member_all',
        'plant_drafts_member_all',
        'observation_drafts_member_all'
      );
  IF cnt <> 5 THEN
    RAISE EXCEPTION 'migration_016_invariant: expected 5 RLS policies, got %', cnt;
  END IF;

  -- Assertion 7: RLS enabled on all 5 tables
  SELECT count(*) INTO cnt FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname IN ('imports','import_items','bed_drafts','plant_drafts','observation_drafts')
      AND c.relrowsecurity = true;
  IF cnt <> 5 THEN
    RAISE EXCEPTION 'migration_016_invariant: expected 5 tables with RLS enabled, got %', cnt;
  END IF;

  RAISE NOTICE 'migration_016 ok: imports + import_items + bed_drafts + plant_drafts + observation_drafts + RLS applied';
END $$;
