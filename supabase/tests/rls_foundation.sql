-- RLS Foundation Test — Phase 1 / Plan 02 (schema-updated for Phase 2.5 Plan 02.5-02)
-- Ausführung: supabase db query -f supabase/tests/rls_foundation.sql --linked
-- Erwartet: NOTICE 'RLS ok: user B sieht 0 Zeilen von user A'
--
-- Test-User UUIDs (aus Supabase Dashboard → Auth → Users):
--   user-a@test.local  = b9667f2a-7e86-497b-9cff-3ae320c7ff2c
--   user-b@test.local  = d5fc0937-5e49-4fb5-9740-9940f075fab2
--
-- Hinweis: SET LOCAL ROLE authenticated ist erforderlich, damit RLS greift.
-- supabase db query läuft als postgres (superuser) — ohne expliziten ROLE-Wechsel
-- werden RLS-Policies ignoriert.
--
-- Post-Migration-003: ai_jobs.user_id → created_by_user_id + garden_id NOT NULL.
-- Test verwendet ensure_default_garden_for_user RPC um einen Garten für User A zu seedan.

BEGIN;
  -- Als User A: JWT-Claims setzen + Rolle wechseln, dann INSERT
  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- Profile für User A anlegen (idempotent — seed aus Migration 003 möglich)
  insert into public.profiles(id, display_name)
    values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, 'user_a')
    on conflict (id) do nothing;

  -- Phase 2.5 schema: garden_id NOT NULL + column renamed.
  do $$
  declare ga_id uuid;
  begin
    ga_id := public.ensure_default_garden_for_user();
    insert into public.ai_jobs(created_by_user_id, garden_id, job_type, payload)
      values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, ga_id, 'photo_analysis', '{"test":"A"}'::jsonb);
  end $$;

  -- Als User B: JWT-Claims wechseln, SELECT darf 0 Zeilen von User A liefern
  select set_config('request.jwt.claim.sub', 'd5fc0937-5e49-4fb5-9740-9940f075fab2', true);

  do $$
  declare cnt int;
  begin
    select count(*) into cnt
      from public.ai_jobs
     where created_by_user_id = 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid;
    if cnt <> 0 then
      raise exception 'RLS breach: user B sees % rows of user A', cnt;
    end if;
    raise notice 'RLS ok: user B sieht 0 Zeilen von user A';
  end $$;

ROLLBACK;
