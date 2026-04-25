-- Phase 3 / LWW-Guard Test — Plan 03-01 Task 02
-- Ausführung: supabase db query --linked -f supabase/tests/lww_guard.sql
-- Prüft: P9011 (older write reject) + P9010 (null updated_at) + happy path (newer write accept)
-- Pattern: BEGIN/ROLLBACK Wrapper + JWT-Claim-Switch + do $$-Assertions
-- Voraussetzung: Migration 013 applied (tg_lww_guard + aa_lww_guard_vereinsregeln).
BEGIN;

  -- Setup-Phase als Superuser (ohne set local role authenticated):
  -- Superuser-Seed muss VOR dem role-switch stattfinden (Phase 02.5 P02 Decision).
  do $$
  declare
    v_owner    uuid := gen_random_uuid();
    v_garden   uuid;
    v_rule_id  uuid := gen_random_uuid();
    v_now      timestamptz := now();
  begin
    -- Auth-User anlegen
    INSERT INTO auth.users (id, email, aud, role)
      VALUES (v_owner, 'owner_lww_' || v_owner::text || '@test.local', 'authenticated', 'authenticated')
      ON CONFLICT DO NOTHING;

    -- Profile anlegen (nur id + display_name — mode ist TypeScript-only)
    INSERT INTO public.profiles (id, display_name)
      VALUES (v_owner, 'LWW-Test-Owner')
      ON CONFLICT (id) DO NOTHING;

    -- Garten anlegen
    INSERT INTO public.gardens (id, name, created_by_user_id, updated_by_user_id)
      VALUES (gen_random_uuid(), 'LWW Test Garden', v_owner, v_owner)
      RETURNING id INTO v_garden;

    -- Owner-Membership anlegen
    INSERT INTO public.garden_members (garden_id, user_id, role)
      VALUES (v_garden, v_owner, 'owner');

    -- Vereinsregel mit bekanntem updated_at anlegen
    INSERT INTO public.vereinsregeln
        (id, created_by_user_id, updated_by_user_id, garden_id, titel, ist_bkleingg, aktiv, source, updated_at)
      VALUES
        (v_rule_id, v_owner, v_owner, v_garden, 'Heckenmass', false, true, 'manual', v_now);

    -- UUIDs via set_config für spätere role-switch-Nutzung speichern
    PERFORM set_config('test.owner_id',        v_owner::text,   true);
    PERFORM set_config('test.garden_id',       v_garden::text,  true);
    PERFORM set_config('test.rule_id',         v_rule_id::text, true);
    PERFORM set_config('test.seed_updated_at', v_now::text,     true);
  end $$;

  -- Auth-Context: Owner authentifizieren
  select set_config('request.jwt.claim.sub',  current_setting('test.owner_id'), true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- CASE 1: Älteren updated_at → P9011 (LWW reject)
  do $$ begin
    begin
      UPDATE public.vereinsregeln
        SET titel      = 'older-write',
            updated_at = current_setting('test.seed_updated_at')::timestamptz - interval '1 hour'
        WHERE id = current_setting('test.rule_id')::uuid;
      RAISE EXCEPTION 'lww_guard_test_failed_P9011_not_raised';
    exception when sqlstate 'P9011' then
      RAISE NOTICE 'lww_guard_ok: P9011 rejected older write';
    end;
  end $$;

  -- CASE 2: NULL updated_at → P9010 (missing updated_at)
  do $$ begin
    begin
      UPDATE public.vereinsregeln
        SET titel      = 'null-write',
            updated_at = NULL
        WHERE id = current_setting('test.rule_id')::uuid;
      RAISE EXCEPTION 'lww_guard_test_failed_P9010_not_raised';
    exception when sqlstate 'P9010' then
      RAISE NOTICE 'lww_guard_ok: P9010 rejected null updated_at';
    end;
  end $$;

  -- CASE 3: Neueren updated_at → akzeptiert (happy path)
  do $$ begin
    UPDATE public.vereinsregeln
      SET titel      = 'newer-write',
          updated_at = current_setting('test.seed_updated_at')::timestamptz + interval '1 hour'
      WHERE id = current_setting('test.rule_id')::uuid;
    RAISE NOTICE 'lww_guard_ok: accept newer write';
  end $$;

ROLLBACK;
