-- Phase 3 / enqueue_photo_analysis RPC Test — Plan 03-01 Task 02
-- Ausführung: supabase db query --linked -f supabase/tests/enqueue_photo_analysis.sql
-- Prüft: Non-member → 42501 reject; Member → success + ai_jobs audit-row
-- Voraussetzung: Migration 013 applied (enqueue_photo_analysis RPC + photo_queue-table).
BEGIN;

  -- Setup-Phase als Superuser (role-switch kommt danach)
  do $$
  declare
    v_owner   uuid := gen_random_uuid();
    v_stranger uuid := gen_random_uuid();
    v_garden  uuid;
  begin
    INSERT INTO auth.users (id, email, aud, role) VALUES
      (v_owner,    'owner_enq_'    || v_owner::text    || '@test.local', 'authenticated', 'authenticated'),
      (v_stranger, 'stranger_enq_' || v_stranger::text || '@test.local', 'authenticated', 'authenticated')
      ON CONFLICT DO NOTHING;

    INSERT INTO public.profiles (id, display_name) VALUES
      (v_owner,    'Enq-Owner'),
      (v_stranger, 'Enq-Stranger')
      ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.gardens (id, name, created_by_user_id, updated_by_user_id)
      VALUES (gen_random_uuid(), 'Enq Test Garden', v_owner, v_owner)
      RETURNING id INTO v_garden;

    INSERT INTO public.garden_members (garden_id, user_id, role)
      VALUES (v_garden, v_owner, 'owner');

    PERFORM set_config('test.owner_id',    v_owner::text,   true);
    PERFORM set_config('test.stranger_id', v_stranger::text, true);
    PERFORM set_config('test.garden_id',   v_garden::text,  true);
  end $$;

  -- CASE 1: Non-member (stranger) → 42501
  select set_config('request.jwt.claim.sub',  current_setting('test.stranger_id'), true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$ begin
    begin
      PERFORM public.enqueue_photo_analysis(
        current_setting('test.garden_id')::uuid,
        'foo/bar.jpg',
        'plan_photo'
      );
      RAISE EXCEPTION 'enqueue_photo_analysis_test_failed_stranger_accepted';
    exception when sqlstate '42501' then
      RAISE NOTICE 'enqueue_photo_analysis_ok: non-member rejected with 42501';
    end;
  end $$;

  -- CASE 2: Member (owner) → success + ai_jobs audit-row
  select set_config('request.jwt.claim.sub',  current_setting('test.owner_id'), true);
  set local role authenticated;

  do $$ declare
    v_job_id      uuid;
    v_ai_jobs_cnt int;
  begin
    v_job_id := public.enqueue_photo_analysis(
      current_setting('test.garden_id')::uuid,
      'testgarden/test.jpg',
      'plan_photo'
    );

    IF v_job_id IS NULL THEN
      RAISE EXCEPTION 'enqueue_photo_analysis_test_failed_null_job_id';
    END IF;

    SELECT count(*) INTO v_ai_jobs_cnt FROM public.ai_jobs
      WHERE id                = v_job_id
        AND garden_id         = current_setting('test.garden_id')::uuid
        AND job_type          = 'photo_analysis'
        AND created_by_user_id = current_setting('test.owner_id')::uuid;

    IF v_ai_jobs_cnt <> 1 THEN
      RAISE EXCEPTION 'enqueue_photo_analysis_test_failed_no_audit_row (cnt=%)', v_ai_jobs_cnt;
    END IF;

    RAISE NOTICE 'enqueue_photo_analysis_ok: member enqueue accepted, job_id=% + ai_jobs audit row written', v_job_id;
  end $$;

ROLLBACK;
