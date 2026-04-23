-- Phase 2.5 / Migration 004 — Fix RLS Infinite Recursion (Rule-1 bug fix for Migration 003)
-- Background:
--   Migration 003 introduced member-check RLS policies that reference
--   public.garden_members from policies ON public.garden_members itself
--   (garden_members_member_select USING subquery on garden_members gm2).
--   Postgres evaluates subqueries under the caller's RLS context → infinite
--   recursion (ERRCODE 42P17 "infinite recursion detected in policy").
--
-- Fix:
--   Introduce two SECURITY DEFINER helper functions that bypass RLS:
--     public.is_garden_member(uuid) → boolean
--     public.is_garden_owner(uuid)  → boolean
--   Rewrite every policy that previously subquery-joined garden_members to
--   use these helpers instead. Helpers run with function owner (postgres) +
--   SET search_path = public, pg_temp so they cannot be hijacked.
--
-- Affected policies (dropped + recreated via helpers):
--   gardens_member_select, gardens_member_update, gardens_owner_delete
--   garden_members_member_select, garden_members_owner_update,
--   garden_members_self_or_owner_delete
--   invite_codes_member_select
--   vereinsregeln_member
--   ai_jobs_member_read, ai_jobs_member_insert
--   ai_results_member_read
--
-- Test coverage: same Wave-0 + D-16 SQL tests — they now pass without recursion.
-- Atomicity: Supabase wraps file in implicit transaction.

-- ──────────────────────────────────────────────────────────────
-- 1. SECURITY DEFINER helpers (RLS-bypassing membership checks)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_garden_member(p_garden_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_garden_owner(p_garden_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.is_garden_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_garden_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_garden_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_garden_owner(uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 2. Drop + recreate all recursive policies
-- ──────────────────────────────────────────────────────────────

-- gardens
DROP POLICY IF EXISTS "gardens_member_select" ON public.gardens;
DROP POLICY IF EXISTS "gardens_member_update" ON public.gardens;
DROP POLICY IF EXISTS "gardens_owner_delete" ON public.gardens;

CREATE POLICY "gardens_member_select" ON public.gardens FOR SELECT
  USING (public.is_garden_member(id));
CREATE POLICY "gardens_member_update" ON public.gardens FOR UPDATE
  USING (public.is_garden_member(id))
  WITH CHECK (public.is_garden_member(id));
CREATE POLICY "gardens_owner_delete" ON public.gardens FOR DELETE
  USING (public.is_garden_owner(id));

-- garden_members — non-recursive: SELECT own rows + rows of gardens you're member of
DROP POLICY IF EXISTS "garden_members_member_select" ON public.garden_members;
DROP POLICY IF EXISTS "garden_members_owner_update" ON public.garden_members;
DROP POLICY IF EXISTS "garden_members_self_or_owner_delete" ON public.garden_members;

-- Helper call is safe because SECURITY DEFINER bypasses RLS on the inner garden_members read.
CREATE POLICY "garden_members_member_select" ON public.garden_members FOR SELECT
  USING (public.is_garden_member(garden_id));
CREATE POLICY "garden_members_owner_update" ON public.garden_members FOR UPDATE
  USING (public.is_garden_owner(garden_id));
CREATE POLICY "garden_members_self_or_owner_delete" ON public.garden_members FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR public.is_garden_owner(garden_id)
  );

-- invite_codes
DROP POLICY IF EXISTS "invite_codes_member_select" ON public.invite_codes;
CREATE POLICY "invite_codes_member_select" ON public.invite_codes FOR SELECT
  USING (public.is_garden_member(garden_id));

-- vereinsregeln
DROP POLICY IF EXISTS "vereinsregeln_member" ON public.vereinsregeln;
CREATE POLICY "vereinsregeln_member" ON public.vereinsregeln FOR ALL
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));

-- ai_jobs
DROP POLICY IF EXISTS "ai_jobs_member_read" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_member_insert" ON public.ai_jobs;
CREATE POLICY "ai_jobs_member_read" ON public.ai_jobs FOR SELECT
  USING (public.is_garden_member(garden_id));
CREATE POLICY "ai_jobs_member_insert" ON public.ai_jobs FOR INSERT
  WITH CHECK (public.is_garden_member(garden_id));

-- ai_results
DROP POLICY IF EXISTS "ai_results_member_read" ON public.ai_results;
CREATE POLICY "ai_results_member_read" ON public.ai_results FOR SELECT
  USING (public.is_garden_member(garden_id));

-- ──────────────────────────────────────────────────────────────
-- 3. Post-fix sanity: ensure at least one policy using helper exists per table
-- ──────────────────────────────────────────────────────────────
do $$
declare cnt int;
begin
  select count(*) into cnt from pg_policies
    where schemaname = 'public'
      and tablename = 'garden_members'
      and policyname = 'garden_members_member_select';
  if cnt <> 1 then raise exception 'migration_004_invariant: garden_members SELECT policy missing'; end if;
  raise notice 'migration_004 ok: RLS recursion fix applied';
end $$;
