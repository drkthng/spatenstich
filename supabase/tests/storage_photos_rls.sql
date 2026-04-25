-- Phase 3 / Storage Photos RLS Test — Plan 03-01 Task 02
-- Ausführung: supabase db query --linked -f supabase/tests/storage_photos_rls.sql
-- Prüft: photos-Bucket RLS via foldername(name)[1]::uuid → is_garden_member
--   CASE 1: Member kann storage.objects INSERT mit <garden_id>/file.jpg
--   CASE 2: Non-member INSERT wird mit 42501 abgewiesen
--   CASE 3: Non-member SELECT liefert 0 Rows (RLS USING filtert heraus)
-- Voraussetzung: Migration 013 applied (photos_garden_member_* Policies auf storage.objects).
BEGIN;

  -- Setup-Phase als Superuser
  do $$
  declare
    v_owner   uuid := gen_random_uuid();
    v_stranger uuid := gen_random_uuid();
    v_garden  uuid;
  begin
    INSERT INTO auth.users (id, email, aud, role) VALUES
      (v_owner,    'owner_stor_'    || v_owner::text    || '@test.local', 'authenticated', 'authenticated'),
      (v_stranger, 'stranger_stor_' || v_stranger::text || '@test.local', 'authenticated', 'authenticated')
      ON CONFLICT DO NOTHING;

    INSERT INTO public.profiles (id, display_name) VALUES
      (v_owner,    'Stor-Owner'),
      (v_stranger, 'Stor-Stranger')
      ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.gardens (id, name, created_by_user_id, updated_by_user_id)
      VALUES (gen_random_uuid(), 'Stor Test Garden', v_owner, v_owner)
      RETURNING id INTO v_garden;

    INSERT INTO public.garden_members (garden_id, user_id, role)
      VALUES (v_garden, v_owner, 'owner');

    PERFORM set_config('test.owner_id',    v_owner::text,   true);
    PERFORM set_config('test.stranger_id', v_stranger::text, true);
    PERFORM set_config('test.garden_id',   v_garden::text,  true);
  end $$;

  -- CASE 1: Member kann storage.objects INSERT (path = <garden_id>/owner-upload.jpg)
  select set_config('request.jwt.claim.sub',  current_setting('test.owner_id'), true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$ declare
    v_owner  uuid := current_setting('test.owner_id')::uuid;
    v_garden uuid := current_setting('test.garden_id')::uuid;
  begin
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
      VALUES (
        'photos',
        v_garden::text || '/owner-upload.jpg',
        v_owner,
        v_owner::text
      );
    RAISE NOTICE 'storage_photos_rls_ok: member INSERT accepted for path <garden_id>/owner-upload.jpg';
  end $$;

  -- CASE 2: Non-member INSERT → 42501
  select set_config('request.jwt.claim.sub',  current_setting('test.stranger_id'), true);
  set local role authenticated;

  do $$ declare
    v_stranger uuid := current_setting('test.stranger_id')::uuid;
    v_garden   uuid := current_setting('test.garden_id')::uuid;
  begin
    begin
      INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
        VALUES (
          'photos',
          v_garden::text || '/stranger-upload.jpg',
          v_stranger,
          v_stranger::text
        );
      RAISE EXCEPTION 'storage_photos_rls_test_failed_stranger_accepted';
    exception when sqlstate '42501' then
      RAISE NOTICE 'storage_photos_rls_ok: non-member INSERT rejected with 42501';
    end;
  end $$;

  -- CASE 3: Non-member SELECT → 0 Rows (RLS USING filtert heraus)
  do $$ declare
    v_garden uuid := current_setting('test.garden_id')::uuid;
    v_rows   int;
  begin
    SELECT count(*) INTO v_rows FROM storage.objects
      WHERE bucket_id = 'photos'
        AND name LIKE v_garden::text || '/%';
    IF v_rows <> 0 THEN
      RAISE EXCEPTION 'storage_photos_rls_test_failed_non_member_saw_% rows', v_rows;
    END IF;
    RAISE NOTICE 'storage_photos_rls_ok: non-member SELECT returns 0 rows (rows=%), is_garden_member USING filter active', v_rows;
  end $$;

ROLLBACK;
