-- Phase 2.5 / Migration 006 — Fix tg_garden_members_limit_2 RAISE syntax (Rule-1 bug fix)
-- Background:
--   Migration 003's tg_garden_members_limit_2() trigger function used:
--     RAISE EXCEPTION 'garden_member_limit_exceeded'
--       USING ERRCODE = '23514', MESSAGE = 'Dieser Garten hat bereits 2 Mitglieder.';
--   This is illegal in PL/pgSQL: the format-string ('garden_member_limit_exceeded')
--   IS the MESSAGE, so using `USING MESSAGE = ...` raises
--     42601 "RAISE option already specified: MESSAGE".
--   member_limit.sql fails at the 3rd INSERT because the trigger itself crashes.
--
-- Fix:
--   Re-create the trigger function without `MESSAGE =` in the USING clause.
--   Keep the ERRCODE '23514' (check_violation) — tests expect that SQLSTATE
--   for the `exception when check_violation` catch.
--
-- Atomicity: Supabase wraps file in implicit transaction.

CREATE OR REPLACE FUNCTION public.tg_garden_members_limit_2()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_count int;
BEGIN
  -- Row-lock the parent garden to serialize concurrent garden_members inserts (Pitfall 3).
  PERFORM 1 FROM public.gardens WHERE id = NEW.garden_id FOR UPDATE;
  SELECT count(*) INTO current_count FROM public.garden_members WHERE garden_id = NEW.garden_id;
  IF current_count >= 2 THEN
    -- Use format-string as MESSAGE; ERRCODE via USING only.
    RAISE EXCEPTION 'garden_member_limit_exceeded: Dieser Garten hat bereits 2 Mitglieder'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

do $$ begin raise notice 'migration_006 ok: tg_garden_members_limit_2 RAISE syntax fixed'; end $$;
