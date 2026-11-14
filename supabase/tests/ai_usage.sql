-- Phase 34 / Migration 023 — usage book, monthly limit, hourly limit.
-- Run: supabase db query --linked -f supabase/tests/ai_usage.sql
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
      values ('AI Test', v_a, v_a) returning id into v_garden;
    insert into public.garden_members (garden_id, user_id, role) values
      (v_garden, v_a, 'owner'), (v_garden, v_b, 'member');
    -- 70 $ this month, 5 $ last month.
    insert into public.ai_usage (garden_id, user_id, feature, model, input_tokens, output_tokens, cost_usd, status)
      values (v_garden, v_a, 'test', 'claude-opus-5-5', 1000, 500, 40, 'ok'),
             (v_garden, v_b, 'test', 'claude-opus-5-5', 1000, 500, 30, 'ok');
    insert into public.ai_usage (garden_id, user_id, feature, cost_usd, status, created_at)
      values (v_garden, v_a, 'test', 5, 'ok', public.ai_month_start() - interval '1 day');
    perform set_config('test.a', v_a::text, true);
    perform set_config('test.b', v_b::text, true);
    perform set_config('test.c', v_c::text, true);
    perform set_config('test.garden', v_garden::text, true);
  end $$;

  -- (a) the edge function's check: member, not exhausted, not rate limited
  do $$
  declare v json;
  begin
    v := public.ai_precheck(current_setting('test.garden')::uuid, current_setting('test.b')::uuid);
    if not (v->>'member')::boolean or (v->>'budget_exhausted')::boolean or (v->>'rate_limited')::boolean
       or (v->>'spent_usd')::numeric <> 70 or (v->>'limit_usd')::numeric <> 100 then
      raise exception 'ai_usage_failed: precheck for a member is wrong: %', v;
    end if;
    v := public.ai_precheck(current_setting('test.garden')::uuid, current_setting('test.c')::uuid);
    if (v->>'member')::boolean then
      raise exception 'ai_usage_failed: a stranger passes as member';
    end if;
    raise notice 'ai_usage_ok: (a) precheck knows members, spend of this month only, and the default limit';
  end $$;

  -- ── As member B ────────────────────────────────────────────────────────────
  select set_config('request.jwt.claim.sub', current_setting('test.b'), true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare v json; v_rows int;
  begin
    v := public.ai_usage_summary(current_setting('test.garden')::uuid);
    if (v->>'spent_usd')::numeric <> 70 or (v->>'remaining_usd')::numeric <> 30
       or (v->>'warn')::boolean or (v->>'blocked')::boolean or (v->>'is_owner')::boolean
       or (v->>'requests')::int <> 2 then
      raise exception 'ai_usage_failed: summary for member wrong: %', v;
    end if;
    select count(*) into v_rows from public.ai_usage where garden_id = current_setting('test.garden')::uuid;
    if v_rows <> 3 then
      raise exception 'ai_usage_failed: member reads % rows of the usage book, expected 3', v_rows;
    end if;
    raise notice 'ai_usage_ok: (b) a member sees spend, what is left and the usage book';
  end $$;

  -- (c) nobody but the service role writes the usage book
  do $$ begin
    begin
      insert into public.ai_usage (garden_id, user_id, feature, cost_usd, status)
        values (current_setting('test.garden')::uuid, current_setting('test.b')::uuid, 'test', 0, 'ok');
      raise exception 'ai_usage_failed: a member wrote into the usage book';
    exception when insufficient_privilege then
      raise notice 'ai_usage_ok: (c) members cannot write the usage book';
    end;
    begin
      delete from public.ai_usage where garden_id = current_setting('test.garden')::uuid;
      raise exception 'ai_usage_failed: a member deleted from the usage book';
    exception when insufficient_privilege then
      null;
    end;
  end $$;

  -- (d) a member cannot change the limit, nor ask the internal check
  do $$ begin
    begin
      perform public.set_ai_monthly_limit(current_setting('test.garden')::uuid, 500);
      raise exception 'ai_usage_failed: a member changed the limit';
    exception when sqlstate '42501' then
      raise notice 'ai_usage_ok: (d) only the owner changes the limit';
    end;
    begin
      perform public.ai_precheck(current_setting('test.garden')::uuid, current_setting('test.b')::uuid);
      raise exception 'ai_usage_failed: a member called ai_precheck';
    exception when insufficient_privilege then
      null;
    end;
  end $$;

  -- ── As owner A ─────────────────────────────────────────────────────────────
  select set_config('request.jwt.claim.sub', current_setting('test.a'), true);
  do $$
  declare v json;
  begin
    v := public.set_ai_monthly_limit(current_setting('test.garden')::uuid, 80);
    if (v->>'limit_usd')::numeric <> 80 or not (v->>'warn')::boolean or (v->>'blocked')::boolean then
      raise exception 'ai_usage_failed: 70 of 80 should warn: %', v;
    end if;
    v := public.set_ai_monthly_limit(current_setting('test.garden')::uuid, 70);
    if not (v->>'blocked')::boolean or (v->>'warn')::boolean or (v->>'remaining_usd')::numeric <> 0 then
      raise exception 'ai_usage_failed: 70 of 70 should block: %', v;
    end if;
    begin
      perform public.set_ai_monthly_limit(current_setting('test.garden')::uuid, 5000);
      raise exception 'ai_usage_failed: an absurd limit was accepted';
    exception when sqlstate '22023' then
      null;
    end;
    raise notice 'ai_usage_ok: (e) warning from 80 %%, stop at 100 %%, limit within bounds';
  end $$;

  -- ── As a stranger ──────────────────────────────────────────────────────────
  select set_config('request.jwt.claim.sub', current_setting('test.c'), true);
  do $$
  declare v_rows int;
  begin
    select count(*) into v_rows from public.ai_usage where garden_id = current_setting('test.garden')::uuid;
    if v_rows <> 0 then
      raise exception 'ai_usage_failed: a stranger reads the usage book';
    end if;
    begin
      perform public.ai_usage_summary(current_setting('test.garden')::uuid);
      raise exception 'ai_usage_failed: a stranger got the summary';
    exception when sqlstate '42501' then
      raise notice 'ai_usage_ok: (f) strangers see nothing';
    end;
  end $$;

  -- (g) the hourly limit and the exhausted budget, as the edge function sees them
  reset role;
  do $$
  declare v json;
  begin
    v := public.ai_precheck(current_setting('test.garden')::uuid, current_setting('test.b')::uuid);
    if not (v->>'budget_exhausted')::boolean then
      raise exception 'ai_usage_failed: budget of 70 with 70 spent is not exhausted: %', v;
    end if;
    insert into public.ai_usage (garden_id, user_id, feature, cost_usd, status)
      select current_setting('test.garden')::uuid, current_setting('test.b')::uuid, 'test', 0, 'ok'
      from generate_series(1, 20);
    v := public.ai_precheck(current_setting('test.garden')::uuid, current_setting('test.b')::uuid);
    if not (v->>'rate_limited')::boolean then
      raise exception 'ai_usage_failed: 21 requests in an hour are not rate limited: %', v;
    end if;
    v := public.ai_precheck(current_setting('test.garden')::uuid, current_setting('test.a')::uuid);
    if (v->>'rate_limited')::boolean then
      raise exception 'ai_usage_failed: the hourly limit of one person hits the other';
    end if;
    raise notice 'ai_usage_ok: all cases passed';
  end $$;

ROLLBACK;
