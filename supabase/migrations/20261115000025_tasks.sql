-- Phase 36 (TASK-05, TASK-06, TASK-07, TASK-09): tasks for today.
--
-- The list of today's tasks is worked out on the device from the plan, the calendar and
-- the season. The database holds only what cannot be worked out:
--   garden_tasks   tasks the members add themselves, once or repeating       (TASK-06)
--   task_done      what was ticked off, and until when it stays off the list  (TASK-05)
--   task_sorts     the order the AI gave a day's list, kept so it is asked at most
--                  once per day and time budget and both members see the same (TASK-09)
--   weather_cache  the forecast per postcode, fetched by the weather function;
--                  not readable by devices                                    (TASK-07)
-- The first three are synced like the plan (edit time, server stamp, older edits
-- refused, members only, live updates). Idempotent.

create table if not exists public.garden_tasks (
  id                  uuid primary key default gen_random_uuid(),
  garden_id           uuid not null references public.gardens(id) on delete cascade,
  title               text not null check (char_length(title) between 1 and 120),
  where_text          text check (where_text is null or char_length(where_text) <= 120),
  target_element_id   uuid,
  duration_min        integer not null default 15 check (duration_min between 1 and 600),
  -- null: once. Otherwise the task comes back this many days after it was done.
  interval_days       integer check (interval_days is null or interval_days between 1 and 365),
  due_on              date not null,
  notes               text check (notes is null or char_length(notes) <= 1000),
  created_by_user_id  uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by_user_id  uuid references auth.users(id),
  deleted_at          timestamptz,
  server_updated_at   timestamptz not null default clock_timestamp()
);

create table if not exists public.task_done (
  id                  uuid primary key default gen_random_uuid(),
  garden_id           uuid not null references public.gardens(id) on delete cascade,
  -- What was done: the stable key of a task from the rules, of an own task or of a finding.
  task_key            text not null check (char_length(task_key) between 1 and 200),
  done_on             date not null,
  -- The task stays off the list up to and including this day; null: it does not come back.
  hide_until          date,
  done_by_user_id     uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by_user_id  uuid references auth.users(id),
  deleted_at          timestamptz,
  server_updated_at   timestamptz not null default clock_timestamp()
);

create table if not exists public.task_sorts (
  id                  uuid primary key default gen_random_uuid(),
  garden_id           uuid not null references public.gardens(id) on delete cascade,
  day                 date not null,
  -- Minutes the person has; 0 when no budget was chosen.
  budget_min          integer not null default 0 check (budget_min between 0 and 1440),
  -- Fingerprint of the list that was sorted. A different list is not this order's list.
  input_hash          text not null check (char_length(input_hash) between 1 and 80),
  -- [{ "key": "...", "reason": "..." }, ...] in the order the AI gave.
  items               jsonb not null default '[]'::jsonb,
  created_by_user_id  uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by_user_id  uuid references auth.users(id),
  deleted_at          timestamptz,
  server_updated_at   timestamptz not null default clock_timestamp()
);

create index if not exists idx_garden_tasks_cursor on public.garden_tasks (garden_id, server_updated_at, id);
create index if not exists idx_task_done_cursor on public.task_done (garden_id, server_updated_at, id);
create index if not exists idx_task_sorts_cursor on public.task_sorts (garden_id, server_updated_at, id);

alter table public.garden_tasks enable row level security;
alter table public.task_done enable row level security;
alter table public.task_sorts enable row level security;

do $$
declare t text;
begin
  foreach t in array array['garden_tasks', 'task_done', 'task_sorts'] loop
    execute format('drop policy if exists %I on public.%I', t || '_member_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_garden_member(garden_id))
         with check (public.is_garden_member(garden_id))', t || '_member_all', t);

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('drop trigger if exists aa_lww_guard_%s on public.%I', t, t);
    execute format(
      'create trigger aa_lww_guard_%s before update on public.%I
         for each row execute function public.tg_lww_guard()', t, t);

    execute format('drop trigger if exists zy_set_server_updated_at_%s on public.%I', t, t);
    execute format(
      'create trigger zy_set_server_updated_at_%s before insert or update on public.%I
         for each row execute function public.tg_set_server_updated_at()', t, t);

    execute format('drop trigger if exists zz_set_updated_at_%s on public.%I', t, t);
    execute format(
      'create trigger zz_set_updated_at_%s before insert or update on public.%I
         for each row execute function public.tg_set_updated_at()', t, t);
  end loop;
end $$;

-- The forecast per postcode. Written and read by the weather function (service role)
-- only: row level security is on and there is no policy for anyone else.
create table if not exists public.weather_cache (
  plz         text primary key check (plz ~ '^[0-9]{5}$'),
  latitude    double precision not null,
  longitude   double precision not null,
  place       text,
  forecast    jsonb not null,
  fetched_at  timestamptz not null default now()
);
alter table public.weather_cache enable row level security;
revoke all on public.weather_cache from anon, authenticated;

-- A ticked-off task reaches the partner within seconds.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'publication supabase_realtime not found, skipped';
    return;
  end if;
  foreach t in array array['garden_tasks', 'task_done', 'task_sorts'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

do $$
begin
  if (select count(*) from pg_policies
      where schemaname = 'public'
        and policyname in ('garden_tasks_member_all', 'task_done_member_all', 'task_sorts_member_all')) <> 3 then
    raise exception 'migration_025_invariant: member policies missing';
  end if;
  if (select count(*) from pg_trigger
      where not tgisinternal
        and tgrelid in ('public.garden_tasks'::regclass, 'public.task_done'::regclass, 'public.task_sorts'::regclass)) <> 9 then
    raise exception 'migration_025_invariant: expected 9 triggers on the three tables';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'weather_cache') then
    raise exception 'migration_025_invariant: weather_cache must have no policy';
  end if;
  raise notice 'migration_025 ok: garden_tasks + task_done + task_sorts + weather_cache';
end $$;
