-- Phase 5 Plan 01 Task 1: AI-Tabellen und pgmq-Queue entfernen
-- Provides: DROP ai_results, ai_jobs, pgmq.ai_jobs-Queue
-- Follows: Migration 014 pattern (Kommentar, Sektionen, DO $$ Invariant-Block)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.

-- ──────────────────────────────────────────────────────────────
-- Section 1 — RLS-Policies entfernen
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_results_creator_read" ON public.ai_results;
DROP POLICY IF EXISTS "ai_results_insert_service" ON public.ai_results;
DROP POLICY IF EXISTS "ai_jobs_creator_insert" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_creator_read" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_update_service" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_member_insert" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_member_read" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_results_member_read" ON public.ai_results;

-- ──────────────────────────────────────────────────────────────
-- Section 2 — Tabellen droppen (ai_results zuerst wegen FK auf ai_jobs)
-- ──────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.ai_results CASCADE;
DROP TABLE IF EXISTS public.ai_jobs CASCADE;

-- ──────────────────────────────────────────────────────────────
-- Section 3 — pgmq-Queue loeschen (D-05: Extension kann bleiben)
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgmq') THEN
    PERFORM pgmq.drop_queue('ai_jobs', true);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- Section 4 — Post-migration Invariant-Assertions
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name IN ('ai_jobs','ai_results')) THEN
    RAISE EXCEPTION 'phase5_invariant: ai tables still exist after drop';
  END IF;
  RAISE NOTICE 'phase5 migration ok: ai_jobs + ai_results + pgmq queue removed';
END $$;
