-- Phase 2.5 / Migration 007 — CR-01: ai_jobs/ai_results per-creator isolation
-- Background:
--   Migration 004 setzte ai_jobs_member_insert / ai_jobs_member_read /
--   ai_results_member_read auf reinen `is_garden_member(garden_id)` Check.
--   Damit kann User B in einem geteilten 2-Member-Garten:
--     1. ai_jobs-Rows mit created_by_user_id = <user_a> inserten →
--        verbrennt User A's AI-Budget (50 Calls/Tag Soft, 200 Hard).
--     2. Die Payloads fremder Jobs (Foto-Analysen, Claude-Responses mit
--        sensiblen Geo-Daten) lesen — implizite Daten-Exfiltration zwischen
--        den beiden Nutzern.
--
--   Threat-Model-Update: AI-Jobs sind per-creator isoliert, NICHT
--   per-garden-shared. Vereinsregeln + Plan-Daten bleiben member-geteilt
--   (das ist das Kern-Feature), aber individual-verursachte AI-Calls
--   bleiben bei ihrem Urheber. Dirks Frau soll z. B. nicht Dirks
--   AI-Foto-Analysen sehen und umgekehrt.
--
-- Fix:
--   INSERT-Policy zusätzlich auf created_by_user_id = auth.uid() binden.
--   SELECT-Policies auf created_by_user_id = auth.uid() binden.
--   (Service-Role-Policies ai_jobs_update_service / ai_results_insert_service
--    bleiben unverändert — Edge-Function-Writer brauchen keinen User-Scope.)
--
-- Atomicity: Supabase wraps file in implicit transaction.

-- ──────────────────────────────────────────────────────────────
-- ai_jobs: INSERT + SELECT nur für den eigentlichen Creator
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_jobs_member_insert" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_member_read" ON public.ai_jobs;

CREATE POLICY "ai_jobs_creator_insert" ON public.ai_jobs FOR INSERT
  WITH CHECK (
    public.is_garden_member(garden_id)
    AND created_by_user_id = (select auth.uid())
  );

CREATE POLICY "ai_jobs_creator_read" ON public.ai_jobs FOR SELECT
  USING (
    public.is_garden_member(garden_id)
    AND created_by_user_id = (select auth.uid())
  );

-- ──────────────────────────────────────────────────────────────
-- ai_results: SELECT nur für den Creator des zugehörigen Jobs
-- ──────────────────────────────────────────────────────────────
-- ai_results hat keine eigene created_by_user_id-Spalte — die Row gehört
-- semantisch zu dem ai_jobs-Row, der sie erzeugt hat (1:1 via job_id FK).
-- Wir binden die Policy über einen EXISTS-Join an ai_jobs.created_by_user_id.
-- is_garden_member bleibt als Defense-in-Depth (double check) für den Fall,
-- dass ai_jobs und ai_results in unterschiedlichen Gärten landen würden
-- (das sollte nicht passieren, aber die RLS darf das nicht stillschweigend
-- erlauben).
DROP POLICY IF EXISTS "ai_results_member_read" ON public.ai_results;

CREATE POLICY "ai_results_creator_read" ON public.ai_results FOR SELECT
  USING (
    public.is_garden_member(garden_id)
    AND EXISTS (
      SELECT 1 FROM public.ai_jobs j
      WHERE j.id = ai_results.job_id
        AND j.created_by_user_id = (select auth.uid())
    )
  );

-- ──────────────────────────────────────────────────────────────
-- Post-migration invariant: neue Policies existieren
-- ──────────────────────────────────────────────────────────────
do $$
declare cnt int;
begin
  select count(*) into cnt from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_jobs'
      and policyname in ('ai_jobs_creator_insert','ai_jobs_creator_read');
  if cnt <> 2 then
    raise exception 'migration_007_invariant: ai_jobs creator policies missing (found %)', cnt;
  end if;

  select count(*) into cnt from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_results'
      and policyname = 'ai_results_creator_read';
  if cnt <> 1 then
    raise exception 'migration_007_invariant: ai_results_creator_read policy missing';
  end if;

  raise notice 'migration_007 ok: ai_jobs + ai_results per-creator isolation applied';
end $$;
