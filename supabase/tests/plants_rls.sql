-- Phase 8 Plan 02: pgTAP-style RLS tests for plants + plant_companions (filled).
-- Tests target PLANT-DB-04 (read-only RLS) + the CHECK (plant_a_id < plant_b_id) constraint.
-- Pattern: supabase/tests/garden_plan_rls.sql (auth.users INSERT + SET LOCAL ROLE authenticated).
--
-- Invocation: `supabase test db --linked` after Migration 019 lands (Plan 04 Wave 3).
-- Atomicity: ROLLBACK at end — never persist test data.

BEGIN;

-- ─────────────────────────────────────────────────────────
-- Setup: synthetic auth user for role-switching tests
-- ─────────────────────────────────────────────────────────
SELECT set_config('test.user_a', 'a0000000-0000-4000-a000-000000000001', true);

INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, created_at, updated_at)
VALUES
  (current_setting('test.user_a')::uuid, '00000000-0000-0000-0000-000000000000',
   'test-plants-a@example.com', '$2a$10$fake', 'authenticated', 'authenticated', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insert one minimal plant + one peer plant so we have rows to read.
INSERT INTO public.plants (id, slug, name_de, family, category, sun_requirement, water_needs, data_source)
VALUES
  ('11111111-1111-4111-a111-000000000001', 'rls-test-tomate', 'RLS Test Tomate', 'Solanaceae', 'Gemüse', 'sonnig', 'hoch', 'own-research'),
  ('22222222-2222-4222-a222-000000000002', 'rls-test-basilikum', 'RLS Test Basilikum', 'Lamiaceae', 'Kraut', 'sonnig', 'mittel', 'own-research')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- TEST 1 — Authenticated user CAN SELECT from plants
-- ─────────────────────────────────────────────────────────
DO $$ DECLARE cnt int;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', current_setting('test.user_a')), true);

  SELECT count(*) INTO cnt FROM public.plants WHERE slug LIKE 'rls-test-%';
  IF cnt < 2 THEN
    RAISE EXCEPTION 'plants_rls_test1: authenticated SELECT plants returned % rows, expected >=2', cnt;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'plants_rls test1 PASS — authenticated CAN SELECT plants (% rows visible)', cnt;
END $$;

-- ─────────────────────────────────────────────────────────
-- TEST 2 — Authenticated user CAN SELECT from plant_companions
-- ─────────────────────────────────────────────────────────
-- First seed a companion row (service-role bypass via direct INSERT in this test transaction).
INSERT INTO public.plant_companions (plant_a_id, plant_b_id, relationship, source)
VALUES
  (LEAST('11111111-1111-4111-a111-000000000001'::uuid, '22222222-2222-4222-a222-000000000002'::uuid),
   GREATEST('11111111-1111-4111-a111-000000000001'::uuid, '22222222-2222-4222-a222-000000000002'::uuid),
   'companion', 'own-research')
ON CONFLICT DO NOTHING;

DO $$ DECLARE cnt int;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', current_setting('test.user_a')), true);

  SELECT count(*) INTO cnt FROM public.plant_companions;
  IF cnt < 1 THEN
    RAISE EXCEPTION 'plants_rls_test2: authenticated SELECT plant_companions returned 0 rows';
  END IF;

  RESET ROLE;
  RAISE NOTICE 'plants_rls test2 PASS — authenticated CAN SELECT plant_companions (% rows)', cnt;
END $$;

-- ─────────────────────────────────────────────────────────
-- TEST 3 — Authenticated user CANNOT INSERT into plants
-- (no WRITE policy → INSERT must fail with insufficient_privilege)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', current_setting('test.user_a')), true);

  BEGIN
    INSERT INTO public.plants (slug, name_de, family, category, sun_requirement, water_needs, data_source)
    VALUES ('rls-attack-row', 'Attack', 'Fakeaceae', 'Gemüse', 'sonnig', 'mittel', 'own-research');
    -- If we reach here, the policy did NOT deny — that's a failure.
    RESET ROLE;
    RAISE EXCEPTION 'plants_rls_test3: authenticated INSERT plants succeeded; RLS not enforced';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    -- Expected. Either insufficient_privilege (RLS denial) or check_violation
    -- (depending on PG version + policy semantics). Both indicate the write was blocked.
    RESET ROLE;
    RAISE NOTICE 'plants_rls test3 PASS — authenticated INSERT plants blocked as expected';
  END;
END $$;

-- ─────────────────────────────────────────────────────────
-- TEST 4 — Anonymous (no JWT claim, no role) gets 0 rows from plants SELECT
-- ─────────────────────────────────────────────────────────
DO $$ DECLARE cnt int;
BEGIN
  SET LOCAL ROLE anon;
  -- Clear any JWT claims so auth.uid() returns NULL.
  PERFORM set_config('request.jwt.claims', '{}', true);

  SELECT count(*) INTO cnt FROM public.plants WHERE slug LIKE 'rls-test-%';
  IF cnt <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'plants_rls_test4: anonymous SELECT plants returned % rows, expected 0', cnt;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'plants_rls test4 PASS — anonymous SELECT plants returns 0 rows';
END $$;

-- ─────────────────────────────────────────────────────────
-- TEST 5 — CHECK (plant_a_id < plant_b_id) is enforced
-- (insert with a > b; expect SQLSTATE 23514 check_violation)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    INSERT INTO public.plant_companions (plant_a_id, plant_b_id, relationship, source)
    VALUES
      (GREATEST('11111111-1111-4111-a111-000000000001'::uuid, '22222222-2222-4222-a222-000000000002'::uuid),
       LEAST('11111111-1111-4111-a111-000000000001'::uuid, '22222222-2222-4222-a222-000000000002'::uuid),
       'companion', 'own-research');
    RAISE EXCEPTION 'plants_rls_test5: a>b INSERT plant_companions succeeded; CHECK not enforced';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'plants_rls test5 PASS — CHECK (plant_a_id < plant_b_id) enforced (SQLSTATE 23514)';
  END;
END $$;

-- ─────────────────────────────────────────────────────────
-- Cleanup happens automatically via ROLLBACK below.
-- ─────────────────────────────────────────────────────────

ROLLBACK;
