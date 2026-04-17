-- E2E pgmq Round-Trip Smoke Test
-- Aufruf: supabase db query -f scripts/e2e-pgmq-smoke.sql --linked
--
-- VORAUSSETZUNGEN:
--   1. ai-job-consumer Edge Function deployed (supabase functions deploy ai-job-consumer)
--   2. Edge Function Secrets gesetzt (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
--   3. Eine test-user-UUID bereitstellen (ersetze <test-user-uuid> unten)
--
-- SCHRITTE:
--   1. Dieses Script ausführen → gibt smoke_job_id aus
--   2. Edge Function manuell triggern (via Dashboard oder HTTP)
--   3. Ergebnis prüfen mit Schritt-3-Queries unten

-- Schritt 1: Test-Job einfügen (ersetze die UUID durch eine gültige test-user-UUID)
-- Hinweis: In der Produktion kommt user_id aus auth.uid(). Hier direkter Insert als service_role.
DO $$
DECLARE
  smoke_user_id uuid := gen_random_uuid(); -- Test-User-UUID (kein echter User nötig für Smoke-Test)
  smoke_job_id  uuid;
  msg_id        bigint;
BEGIN
  -- Schritt 1: Job einfügen
  INSERT INTO public.ai_jobs(user_id, job_type, payload)
    VALUES (smoke_user_id, 'photo_analysis', '{"smoke":true}'::jsonb)
    RETURNING id INTO smoke_job_id;

  RAISE NOTICE 'smoke_job_id: %', smoke_job_id;

  -- Schritt 2: pgmq-Message senden
  SELECT pgmq_public.send(
    'ai_jobs',
    jsonb_build_object(
      'job_id', smoke_job_id,
      'job_type', 'photo_analysis',
      'payload', '{"smoke":true}'::jsonb
    ),
    0
  ) INTO msg_id;

  RAISE NOTICE 'pgmq msg_id: %', msg_id;
  RAISE NOTICE '--- Nächste Schritte ---';
  RAISE NOTICE '1. Edge Function triggern (Dashboard oder HTTP POST zu /functions/v1/ai-job-consumer)';
  RAISE NOTICE '2. Prüfen: SELECT * FROM public.ai_results WHERE job_id = ''%'';', smoke_job_id;
  RAISE NOTICE '3. Prüfen: SELECT status FROM public.ai_jobs WHERE id = ''%'';', smoke_job_id;
  RAISE NOTICE 'Erwartung: ai_results hat 1 Zeile mit raw_response._phase1_placeholder=true; ai_jobs.status=''done''';
END $$;
