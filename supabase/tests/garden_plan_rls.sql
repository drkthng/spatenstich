-- Phase 4 Plan 01 Task 01: RLS tests for garden_dimensions + plan_elements.
-- Follows Phase 1 pattern: SET LOCAL ROLE authenticated + set_config for auth.uid().
--
-- Tests:
--   1. Member can INSERT into garden_dimensions for their garden
--   2. Member can SELECT from garden_dimensions for their garden
--   3. Member can INSERT into plan_elements for their garden
--   4. Member can SELECT from plan_elements for their garden
--   5. Non-member cannot access rows from another garden
--   6. Budget query: COUNT ai_jobs for a garden_id today returns correct count

-- ======================================================================
-- SETUP: Create test users and garden (runs as postgres superuser)
-- ======================================================================

-- Test user IDs
SELECT set_config('test.user_a', 'a0000000-0000-4000-a000-000000000001', true);
SELECT set_config('test.user_b', 'b0000000-0000-4000-b000-000000000002', true);
SELECT set_config('test.garden_id', 'c0000000-0000-4000-c000-000000000001', true);

-- Create auth.users entries (required for FK constraints)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, raw_app_meta_data, created_at, updated_at)
VALUES
  (current_setting('test.user_a')::uuid, '00000000-0000-0000-0000-000000000000',
   'test-plan-a@example.com', '$2a$10$fake', 'authenticated', 'authenticated',
   '{"provider":"email","providers":["email"]}'::jsonb, now(), now()),
  (current_setting('test.user_b')::uuid, '00000000-0000-0000-0000-000000000000',
   'test-plan-b@example.com', '$2a$10$fake', 'authenticated', 'authenticated',
   '{"provider":"email","providers":["email"]}'::jsonb, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create profiles (FK requirement for some RPCs)
INSERT INTO public.profiles (id, display_name, created_at, updated_at)
VALUES
  (current_setting('test.user_a')::uuid, 'Test A', now(), now()),
  (current_setting('test.user_b')::uuid, 'Test B', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create garden with user_a as owner
INSERT INTO public.gardens (id, name, created_by_user_id, created_at, updated_at)
VALUES (current_setting('test.garden_id')::uuid, 'Test Plan Garden',
        current_setting('test.user_a')::uuid, now(), now())
ON CONFLICT (id) DO NOTHING;

-- user_a is owner, user_b is NOT a member
INSERT INTO public.garden_members (garden_id, user_id, role, joined_at)
VALUES (current_setting('test.garden_id')::uuid, current_setting('test.user_a')::uuid, 'owner', now())
ON CONFLICT (garden_id, user_id) DO NOTHING;

-- ======================================================================
-- TEST 1: Member can INSERT into garden_dimensions
-- ======================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}',
  current_setting('test.user_a')), true);

INSERT INTO public.garden_dimensions (id, garden_id, shape, width_m, height_m, extra_dims)
VALUES (gen_random_uuid(), current_setting('test.garden_id')::uuid, 'rectangle', 12.0, 8.5, null);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.garden_dimensions
    WHERE garden_id = current_setting('test.garden_id')::uuid
  ) THEN
    RAISE EXCEPTION 'TEST 1 FAILED: member should be able to INSERT garden_dimensions';
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: member can INSERT garden_dimensions';
END $$;

-- ======================================================================
-- TEST 2: Member can SELECT from garden_dimensions
-- ======================================================================
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.garden_dimensions
  WHERE garden_id = current_setting('test.garden_id')::uuid;
  IF cnt < 1 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: member should see garden_dimensions rows (got %)', cnt;
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: member can SELECT garden_dimensions (% rows)', cnt;
END $$;

-- ======================================================================
-- TEST 3: Member can INSERT into plan_elements
-- ======================================================================
INSERT INTO public.plan_elements (id, garden_id, element_type, label, x_m, y_m, width_m, height_m, confidence, is_accepted)
VALUES
  (gen_random_uuid(), current_setting('test.garden_id')::uuid, 'Beet', 'Gemuese-Hochbeet', 3.0, 2.0, 2.0, 1.5, 'high', true),
  (gen_random_uuid(), current_setting('test.garden_id')::uuid, 'Laube', 'Gartenlaube', 8.0, 6.0, 3.0, 4.0, 'medium', true);

DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.plan_elements
  WHERE garden_id = current_setting('test.garden_id')::uuid;
  IF cnt < 2 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: member should be able to INSERT plan_elements (got %)', cnt;
  END IF;
  RAISE NOTICE 'TEST 3 PASSED: member can INSERT plan_elements (% rows)', cnt;
END $$;

-- ======================================================================
-- TEST 4: Member can SELECT from plan_elements
-- ======================================================================
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.plan_elements
  WHERE garden_id = current_setting('test.garden_id')::uuid AND is_accepted = true;
  IF cnt < 2 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: member should see plan_elements rows (got %)', cnt;
  END IF;
  RAISE NOTICE 'TEST 4 PASSED: member can SELECT plan_elements (% accepted rows)', cnt;
END $$;

-- ======================================================================
-- TEST 5: Non-member cannot access rows from another garden
-- ======================================================================
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}',
  current_setting('test.user_b')), true);

DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.garden_dimensions
  WHERE garden_id = current_setting('test.garden_id')::uuid;
  IF cnt <> 0 THEN
    RAISE EXCEPTION 'TEST 5a FAILED: non-member should get 0 rows from garden_dimensions (got %)', cnt;
  END IF;
  RAISE NOTICE 'TEST 5a PASSED: non-member sees 0 garden_dimensions rows';
END $$;

DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.plan_elements
  WHERE garden_id = current_setting('test.garden_id')::uuid;
  IF cnt <> 0 THEN
    RAISE EXCEPTION 'TEST 5b FAILED: non-member should get 0 rows from plan_elements (got %)', cnt;
  END IF;
  RAISE NOTICE 'TEST 5b PASSED: non-member sees 0 plan_elements rows';
END $$;

-- ======================================================================
-- TEST 6: Budget query — COUNT ai_jobs for a garden_id today returns correct count
-- ======================================================================
RESET ROLE;

-- Insert 3 ai_jobs for the test garden (as superuser, since ai_jobs INSERT may be RPC-only)
INSERT INTO public.ai_jobs (id, created_by_user_id, garden_id, job_type, payload, status, created_at)
VALUES
  (gen_random_uuid(), current_setting('test.user_a')::uuid, current_setting('test.garden_id')::uuid,
   'photo_analysis', '{"test": true}'::jsonb, 'done', now()),
  (gen_random_uuid(), current_setting('test.user_a')::uuid, current_setting('test.garden_id')::uuid,
   'photo_analysis', '{"test": true}'::jsonb, 'done', now()),
  (gen_random_uuid(), current_setting('test.user_a')::uuid, current_setting('test.garden_id')::uuid,
   'photo_analysis', '{"test": true}'::jsonb, 'queued', now());

DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.ai_jobs
  WHERE garden_id = current_setting('test.garden_id')::uuid
    AND created_at >= date_trunc('day', now());
  IF cnt < 3 THEN
    RAISE EXCEPTION 'TEST 6 FAILED: expected at least 3 ai_jobs today for garden (got %)', cnt;
  END IF;
  RAISE NOTICE 'TEST 6 PASSED: budget query COUNT ai_jobs today = %', cnt;
END $$;

-- ======================================================================
-- CLEANUP
-- ======================================================================
RESET ROLE;
DELETE FROM public.plan_elements WHERE garden_id = current_setting('test.garden_id')::uuid;
DELETE FROM public.garden_dimensions WHERE garden_id = current_setting('test.garden_id')::uuid;
DELETE FROM public.ai_jobs WHERE garden_id = current_setting('test.garden_id')::uuid
  AND (payload->>'test')::boolean = true;
DELETE FROM public.garden_members WHERE garden_id = current_setting('test.garden_id')::uuid;
DELETE FROM public.gardens WHERE id = current_setting('test.garden_id')::uuid;
DELETE FROM public.profiles WHERE id IN (
  current_setting('test.user_a')::uuid,
  current_setting('test.user_b')::uuid
);
DELETE FROM auth.users WHERE id IN (
  current_setting('test.user_a')::uuid,
  current_setting('test.user_b')::uuid
);

DO $$ BEGIN
  RAISE NOTICE 'ALL GARDEN_PLAN_RLS TESTS PASSED';
END $$;
