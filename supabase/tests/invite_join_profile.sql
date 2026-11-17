-- Migration 026: joining a garden with an invite code creates the joiner's profile.
-- Expected:
--   1) User B has no profile, consumes A's code: a profile exists afterwards, and its
--      display name is the part of the e-mail address before the @ (at most 40 chars).
--   2) A profile that exists already is not overwritten by joining.
-- Pattern: invite_code.sql (BEGIN/ROLLBACK, fixed test users).
BEGIN;
  -- As superuser: user B starts without a profile; remember the name we expect.
  delete from public.profiles where id = 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid;
  select set_config(
    'test.join_profile.expected',
    coalesce((select nullif(left(btrim(split_part(email, '@', 1)), 40), '')
              from auth.users where id = 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid), ''),
    true);

  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare
    ga_id uuid;
    code_txt text;
    found_name text;
    found_rows int;
    expected text := current_setting('test.join_profile.expected');
  begin
    ga_id := public.ensure_default_garden_for_user();
    code_txt := public.create_invite_for_garden(ga_id);

    -- 1) B joins without a profile.
    perform set_config('request.jwt.claim.sub', 'd5fc0937-5e49-4fb5-9740-9940f075fab2', true);
    perform public.consume_invite_code(code_txt);
    select count(*), max(display_name) into found_rows, found_name
    from public.profiles where id = 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid;
    if found_rows <> 1 then
      raise exception 'join_created_no_profile: % rows', found_rows;
    end if;
    if coalesce(found_name, '') <> expected then
      raise exception 'join_profile_wrong_name: expected "%", got "%"', expected, found_name;
    end if;
    raise notice 'join_profile_created: display_name="%"', found_name;

    -- A sees B's name (co-member policy), which is what the member list needs.
    perform set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
    if not exists (select 1 from public.profiles where id = 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid) then
      raise exception 'join_profile_not_visible_to_owner';
    end if;
    raise notice 'join_profile_visible_to_owner';
  end $$;
ROLLBACK;

BEGIN;
  -- 2) An existing profile keeps its name.
  insert into public.profiles(id, display_name)
    values ('d5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'Eigener Name')
    on conflict (id) do update set display_name = excluded.display_name;

  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare
    ga_id uuid;
    code_txt text;
    found_name text;
  begin
    ga_id := public.ensure_default_garden_for_user();
    code_txt := public.create_invite_for_garden(ga_id);
    perform set_config('request.jwt.claim.sub', 'd5fc0937-5e49-4fb5-9740-9940f075fab2', true);
    perform public.consume_invite_code(code_txt);
    select display_name into found_name
    from public.profiles where id = 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid;
    if found_name is distinct from 'Eigener Name' then
      raise exception 'join_overwrote_profile: got "%"', found_name;
    end if;
    raise notice 'join_kept_existing_profile';
  end $$;
ROLLBACK;
