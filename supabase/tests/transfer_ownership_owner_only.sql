-- Phase 2.5 D-16 Test — transfer_ownership Owner-only (Plan 02.5-02)
-- Ausführung: supabase db query -f supabase/tests/transfer_ownership_owner_only.sql --linked
-- Erwartet: NOTICE 'transfer_ownership_owner_only ok' (non-owner bekommt 42501 / insufficient_privilege)
--
-- Setup-Phase als superuser (profiles + direkter garden_members-Insert).
-- Assertion-Phase als authenticated-user B.

BEGIN;
  -- Profiles als superuser
  insert into public.profiles(id, display_name)
    values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, 'user_a')
    on conflict (id) do nothing;
  insert into public.profiles(id, display_name)
    values ('d5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'user_b')
    on conflict (id) do nothing;

  -- Garten via RPC (User A)
  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare ga_id uuid;
  begin
    ga_id := public.ensure_default_garden_for_user();
    perform set_config('test.ga_id', ga_id::text, true);
  end $$;

  reset role;

  -- User B als Member (superuser direct-insert)
  do $$
  declare ga_id uuid;
  begin
    ga_id := current_setting('test.ga_id')::uuid;
    insert into public.garden_members(garden_id, user_id, role)
      values (ga_id, 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'member');
  end $$;

  -- Switch to User B (non-owner) für den Assertion
  select set_config('request.jwt.claim.sub', 'd5fc0937-5e49-4fb5-9740-9940f075fab2', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare
    ga_id uuid;
    sqlstate_caught text;
  begin
    ga_id := current_setting('test.ga_id')::uuid;

    -- Nicht-Owner B versucht Ownership auf A zu transferieren
    begin
      perform public.transfer_ownership(ga_id, 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid);
      raise exception 'transfer_ownership_owner_only_failed: non-owner transfer succeeded';
    exception when insufficient_privilege then
      get stacked diagnostics sqlstate_caught = returned_sqlstate;
      raise notice 'transfer_ownership_owner_only ok: SQLSTATE=% (42501) as expected', sqlstate_caught;
    end;
  end $$;
ROLLBACK;
