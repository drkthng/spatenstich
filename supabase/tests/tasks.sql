-- Phase 36 / Migration 025 — own tasks, tick-offs, AI orders, weather cache.
-- Run: supabase db query --linked -f supabase/tests/tasks.sql
-- BEGIN/ROLLBACK, JWT claim switch, do-blocks that raise on failure. Nothing is left behind.
BEGIN;

  do $$
  declare
    v_a uuid := gen_random_uuid();
    v_b uuid := gen_random_uuid();
    v_c uuid := gen_random_uuid();
    v_garden uuid;
  begin
    insert into auth.users (id, email, aud, role) values
      (v_a, 'a_' || v_a || '@test.local', 'authenticated', 'authenticated'),
      (v_b, 'b_' || v_b || '@test.local', 'authenticated', 'authenticated'),
      (v_c, 'c_' || v_c || '@test.local', 'authenticated', 'authenticated')
      on conflict do nothing;
    insert into public.profiles (id, display_name) values (v_a, 'A'), (v_b, 'B'), (v_c, 'C')
      on conflict (id) do nothing;
    insert into public.gardens (name, created_by_user_id, updated_by_user_id)
      values ('Aufgaben Test', v_a, v_a) returning id into v_garden;
    insert into public.garden_members (garden_id, user_id, role) values
      (v_garden, v_a, 'owner'), (v_garden, v_b, 'member');
    insert into public.weather_cache (plz, latitude, longitude, place, forecast)
      values ('00001', 52.5, 13.4, 'Testort', '[]'::jsonb);
    perform set_config('test.a', v_a::text, true);
    perform set_config('test.b', v_b::text, true);
    perform set_config('test.c', v_c::text, true);
    perform set_config('test.garden', v_garden::text, true);
    perform set_config('test.task', gen_random_uuid()::text, true);
    perform set_config('test.done', gen_random_uuid()::text, true);
  end $$;

  -- ── As member A ────────────────────────────────────────────────────────────
  select set_config('request.jwt.claim.sub', current_setting('test.a'), true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare v_task public.garden_tasks; v_done public.task_done;
  begin
    insert into public.garden_tasks (id, garden_id, title, where_text, duration_min, interval_days, due_on, created_by_user_id, updated_by_user_id)
      values (current_setting('test.task')::uuid, current_setting('test.garden')::uuid, 'Regentonne leeren', 'an der Laube', 20, 14,
              current_date, current_setting('test.a')::uuid, current_setting('test.a')::uuid)
      returning * into v_task;
    if v_task.server_updated_at is null or v_task.deleted_at is not null then
      raise exception 'tasks_failed: defaults of an own task are wrong';
    end if;
    insert into public.task_done (id, garden_id, task_key, done_on, hide_until, done_by_user_id, updated_by_user_id, updated_at)
      values (current_setting('test.done')::uuid, current_setting('test.garden')::uuid, 'own:' || v_task.id, current_date, current_date + 13,
              current_setting('test.a')::uuid, current_setting('test.a')::uuid, now() - interval '5 minutes')
      returning * into v_done;
    insert into public.task_sorts (garden_id, day, budget_min, input_hash, items, created_by_user_id)
      values (current_setting('test.garden')::uuid, current_date, 30, 'abc-1f',
              '[{"key":"season:water","reason":"Zuerst gießen."}]'::jsonb, current_setting('test.a')::uuid);
    raise notice 'tasks_ok: (a) a member stores an own task, a tick-off and an AI order';
  end $$;

  do $$
  begin
    begin
      insert into public.garden_tasks (garden_id, title, duration_min, due_on)
        values (current_setting('test.garden')::uuid, '', 10, current_date);
      raise exception 'tasks_failed: an own task without a title was accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.garden_tasks (garden_id, title, duration_min, due_on)
        values (current_setting('test.garden')::uuid, 'x', 0, current_date);
      raise exception 'tasks_failed: a duration of 0 minutes was accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.garden_tasks (garden_id, title, duration_min, interval_days, due_on)
        values (current_setting('test.garden')::uuid, 'x', 10, 400, current_date);
      raise exception 'tasks_failed: an interval of 400 days was accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.task_done (garden_id, task_key, done_on)
        values (current_setting('test.garden')::uuid, '', current_date);
      raise exception 'tasks_failed: a tick-off without a task key was accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.task_sorts (garden_id, day, budget_min, input_hash)
        values (current_setting('test.garden')::uuid, current_date, -5, 'x');
      raise exception 'tasks_failed: a negative budget was accepted';
    exception when check_violation then null;
    end;
    raise notice 'tasks_ok: (b) empty titles and keys, impossible durations, intervals and budgets are refused';
  end $$;

  -- ── As member B: sees it, takes the tick back ──────────────────────────────
  reset role;
  select set_config('request.jwt.claim.sub', current_setting('test.b'), true);
  set local role authenticated;

  do $$
  declare v_count int; v_before timestamptz; v_after timestamptz;
  begin
    select count(*) into v_count from public.task_done
      where garden_id = current_setting('test.garden')::uuid and deleted_at is null;
    if v_count <> 1 then
      raise exception 'tasks_failed: the partner sees % tick-offs, expected 1', v_count;
    end if;
    select count(*) into v_count from public.task_sorts where garden_id = current_setting('test.garden')::uuid;
    if v_count <> 1 then
      raise exception 'tasks_failed: the partner does not see the AI order';
    end if;
    select server_updated_at into v_before from public.task_done where id = current_setting('test.done')::uuid;
    update public.task_done set deleted_at = now(), updated_at = now(), updated_by_user_id = current_setting('test.b')::uuid
      where id = current_setting('test.done')::uuid;
    select server_updated_at into v_after from public.task_done where id = current_setting('test.done')::uuid;
    if v_after <= v_before then
      raise exception 'tasks_failed: the server stamp did not move when the tick was taken back';
    end if;
    update public.garden_tasks set duration_min = 30, updated_at = now() where id = current_setting('test.task')::uuid;
    raise notice 'tasks_ok: (c) the partner sees tick-off and order, takes the tick back and changes the task';
  end $$;

  do $$
  begin
    begin
      update public.task_done set deleted_at = null, updated_at = now() - interval '1 hour'
        where id = current_setting('test.done')::uuid;
      raise exception 'tasks_failed: an older edit replaced a newer one';
    exception when sqlstate 'P9011' then null;
    end;
    raise notice 'tasks_ok: (d) an older edit of a tick-off is refused (P9011)';
  end $$;

  -- A member cannot read or write the weather cache.
  do $$
  declare v_rows int;
  begin
    begin
      select count(*) into v_rows from public.weather_cache;
      if v_rows <> 0 then
        raise exception 'tasks_failed: a member reads the weather cache';
      end if;
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.weather_cache (plz, latitude, longitude, forecast) values ('00002', 1, 1, '[]'::jsonb);
      raise exception 'tasks_failed: a member wrote to the weather cache';
    exception when insufficient_privilege then null;
    end;
    raise notice 'tasks_ok: (e) the weather cache is closed to members';
  end $$;

  -- ── As a stranger ──────────────────────────────────────────────────────────
  reset role;
  select set_config('request.jwt.claim.sub', current_setting('test.c'), true);
  set local role authenticated;

  do $$
  declare v_rows int; t text;
  begin
    foreach t in array array['garden_tasks', 'task_done', 'task_sorts'] loop
      execute format('select count(*) from public.%I where garden_id = %L', t, current_setting('test.garden')) into v_rows;
      if v_rows <> 0 then
        raise exception 'tasks_failed: a stranger reads % rows of %', v_rows, t;
      end if;
    end loop;
    begin
      insert into public.garden_tasks (garden_id, title, due_on) values (current_setting('test.garden')::uuid, 'fremd', current_date);
      raise exception 'tasks_failed: a stranger wrote an own task';
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.task_done (garden_id, task_key, done_on) values (current_setting('test.garden')::uuid, 'season:water', current_date);
      raise exception 'tasks_failed: a stranger ticked a task off';
    exception when insufficient_privilege then null;
    end;
    update public.garden_tasks set title = 'gekapert', updated_at = now() where id = current_setting('test.task')::uuid;
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then
      raise exception 'tasks_failed: a stranger changed an own task';
    end if;
    raise notice 'tasks_ok: (f) someone who is not a member neither reads nor writes tasks, tick-offs or orders';
  end $$;

  -- ── Without sign-in ────────────────────────────────────────────────────────
  reset role;
  select set_config('request.jwt.claim.sub', '', true);
  set local role anon;

  do $$
  declare v_rows int; t text;
  begin
    foreach t in array array['garden_tasks', 'task_done', 'task_sorts', 'weather_cache'] loop
      begin
        execute format('select count(*) from public.%I', t) into v_rows;
        if v_rows <> 0 then
          raise exception 'tasks_failed: a visitor reads %', t;
        end if;
      exception when insufficient_privilege then null;
      end;
    end loop;
    raise notice 'tasks_ok: (g) without a sign-in there is nothing to read';
  end $$;

  reset role;

  do $$
  declare v_count int;
  begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      select count(*) into v_count from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public'
          and tablename in ('garden_tasks', 'task_done', 'task_sorts');
      if v_count <> 3 then
        raise exception 'tasks_failed: % of 3 tables are in the realtime publication', v_count;
      end if;
      if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'weather_cache') then
        raise exception 'tasks_failed: the weather cache must not be in the realtime publication';
      end if;
    end if;
    raise notice 'tasks_ok: (h) tasks, tick-offs and orders are in the realtime publication, the weather cache is not';
  end $$;

ROLLBACK;
