-- Phase 2.5 2-Member-Limit Trigger Test — Plan 02.5-01-04 (stub) / Plan 02.5-02 (green)
-- Erwartet nach Migration 003: NOTICE 'member_limit_enforced' + EXCEPTION mit SQLSTATE 23514 beim 3. Insert.
-- Pattern: rls_phase2.sql — BEGIN/ROLLBACK.

BEGIN;
  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.profiles(id, display_name)
    values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, 'user_a')
    on conflict (id) do nothing;

  do $$
  declare
    ga_id uuid;
    sqlstate_caught text;
  begin
    ga_id := public.ensure_default_garden_for_user();

    -- Zweiter Member wird direkt eingefügt (simuliert erfolgreichen Beitritt)
    insert into public.garden_members(garden_id, user_id, role)
      values (ga_id, 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'member');

    -- Dritter Member MUSS vom Trigger geblockt werden
    begin
      insert into public.garden_members(garden_id, user_id, role)
        values (ga_id, '11111111-1111-1111-1111-111111111111'::uuid, 'member');
      raise exception 'member_limit_not_enforced: 3rd member insert succeeded';
    exception when check_violation then
      get stacked diagnostics sqlstate_caught = returned_sqlstate;
      raise notice 'member_limit_enforced: SQLSTATE=% caught as expected', sqlstate_caught;
    end;
  end $$;
ROLLBACK;
