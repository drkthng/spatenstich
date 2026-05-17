-- Phase 8 Plan 01: pgTAP-style RLS tests for plants + plant_companions.
-- Wave 0 skeleton — assertions filled in Plan 02 (Wave 1) after Migration 019 lands.
-- Analog: supabase/tests/garden_plan_rls.sql.
-- Tests target PLANT-DB-04 (read-only RLS) + the CHECK (plant_a_id < plant_b_id) constraint.
--
-- Invocation: `supabase test db --linked` after Wave 1 push.
-- Status (Wave 0): SKELETON. All DO blocks raise NOTICE only; no EXCEPTION yet.

BEGIN;

-- ─────────────────────────────────────────────────────────
-- Setup: two synthetic auth users for role-switching tests
-- ─────────────────────────────────────────────────────────
SELECT set_config('test.user_a', 'a0000000-0000-4000-a000-000000000001', true);
SELECT set_config('test.user_b', 'b0000000-0000-4000-b000-000000000002', true);

-- TODO Wave 1: INSERT auth.users rows for test.user_a + test.user_b
--   (pattern: garden_plan_rls.sql lines 30-48 with ON CONFLICT (id) DO NOTHING).

-- ─────────────────────────────────────────────────────────
-- TEST 1 — Authenticated user CAN SELECT from plants
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  -- TODO Wave 1: SET LOCAL ROLE authenticated;
  --   SELECT set_config('request.jwt.claims', '{"sub":"<user_a>","role":"authenticated"}', true);
  --   PERFORM 1 FROM public.plants LIMIT 1;
  --   GET DIAGNOSTICS cnt = ROW_COUNT;
  --   IF cnt < 0 THEN RAISE EXCEPTION 'plants_rls_test1: authenticated SELECT failed'; END IF;
  RAISE NOTICE 'plants_rls test1 SKELETON — authenticated CAN SELECT plants';
END $$;

-- ─────────────────────────────────────────────────────────
-- TEST 2 — Authenticated user CAN SELECT from plant_companions
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  -- TODO Wave 1: same pattern as TEST 1 against plant_companions table
  RAISE NOTICE 'plants_rls test2 SKELETON — authenticated CAN SELECT plant_companions';
END $$;

-- ─────────────────────────────────────────────────────────
-- TEST 3 — Authenticated user CANNOT INSERT/UPDATE/DELETE on plants
-- (no WRITE policy exists → policy denies; the write fails silently or raises)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  -- TODO Wave 1: SET LOCAL ROLE authenticated; attempt INSERT INTO public.plants (...);
  --   catch the expected denial (insufficient_privilege / no_policy).
  --   Assert that no row was created.
  RAISE NOTICE 'plants_rls test3 SKELETON — authenticated CANNOT INSERT plants';
END $$;

-- ─────────────────────────────────────────────────────────
-- TEST 4 — Anonymous (auth.uid() IS NULL) gets 0 rows from plants SELECT
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  -- TODO Wave 1: SET LOCAL ROLE anon;
  --   SELECT set_config('request.jwt.claims', NULL, true);
  --   PERFORM 1 FROM public.plants;
  --   assert ROW_COUNT = 0 (RLS denies).
  RAISE NOTICE 'plants_rls test4 SKELETON — anonymous gets 0 rows from plants';
END $$;

-- ─────────────────────────────────────────────────────────
-- TEST 5 — CHECK (plant_a_id < plant_b_id) is enforced
-- (service-role bypass to test the CHECK; expect SQLSTATE 23514 check_violation)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  -- TODO Wave 1: RESET ROLE; INSERT INTO public.plant_companions
  --   (plant_a_id, plant_b_id, relationship, source) VALUES
  --   ('zzzzzzzz-...', 'aaaaaaaa-...', 'companion', 'test')  -- intentionally a > b
  --   in a sub-transaction; expect to catch SQLSTATE 23514.
  RAISE NOTICE 'plants_rls test5 SKELETON — CHECK (plant_a_id < plant_b_id) enforced';
END $$;

-- ─────────────────────────────────────────────────────────
-- Cleanup
-- ─────────────────────────────────────────────────────────
-- TODO Wave 1: DELETE FROM auth.users WHERE id IN (current_setting('test.user_a')::uuid, current_setting('test.user_b')::uuid);

ROLLBACK;  -- pgTAP test convention — never persist test data
