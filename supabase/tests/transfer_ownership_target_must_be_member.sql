-- Phase 2.5 D-16 Test — transfer_ownership target must be existing member (Plan 02.5-02)
-- Ausführung: supabase db query -f supabase/tests/transfer_ownership_target_must_be_member.sql --linked
-- Erwartet: NOTICE 'transfer_ownership_target_must_be_member ok' (Owner bekommt P0005 / target_not_member)
--
-- Pattern: rls_phase2.sql — BEGIN/ROLLBACK mit set_config + SET LOCAL ROLE authenticated.

BEGIN;
  -- Setup: User A als Owner (kein zweiter Member in diesem Garten)
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
    sqlmsg text;
  begin
    ga_id := public.ensure_default_garden_for_user();

    -- Versuch: Transfer auf User C, der NICHT in garden_members ist
    -- (c UUID existiert nicht mal als profile — rein synthetisch)
    begin
      perform public.transfer_ownership(ga_id, '11111111-2222-3333-4444-555555555555'::uuid);
      raise exception 'transfer_ownership_target_must_be_member_failed: transfer to non-member succeeded';
    exception when others then
      get stacked diagnostics sqlstate_caught = returned_sqlstate, sqlmsg = message_text;
      if sqlmsg like '%target_not_member%' then
        raise notice 'transfer_ownership_target_must_be_member ok: SQLSTATE=% message=%', sqlstate_caught, sqlmsg;
      else
        raise;
      end if;
    end;
  end $$;
ROLLBACK;
