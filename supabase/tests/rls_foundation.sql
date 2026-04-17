-- Run with: supabase db execute --file supabase/tests/rls_foundation.sql
-- Erwartet: 0 Zeilen sichtbar für User B wenn User A Daten schreibt.
-- Wird in Task 1-02-05 (Wave 2) vollständig ausgeführt.
BEGIN;
  -- Platzhalter für set_config('request.jwt.claim.sub', '<user-a>', true);
  -- INSERT als User A, dann als User B lesen, 0 Rows erwarten.
ROLLBACK;
