-- Phase 2.5 / Migration 009 — WR-05: transfer_ownership darf created_by_user_id nicht überschreiben
-- Background:
--   Migration 003 setzte im transfer_ownership-Body:
--     UPDATE public.gardens
--     SET created_by_user_id = p_to_user_id,
--         updated_by_user_id = v_user
--     WHERE id = p_garden_id;
--
--   `created_by_user_id` ist per Namenskonvention (D-06) und D-14
--   audit-invariant — "wer hat die Row erstellt". Der neue Owner hat den
--   Garten aber NICHT erstellt, er hat ihn ÜBERNOMMEN. Das überschreibt
--   Audit-Trail und bricht die semantische Contract mit anderen Tabellen
--   (vereinsregeln.created_by_user_id, ai_jobs.created_by_user_id).
--
--   Die korrekte "wer ist aktueller Owner"-Info ist bereits in
--   garden_members.role = 'owner' abgebildet. Ein Redundanz-Update auf
--   gardens.created_by_user_id ist nicht nur unnötig, sondern schädlich.
--
-- Fix:
--   CREATE OR REPLACE FUNCTION transfer_ownership — entferne das
--   created_by_user_id = p_to_user_id Update. updated_by_user_id = v_user
--   bleibt (reflektiert: "v_user hat die Ownership-Änderung ausgelöst").
--
-- Atomicity: Supabase wraps file in implicit transaction.

CREATE OR REPLACE FUNCTION public.transfer_ownership(p_garden_id uuid, p_to_user_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_caller_is_owner boolean;
  v_target_is_member boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF v_user = p_to_user_id THEN
    RAISE EXCEPTION 'cannot_transfer_to_self' USING ERRCODE = 'P0004';
  END IF;

  -- Caller-is-owner check
  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = v_user AND role = 'owner'
  ) INTO v_caller_is_owner;

  IF NOT v_caller_is_owner THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  -- Target-must-be-existing-member check (role = 'member' specifically —
  -- if target is already owner, the transfer is redundant and 'target_not_member' is correct).
  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = p_to_user_id AND role = 'member'
  ) INTO v_target_is_member;

  IF NOT v_target_is_member THEN
    RAISE EXCEPTION 'target_not_member' USING ERRCODE = 'P0005';
  END IF;

  -- Atomic role swap (one implicit transaction — Supabase CLI wraps file).
  UPDATE public.garden_members
  SET role = 'member'
  WHERE garden_id = p_garden_id AND user_id = v_user;

  UPDATE public.garden_members
  SET role = 'owner'
  WHERE garden_id = p_garden_id AND user_id = p_to_user_id;

  -- WR-05 FIX: created_by_user_id wird NICHT überschrieben (audit-invariant).
  -- Nur updated_by_user_id stempeln — dokumentiert "wer hat Ownership-
  -- Änderung ausgelöst". "Aktueller Owner" ist in garden_members.role.
  UPDATE public.gardens
  SET updated_by_user_id = v_user
  WHERE id = p_garden_id;

  RETURN json_build_object(
    'status', 'transferred',
    'garden_id', p_garden_id,
    'new_owner_id', p_to_user_id
  );
END $$;

-- CREATE OR REPLACE preserves existing REVOKE/GRANT — no re-grant needed.

do $$ begin raise notice 'migration_009 ok: transfer_ownership no longer overwrites created_by_user_id'; end $$;
