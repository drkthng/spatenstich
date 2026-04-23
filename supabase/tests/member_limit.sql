-- Phase 2.5 2-Member-Limit Trigger Test — Plan 02.5-01-04 (stub) / Plan 02.5-02 (green)
-- Erwartet nach Migration 003: EXCEPTION mit SQLSTATE 23514 (check_violation) beim 3. Insert.
-- Pattern: rls_phase2.sql — BEGIN/ROLLBACK.
--
-- Setup läuft als postgres (superuser) — direkte garden_members INSERTs sind nur
-- via superuser möglich (garden_members hat keine INSERT-Policy; productive code
-- muss consume_invite_code RPC nutzen).
-- Setup ruft ensure_default_garden_for_user über SET_CONFIG jwt-sub + SET LOCAL
-- ROLE authenticated — RPC ist SECURITY DEFINER, kommt also durch.

BEGIN;
  -- Profile für User A als superuser anlegen (idempotent)
  insert into public.profiles(id, display_name)
    values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, 'user_a')
    on conflict (id) do nothing;

  -- Garten via RPC anlegen — brauchen authenticated + jwt-sub
  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare ga_id uuid;
  begin
    ga_id := public.ensure_default_garden_for_user();
    -- Speichern für späteren Zugriff nach role-reset
    perform set_config('test.member_limit.ga_id', ga_id::text, true);
  end $$;

  -- Zurück auf superuser für direkte garden_members INSERTs
  -- (keine INSERT-Policy auf garden_members → nur superuser kann direkt einfügen)
  reset role;

  do $$
  declare
    ga_id uuid;
    sqlstate_caught text;
  begin
    ga_id := current_setting('test.member_limit.ga_id')::uuid;

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
