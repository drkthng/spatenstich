-- RLS Foundation Test — Phase 1 / Plan 02
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

BEGIN;
  -- Als User A: JWT-Claims setzen + Rolle wechseln, dann INSERT
  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.ai_jobs(user_id, job_type, payload)
    values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, 'photo_analysis', '{"test":"A"}'::jsonb);

  -- Als User B: JWT-Claims wechseln, SELECT darf 0 Zeilen von User A liefern
  select set_config('request.jwt.claim.sub', 'd5fc0937-5e49-4fb5-9740-9940f075fab2', true);

  do $$
  declare cnt int;
  begin
    select count(*) into cnt
      from public.ai_jobs
     where user_id = 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid;
    if cnt <> 0 then
      raise exception 'RLS breach: user B sees % rows of user A', cnt;
    end if;
    raise notice 'RLS ok: user B sieht 0 Zeilen von user A';
  end $$;

ROLLBACK;
