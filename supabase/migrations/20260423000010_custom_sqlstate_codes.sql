-- Phase 2.5 / Migration 010 — WR-04: Custom SQLSTATEs für domain-errors
-- Background:
--   Migration 003 nutzte P0002, P0003, P0004, P0005 als SQLSTATE für die
--   domain-Exceptions (invite_invalid_or_expired, garden_has_members,
--   cannot_transfer_to_self, target_not_member). Das ist gefährlich:
--     P0002 entspricht dem PL/pgSQL-Built-in no_data_found (SELECT INTO
--           STRICT ohne Treffer)
--     P0003 entspricht too_many_rows
--     P0004 entspricht assert_failure
--     P0005 ist reserviert (zukünftige Erweiterung)
--
--   Wenn ein zukünftiger Trigger innerhalb der RPCs ein internes SELECT
--   INTO STRICT ohne Match wirft, bekommt der Client P0002 und der
--   inviteCodeRepo-Error-Mapper ordnet das fälschlicherweise als
--   "Code ungültig oder abgelaufen" ein. Latenter Bug, der sich erst
--   bei zukünftigen Trigger-Erweiterungen manifestiert.
--
-- Fix:
--   Wechsle auf P9xxx-Block (keine Built-In-Kollisionen, Postgres-Docs
--   reservieren P9xxx für user-defined):
--     invite_invalid_or_expired  : P0002 → P9001
--     garden_has_members         : P0003 → P9003
--     cannot_transfer_to_self    : P0004 → P9004
--     target_not_member          : P0005 → P9005
--
--   (garden_already_full wird in Migration 011 als neuer Code P9006
--   zusätzlich eingeführt.)
--
--   Alle betroffenen RPCs werden per CREATE OR REPLACE FUNCTION
--   aktualisiert. Client-Code-Mapping wird parallel in dieser Phase
--   angepasst (gardenRepo.ts, inviteCodeRepo.ts).
--
-- Atomicity: Supabase wraps file in implicit transaction.

-- ──────────────────────────────────────────────────────────────
-- 1. consume_invite_code — P0002 → P9001
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_invite_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_garden_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Atomic claim: the first UPDATE wins, concurrent callers get NULL RETURNING.
  UPDATE public.invite_codes
  SET consumed_at = now(), consumed_by_user_id = v_user
  WHERE upper(code) = upper(p_code)
    AND consumed_at IS NULL
    AND expires_at > now()
  RETURNING garden_id INTO v_garden_id;

  IF v_garden_id IS NULL THEN
    -- WR-04: P9001 statt P0002 (P0002 = no_data_found built-in).
    RAISE EXCEPTION 'invite_invalid_or_expired' USING ERRCODE = 'P9001';
  END IF;

  -- BEFORE INSERT Trigger enforces 2-Member-Limit.
  INSERT INTO public.garden_members (garden_id, user_id, role)
  VALUES (v_garden_id, v_user, 'member')
  ON CONFLICT (garden_id, user_id) DO NOTHING;

  RETURN v_garden_id;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 2. delete_garden — P0003 → P9003
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_garden(p_garden_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_owner boolean;
  v_member_count int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = v_user AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_member_count
  FROM public.garden_members
  WHERE garden_id = p_garden_id;

  IF v_member_count > 1 THEN
    -- WR-04: P9003 statt P0003 (P0003 = too_many_rows built-in).
    RAISE EXCEPTION 'garden_has_members' USING ERRCODE = 'P9003';
  END IF;

  DELETE FROM public.gardens WHERE id = p_garden_id;

  RETURN json_build_object('status', 'deleted', 'garden_id', p_garden_id);
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. transfer_ownership — P0004 → P9004, P0005 → P9005
--    (Re-applies WR-05 fix from Migration 009: no created_by_user_id update.)
-- ──────────────────────────────────────────────────────────────
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
    -- WR-04: P9004 statt P0004 (P0004 = assert_failure built-in).
    RAISE EXCEPTION 'cannot_transfer_to_self' USING ERRCODE = 'P9004';
  END IF;

  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = v_user AND role = 'owner'
  ) INTO v_caller_is_owner;

  IF NOT v_caller_is_owner THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = p_to_user_id AND role = 'member'
  ) INTO v_target_is_member;

  IF NOT v_target_is_member THEN
    -- WR-04: P9005 statt P0005.
    RAISE EXCEPTION 'target_not_member' USING ERRCODE = 'P9005';
  END IF;

  -- Atomic role swap.
  UPDATE public.garden_members
  SET role = 'member'
  WHERE garden_id = p_garden_id AND user_id = v_user;

  UPDATE public.garden_members
  SET role = 'owner'
  WHERE garden_id = p_garden_id AND user_id = p_to_user_id;

  -- WR-05 preserved: no created_by_user_id overwrite.
  UPDATE public.gardens
  SET updated_by_user_id = v_user
  WHERE id = p_garden_id;

  RETURN json_build_object(
    'status', 'transferred',
    'garden_id', p_garden_id,
    'new_owner_id', p_to_user_id
  );
END $$;

-- CREATE OR REPLACE preserves GRANT EXECUTE ... TO authenticated.

do $$ begin raise notice 'migration_010 ok: custom P9xxx SQLSTATEs applied'; end $$;
