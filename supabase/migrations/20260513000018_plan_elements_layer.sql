-- Phase 7 Plan 02: plan_elements.layer for two-layer editor (infrastructure | seasonal)
-- Provides: layer column with CHECK + default + backfill of plant rows
-- Follows: Migration 017 pattern (DO-block invariants, ALTER ADD COLUMN IF NOT EXISTS)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.

-- ──────────────────────────────────────────────────────────────
-- Section 1 — Add layer column with default + CHECK constraint
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.plan_elements
  ADD COLUMN IF NOT EXISTS layer text NOT NULL DEFAULT 'infrastructure';

-- CHECK constraint (added separately so re-runs of migration are safe on retries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'plan_elements_layer_check'
  ) THEN
    ALTER TABLE public.plan_elements
      ADD CONSTRAINT plan_elements_layer_check
      CHECK (layer IN ('infrastructure','seasonal'));
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- Section 2 — Backfill: promote existing plant rows from infrastructure → seasonal
-- ──────────────────────────────────────────────────────────────

UPDATE public.plan_elements
   SET layer = 'seasonal'
 WHERE element_type = 'Pflanze'
   AND deleted_at IS NULL
   AND layer = 'infrastructure';

-- ──────────────────────────────────────────────────────────────
-- Section 3 — Invariants (raise if schema state is wrong)
-- ──────────────────────────────────────────────────────────────

DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_elements' AND column_name = 'layer';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_018_invariant: layer column missing on plan_elements';
  END IF;

  SELECT count(*) INTO cnt FROM information_schema.check_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'plan_elements_layer_check';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_018_invariant: layer CHECK constraint missing';
  END IF;

  RAISE NOTICE 'migration_018 ok: plan_elements.layer added with CHECK + plant backfill';
END $$;
