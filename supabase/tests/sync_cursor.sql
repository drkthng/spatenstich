-- Phase 33 / Migration 021 — sync cursor, edit times, soft member removal.
-- Run: supabase db query --linked -f supabase/tests/sync_cursor.sql
-- Pattern as in lww_guard.sql: BEGIN/ROLLBACK, JWT claim switch, do-blocks that raise
-- on failure. Nothing is left behind.
BEGIN;

  do $$
  declare
    v_a uuid := gen_random_uuid();
    v_b uuid := gen_random_uuid();
    v_c uuid := gen_random_uuid();
    v_garden uuid;
    v_el uuid := gen_random_uuid();
  begin
    insert into auth.users (id, email, aud, role) values
      (v_a, 'a_' || v_a || '@test.local', 'authenticated', 'authenticated'),
      (v_b, 'b_' || v_b || '@test.local', 'authenticated', 'authenticated'),
      (v_c, 'c_' || v_c || '@test.local', 'authenticated', 'authenticated')
      on conflict do nothing;
    insert into public.profiles (id, display_name) values (v_a, 'A'), (v_b, 'B'), (v_c, 'C')
      on conflict (id) do nothing;
    insert into public.gardens (name, created_by_user_id, updated_by_user_id)
      values ('Sync Test', v_a, v_a) returning id into v_garden;
    insert into public.garden_members (garden_id, user_id, role) values
      (v_garden, v_a, 'owner'), (v_garden, v_b, 'member');
    insert into public.plan_elements
        (id, garden_id, element_type, label, x_m, y_m, width_m, height_m, updated_at)
      values (v_el, v_garden, 'Beet', 'Beet 1', 1, 1, 2, 1, now() - interval '1 hour');

    perform set_config('test.a', v_a::text, true);
    perform set_config('test.b', v_b::text, true);
    perform set_config('test.c', v_c::text, true);
    perform set_config('test.garden', v_garden::text, true);
    perform set_config('test.el', v_el::text, true);
  end $$;

  -- ── As member A ────────────────────────────────────────────────────────────
  select set_config('request.jwt.claim.sub', current_setting('test.a'), true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- (a) insert sets server_updated_at and keeps the edit time that was sent
  do $$
  declare v_id uuid := gen_random_uuid(); v_sua timestamptz; v_ua timestamptz;
          v_edit timestamptz := now() - interval '3 hours';
  begin
    insert into public.plan_elements
        (id, garden_id, element_type, label, x_m, y_m, width_m, height_m, updated_at)
      values (v_id, current_setting('test.garden')::uuid, 'Beet', 'offline', 0, 0, 1, 1, v_edit);
    select server_updated_at, updated_at into v_sua, v_ua from public.plan_elements where id = v_id;
    if v_sua is null or v_sua < now() - interval '1 minute' then
      raise exception 'sync_cursor_failed: insert did not stamp server_updated_at (%).', v_sua;
    end if;
    if v_ua <> v_edit then
      raise exception 'sync_cursor_failed: insert changed the edit time (% <> %).', v_ua, v_edit;
    end if;
    raise notice 'sync_cursor_ok: (a) offline edit from 3 hours ago is stamped as arrived now';
  end $$;

  -- (b) an older edit is rejected
  do $$ begin
    begin
      update public.plan_elements
        set label = 'older', updated_at = now() - interval '2 hours'
        where id = current_setting('test.el')::uuid;
      raise exception 'sync_cursor_failed: older edit was accepted';
    exception when sqlstate 'P9011' then
      raise notice 'sync_cursor_ok: (b) older edit rejected with P9011';
    end;
  end $$;

  -- (c) a newer edit keeps its edit time and moves the cursor column forward
  do $$
  declare v_before timestamptz; v_after timestamptz; v_ua timestamptz;
          v_edit timestamptz := now() - interval '10 minutes';
  begin
    select server_updated_at into v_before from public.plan_elements where id = current_setting('test.el')::uuid;
    update public.plan_elements set label = 'newer', updated_at = v_edit
      where id = current_setting('test.el')::uuid;
    select server_updated_at, updated_at into v_after, v_ua from public.plan_elements where id = current_setting('test.el')::uuid;
    if v_ua <> v_edit then
      raise exception 'sync_cursor_failed: edit time overwritten (% <> %).', v_ua, v_edit;
    end if;
    if v_after <= v_before then
      raise exception 'sync_cursor_failed: server_updated_at did not rise (% -> %).', v_before, v_after;
    end if;
    raise notice 'sync_cursor_ok: (c) newer edit keeps its time, server_updated_at rises';
  end $$;

  -- (d) a change without an edit time of its own is stamped now
  do $$
  declare v_ua timestamptz;
  begin
    update public.plan_elements set label = 'no stamp' where id = current_setting('test.el')::uuid;
    select updated_at into v_ua from public.plan_elements where id = current_setting('test.el')::uuid;
    if v_ua < now() - interval '1 minute' then
      raise exception 'sync_cursor_failed: unstamped change kept the old edit time (%).', v_ua;
    end if;
    raise notice 'sync_cursor_ok: (d) unstamped change is stamped now';
  end $$;

  -- (e) an edit time from the future is replaced
  do $$
  declare v_ua timestamptz;
  begin
    update public.plan_elements set label = 'future', updated_at = now() + interval '2 days'
      where id = current_setting('test.el')::uuid;
    select updated_at into v_ua from public.plan_elements where id = current_setting('test.el')::uuid;
    if v_ua > now() + interval '5 minutes' then
      raise exception 'sync_cursor_failed: future edit time kept (%).', v_ua;
    end if;
    raise notice 'sync_cursor_ok: (e) future edit time replaced';
  end $$;

  -- (f) review tables: older edit rejected too
  do $$
  declare v_import uuid := gen_random_uuid();
  begin
    insert into public.imports (id, garden_id, imported_at, payload_schema_version, updated_at)
      values (v_import, current_setting('test.garden')::uuid, now(), '1.0', now() - interval '1 hour');
    begin
      update public.imports set chat_reference = 'older', updated_at = now() - interval '2 hours'
        where id = v_import;
      raise exception 'sync_cursor_failed: older edit on imports was accepted';
    exception when sqlstate 'P9011' then
      raise notice 'sync_cursor_ok: (f) imports reject an older edit';
    end;
  end $$;

  -- (g) a third person cannot join a full garden
  reset role;
  do $$ begin
    begin
      insert into public.garden_members (garden_id, user_id, role)
        values (current_setting('test.garden')::uuid, current_setting('test.c')::uuid, 'member');
      raise exception 'sync_cursor_failed: third member accepted';
    exception when sqlstate '23514' then
      raise notice 'sync_cursor_ok: (g) member limit still holds';
    end;
  end $$;

  -- ── As member B: may not remove A ──────────────────────────────────────────
  select set_config('request.jwt.claim.sub', current_setting('test.b'), true);
  set local role authenticated;
  do $$ begin
    begin
      perform public.remove_garden_member(current_setting('test.garden')::uuid, current_setting('test.a')::uuid);
      raise exception 'sync_cursor_failed: member removed the owner';
    exception when sqlstate '42501' then
      raise notice 'sync_cursor_ok: (h) a member cannot remove someone else';
    end;
  end $$;

  -- ── As owner A: remove B ───────────────────────────────────────────────────
  select set_config('request.jwt.claim.sub', current_setting('test.a'), true);
  do $$
  declare v_seen int; v_deleted timestamptz;
  begin
    perform public.remove_garden_member(current_setting('test.garden')::uuid, current_setting('test.b')::uuid);
    select count(*), max(deleted_at) into v_seen, v_deleted from public.garden_members
      where garden_id = current_setting('test.garden')::uuid and user_id = current_setting('test.b')::uuid;
    if v_seen <> 1 or v_deleted is null then
      raise exception 'sync_cursor_failed: owner does not see the removal mark (rows %, deleted %).', v_seen, v_deleted;
    end if;
    raise notice 'sync_cursor_ok: (i) removal is a mark the owner can still read';
  end $$;

  -- ── As removed B: no access any more ───────────────────────────────────────
  select set_config('request.jwt.claim.sub', current_setting('test.b'), true);
  do $$
  declare v_rows int;
  begin
    if public.is_garden_member(current_setting('test.garden')::uuid) then
      raise exception 'sync_cursor_failed: removed member still counts as member';
    end if;
    select count(*) into v_rows from public.plan_elements where garden_id = current_setting('test.garden')::uuid;
    if v_rows <> 0 then
      raise exception 'sync_cursor_failed: removed member still reads % plan rows', v_rows;
    end if;
    raise notice 'sync_cursor_ok: (j) removed member has no access';
  end $$;

  -- ── B joins again with a new code: the old row comes back ──────────────────
  select set_config('request.jwt.claim.sub', current_setting('test.a'), true);
  select set_config('test.code', public.create_invite_for_garden(current_setting('test.garden')::uuid), true);
  select set_config('request.jwt.claim.sub', current_setting('test.b'), true);
  do $$
  declare v_garden uuid;
  begin
    v_garden := public.consume_invite_code(current_setting('test.code'));
    if v_garden <> current_setting('test.garden')::uuid or not public.is_garden_member(v_garden) then
      raise exception 'sync_cursor_failed: rejoin did not restore membership';
    end if;
    raise notice 'sync_cursor_ok: (k) a removed member can join again';
  end $$;

  reset role;
  do $$
  declare v_rows int;
  begin
    select count(*) into v_rows from public.garden_members where garden_id = current_setting('test.garden')::uuid;
    if v_rows <> 2 then
      raise exception 'sync_cursor_failed: expected 2 member rows after rejoin, found %', v_rows;
    end if;
    raise notice 'sync_cursor_ok: all cases passed';
  end $$;

ROLLBACK;
