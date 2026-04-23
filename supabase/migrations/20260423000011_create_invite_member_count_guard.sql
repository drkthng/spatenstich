-- Phase 2.5 / Migration 011 — WR-06: create_invite_for_garden race-guard
-- Background:
--   UI gated den "Person einladen"-Button via members.length < 2 client-side.
--   Race-Szenario: Während Owner den Button drückt, tritt der zweite Member
--   gerade über einen früher ausgestellten Code bei. Server akzeptierte den
--   Invite-Create trotzdem — der resultierende Code würde am
--   tg_garden_members_limit_2 Trigger beim Consume scheitern (23514 /
--   check_violation), aber bis dahin hat der Owner einen "gültigen" Code
--   gesehen und weitergeleitet. Confusing UX.
--
-- Fix:
--   Member-Count-Check in create_invite_for_garden VOR dem alten-Code-
--   Invalidate und Insert. Wirft P9006 (garden_already_full) wenn der
--   Garten bereits 2 Mitglieder hat.
--
-- Client-Mapping (settings/garden.tsx Zeile 134):
--   err.code === 'P9006' → t('garden.invite.error_already_full')
--
-- Atomicity: Supabase wraps file in implicit transaction.

CREATE OR REPLACE FUNCTION public.create_invite_for_garden(p_garden_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_owner boolean;
  v_code text;
  v_attempts int := 0;
  v_member_count int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Owner-Check (D-07)
  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = v_user AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  -- WR-06: Race-Guard — Garten bereits voll? (UI gated, aber Race möglich.)
  SELECT count(*) INTO v_member_count
  FROM public.garden_members
  WHERE garden_id = p_garden_id;

  IF v_member_count >= 2 THEN
    RAISE EXCEPTION 'garden_already_full' USING ERRCODE = 'P9006';
  END IF;

  -- D-11: alte aktive Codes dieses Gartens invalidieren
  UPDATE public.invite_codes
  SET consumed_at = now()
  WHERE garden_id = p_garden_id AND consumed_at IS NULL;

  -- Neuen Code generieren (bei Unique-Collision retry, max 10)
  LOOP
    v_attempts := v_attempts + 1;
    v_code := public.gen_invite_code();
    BEGIN
      INSERT INTO public.invite_codes (garden_id, code, created_by_user_id)
      VALUES (p_garden_id, v_code, v_user);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts >= 10 THEN
        RAISE EXCEPTION 'code_generation_failed' USING ERRCODE = 'P0001';
      END IF;
    END;
  END LOOP;

  RETURN v_code;
END $$;

-- CREATE OR REPLACE preserves GRANT EXECUTE ... TO authenticated.
-- search_path bleibt wie zuletzt von Migration 005 gesetzt (public, extensions, pg_temp)?
-- Wait: Migration 005 setzte search_path auf gen_invite_code(), nicht
-- create_invite_for_garden. create_invite_for_garden's search_path ist
-- weiterhin 'public, pg_temp' (siehe Migration 003 Zeile 274). Diese
-- CREATE OR REPLACE überschreibt mit 'public, pg_temp' — konsistent.

do $$ begin raise notice 'migration_011 ok: create_invite_for_garden garden_already_full guard'; end $$;
