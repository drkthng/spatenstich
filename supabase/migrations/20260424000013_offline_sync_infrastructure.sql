-- Phase 3 / Migration 013 — Offline-Sync Infrastructure (D-08, D-09, D-17, D-19, D-23, D-26)
-- Background:
--   D-08 LWW-Guard + D-09 client-set updated_at + D-17 photo_queue +
--   D-19 enqueue_photo_analysis RPC + D-23 soft-delete via deleted_at +
--   D-25 Storage-Bucket RLS für photos + D-26 geo-opt-in Spalten photo_queue
--
-- Trigger-Ordering (Research §3, Landmine L-7):
--   Postgres fires BEFORE UPDATE triggers alphabetisch. LWW-Guard MUSS vor
--   tg_set_updated_at laufen → Naming-Konvention aa_/mm_/zz_.
--   aa_lww_guard_*        < mm_set_updated_by_user_id_* < zz_set_updated_at_*
--
-- Atomicity: Supabase wraps file in implicit transaction (D-15). DO NOT add BEGIN/COMMIT.
-- Rollback-strategy: none needed — if any step fails, Postgres rolls back the whole file.
-- Test coverage: supabase/tests/{lww_guard,trigger_ordering,enqueue_photo_analysis,
--                                 storage_photos_rls,photo-queue-rls}.sql
--
-- SQLSTATE Allocation (Phase 3):
--   P9010 lww_guard_missing_updated_at — NEW.updated_at IS NULL on UPDATE
--   P9011 lww_reject_older_write       — NEW.updated_at < OLD.updated_at on UPDATE
--   (Existing: P9001 invite_invalid_or_expired, P9003 garden_has_members,
--    P9004 cannot_transfer_to_self, P9005 target_not_member, P9006 garden_already_full)

-- ──────────────────────────────────────────────────────────────
-- Section 2 — Trigger-Funktion public.tg_lww_guard() (D-08, D-09)
-- Läuft als SECURITY INVOKER (kein elevated privilege nötig — liest nur NEW/OLD).
-- Muss ZWINGEND alphabetisch VOR tg_set_updated_at laufen (aa_ prefix).
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_lww_guard()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.updated_at IS NULL THEN
    RAISE EXCEPTION 'lww_guard_missing_updated_at'
      USING ERRCODE = 'P9010',
            MESSAGE = 'Client must set updated_at explicitly (D-09)';
  END IF;
  IF NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION 'lww_reject_older_write'
      USING ERRCODE = 'P9011',
            MESSAGE = format('LWW reject: incoming=%s < existing=%s', NEW.updated_at, OLD.updated_at);
  END IF;
  RETURN NEW;
END $$;

COMMENT ON FUNCTION public.tg_lww_guard() IS
  'Phase 3 D-08: reject UPDATE where NEW.updated_at < OLD.updated_at (P9011) or NEW.updated_at IS NULL (P9010). MUST run BEFORE tg_set_updated_at via alphabetical trigger name ordering (aa_ prefix).';

-- ──────────────────────────────────────────────────────────────
-- Section 3 — deleted_at + profiles.updated_at + updated_by_user_id (D-23)
-- IF NOT EXISTS: re-deploy safe (Supabase migration-reruns possible on repair).
-- profiles.updated_at: RESEARCH Open Q 1 — profiles wird sync-Entity für LWW-Guard.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.gardens       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.vereinsregeln ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.ai_jobs       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.ai_results    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.profiles      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.profiles      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles      ADD COLUMN IF NOT EXISTS updated_by_user_id uuid REFERENCES auth.users(id);

-- ──────────────────────────────────────────────────────────────
-- Section 4 — DROP alte Trigger vor Renaming auf aa_/mm_/zz_-Konvention
-- Echte Trigger-Namen aus pg_trigger:
--   gardens:      gardens_updated_at, gardens_updated_by
--   vereinsregeln: vereinsregeln_updated_at, vereinsregeln_updated_by
--   ai_jobs:      ai_jobs_updated_at, ai_jobs_updated_by
--   profiles:     profiles_updated_at  (kein _updated_by vorhanden)
--   ai_results:   keine bestehenden Trigger
-- DROP IF EXISTS: sicher für Re-Deploy und falls Trigger schon in neuem Namen existiert.
-- ──────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS gardens_updated_at       ON public.gardens;
DROP TRIGGER IF EXISTS gardens_updated_by       ON public.gardens;
DROP TRIGGER IF EXISTS vereinsregeln_updated_at ON public.vereinsregeln;
DROP TRIGGER IF EXISTS vereinsregeln_updated_by ON public.vereinsregeln;
DROP TRIGGER IF EXISTS ai_jobs_updated_at       ON public.ai_jobs;
DROP TRIGGER IF EXISTS ai_jobs_updated_by       ON public.ai_jobs;
DROP TRIGGER IF EXISTS profiles_updated_at      ON public.profiles;
-- Schutz gegen Doppel-Attach falls Migration partial-neu:
DROP TRIGGER IF EXISTS aa_lww_guard_gardens                    ON public.gardens;
DROP TRIGGER IF EXISTS mm_set_updated_by_user_id_gardens       ON public.gardens;
DROP TRIGGER IF EXISTS zz_set_updated_at_gardens               ON public.gardens;
DROP TRIGGER IF EXISTS aa_lww_guard_vereinsregeln              ON public.vereinsregeln;
DROP TRIGGER IF EXISTS mm_set_updated_by_user_id_vereinsregeln ON public.vereinsregeln;
DROP TRIGGER IF EXISTS zz_set_updated_at_vereinsregeln         ON public.vereinsregeln;
DROP TRIGGER IF EXISTS aa_lww_guard_ai_jobs                    ON public.ai_jobs;
DROP TRIGGER IF EXISTS mm_set_updated_by_user_id_ai_jobs       ON public.ai_jobs;
DROP TRIGGER IF EXISTS zz_set_updated_at_ai_jobs               ON public.ai_jobs;
DROP TRIGGER IF EXISTS aa_lww_guard_ai_results                 ON public.ai_results;
DROP TRIGGER IF EXISTS mm_set_updated_by_user_id_ai_results    ON public.ai_results;
DROP TRIGGER IF EXISTS zz_set_updated_at_ai_results            ON public.ai_results;
DROP TRIGGER IF EXISTS aa_lww_guard_profiles                   ON public.profiles;
DROP TRIGGER IF EXISTS mm_set_updated_by_user_id_profiles      ON public.profiles;
DROP TRIGGER IF EXISTS zz_set_updated_at_profiles              ON public.profiles;

-- ──────────────────────────────────────────────────────────────
-- Section 5 — NEUE Trigger-Attachments mit aa_/mm_/zz_-Konvention (D-08, L-7)
-- Alphabetische Reihenfolge: aa_ < mm_ < zz_
--   aa_lww_guard_*             → P9010/P9011 LWW-Guard (feuert ZUERST)
--   mm_set_updated_by_user_id_ → auth.uid() fill (feuert NACH LWW-Guard)
--   zz_set_updated_at_*        → now() stamp (feuert ZULETZT)
-- ──────────────────────────────────────────────────────────────
DO $$ DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['gardens','vereinsregeln','ai_jobs','ai_results','profiles']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER aa_lww_guard_%I BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_lww_guard()', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER mm_set_updated_by_user_id_%I BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_by_user_id()', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER zz_set_updated_at_%I BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()', tbl, tbl);
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────
-- Section 6 — public.photo_queue Tabelle (D-17, D-26)
-- RLS: photo_queue_member_all — member-only, USING + WITH CHECK via is_garden_member(garden_id)
-- LWW-Trigger-Trio analog Section 5 (explizit, nicht via DO-Loop)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.photo_queue (
  id                 uuid primary key default gen_random_uuid(),
  garden_id          uuid not null references public.gardens(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  local_uri          text not null,
  kind               text not null,
  uploaded_at        timestamptz,
  storage_path       text,
  retry_count        int  not null default 0,
  last_error         text,
  last_attempted_at  timestamptz,
  geo_lat            double precision,
  geo_lng            double precision,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id),
  deleted_at         timestamptz
);

CREATE INDEX IF NOT EXISTS photo_queue_garden_idx
  ON public.photo_queue (garden_id, uploaded_at);
CREATE INDEX IF NOT EXISTS photo_queue_retry_idx
  ON public.photo_queue (retry_count) WHERE uploaded_at IS NULL;

ALTER TABLE public.photo_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photo_queue_member_all" ON public.photo_queue;
CREATE POLICY "photo_queue_member_all" ON public.photo_queue
  FOR ALL TO authenticated
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));

-- LWW + updated_by + updated_at Trigger-Trio für photo_queue (explizit):
DROP TRIGGER IF EXISTS aa_lww_guard_photo_queue                    ON public.photo_queue;
DROP TRIGGER IF EXISTS mm_set_updated_by_user_id_photo_queue       ON public.photo_queue;
DROP TRIGGER IF EXISTS zz_set_updated_at_photo_queue               ON public.photo_queue;

CREATE TRIGGER aa_lww_guard_photo_queue BEFORE UPDATE ON public.photo_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_lww_guard();
CREATE TRIGGER mm_set_updated_by_user_id_photo_queue BEFORE UPDATE ON public.photo_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_by_user_id();
CREATE TRIGGER zz_set_updated_at_photo_queue BEFORE UPDATE ON public.photo_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Section 7 — RPC public.enqueue_photo_analysis (D-19, S-2-Pattern)
-- SECURITY DEFINER: member-check + pgmq.send atomar mit ai_jobs-INSERT
-- search_path: public, pgmq, pg_temp — pgmq.send lebt im pgmq-Schema (verifiziert via
--   SELECT n.nspname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
--   WHERE p.proname='send' AND n.nspname IN ('pgmq','pgmq_public','extensions')
--   → result: nspname = 'pgmq')
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_photo_analysis(
  p_garden_id uuid, p_storage_path text, p_kind text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_job_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_garden_member(p_garden_id) THEN
    RAISE EXCEPTION 'not_garden_member' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.ai_jobs (created_by_user_id, garden_id, job_type, payload)
  VALUES (v_user, p_garden_id, 'photo_analysis',
    jsonb_build_object('storage_path', p_storage_path, 'kind', p_kind))
  RETURNING id INTO v_job_id;

  PERFORM pgmq.send('ai_jobs',
    jsonb_build_object('job_id', v_job_id, 'storage_path', p_storage_path, 'kind', p_kind));

  RETURN v_job_id;
END $$;

REVOKE ALL ON FUNCTION public.enqueue_photo_analysis(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_photo_analysis(uuid, text, text) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- Section 8 — RPC public.server_now (Research §5 Clock-skew-Vermeidung)
-- STABLE: kein Write-Seiteneffekt; liefert authoritative DB-Timestamp für Client-Clock-Sync.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.server_now()
RETURNS timestamptz
LANGUAGE sql STABLE AS $$ SELECT now(); $$;

GRANT EXECUTE ON FUNCTION public.server_now() TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- Section 9 — Storage-Bucket-RLS für bucket_id='photos' (D-25, NFR-04, Research §6)
-- Path-Convention: <garden_id>/<photo_id>.<ext>
-- foldername(name)[1] extrahiert garden_id aus dem ersten Path-Segment.
-- Re-entrant: DROP IF EXISTS vor CREATE.
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "photos_garden_member_read"   ON storage.objects;
DROP POLICY IF EXISTS "photos_garden_member_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_garden_member_update" ON storage.objects;
DROP POLICY IF EXISTS "photos_garden_member_delete" ON storage.objects;

CREATE POLICY "photos_garden_member_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.is_garden_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "photos_garden_member_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND public.is_garden_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "photos_garden_member_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.is_garden_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "photos_garden_member_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.is_garden_member(((storage.foldername(name))[1])::uuid)
  );

-- ──────────────────────────────────────────────────────────────
-- Section 10 — LWW-kompatibler transfer_ownership-Patch (L-9)
-- Der bestehende RPC setzt kein explizites updated_at = now() auf gardens.
-- Nach Migration 013 ist aa_lww_guard_gardens aktiv: UPDATE ohne NEW.updated_at
-- ungleich OLD.updated_at wirft P9010 (wenn NULL) oder läuft durch (wenn unverändert
-- bleibt — aber zz_set_updated_at überschreibt danach auf now()).
-- Defense-in-Depth: explizit updated_at = now() setzen, damit LWW-Guard nie P9010 wirft.
-- Migrationiert von Migration 003 → 010 → hier 013 (append-only Rule):
--   010 korrigierte P9xxx SQLSTATEs. 013 fügt updated_at = now() hinzu.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.transfer_ownership(p_garden_id uuid, p_to_user_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_caller_is_owner boolean;
  v_target_is_member boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF v_user = p_to_user_id THEN
    -- WR-04: P9004 (from Migration 010)
    RAISE EXCEPTION 'cannot_transfer_to_self' USING ERRCODE = 'P9004';
  END IF;

  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = v_user AND role = 'owner'
  ) INTO v_caller_is_owner;

  IF NOT v_caller_is_owner THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = p_to_user_id AND role = 'member'
  ) INTO v_target_is_member;

  IF NOT v_target_is_member THEN
    -- WR-04: P9005 (from Migration 010)
    RAISE EXCEPTION 'target_not_member' USING ERRCODE = 'P9005';
  END IF;

  -- Atomic role swap.
  UPDATE public.garden_members
  SET role = 'member'
  WHERE garden_id = p_garden_id AND user_id = v_user;

  UPDATE public.garden_members
  SET role = 'owner'
  WHERE garden_id = p_garden_id AND user_id = p_to_user_id;

  -- Phase 3 L-9 patch: explicit updated_at = now() for LWW-Guard compatibility.
  -- Without this, aa_lww_guard_gardens would receive NEW.updated_at == OLD.updated_at
  -- (unchanged), which passes through but is semantically incorrect for LWW sync.
  UPDATE public.gardens
  SET created_by_user_id = p_to_user_id,
      updated_by_user_id = v_user,
      updated_at         = now()   -- Phase 3 L-9: explicit for LWW-Guard
  WHERE id = p_garden_id;

  RETURN json_build_object(
    'status', 'transferred',
    'garden_id', p_garden_id,
    'new_owner_id', p_to_user_id
  );
END $$;

-- CREATE OR REPLACE preserves existing GRANT EXECUTE ... TO authenticated.

-- ──────────────────────────────────────────────────────────────
-- Section 11 — Post-migration Invariant-Assertions (aus Migration 004 Pattern)
-- Schlägt fehl und rollt die gesamte Migration zurück, falls eine Invariante verletzt.
-- ──────────────────────────────────────────────────────────────
DO $$ DECLARE cnt int;
BEGIN
  -- Assertion 1: mindestens 6 aa_lww_guard_* Trigger vorhanden (5 tables + photo_queue)
  SELECT count(*) INTO cnt FROM pg_trigger
    WHERE tgname LIKE 'aa_lww_guard_%' AND NOT tgisinternal;
  IF cnt < 6 THEN
    RAISE EXCEPTION 'migration_013_invariant: expected >=6 aa_lww_guard_* triggers, got %', cnt;
  END IF;

  -- Assertion 2: genau 4 photos_garden_member_* Policies auf storage.objects
  SELECT count(*) INTO cnt FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'photos_garden_member_%';
  IF cnt <> 4 THEN
    RAISE EXCEPTION 'migration_013_invariant: expected 4 photos_garden_member_* policies, got %', cnt;
  END IF;

  -- Assertion 3: alle 3 RPCs existieren
  SELECT count(*) INTO cnt FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
    WHERE n.nspname='public' AND p.proname IN ('tg_lww_guard','enqueue_photo_analysis','server_now');
  IF cnt < 3 THEN
    RAISE EXCEPTION 'migration_013_invariant: missing one of tg_lww_guard/enqueue_photo_analysis/server_now (found %)', cnt;
  END IF;

  -- Assertion 4: photo_queue existiert
  SELECT count(*) INTO cnt FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
    WHERE n.nspname='public' AND c.relname='photo_queue' AND c.relkind='r';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_013_invariant: photo_queue table missing';
  END IF;

  RAISE NOTICE 'migration_013 ok: LWW + photo_queue + RPCs + storage RLS applied';
END $$;
