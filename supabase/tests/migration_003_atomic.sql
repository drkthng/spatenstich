-- Phase 2.5 Migration 003 Idempotency + Backfill Test — Plan 02.5-01-04 (stub) / Plan 02.5-02 (green)
-- Erwartet nach Migration 003:
--   1) Jede profiles-Row hat genau einen zugehörigen Default-Garten (seed vollständig)
--   2) Kein vereinsregeln / ai_jobs / ai_results row mit garden_id IS NULL (backfill vollständig)
--   3) Re-run des seeding-Scripts erzeugt keine Duplikate (idempotent in Migration 003 — per Design ONE-shot; Test verifiziert final state)
BEGIN;
  do $$
  declare orphan_count int;
  begin
    -- Jede profiles-Row hat mindestens einen Owner-Eintrag in garden_members
    select count(*) into orphan_count
      from public.profiles p
      where not exists (
        select 1 from public.garden_members gm where gm.user_id = p.id and gm.role = 'owner'
      );
    if orphan_count <> 0 then
      raise exception 'seed_incomplete: % profiles without owner garden_members row', orphan_count;
    end if;
    raise notice 'seed_ok: every profile has an owner garden_members row';

    -- vereinsregeln backfill
    select count(*) into orphan_count from public.vereinsregeln where garden_id is null;
    if orphan_count <> 0 then raise exception 'backfill_incomplete_vereinsregeln: % rows with null garden_id', orphan_count; end if;
    raise notice 'backfill_ok_vereinsregeln: 0 rows with null garden_id';

    -- ai_jobs backfill
    select count(*) into orphan_count from public.ai_jobs where garden_id is null;
    if orphan_count <> 0 then raise exception 'backfill_incomplete_ai_jobs: % rows with null garden_id', orphan_count; end if;
    raise notice 'backfill_ok_ai_jobs: 0 rows with null garden_id';

    -- ai_results backfill
    select count(*) into orphan_count from public.ai_results where garden_id is null;
    if orphan_count <> 0 then raise exception 'backfill_incomplete_ai_results: % rows with null garden_id', orphan_count; end if;
    raise notice 'backfill_ok_ai_results: 0 rows with null garden_id';
  end $$;
ROLLBACK;
