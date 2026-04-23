-- RLS Phase 2 Test — schema-updated for Phase 2.5 (Plan 02.5-02).
-- Ausführung: supabase db query -f supabase/tests/rls_phase2.sql --linked
-- Erwartet: 2× NOTICE 'RLS ok: user B sieht 0 Zeilen von user A' (profiles + vereinsregeln)
-- Hinweis: vereinsregeln wurde in Migration 003 um garden_id + created_by_user_id erweitert.
--          Test verwendet ensure_default_garden_for_user RPC um einen Garten für User A zu seedan.
--
-- Test-User UUIDs (identisch zu rls_foundation.sql — gleiche Fixtures):
--   user-a@test.local  = b9667f2a-7e86-497b-9cff-3ae320c7ff2c
--   user-b@test.local  = d5fc0937-5e49-4fb5-9740-9940f075fab2
--
-- SET LOCAL ROLE authenticated ist erforderlich (analog Phase 1).
-- supabase db query läuft als postgres (superuser) — ohne ROLE-Wechsel
-- werden RLS-Policies ignoriert.

BEGIN;
  -- ── Als User A: JWT-Claims setzen + Rolle wechseln, dann INSERTs ──
  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- Profile für User A anlegen (idempotent — Profile kann bereits aus Migration 003 seed existieren)
  insert into public.profiles(id, plz, klimazone, archetype, display_name)
    values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, '12043', 4, 'selbstversorger', 'user_a')
    on conflict (id) do update set plz = excluded.plz, klimazone = excluded.klimazone, archetype = excluded.archetype;

  -- Phase 2.5 schema: garden_id NOT NULL + column renamed. Seed garden via RPC.
  do $$
  declare ga_id uuid;
  begin
    ga_id := public.ensure_default_garden_for_user();
    insert into public.vereinsregeln(
      id, created_by_user_id, updated_by_user_id, garden_id,
      source, titel, wert, einheit, ist_bkleingg, aktiv
    ) values (
      gen_random_uuid(), 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid,
      'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, ga_id,
      'checklist', 'Heckenhöhe max', 120, 'cm', false, true
    );
  end $$;

  -- ── Als User B: JWT-Claim wechseln, SELECTs müssen 0 Zeilen ergeben ──
  select set_config('request.jwt.claim.sub', 'd5fc0937-5e49-4fb5-9740-9940f075fab2', true);

  do $$
  declare cnt int;
  begin
    -- profiles isolation
    select count(*) into cnt
      from public.profiles
     where id = 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid;
    if cnt <> 0 then
      raise exception 'RLS breach (profiles): user B sees % rows of user A', cnt;
    end if;
    raise notice 'RLS ok (profiles): user B sieht 0 Zeilen von user A';

    -- vereinsregeln isolation (column renamed user_id → created_by_user_id in Migration 003)
    select count(*) into cnt
      from public.vereinsregeln
     where created_by_user_id = 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid;
    if cnt <> 0 then
      raise exception 'RLS breach (vereinsregeln): user B sees % rows of user A', cnt;
    end if;
    raise notice 'RLS ok (vereinsregeln): user B sieht 0 Zeilen von user A';
  end $$;

ROLLBACK;
