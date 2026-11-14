-- Phase 33 (SYNC3-02/03/08): a reliable sync cursor, client edit times that survive,
-- and members that are removed softly so the removal reaches the partner.
--
-- 1. server_updated_at on every synced table, set by the server on each write. Clients
--    pull by this column only, so a row that was edited offline at 10:00 and pushed at
--    12:00 is still found by a device that already pulled at 11:00.
-- 2. updated_at stays the edit time the client sent. Together with the existing guard
--    (P9011 when the incoming edit is older) the later edit wins, whoever syncs first.
-- 3. garden_members gets deleted_at. Every membership check ignores removed members.
--
-- Additive and idempotent. No data is deleted.

begin;

-- ── 1. server_updated_at ─────────────────────────────────────────────────────

create or replace function public.tg_set_server_updated_at() returns trigger
language plpgsql as $$
begin
  -- clock_timestamp(), not now(): rows written by one statement get distinct, rising
  -- values, and the stamp is as close to the commit as a trigger can get.
  new.server_updated_at := clock_timestamp();
  return new;
end $$;

alter table public.garden_members
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by_user_id uuid,
  add column if not exists deleted_at timestamptz;

do $$
declare t text;
begin
  foreach t in array array[
    'gardens', 'profiles', 'garden_members', 'invite_codes', 'garden_dimensions',
    'plan_elements', 'imports', 'import_items', 'bed_drafts', 'plant_drafts',
    'observation_drafts'
  ] loop
    execute format(
      'alter table public.%I add column if not exists server_updated_at timestamptz not null default now()', t);
    execute format('drop trigger if exists zy_set_server_updated_at_%s on public.%I', t, t);
    execute format(
      'create trigger zy_set_server_updated_at_%s before insert or update on public.%I
         for each row execute function public.tg_set_server_updated_at()', t, t);
  end loop;

  foreach t in array array[
    'garden_members', 'invite_codes', 'garden_dimensions', 'plan_elements', 'imports',
    'import_items', 'bed_drafts', 'plant_drafts', 'observation_drafts'
  ] loop
    execute format(
      'create index if not exists idx_%s_garden_sua on public.%I (garden_id, server_updated_at)', t, t);
  end loop;
end $$;

create index if not exists idx_gardens_sua on public.gardens (server_updated_at);
create index if not exists idx_profiles_sua on public.profiles (server_updated_at);

-- ── 2. updated_at keeps the client's edit time ───────────────────────────────

create or replace function public.tg_set_updated_at() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at is not distinct from old.updated_at then
      -- A change that brought no edit time of its own (server-side function, or the
      -- same snapshot sent twice): stamp it now.
      new.updated_at := now();
    end if;
  end if;
  if new.updated_at is null or new.updated_at > now() + interval '5 minutes' then
    -- Missing, or a device clock far ahead: a stamp from the future would win every
    -- later conflict, so it is replaced.
    new.updated_at := now();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'gardens', 'profiles', 'garden_members', 'garden_dimensions', 'plan_elements',
    'imports', 'bed_drafts', 'plant_drafts', 'observation_drafts', 'vereinsregeln'
  ] loop
    execute format('drop trigger if exists zz_set_updated_at_%s on public.%I', t, t);
    execute format(
      'create trigger zz_set_updated_at_%s before insert or update on public.%I
         for each row execute function public.tg_set_updated_at()', t, t);
  end loop;

  -- The later edit wins on the review tables too (they had no guard so far).
  foreach t in array array['imports', 'bed_drafts', 'plant_drafts', 'observation_drafts'] loop
    execute format('drop trigger if exists aa_lww_guard_%s on public.%I', t, t);
    execute format(
      'create trigger aa_lww_guard_%s before update on public.%I
         for each row execute function public.tg_lww_guard()', t, t);
  end loop;
end $$;

-- ── 3. Removed members no longer count ───────────────────────────────────────

create or replace function public.is_garden_member(p_garden_id uuid) returns boolean
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select exists (
    select 1 from public.garden_members
    where garden_id = p_garden_id and user_id = auth.uid() and deleted_at is null
  );
$$;

create or replace function public.is_garden_owner(p_garden_id uuid) returns boolean
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select exists (
    select 1 from public.garden_members
    where garden_id = p_garden_id and user_id = auth.uid() and role = 'owner'
      and deleted_at is null
  );
$$;

create or replace function public.are_co_members(p_user_a uuid, p_user_b uuid) returns boolean
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select exists (
    select 1
    from public.garden_members gm_a
    join public.garden_members gm_b on gm_a.garden_id = gm_b.garden_id
    where gm_a.user_id = p_user_a
      and gm_b.user_id = p_user_b
      and gm_a.deleted_at is null
      and gm_b.deleted_at is null
  );
$$;

create or replace function public.tg_garden_members_limit_2() returns trigger
language plpgsql as $$
declare current_count int;
begin
  -- Row-lock the parent garden to serialize concurrent garden_members inserts.
  perform 1 from public.gardens where id = new.garden_id for update;
  select count(*) into current_count
  from public.garden_members
  where garden_id = new.garden_id and deleted_at is null
    and user_id <> new.user_id;        -- a returning member does not count twice
  if current_count >= 2 then
    raise exception 'garden_member_limit_exceeded: Dieser Garten hat bereits 2 Mitglieder'
      using errcode = '23514';
  end if;
  return new;
end $$;

create or replace function public.consume_invite_code(p_code text) returns uuid
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_user uuid := auth.uid();
  v_garden_id uuid;
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
  return v_garden_id;
end $$;

create or replace function public.create_invite_for_garden(p_garden_id uuid) returns text
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_user uuid := auth.uid();
  v_is_owner boolean;
  v_code text;
  v_attempts int := 0;
  v_member_count int;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select exists(
    select 1 from public.garden_members
    where garden_id = p_garden_id and user_id = v_user and role = 'owner'
      and deleted_at is null
  ) into v_is_owner;
  if not v_is_owner then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  select count(*) into v_member_count
  from public.garden_members
  where garden_id = p_garden_id and deleted_at is null;
  if v_member_count >= 2 then
    raise exception 'garden_already_full' using errcode = 'P9006';
  end if;
  -- Older open codes of this garden stop working.
  update public.invite_codes
  set consumed_at = now()
  where garden_id = p_garden_id and consumed_at is null;
  loop
    v_attempts := v_attempts + 1;
    v_code := public.gen_invite_code();
    begin
      insert into public.invite_codes (garden_id, code, created_by_user_id)
      values (p_garden_id, v_code, v_user);
      exit;
    exception when unique_violation then
      if v_attempts >= 10 then
        raise exception 'code_generation_failed' using errcode = 'P0001';
      end if;
    end;
  end loop;
  return v_code;
end $$;

create or replace function public.delete_garden(p_garden_id uuid) returns json
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_user uuid := auth.uid();
  v_is_owner boolean;
  v_member_count int;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select exists(
    select 1 from public.garden_members
    where garden_id = p_garden_id and user_id = v_user and role = 'owner'
      and deleted_at is null
  ) into v_is_owner;
  if not v_is_owner then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  select count(*) into v_member_count
  from public.garden_members
  where garden_id = p_garden_id and deleted_at is null;
  if v_member_count > 1 then
    raise exception 'garden_has_members' using errcode = 'P9003';
  end if;
  delete from public.gardens where id = p_garden_id;
  return json_build_object('status', 'deleted', 'garden_id', p_garden_id);
end $$;

create or replace function public.ensure_default_garden_for_user() returns uuid
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_user uuid := auth.uid();
  v_garden_id uuid;
  v_display_name text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select garden_id into v_garden_id
  from public.garden_members
  where user_id = v_user and deleted_at is null
  order by joined_at asc limit 1;
  if v_garden_id is not null then
    return v_garden_id;
  end if;
  select left(btrim(split_part(email, '@', 1)), 40) into v_display_name
  from auth.users where id = v_user;
  if v_display_name = '' then v_display_name := null; end if;
  insert into public.profiles (id, display_name)
  values (v_user, v_display_name)
  on conflict (id) do nothing;
  insert into public.gardens (name, created_by_user_id)
  values ('Mein Garten', v_user)
  returning id into v_garden_id;
  insert into public.garden_members (garden_id, user_id, role)
  values (v_garden_id, v_user, 'owner');
  return v_garden_id;
end $$;

create or replace function public.transfer_ownership(p_garden_id uuid, p_to_user_id uuid) returns json
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_user uuid := auth.uid();
  v_caller_is_owner boolean;
  v_target_is_member boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_user = p_to_user_id then
    raise exception 'cannot_transfer_to_self' using errcode = 'P9004';
  end if;
  select exists(
    select 1 from public.garden_members
    where garden_id = p_garden_id and user_id = v_user and role = 'owner'
      and deleted_at is null
  ) into v_caller_is_owner;
  if not v_caller_is_owner then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  select exists(
    select 1 from public.garden_members
    where garden_id = p_garden_id and user_id = p_to_user_id and role = 'member'
      and deleted_at is null
  ) into v_target_is_member;
  if not v_target_is_member then
    raise exception 'target_not_member' using errcode = 'P9005';
  end if;
  update public.garden_members
  set role = 'member', updated_by_user_id = v_user
  where garden_id = p_garden_id and user_id = v_user;
  update public.garden_members
  set role = 'owner', updated_by_user_id = v_user
  where garden_id = p_garden_id and user_id = p_to_user_id;
  update public.gardens
  set updated_by_user_id = v_user,
      updated_at         = now()
  where id = p_garden_id;
  return json_build_object(
    'status', 'transferred',
    'garden_id', p_garden_id,
    'new_owner_id', p_to_user_id
  );
end $$;

-- Removing a member, or leaving, marks the row instead of deleting it. The same people
-- may do it as before: the member themselves, or the owner of the garden.
create or replace function public.remove_garden_member(p_garden_id uuid, p_user_id uuid) returns json
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_user uuid := auth.uid();
  v_is_owner boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select exists(
    select 1 from public.garden_members
    where garden_id = p_garden_id and user_id = v_user and role = 'owner'
      and deleted_at is null
  ) into v_is_owner;
  if v_user <> p_user_id and not v_is_owner then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  update public.garden_members
  set deleted_at = now(), updated_at = now(), updated_by_user_id = v_user
  where garden_id = p_garden_id and user_id = p_user_id and deleted_at is null;
  return json_build_object('status', 'removed', 'garden_id', p_garden_id, 'user_id', p_user_id);
end $$;

revoke all on function public.remove_garden_member(uuid, uuid) from public;
revoke all on function public.remove_garden_member(uuid, uuid) from anon;
grant execute on function public.remove_garden_member(uuid, uuid) to authenticated;

commit;
