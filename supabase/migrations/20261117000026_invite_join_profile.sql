-- Phase 39: someone who joins a garden with an invite code gets a profile.
--
-- A profile row (with the display name taken from the e-mail address) was only created
-- by ensure_default_garden_for_user(). Since Phase 37 a person who types an invite code
-- at sign-up goes straight to consume_invite_code() and never calls that function, so
-- she had no profile: the member list showed "?", and "Heute erledigt" and the usage
-- book showed no name for her.
--
-- 1. consume_invite_code() creates the profile the same way ensure_default_garden_for_user()
--    does. An existing profile is left as it is.
-- 2. Members who already joined without a profile get one.
--
-- Additive and idempotent. No data is deleted.

begin;

create or replace function public.consume_invite_code(p_code text) returns uuid
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_user uuid := auth.uid();
  v_garden_id uuid;
  v_display_name text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  -- Atomic claim: the first UPDATE wins, concurrent callers get NULL RETURNING.
  update public.invite_codes
  set consumed_at = now(), consumed_by_user_id = v_user
  where upper(code) = upper(p_code)
    and consumed_at is null
    and expires_at > now()
  returning garden_id into v_garden_id;
  if v_garden_id is null then
    raise exception 'invite_invalid_or_expired' using errcode = 'P9001';
  end if;
  -- BEFORE INSERT trigger enforces the 2-member limit. Someone who was removed
  -- earlier and joins again gets the old row back instead of a duplicate.
  insert into public.garden_members (garden_id, user_id, role)
  values (v_garden_id, v_user, 'member')
  on conflict (garden_id, user_id) do update
    set deleted_at = null, role = 'member', joined_at = now(),
        updated_at = now(), updated_by_user_id = v_user
    where public.garden_members.deleted_at is not null;
  -- The name the partner sees. Same rule as in ensure_default_garden_for_user().
  select left(btrim(split_part(email, '@', 1)), 40) into v_display_name
  from auth.users where id = v_user;
  if v_display_name = '' then v_display_name := null; end if;
  insert into public.profiles (id, display_name)
  values (v_user, v_display_name)
  on conflict (id) do nothing;
  return v_garden_id;
end $$;

-- Members who joined before this migration.
insert into public.profiles (id, display_name)
select u.id, nullif(left(btrim(split_part(u.email, '@', 1)), 40), '')
from auth.users u
where exists (
    select 1 from public.garden_members m
    where m.user_id = u.id and m.deleted_at is null
  )
on conflict (id) do nothing;

do $$
begin
  if exists (
    select 1 from public.garden_members m
    where m.deleted_at is null
      and not exists (select 1 from public.profiles p where p.id = m.user_id)
  ) then
    raise exception 'migration_026_invariant: a member without a profile is left';
  end if;
  if position('insert into public.profiles' in
       pg_get_functiondef('public.consume_invite_code(text)'::regprocedure)) = 0 then
    raise exception 'migration_026_invariant: consume_invite_code does not create a profile';
  end if;
  raise notice 'migration_026 ok: joining by invite code creates a profile';
end $$;

commit;
