-- Phase 35 / Migration 024 — photo findings and garden-own catalog entries.
-- Run: supabase db query --linked -f supabase/tests/photo_findings.sql
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
      values ('Foto Test', v_a, v_a) returning id into v_garden;
    insert into public.garden_members (garden_id, user_id, role) values
      (v_garden, v_a, 'owner'), (v_garden, v_b, 'member');
    perform set_config('test.a', v_a::text, true);
    perform set_config('test.b', v_b::text, true);
    perform set_config('test.c', v_c::text, true);
    perform set_config('test.garden', v_garden::text, true);
    perform set_config('test.finding', gen_random_uuid()::text, true);
    perform set_config('test.plant', gen_random_uuid()::text, true);
  end $$;

  -- ── As member A: a check stores a finding and proposes a catalog entry ─────
  select set_config('request.jwt.claim.sub', current_setting('test.a'), true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare v_row public.photo_findings;
  begin
    insert into public.photo_findings
      (id, garden_id, check_id, kind, title, detail, proposal, confidence, closeup_of, created_by_user_id, updated_by_user_id, updated_at)
    values
      (current_setting('test.finding')::uuid, current_setting('test.garden')::uuid, gen_random_uuid(), 'catalog_plant',
       'Yacon steht nicht im Katalog', 'Auf dem Foto links.',
       '{"plantName":"Yacon","catalog":{"nameDe":"Yacon","plantStartMonth":5,"plantEndMonth":6}}'::jsonb,
       0.8, null, current_setting('test.a')::uuid, current_setting('test.a')::uuid, now() - interval '10 minutes')
    returning * into v_row;
    if v_row.status <> 'open' or v_row.task_requested or v_row.server_updated_at is null then
      raise exception 'photo_failed: defaults of a new finding are wrong';
    end if;
    if v_row.proposal->'catalog'->>'nameDe' <> 'Yacon' then
      raise exception 'photo_failed: the proposal did not survive as JSON';
    end if;
    -- The edit time of the device is kept (it is not from the future).
    if v_row.updated_at > now() - interval '9 minutes' then
      raise exception 'photo_failed: the edit time was replaced by the server time';
    end if;
    raise notice 'photo_ok: (a) a member stores a finding; open by default, proposal intact, edit time kept';
  end $$;

  do $$
  begin
    begin
      insert into public.photo_findings (garden_id, check_id, kind, title)
        values (current_setting('test.garden')::uuid, gen_random_uuid(), 'guess', 'x');
      raise exception 'photo_failed: an unknown kind was accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.photo_findings (garden_id, check_id, kind, title, confidence)
        values (current_setting('test.garden')::uuid, gen_random_uuid(), 'pest', 'x', 1.5);
      raise exception 'photo_failed: a confidence above 1 was accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.photo_findings (garden_id, check_id, kind, title, status)
        values (current_setting('test.garden')::uuid, gen_random_uuid(), 'pest', 'x', 'done');
      raise exception 'photo_failed: an unknown status was accepted';
    exception when check_violation then null;
    end;
    raise notice 'photo_ok: (b) unknown kinds, statuses and impossible confidence are refused';
  end $$;

  -- ── As member B: sees the open finding, accepts it, adds the plant ─────────
  reset role;
  select set_config('request.jwt.claim.sub', current_setting('test.b'), true);
  set local role authenticated;

  do $$
  declare v_open int; v_before timestamptz; v_after timestamptz; v_plant public.garden_plants;
  begin
    select count(*) into v_open from public.photo_findings
      where garden_id = current_setting('test.garden')::uuid and status = 'open';
    if v_open <> 1 then
      raise exception 'photo_failed: the partner sees % open findings, expected 1', v_open;
    end if;
    select server_updated_at into v_before from public.photo_findings where id = current_setting('test.finding')::uuid;

    update public.photo_findings
      set status = 'accepted', resolved_at = now(), updated_at = now(), updated_by_user_id = current_setting('test.b')::uuid
      where id = current_setting('test.finding')::uuid;
    select server_updated_at into v_after from public.photo_findings where id = current_setting('test.finding')::uuid;
    if v_after <= v_before then
      raise exception 'photo_failed: the server stamp did not move on an update';
    end if;

    insert into public.garden_plants
      (id, garden_id, slug, name_de, name_botanical, family, category, min_spacing_cm, plant_doy_start, plant_doy_end, updated_by_user_id)
    values
      (current_setting('test.plant')::uuid, current_setting('test.garden')::uuid, 'yacon', 'Yacon', 'Smallanthus sonchifolius',
       'Korbblütler', 'Gemüse', 80, 121, 181, current_setting('test.b')::uuid)
    returning * into v_plant;
    if v_plant.source <> 'photo' or v_plant.server_updated_at is null then
      raise exception 'photo_failed: defaults of a garden plant are wrong';
    end if;
    raise notice 'photo_ok: (c) the partner sees the open finding, accepts it and adds the catalog entry';
  end $$;

  -- An edit that is older than the stored one is refused (same rule as the plan).
  do $$
  begin
    begin
      update public.photo_findings
        set status = 'dismissed', updated_at = now() - interval '1 hour'
        where id = current_setting('test.finding')::uuid;
      raise exception 'photo_failed: an older edit replaced a newer one';
    exception when sqlstate 'P9011' then null;
    end;
    raise notice 'photo_ok: (d) an older edit of a finding is refused (P9011)';
  end $$;

  do $$
  begin
    begin
      insert into public.garden_plants (garden_id, slug, name_de)
        values (current_setting('test.garden')::uuid, 'yacon', 'Yacon zwei');
      raise exception 'photo_failed: the same slug was accepted twice in one garden';
    exception when unique_violation then null;
    end;
    begin
      insert into public.garden_plants (garden_id, slug, name_de)
        values (current_setting('test.garden')::uuid, 'Kein Slug!', 'x');
      raise exception 'photo_failed: a slug with spaces and capitals was accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.garden_plants (garden_id, slug, name_de, plant_doy_start)
        values (current_setting('test.garden')::uuid, 'tag-400', 'x', 400);
      raise exception 'photo_failed: day 400 of the year was accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.garden_plants (garden_id, slug, name_de, category)
        values (current_setting('test.garden')::uuid, 'pilz', 'x', 'Pilz');
      raise exception 'photo_failed: an unknown category was accepted';
    exception when check_violation then null;
    end;
    -- A deleted entry frees its name.
    update public.garden_plants set deleted_at = now(), updated_at = now() where id = current_setting('test.plant')::uuid;
    insert into public.garden_plants (garden_id, slug, name_de)
      values (current_setting('test.garden')::uuid, 'yacon', 'Yacon neu');
    raise notice 'photo_ok: (e) garden plants: one live entry per slug, valid slug, days and category only';
  end $$;

  -- ── As a stranger: nothing to see, nothing to write ────────────────────────
  reset role;
  select set_config('request.jwt.claim.sub', current_setting('test.c'), true);
  set local role authenticated;

  do $$
  declare v_rows int;
  begin
    select count(*) into v_rows from public.photo_findings where garden_id = current_setting('test.garden')::uuid;
    if v_rows <> 0 then
      raise exception 'photo_failed: a stranger reads % findings', v_rows;
    end if;
    select count(*) into v_rows from public.garden_plants where garden_id = current_setting('test.garden')::uuid;
    if v_rows <> 0 then
      raise exception 'photo_failed: a stranger reads % garden plants', v_rows;
    end if;
    begin
      insert into public.photo_findings (garden_id, check_id, kind, title)
        values (current_setting('test.garden')::uuid, gen_random_uuid(), 'pest', 'fremd');
      raise exception 'photo_failed: a stranger wrote a finding';
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.garden_plants (garden_id, slug, name_de)
        values (current_setting('test.garden')::uuid, 'fremd', 'fremd');
      raise exception 'photo_failed: a stranger wrote a garden plant';
    exception when insufficient_privilege then null;
    end;
    update public.photo_findings set status = 'dismissed', updated_at = now()
      where id = current_setting('test.finding')::uuid;
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then
      raise exception 'photo_failed: a stranger changed a finding';
    end if;
    raise notice 'photo_ok: (f) someone who is not a member neither reads nor writes findings or garden plants';
  end $$;

  -- ── Without sign-in ────────────────────────────────────────────────────────
  reset role;
  select set_config('request.jwt.claim.sub', '', true);
  set local role anon;

  do $$
  declare v_rows int;
  begin
    begin
      select count(*) into v_rows from public.photo_findings;
      if v_rows <> 0 then
        raise exception 'photo_failed: a visitor reads findings';
      end if;
    exception when insufficient_privilege then null;
    end;
    begin
      select count(*) into v_rows from public.garden_plants;
      if v_rows <> 0 then
        raise exception 'photo_failed: a visitor reads garden plants';
      end if;
    exception when insufficient_privilege then null;
    end;
    raise notice 'photo_ok: (g) without a sign-in there is nothing to read';
  end $$;

  reset role;

  -- The tables are part of the live updates.
  do $$
  declare v_count int;
  begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      select count(*) into v_count from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public'
          and tablename in ('photo_findings', 'garden_plants');
      if v_count <> 2 then
        raise exception 'photo_failed: % of 2 tables are in the realtime publication', v_count;
      end if;
    end if;
    raise notice 'photo_ok: (h) both tables are in the realtime publication';
  end $$;

ROLLBACK;
