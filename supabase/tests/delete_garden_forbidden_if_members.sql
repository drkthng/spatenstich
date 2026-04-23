-- Phase 2.5 D-16 Test — delete_garden refuses when member_count > 1 (Plan 02.5-02)
-- Ausführung: supabase db query -f supabase/tests/delete_garden_forbidden_if_members.sql --linked
-- Erwartet: NOTICE 'delete_garden_forbidden_if_members ok' (Owner bekommt P0003 / garden_has_members)
--
-- Setup-Phase als superuser (profiles + garden_members direct inserts).
-- Assertion-Phase als authenticated-user A.
-- Fixtures:
--   user-a  = b9667f2a-7e86-497b-9cff-3ae320c7ff2c (Owner)
--   user-b  = d5fc0937-5e49-4fb5-9740-9940f075fab2 (Member)

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

  -- User B als zweiten Member einfügen (superuser)
  do $$
  declare ga_id uuid;
  begin
    ga_id := current_setting('test.ga_id')::uuid;
    insert into public.garden_members(garden_id, user_id, role)
      values (ga_id, 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'member');
  end $$;

  -- Zurück als User A für delete_garden-Versuch
  set local role authenticated;

  do $$
  declare
    ga_id uuid;
    sqlstate_caught text;
    sqlmsg text;
  begin
    ga_id := current_setting('test.ga_id')::uuid;

    begin
      perform public.delete_garden(ga_id);
      raise exception 'delete_garden_forbidden_if_members_failed: delete succeeded with 2 members';
    exception when others then
      get stacked diagnostics sqlstate_caught = returned_sqlstate, sqlmsg = message_text;
      if sqlmsg like '%garden_has_members%' then
        raise notice 'delete_garden_forbidden_if_members ok: SQLSTATE=% message=%', sqlstate_caught, sqlmsg;
      else
        raise;
      end if;
    end;
  end $$;
ROLLBACK;
