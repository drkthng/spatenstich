-- Phase 3 / Trigger-Ordering Test — Plan 03-01 Task 02
-- Ausführung: supabase db query --linked -f supabase/tests/trigger_ordering.sql
-- Prüft: aa_lww_guard_* + mm_set_updated_by_user_id_* + zz_set_updated_at_*
--        existieren pro Tabelle und aa_* ist alphabetisch erster BEFORE-UPDATE-Trigger.
-- Voraussetzung: Migration 013 applied.
-- Kein role-switch nötig: pg_trigger-Catalog-Queries laufen als Superuser.
BEGIN;

  do $$ declare
    tbl       text;
    cnt_aa    int;
    cnt_mm    int;
    cnt_zz    int;
    first_name text;
  begin
    FOREACH tbl IN ARRAY ARRAY['gardens','vereinsregeln','ai_jobs','ai_results','profiles','photo_queue']
    LOOP
      -- Prüfe: aa_lww_guard_<tbl> existiert
      SELECT count(*) INTO cnt_aa FROM pg_trigger
        WHERE tgrelid = ('public.' || tbl)::regclass
          AND tgname   = ('aa_lww_guard_' || tbl)
          AND NOT tgisinternal;
      IF cnt_aa <> 1 THEN
        RAISE EXCEPTION 'trigger_ordering_failed: aa_lww_guard_% missing (count=%)', tbl, cnt_aa;
      END IF;

      -- Prüfe: mm_set_updated_by_user_id_<tbl> existiert
      SELECT count(*) INTO cnt_mm FROM pg_trigger
        WHERE tgrelid = ('public.' || tbl)::regclass
          AND tgname   = ('mm_set_updated_by_user_id_' || tbl)
          AND NOT tgisinternal;
      IF cnt_mm <> 1 THEN
        RAISE EXCEPTION 'trigger_ordering_failed: mm_set_updated_by_user_id_% missing (count=%)', tbl, cnt_mm;
      END IF;

      -- Prüfe: zz_set_updated_at_<tbl> existiert
      SELECT count(*) INTO cnt_zz FROM pg_trigger
        WHERE tgrelid = ('public.' || tbl)::regclass
          AND tgname   = ('zz_set_updated_at_' || tbl)
          AND NOT tgisinternal;
      IF cnt_zz <> 1 THEN
        RAISE EXCEPTION 'trigger_ordering_failed: zz_set_updated_at_% missing (count=%)', tbl, cnt_zz;
      END IF;

      -- Prüfe: alphabetisch erster BEFORE-UPDATE-Trigger ist aa_lww_guard_*
      -- tgtype bits: 2=BEFORE, 4=ROW, 16=UPDATE → (tgtype & 26) = 26
      SELECT tgname INTO first_name FROM pg_trigger
        WHERE tgrelid   = ('public.' || tbl)::regclass
          AND NOT tgisinternal
          AND tgtype & 2  = 2   -- BEFORE
          AND tgtype & 16 = 16  -- UPDATE
        ORDER BY tgname
        LIMIT 1;

      IF first_name NOT LIKE 'aa_lww_guard_%' THEN
        RAISE EXCEPTION 'trigger_ordering_failed: first BEFORE UPDATE trigger on % is "%" (expected aa_lww_guard_*)',
          tbl, first_name;
      END IF;
    END LOOP;

    RAISE NOTICE 'trigger_ordering_ok: aa_/mm_/zz_ Konvention auf 6 Tabellen verifiziert';
  end $$;

ROLLBACK;
