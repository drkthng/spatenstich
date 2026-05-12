-- Phase 6.5 Plan 02 Task 01: plan_elements.imported_from + provenance
-- Provides: Provenance link from plan_elements back to import_items (DRAFT-02)
-- Follows: Migration 014 pattern (sections, DO-block invariants, partial index on deletedAt IS NULL)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.

-- ──────────────────────────────────────────────────────────────
-- Section 1 — Add provenance columns to plan_elements
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.plan_elements
  ADD COLUMN IF NOT EXISTS imported_from uuid REFERENCES public.import_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provenance    jsonb;

CREATE INDEX IF NOT EXISTS idx_plan_elements_imported_from
  ON public.plan_elements (imported_from)
  WHERE imported_from IS NOT NULL AND deleted_at IS NULL;

-- ──────────────────────────────────────────────────────────────
-- Section 2 — Drop legacy ai_result_id (orphaned by Migration 015 CASCADE drop of ai_results)
-- The column may already be gone if Postgres removed it via CASCADE; DROP IF EXISTS is safe in both cases.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.plan_elements DROP COLUMN IF EXISTS ai_result_id;

-- ──────────────────────────────────────────────────────────────
-- Section 3 — Invariants (raise if schema state is wrong)
-- ──────────────────────────────────────────────────────────────

DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_elements'
      AND column_name IN ('imported_from', 'provenance');
  IF cnt <> 2 THEN
    RAISE EXCEPTION 'migration_017_invariant: expected 2 new cols on plan_elements, got %', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_elements' AND column_name = 'ai_result_id';
  IF cnt <> 0 THEN
    RAISE EXCEPTION 'migration_017_invariant: ai_result_id should be dropped, still present';
  END IF;

  RAISE NOTICE 'migration_017 ok: plan_elements.imported_from + provenance added; ai_result_id dropped';
END $$;
