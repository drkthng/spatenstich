-- Phase 2.5 / Migration 012 — WR-03: display_name Längen-Constraint
-- Background:
--   profiles.display_name ist unbeschränkter `text`. migrateLocalToAccount
--   schreibt email.split('@')[0] (bis 254 Zeichen nach RFC 5321 local-part).
--   settings/garden.tsx rendert {m.displayName ?? '?'} direkt → Owner-Badge-
--   Row wird bei 254-Zeichen-Namen unbedienbar. Zero-Width-Joiner oder
--   RTL-Overrides können das RN-Layout zusätzlich brechen.
--
--   Kein Security-Bypass (RN escapt XSS automatisch), aber UI-Bruch
--   realistisch bei Power-User-Manipulation via direct-upsert.
--
-- Fix:
--   1. DB-Constraint: display_name zwischen 1 und 40 Zeichen.
--   2. Backfill: existierende überlange display_names werden auf 40 Zeichen
--      gekürzt, damit der Constraint nicht an bestehenden Rows scheitert.
--      (Migration 003 seedete mit split_part(email,'@',1) — realistische
--      Werte sind kurz, aber wir sind defensive.)
--   3. Client-Limit in profileRepo.saveProfile + migrateLocalToAccount
--      (separater commit, gleiche WR-03-Gruppe).
--
-- Wir nutzen btrim + char_length für die Validierung, erlauben also keine
-- all-whitespace-Namen ("   " ist ungültig). Trim findet auf Client-Seite
-- statt — der Constraint ist hart.
--
-- Atomicity: Supabase wraps file in implicit transaction.

-- ──────────────────────────────────────────────────────────────
-- 1. Backfill: bestehende Rows auf max 40 Zeichen kürzen
-- ──────────────────────────────────────────────────────────────
UPDATE public.profiles
SET display_name = left(btrim(display_name), 40)
WHERE display_name IS NOT NULL
  AND (char_length(display_name) > 40 OR btrim(display_name) <> display_name);

-- Falls ein Backfill-Kandidat durch btrim zur leeren String geworden ist,
-- setze auf NULL (Constraint erlaubt das) — User kann im Nachgang einen
-- Namen via saveProfile setzen.
UPDATE public.profiles
SET display_name = NULL
WHERE display_name IS NOT NULL
  AND char_length(display_name) = 0;

-- ──────────────────────────────────────────────────────────────
-- 2. CHECK-Constraint
--    display_name darf NULL sein (Neu-Registrierungen bevor
--    ensure_default_garden_for_user lief). Wenn gesetzt: 1..40 Zeichen
--    AFTER trim, d. h. kein all-whitespace.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_len
  CHECK (
    display_name IS NULL
    OR (
      char_length(display_name) BETWEEN 1 AND 40
      AND btrim(display_name) = display_name
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 3. Seed-Query in ensure_default_garden_for_user härten:
--    split_part(email, '@', 1) wird auf 40 Zeichen gekürzt, damit Neu-
--    Registrierungen mit extrem langen local-parts den Constraint nicht
--    verletzen.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_default_garden_for_user()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_garden_id uuid;
  v_display_name text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT garden_id INTO v_garden_id
  FROM public.garden_members WHERE user_id = v_user
  ORDER BY joined_at ASC LIMIT 1;

  IF v_garden_id IS NOT NULL THEN
    RETURN v_garden_id;
  END IF;

  -- WR-03: left(..., 40) schützt gegen überlange email-local-parts.
  SELECT left(btrim(split_part(email, '@', 1)), 40) INTO v_display_name
  FROM auth.users WHERE id = v_user;
  -- Fallback: leerer local-part → NULL (Constraint erlaubt NULL).
  IF v_display_name = '' THEN v_display_name := NULL; END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (v_user, v_display_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.gardens (name, created_by_user_id)
  VALUES ('Mein Garten', v_user)
  RETURNING id INTO v_garden_id;

  INSERT INTO public.garden_members (garden_id, user_id, role)
  VALUES (v_garden_id, v_user, 'owner');

  RETURN v_garden_id;
END $$;

-- CREATE OR REPLACE preserves GRANT EXECUTE ... TO authenticated.

do $$ begin raise notice 'migration_012 ok: display_name length constraint + ensure_default_garden_for_user hardened'; end $$;
