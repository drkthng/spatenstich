-- Phase 3 / photo_queue Member-RLS Test (I-7) — Plan 03-01 Task 02
-- Ausführung: supabase db query --linked -f supabase/tests/photo-queue-rls.test.sql
-- Invariante I-7 aus 03-VALIDATION.md:
--   photo_queue hat policy photo_queue_member_all mit is_garden_member(garden_id).
--   CASE 1: u1 INSERT in photo_queue mit garden_id = g2 (fremd) → 42501 (WITH CHECK fail)
--   CASE 2: u1 SELECT auf photo_queue WHERE garden_id = g2 → 0 rows (USING filter)
--   CASE 3: u1 INSERT in photo_queue mit garden_id = g1 (eigen) → success (positive control)
-- Setup: 2 Gärten (g1, g2) + 1 User u1 (Member nur in g1) + u_own2 (Owner von g2)
-- Voraussetzung: Migration 013 applied (photo_queue + photo_queue_member_all policy).
BEGIN;

  -- Setup-Phase als Superuser (vor role-switch)
  do $$
  declare
    v_u1      uuid := gen_random_uuid();
    v_u_own2  uuid := gen_random_uuid();
    v_g1      uuid := gen_random_uuid();
    v_g2      uuid := gen_random_uuid();
  begin
    -- Auth-Users anlegen
    INSERT INTO auth.users (id, email, aud, role) VALUES
      (v_u1,     'u1_pqrls_'     || v_u1::text     || '@test.local', 'authenticated', 'authenticated'),
      (v_u_own2, 'uown2_pqrls_'  || v_u_own2::text || '@test.local', 'authenticated', 'authenticated')
      ON CONFLICT DO NOTHING;

    -- Profile anlegen
    INSERT INTO public.profiles (id, display_name) VALUES
      (v_u1,     'PQ-U1'),
      (v_u_own2, 'PQ-UOwn2')
      ON CONFLICT (id) DO NOTHING;

    -- Gärten anlegen (g1 = u1-Garden, g2 = fremder Garten)
    INSERT INTO public.gardens (id, name, created_by_user_id, updated_by_user_id) VALUES
      (v_g1, 'Garden-1 (u1-member)', v_u1,     v_u1),
      (v_g2, 'Garden-2 (fremd)',     v_u_own2, v_u_own2);

    -- Memberships: u1 nur in g1, u_own2 nur in g2
    INSERT INTO public.garden_members (garden_id, user_id, role) VALUES
      (v_g1, v_u1,     'owner'),
      (v_g2, v_u_own2, 'owner');

    -- Seed: 1 photo_queue-Row in g2 (als Superuser, RLS-Bypass für Seeding)
    INSERT INTO public.photo_queue (id, garden_id, created_by_user_id, local_uri, kind)
      VALUES (gen_random_uuid(), v_g2, v_u_own2, 'file:///seed-g2.jpg', 'plan_photo');

    -- Test-Globals speichern
    PERFORM set_config('test.u1', v_u1::text,     true);
    PERFORM set_config('test.g1', v_g1::text,     true);
    PERFORM set_config('test.g2', v_g2::text,     true);
  end $$;

  -- Auth-Context-Switch: u1 authentifizieren
  select set_config('request.jwt.claim.sub',  current_setting('test.u1'), true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- CASE 1: u1 INSERT in photo_queue mit garden_id = g2 → 42501 (WITH CHECK fail)
  do $$ begin
    begin
      INSERT INTO public.photo_queue (garden_id, created_by_user_id, local_uri, kind)
        VALUES (
          current_setting('test.g2')::uuid,
          current_setting('test.u1')::uuid,
          'file:///attacker.jpg',
          'plan_photo'
        );
      RAISE EXCEPTION 'photo_queue_rls_test_failed_non_member_insert_accepted';
    exception when sqlstate '42501' then
      RAISE NOTICE 'photo_queue_rls_ok: non-member INSERT rejected with 42501';
    end;
  end $$;

  -- CASE 2: u1 SELECT auf photo_queue WHERE garden_id = g2 → 0 rows (USING filter)
  do $$ declare v_rows int;
  begin
    SELECT count(*) INTO v_rows FROM public.photo_queue
      WHERE garden_id = current_setting('test.g2')::uuid;
    IF v_rows <> 0 THEN
      RAISE EXCEPTION 'photo_queue_rls_test_failed_non_member_saw_% rows for fremden Garten', v_rows;
    END IF;
    RAISE NOTICE 'photo_queue_rls_ok: non-member SELECT returns 0 rows (rows=%)', v_rows;
  end $$;

  -- CASE 3: u1 INSERT in photo_queue mit garden_id = g1 → success (positive control)
  do $$ begin
    INSERT INTO public.photo_queue (garden_id, created_by_user_id, local_uri, kind)
      VALUES (
        current_setting('test.g1')::uuid,
        current_setting('test.u1')::uuid,
        'file:///own.jpg',
        'plan_photo'
      );
    RAISE NOTICE 'photo_queue_rls_ok: member INSERT accepted for own garden g1';
  end $$;

ROLLBACK;
