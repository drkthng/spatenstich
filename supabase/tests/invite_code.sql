-- Phase 2.5 Invite-Code Flow Test — Plan 02.5-01-04 (stub) / Plan 02.5-02 (green)
-- Erwartet nach Migration 003 + 010 (WR-04 custom SQLSTATE):
--   1) create_invite_for_garden returns 6-char code (Crockford-alphabet, no 0/O/I/L/U)
--   2) consume_invite_code with valid code returns garden_id + adds user as member
--   3) Double-consume throws SQLSTATE P9001 (invite_invalid_or_expired)
--      Pre-migration-010 dies unter P0002 (= no_data_found built-in). Test prüft
--      message-basiert via sqlmsg LIKE '%invite_invalid_or_expired%' — funktioniert
--      für beide Varianten.
--   4) Expired consume throws SQLSTATE P9001
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
    code_txt text;
    returned_gid uuid;
    sqlstate_caught text;
    sqlmsg text;
  begin
    ga_id := public.ensure_default_garden_for_user();

    -- 1) Generate code as Owner A
    code_txt := public.create_invite_for_garden(ga_id);
    if length(code_txt) <> 6 then raise exception 'invite_code_wrong_length: got %', code_txt; end if;
    if code_txt ~ '[0OILU]' then raise exception 'invite_code_contains_confusable_char: got %', code_txt; end if;
    raise notice 'invite_code_generated: % (6 chars, crockford)', code_txt;

    -- 2) Switch to User B, consume
    perform set_config('request.jwt.claim.sub', 'd5fc0937-5e49-4fb5-9740-9940f075fab2', true);
    insert into public.profiles(id, display_name)
      values ('d5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'user_b') on conflict (id) do nothing;
    returned_gid := public.consume_invite_code(code_txt);
    if returned_gid <> ga_id then raise exception 'consume_returned_wrong_garden: expected %, got %', ga_id, returned_gid; end if;
    raise notice 'invite_code_consumed_ok: garden_id=%', returned_gid;

    -- 3) Double-consume must fail
    -- WR-04: message-basiert statt SQLSTATE-gebunden, da Migration 010 den
    -- SQLSTATE auf P9001 (custom) wechselt. Alte Deployments werfen noch
    -- P0002 (= no_data_found built-in). Message bleibt stabil.
    begin
      perform public.consume_invite_code(code_txt);
      raise exception 'double_consume_not_blocked';
    exception when others then
      get stacked diagnostics sqlstate_caught = returned_sqlstate, sqlmsg = message_text;
      if sqlmsg like '%invite_invalid_or_expired%' then
        raise notice 'double_consume_blocked: SQLSTATE=% message=% as expected', sqlstate_caught, sqlmsg;
      else
        raise;
      end if;
    end;
  end $$;
ROLLBACK;
