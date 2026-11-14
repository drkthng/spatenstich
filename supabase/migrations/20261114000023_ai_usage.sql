-- Phase 34 (AI-03, AI-04, AI-05, AI-08): the usage book for AI requests and the
-- monthly limit per garden.
--
-- - ai_usage: one row per request that reached the model: garden, person, feature,
--   tokens, cost. Members may read it. Only the edge function writes it (service role).
-- - ai_settings: the monthly limit (default 100 $) and the hourly limit per person.
--   Members may read it; the owner changes the limit through set_ai_monthly_limit.
-- - ai_usage_summary: what the app shows (spent, left, warning at 80 %, stop at 100 %).
-- - ai_precheck: what the edge function asks before every request.
--
-- Additive and idempotent.

begin;

create table if not exists public.ai_settings (
  garden_id uuid primary key references public.gardens(id) on delete cascade,
  monthly_limit_usd numeric(10, 2) not null default 100
    check (monthly_limit_usd >= 0 and monthly_limit_usd <= 1000),
  hourly_requests_per_person integer not null default 20
    check (hourly_requests_per_person between 1 and 200),
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null,
  feature text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  status text not null check (status in ('ok', 'refused', 'error')),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_garden_created on public.ai_usage (garden_id, created_at desc);
create index if not exists idx_ai_usage_user_created on public.ai_usage (user_id, created_at desc);

alter table public.ai_settings enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists ai_settings_member_select on public.ai_settings;
create policy ai_settings_member_select on public.ai_settings
  for select to authenticated using (public.is_garden_member(garden_id));

drop policy if exists ai_usage_member_select on public.ai_usage;
create policy ai_usage_member_select on public.ai_usage
  for select to authenticated using (public.is_garden_member(garden_id));

-- No policies for insert, update or delete: with row level security on, nobody but the
-- service role can write. The grants say the same thing a second time.
revoke all on public.ai_settings from anon, authenticated;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_settings to authenticated;
grant select on public.ai_usage to authenticated;

-- The budget month follows the calendar where the garden is.
create or replace function public.ai_month_start() returns timestamptz
language sql stable as $$
  select date_trunc('month', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
$$;

-- What both members see in the app.
create or replace function public.ai_usage_summary(p_garden_id uuid) returns json
language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_user uuid := auth.uid();
  v_limit numeric;
  v_hourly integer;
  v_spent numeric;
  v_requests integer;
  v_mine_last_hour integer;
  v_start timestamptz := public.ai_month_start();
begin
  if v_user is null or not public.is_garden_member(p_garden_id) then
    raise exception 'not_member' using errcode = '42501';
  end if;
  select monthly_limit_usd, hourly_requests_per_person into v_limit, v_hourly
  from public.ai_settings where garden_id = p_garden_id;
  v_limit := coalesce(v_limit, 100);
  v_hourly := coalesce(v_hourly, 20);
  select coalesce(sum(cost_usd), 0), count(*) into v_spent, v_requests
  from public.ai_usage where garden_id = p_garden_id and created_at >= v_start;
  select count(*) into v_mine_last_hour
  from public.ai_usage where user_id = v_user and created_at >= now() - interval '1 hour';
  return json_build_object(
    'limit_usd', v_limit,
    'spent_usd', round(v_spent, 4),
    'remaining_usd', greatest(v_limit - v_spent, 0),
    'requests', v_requests,
    'month_start', v_start,
    'next_month_start', v_start + interval '1 month',
    'warn', v_limit > 0 and v_spent >= v_limit * 0.8 and v_spent < v_limit,
    'blocked', v_spent >= v_limit,
    'is_owner', public.is_garden_owner(p_garden_id),
    'hourly_limit', v_hourly,
    'my_requests_last_hour', v_mine_last_hour
  );
end $$;

-- Only the owner sets the limit.
create or replace function public.set_ai_monthly_limit(p_garden_id uuid, p_limit_usd numeric) returns json
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_garden_owner(p_garden_id) then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if p_limit_usd is null or p_limit_usd < 0 or p_limit_usd > 1000 then
    raise exception 'limit_out_of_range' using errcode = '22023';
  end if;
  insert into public.ai_settings (garden_id, monthly_limit_usd, updated_at, updated_by_user_id)
  values (p_garden_id, round(p_limit_usd, 2), now(), v_user)
  on conflict (garden_id) do update
    set monthly_limit_usd = excluded.monthly_limit_usd,
        updated_at = now(),
        updated_by_user_id = v_user;
  return public.ai_usage_summary(p_garden_id);
end $$;

-- What the edge function asks before it calls the model. It runs as the service role,
-- which has no signed-in user, so the person is passed in.
create or replace function public.ai_precheck(p_garden_id uuid, p_user_id uuid) returns json
language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_member boolean;
  v_limit numeric;
  v_hourly integer;
  v_spent numeric;
  v_recent integer;
begin
  select exists(
    select 1 from public.garden_members
    where garden_id = p_garden_id and user_id = p_user_id and deleted_at is null
  ) into v_member;
  select monthly_limit_usd, hourly_requests_per_person into v_limit, v_hourly
  from public.ai_settings where garden_id = p_garden_id;
  v_limit := coalesce(v_limit, 100);
  v_hourly := coalesce(v_hourly, 20);
  select coalesce(sum(cost_usd), 0) into v_spent
  from public.ai_usage where garden_id = p_garden_id and created_at >= public.ai_month_start();
  select count(*) into v_recent
  from public.ai_usage where user_id = p_user_id and created_at >= now() - interval '1 hour';
  return json_build_object(
    'member', v_member,
    'limit_usd', v_limit,
    'spent_usd', v_spent,
    'budget_exhausted', v_spent >= v_limit,
    'hourly_limit', v_hourly,
    'recent_requests', v_recent,
    'rate_limited', v_recent >= v_hourly
  );
end $$;

revoke all on function public.ai_usage_summary(uuid) from public, anon;
revoke all on function public.set_ai_monthly_limit(uuid, numeric) from public, anon;
revoke all on function public.ai_precheck(uuid, uuid) from public, anon, authenticated;
grant execute on function public.ai_usage_summary(uuid) to authenticated;
grant execute on function public.set_ai_monthly_limit(uuid, numeric) to authenticated;
grant execute on function public.ai_precheck(uuid, uuid) to service_role;

commit;
