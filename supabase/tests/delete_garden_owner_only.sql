-- Phase 2.5 D-16 Test — delete_garden Owner-only (Plan 02.5-02)
-- Ausführung: supabase db query -f supabase/tests/delete_garden_owner_only.sql --linked
-- Erwartet: NOTICE 'delete_garden_owner_only ok' (non-owner bekommt 42501 / insufficient_privilege)
--
-- Setup läuft als postgres (superuser) bis zur eigentlichen Assertion-Phase,
-- weil profiles-INSERT für zweite User + direkte garden_members-INSERTs nur
-- als superuser möglich sind (RLS / missing INSERT-Policy).
-- Fixtures:
--   user-a  = b9667f2a-7e86-497b-9cff-3ae320c7ff2c (Owner von Garten A)
--   user-b  = d5fc0937-5e49-4fb5-9740-9940f075fab2 (Member von Garten A)

BEGIN;
  -- Setup als superuser: Profiles anlegen
  insert into public.profiles(id, display_name)
    values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, 'user_a')
    on conflict (id) do nothing;
  insert into public.profiles(id, display_name)
    values ('d5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'user_b')
    on conflict (id) do nothing;

  -- Garten via RPC anlegen (User A) — RPC ist SECURITY DEFINER
  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare ga_id uuid;
  begin
    ga_id := public.ensure_default_garden_for_user();
    perform set_config('test.delete_garden.ga_id', ga_id::text, true);
  end $$;

  -- Zurück auf superuser für direkten garden_members-INSERT
  reset role;

  do $$
  declare ga_id uuid;
  begin
    ga_id := current_setting('test.delete_garden.ga_id')::uuid;
    insert into public.garden_members(garden_id, user_id, role)
      values (ga_id, 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'member');
  end $$;

  -- Switch to User B (non-owner) und versuche delete_garden
  select set_config('request.jwt.claim.sub', 'd5fc0937-5e49-4fb5-9740-9940f075fab2', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare
    ga_id uuid;
    sqlstate_caught text;
  begin
    ga_id := current_setting('test.delete_garden.ga_id')::uuid;

    begin
      perform public.delete_garden(ga_id);
      raise exception 'delete_garden_owner_only_failed: non-owner delete succeeded';
    exception when insufficient_privilege then
      get stacked diagnostics sqlstate_caught = returned_sqlstate;
      raise notice 'delete_garden_owner_only ok: SQLSTATE=% (42501) as expected', sqlstate_caught;
    end;
  end $$;
ROLLBACK;
