-- Phase 4 Plan 01 Task 01: garden_dimensions + plan_elements tables
-- Provides: DB schema for garden_dimensions + plan_elements + RLS + LWW triggers
-- Follows: Migration 013 pattern (RLS + LWW-Trigger-Trio: aa_/mm_/zz_)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.

-- ──────────────────────────────────────────────────────────────
-- Section 1 — garden_dimensions: Grundform + Masse (eine Row pro Garten)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.garden_dimensions (
  id                 uuid primary key default gen_random_uuid(),
  garden_id          uuid not null references public.gardens(id) on delete cascade,
  shape              text not null check (shape in ('rectangle','l_shape','trapezoid','freehand')),
  width_m            double precision not null,
  height_m           double precision not null,
  extra_dims         jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id),
  deleted_at         timestamptz,
  UNIQUE(garden_id)
);

CREATE INDEX IF NOT EXISTS idx_garden_dimensions_garden_id
  ON public.garden_dimensions (garden_id) WHERE deleted_at IS NULL;

ALTER TABLE public.garden_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "garden_dimensions_member_all" ON public.garden_dimensions
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));

-- LWW + updated_by + updated_at Trigger-Trio (aa_ < mm_ < zz_):
CREATE TRIGGER aa_lww_guard_garden_dimensions BEFORE UPDATE ON public.garden_dimensions
  FOR EACH ROW EXECUTE FUNCTION public.tg_lww_guard();
CREATE TRIGGER mm_set_updated_by_user_id_garden_dimensions BEFORE UPDATE ON public.garden_dimensions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_by_user_id();
CREATE TRIGGER zz_set_updated_at_garden_dimensions BEFORE UPDATE ON public.garden_dimensions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Section 2 — plan_elements: bestaetigt Elemente aus Claude Vision Analyse
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_elements (
  id                 uuid primary key default gen_random_uuid(),
  garden_id          uuid not null references public.gardens(id) on delete cascade,
  ai_result_id       uuid references public.ai_results(id) on delete set null,
  element_type       text not null,
  label              text not null,
  x_m                double precision not null,
  y_m                double precision not null,
  width_m            double precision not null,
  height_m           double precision not null,
  confidence         text,
  is_accepted        boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id),
  deleted_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_plan_elements_garden_id
  ON public.plan_elements (garden_id) WHERE deleted_at IS NULL;

ALTER TABLE public.plan_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_elements_member_all" ON public.plan_elements
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));

-- LWW + updated_by + updated_at Trigger-Trio:
CREATE TRIGGER aa_lww_guard_plan_elements BEFORE UPDATE ON public.plan_elements
  FOR EACH ROW EXECUTE FUNCTION public.tg_lww_guard();
CREATE TRIGGER mm_set_updated_by_user_id_plan_elements BEFORE UPDATE ON public.plan_elements
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_by_user_id();
CREATE TRIGGER zz_set_updated_at_plan_elements BEFORE UPDATE ON public.plan_elements
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Section 3 — Post-migration Invariant-Assertions
-- ──────────────────────────────────────────────────────────────
DO $$ DECLARE cnt int;
BEGIN
  -- Assertion 1: garden_dimensions table exists
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
    WHERE n.nspname='public' AND c.relname='garden_dimensions' AND c.relkind='r';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_014_invariant: garden_dimensions table missing';
  END IF;

  -- Assertion 2: plan_elements table exists
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
    WHERE n.nspname='public' AND c.relname='plan_elements' AND c.relkind='r';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_014_invariant: plan_elements table missing';
  END IF;

  -- Assertion 3: RLS policies exist (2 new policies)
  SELECT count(*) INTO cnt FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN ('garden_dimensions_member_all', 'plan_elements_member_all');
  IF cnt <> 2 THEN
    RAISE EXCEPTION 'migration_014_invariant: expected 2 RLS policies, got %', cnt;
  END IF;

  -- Assertion 4: LWW triggers (6 total: 3 per table)
  SELECT count(*) INTO cnt FROM pg_trigger
    WHERE tgname LIKE 'aa_lww_guard_garden_%' OR tgname LIKE 'aa_lww_guard_plan_%';
  IF cnt < 2 THEN
    RAISE EXCEPTION 'migration_014_invariant: expected >=2 aa_lww_guard triggers for new tables, got %', cnt;
  END IF;

  RAISE NOTICE 'migration_014 ok: garden_dimensions + plan_elements + RLS + LWW applied';
END $$;
