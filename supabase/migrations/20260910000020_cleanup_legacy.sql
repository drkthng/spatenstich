-- Phase 20 Plan 02 Task 4 (D-06/D-05/DEPLOY-02) — Legacy-Cleanup nach dem M07-Pivot
-- Provides: DROP enqueue_photo_analysis, photo_queue, feature_flags,
--   profiles.plz/klimazone/archetype; bedingtes DROP der Storage-Buckets
--   photos/vereinsregeln (nur wenn leer); CREATE OR REPLACE transfer_ownership
--   ohne die Migration-013-Regression (Audit-Invariante aus Migration 009).
-- Follows: Migration 20260509000015_remove_ai_tables.sql (Kopfkommentar,
--   Sektionsbanner, DROP POLICY vor DROP TABLE, DO $$-Bloecke, Invarianten-
--   Assertion am Dateiende).
--
-- Kontext (Masterplan Anhang C.1, Kap. 0.5):
--   Client-seitig entfernt Plan 20-02 die Foto-Pipeline, useFlag/feature_flags-
--   Anbindung und die PDF-Upload-Karte fuer Vereinsregeln (D-05/D-06). Diese
--   Migration entfernt die dazugehoerigen Server-Objekte, damit kein toter
--   Client-Code gegen eine tote Server-Flaeche laeuft (22P02-Outbox-Eintraege,
--   verwaiste Policies).
--
-- Atomicity: Supabase klammert die Datei bereits in eine implizite Transaktion.
-- KEIN eigenstaendiges BEGIN/COMMIT hinzufuegen (Repo-Konvention).
--
-- Push-Gate: diese Datei wird committet, aber NICHT gepusht, bevor der User
-- in Task 5/6 ein Backup bestaetigt hat (R9, 3-Gate-Protokoll Kap. 0.5).

-- ──────────────────────────────────────────────────────────────
-- Section 1 — Foto-Warteschlange: RPC + Tabelle (D-06)
-- ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.enqueue_photo_analysis(uuid, text, text);

DROP POLICY IF EXISTS "photo_queue_member_all" ON public.photo_queue;
DROP TABLE IF EXISTS public.photo_queue CASCADE;

-- ──────────────────────────────────────────────────────────────
-- Section 2 — feature_flags (D-05: FEATURES ist jetzt eine Compile-Time-
-- Konstante in packages/shared, keine Supabase-Query mehr noetig)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "feature_flags_read_own_and_global" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_service_insert"       ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_service_update"       ON public.feature_flags;
DROP TABLE IF EXISTS public.feature_flags CASCADE;

-- ──────────────────────────────────────────────────────────────
-- Section 3 — Storage-Buckets photos / vereinsregeln: nur beobachten,
-- NICHT loeschen (Korrektur beim echten Push gegen die Live-DB am
-- 2026-09-12, Plan 20-02 Task 7 / Deviation Rule 1+3).
--
-- Urspruenglicher Plan: Bucket-Zeile + Policies im selben DO-Block
-- entfernen, wenn storage.objects fuer den Bucket leer ist (T-20-02-02:
-- nie Policy ohne Bucket oder umgekehrt). Beim echten Gate-3-Push gegen
-- vitrqkzxkiqvadqfzrcx schlug `DELETE FROM storage.buckets ...` mit
-- SQLSTATE 42501 fehl: "Direct deletion from storage tables is not
-- allowed. Use the Storage API instead." — eine Plattform-Absicherung,
-- die zum Zeitpunkt der Planung (Masterplan Anhang C.1) nicht bekannt
-- war. Die Migration lief in Supabase's impliziter Transaktion; der
-- Fehlschlag hat die gesamte Migration atomar zurueckgerollt (verifiziert
-- per Direktabfrage nach dem fehlgeschlagenen Push — kein Objekt wurde
-- geloescht, kein Teilzustand entstand).
--
-- Fix: Da eine SQL-DELETE auf storage.buckets grundsaetzlich nicht mehr
-- moeglich ist, wuerde ein Policy-Drop ohne Bucket-Drop exakt die von
-- T-20-02-02 verbotene Teil-Entfernung erzeugen. Diese Sektion bleibt
-- daher rein informativ: nur die Zaehlpruefung + RAISE NOTICE, keine
-- DROP POLICY / DELETE-Anweisung mehr. Beide Buckets bleiben mit ihren
-- bestehenden Policies unangetastet stehen — deckungsgleich mit der im
-- Plan bereits vorgesehenen "nicht leer"-Fallback-Disposition
-- (T-20-02-04, "accept"), jetzt fuer beide Faelle. Tatsaechliche
-- Bucket-Entfernung ist ein offener manueller Punkt ueber die Storage
-- API/das Dashboard (nicht Teil dieser Migration).
-- ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_photos_count int;
BEGIN
  SELECT count(*) INTO v_photos_count FROM storage.objects WHERE bucket_id = 'photos';
  RAISE NOTICE 'cleanup_legacy: bucket photos enthaelt % Objekt(e) — Bucket+Policies bleiben stehen (SQL-DELETE auf storage.buckets von der Plattform verboten, manueller Aufraeumpunkt ueber Storage API)', v_photos_count;
END $$;

DO $$
DECLARE
  v_vereinsregeln_count int;
BEGIN
  SELECT count(*) INTO v_vereinsregeln_count FROM storage.objects WHERE bucket_id = 'vereinsregeln';
  RAISE NOTICE 'cleanup_legacy: bucket vereinsregeln enthaelt % Objekt(e) — Bucket+Policy bleiben stehen (SQL-DELETE auf storage.buckets von der Plattform verboten, manueller Aufraeumpunkt ueber Storage API)', v_vereinsregeln_count;
END $$;

-- ──────────────────────────────────────────────────────────────
-- Section 4 — profiles.plz/klimazone/archetype droppen (RESEARCH Pitfall 4)
--
-- Vorab per Grep bestaetigt (git grep "profiles\.plz\|profiles\.klimazone\|
-- profiles\.archetype" ueber supabase/migrations/*.sql und app/src): keine
-- Funktion, View oder Client-Code liest diese drei Spalten auf public.profiles
-- — der Zwei-Phasen-Refactor aus Migration 20260423000003 hat plz/klimazone/
-- archetype bereits vollstaendig nach public.gardens verschoben (Backfill lief
-- dort einmalig per INSERT...SELECT). Es gibt daher NICHTS neu zu definieren;
-- dieser Abschnitt ist ein reiner Spalten-Drop.
--
-- ACHTUNG: gleichnamige Spalten auf public.gardens sind produktiv und bleiben
-- unangetastet — der Drop zielt ausschliesslich auf public.profiles.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS plz,
  DROP COLUMN IF EXISTS klimazone,
  DROP COLUMN IF EXISTS archetype;

-- ──────────────────────────────────────────────────────────────
-- Section 5 — transfer_ownership neu definieren (RESEARCH Pitfall 5)
--
-- Body zusammengesetzt aus drei Quellen, alle vier historischen Fassungen
-- gelesen (Migration 003 Original, 009 Fix, 010 SQLSTATE-Refactor, 013
-- LWW-Regression):
--   - SQLSTATE-Codes P9004/P9005 aus Migration 010 (statt P0004/P0005).
--   - Explizites updated_at = now() aus Migration 013 (LWW-Guard-Kompatibilitaet).
--   - OHNE die created_by_user_id = p_to_user_id-Zuweisung, die Migration 013
--     wieder eingeschleppt hatte — das war die von Migration 009 (WR-05)
--     bereits behobene Audit-Invariante-Verletzung (created_by_user_id bleibt
--     "wer hat den Garten erstellt", nicht "wer ist aktueller Owner" —
--     letzteres steht in garden_members.role).
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
    RAISE EXCEPTION 'target_not_member' USING ERRCODE = 'P9005';
  END IF;

  -- Atomic role swap.
  UPDATE public.garden_members
  SET role = 'member'
  WHERE garden_id = p_garden_id AND user_id = v_user;

  UPDATE public.garden_members
  SET role = 'owner'
  WHERE garden_id = p_garden_id AND user_id = p_to_user_id;

  -- Migration 020: KEINE created_by_user_id-Ueberschreibung (WR-05-Invariante,
  -- Migration 009). Nur updated_by_user_id + explizites updated_at = now()
  -- (LWW-Guard-Kompatibilitaet aus Migration 013).
  UPDATE public.gardens
  SET updated_by_user_id = v_user,
      updated_at         = now()
  WHERE id = p_garden_id;

  RETURN json_build_object(
    'status', 'transferred',
    'garden_id', p_garden_id,
    'new_owner_id', p_to_user_id
  );
END $$;

-- CREATE OR REPLACE preserves existing REVOKE/GRANT — kein Re-Grant noetig.

-- ──────────────────────────────────────────────────────────────
-- Section 6 — Post-migration Invariant-Assertions
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'photo_queue') THEN
    RAISE EXCEPTION 'migration_020_invariant: photo_queue still exists after drop';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'enqueue_photo_analysis') THEN
    RAISE EXCEPTION 'migration_020_invariant: enqueue_photo_analysis still exists after drop';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'feature_flags') THEN
    RAISE EXCEPTION 'migration_020_invariant: feature_flags still exists after drop';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'profiles'
               AND column_name IN ('plz', 'klimazone', 'archetype')) THEN
    RAISE EXCEPTION 'migration_020_invariant: profiles.plz/klimazone/archetype still exist after drop';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
                 WHERE n.nspname = 'public' AND p.proname = 'transfer_ownership') THEN
    RAISE EXCEPTION 'migration_020_invariant: transfer_ownership missing after redefine';
  END IF;

  RAISE NOTICE 'migration_020 ok: photo_queue/enqueue_photo_analysis/feature_flags/profiles-Spalten entfernt, transfer_ownership neu definiert';
END $$;
