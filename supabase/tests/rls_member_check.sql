-- Phase 2.5 RLS Member-Check Test — Plan 02.5-01-04 (stub) / Plan 02.5-02 (green)
-- Ausführung: supabase db query -f supabase/tests/rls_member_check.sql --linked
-- Erwartet nach Migration 003: 4× NOTICE 'RLS ok: user B sieht 0 Zeilen von garden A' (gardens, garden_members, vereinsregeln, ai_jobs)
-- Voraussetzung: Migration 003 angewendet (gardens + garden_members + garden_id auf vereinsregeln/ai_jobs/ai_results).
--
-- Pattern: rls_phase2.sql — BEGIN/ROLLBACK mit set_config + SET LOCAL ROLE authenticated.
-- JWT-Claim-Switch zwischen User A (Owner von Garten A) und User B (kein Member).

BEGIN;
  -- User A: Owner von Garten A
  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- Profile für A (idempotent, falls schon seeded)
  insert into public.profiles(id, display_name)
    values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, 'user_a')
    on conflict (id) do nothing;

  -- Garten A anlegen über ensure_default_garden_for_user RPC
  -- (unterlässt direkten INSERT — RLS blockiert direkten gardens-Insert, RPC ist der einzige Pfad)
  do $$
  declare ga_id uuid;
  begin
    ga_id := public.ensure_default_garden_for_user();
    -- Vereinsregel in Garten A anlegen
    insert into public.vereinsregeln(id, created_by_user_id, updated_by_user_id, garden_id, source, titel, ist_bkleingg, aktiv)
      values (gen_random_uuid(), 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, ga_id, 'checklist', 'Heckenhöhe max', false, true);
  end $$;

  -- User B: nicht-Mitglied von Garten A
  select set_config('request.jwt.claim.sub', 'd5fc0937-5e49-4fb5-9740-9940f075fab2', true);

  insert into public.profiles(id, display_name)
    values ('d5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'user_b')
    on conflict (id) do nothing;

  do $$
  declare cnt int; ga_id uuid;
  begin
    -- gardens isolation
    select id into ga_id from public.gardens where created_by_user_id = 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid limit 1;
    select count(*) into cnt from public.gardens where id = ga_id;
    if cnt <> 0 then raise exception 'RLS breach (gardens): user B sees % rows of garden A', cnt; end if;
    raise notice 'RLS ok (gardens): user B sieht 0 Zeilen von garden A';

    -- garden_members isolation
    select count(*) into cnt from public.garden_members where garden_id = ga_id;
    if cnt <> 0 then raise exception 'RLS breach (garden_members): user B sees % rows of garden A', cnt; end if;
    raise notice 'RLS ok (garden_members): user B sieht 0 Zeilen von garden A';

    -- vereinsregeln isolation
    select count(*) into cnt from public.vereinsregeln where garden_id = ga_id;
    if cnt <> 0 then raise exception 'RLS breach (vereinsregeln): user B sees % rows of garden A', cnt; end if;
    raise notice 'RLS ok (vereinsregeln): user B sieht 0 Zeilen von garden A';

    -- ai_jobs isolation
    select count(*) into cnt from public.ai_jobs where garden_id = ga_id;
    if cnt <> 0 then raise exception 'RLS breach (ai_jobs): user B sees % rows of garden A', cnt; end if;
    raise notice 'RLS ok (ai_jobs): user B sieht 0 Zeilen von garden A';
  end $$;
ROLLBACK;
