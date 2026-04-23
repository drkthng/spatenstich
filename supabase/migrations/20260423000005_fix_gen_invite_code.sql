-- Phase 2.5 / Migration 005 — Fix gen_invite_code search_path (Rule-1 bug fix for Migration 003)
-- Background:
--   gen_invite_code() calls gen_random_bytes(6) from pgcrypto. pgcrypto lives
--   in schema `extensions` in Supabase, but gen_invite_code had
--   SET search_path = public, pg_temp → function not found → invite_code.sql
--   test fails with 42883 "function gen_random_bytes(integer) does not exist".
--
-- Fix:
--   Re-create gen_invite_code (and create_invite_for_garden which calls it)
--   with SET search_path = public, extensions, pg_temp so gen_random_bytes
--   resolves to extensions.gen_random_bytes.
--
-- Atomicity: Supabase wraps file in implicit transaction.

CREATE OR REPLACE FUNCTION public.gen_invite_code() RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  alphabet text := '123456789ABCDEFGHJKMNPQRSTVWXYZ';
  result text := '';
  rnd_bytes bytea;
  idx int;
  i int;
BEGIN
  rnd_bytes := gen_random_bytes(6);
  FOR i IN 0..5 LOOP
    idx := (get_byte(rnd_bytes, i) % length(alphabet)) + 1;
    result := result || substring(alphabet from idx for 1);
  END LOOP;
  RETURN result;
END $$;

-- create_invite_for_garden's own search_path stays at `public, pg_temp`, but
-- since it only calls public.gen_invite_code() (which now resolves correctly),
-- it works without further changes. No REVOKE/GRANT changes needed either —
-- CREATE OR REPLACE preserves existing grants.

do $$ begin raise notice 'migration_005 ok: gen_invite_code search_path fixed'; end $$;
