-- Phase 2.5 / Migration 003 — Shared Garden Model (D-01..D-19)
-- Prerequisite: Migration 001 (foundation) + 002 (profiles) applied. Uses public.tg_set_updated_at() from 001.
-- Atomicity: Supabase wraps each migration file in an implicit transaction (D-15). DO NOT add explicit BEGIN/COMMIT.
-- Rollback-strategy: none needed — if any step fails, Postgres rolls back the whole file.
-- Test coverage: supabase/tests/{rls_member_check,member_limit,invite_code,migration_003_atomic}.sql
--                + supabase/tests/{delete_garden_owner_only,delete_garden_forbidden_if_members,
--                  transfer_ownership_owner_only,transfer_ownership_target_must_be_member,
--                  transfer_ownership_atomic}.sql — run after push.
--
-- Order (Pattern 1):
--   1. CREATE gardens, garden_members, invite_codes + indexes
--   2. 2-Member-Limit trigger (Pattern 2 — CHECK mit Subquery in Postgres nicht erlaubt → BEFORE INSERT Trigger per D-17 Claude's Discretion)
--   3. profiles.display_name ADD COLUMN + backfill from email-prefix
--   4. Seed Default-Gärten for every existing profile + owner entry in garden_members
--   5. garden_id + updated_by_user_id ADD COLUMN on vereinsregeln/ai_jobs/ai_results (nullable first)
--   6. UPDATE … SET garden_id = … (backfill) → ALTER TABLE … SET NOT NULL
--   7. RENAME user_id → created_by_user_id (D-06 retain-for-audit) + new garden_id indexes
--   8. DROP old *_own policies + CREATE member-check policies (Pattern 5: (select auth.uid()) wrap)
--   9. RPC functions:
--        9a. gen_invite_code (helper)
--        9b. create_invite_for_garden (D-07 Owner-only, D-11 single-active)
--        9c. consume_invite_code (D-09 atomic)
--        9d. ensure_default_garden_for_user (D-12 idempotent)
--        9e. delete_garden (D-16 Owner-only, refuses if members > 1)
--        9f. transfer_ownership (D-16 Owner-only, target-must-be-member, atomic role swap)
--   10. updated_at / updated_by_user_id trigger attachments (Pattern 6)
--   11. Post-migration invariants (defensive)

-- ──────────────────────────────────────────────────────────────
-- 1. Neue Tabellen: gardens, garden_members, invite_codes
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.gardens (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  plz                  text,
  klimazone            smallint check (klimazone between 1 and 7),
  archetype            text check (archetype in (
    'selbstversorger','familien_naschgarten','mix_ausgewogen',
    'zier_erholung','biodiversitaet','kraeuter_apotheker'
  )),
  created_by_user_id   uuid references auth.users(id) on delete set null,
  updated_by_user_id   uuid references auth.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

CREATE TABLE public.garden_members (
  garden_id   uuid not null references public.gardens(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner','member')),
  joined_at   timestamptz not null default now(),
  primary key (garden_id, user_id)
);
CREATE INDEX garden_members_user_garden_idx ON public.garden_members (user_id, garden_id);
CREATE INDEX garden_members_garden_idx ON public.garden_members (garden_id);

CREATE TABLE public.invite_codes (
  id                    uuid primary key default gen_random_uuid(),
  garden_id             uuid not null references public.gardens(id) on delete cascade,
  code                  text not null unique,
  created_by_user_id    uuid not null references auth.users(id) on delete cascade,
  consumed_at           timestamptz,
  consumed_by_user_id   uuid references auth.users(id),
  expires_at            timestamptz not null default (now() + interval '24 hours'),
  created_at            timestamptz not null default now()
);
CREATE INDEX invite_codes_garden_idx ON public.invite_codes (garden_id);
-- Partial unique index: only one active (consumed_at IS NULL) code per garden (D-11).
CREATE UNIQUE INDEX invite_codes_one_active_per_garden
  ON public.invite_codes (garden_id)
  WHERE consumed_at IS NULL;

-- ──────────────────────────────────────────────────────────────
-- 2. 2-Member-Limit Trigger (Pattern 2)
--    (CHECK mit Subquery in Postgres nicht erlaubt → BEFORE INSERT Trigger per D-17 Claude's Discretion)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_garden_members_limit_2()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_count int;
BEGIN
  -- Row-lock the parent garden to serialize concurrent garden_members inserts (Pitfall 3).
  PERFORM 1 FROM public.gardens WHERE id = NEW.garden_id FOR UPDATE;
  SELECT count(*) INTO current_count FROM public.garden_members WHERE garden_id = NEW.garden_id;
  IF current_count >= 2 THEN
    RAISE EXCEPTION 'garden_member_limit_exceeded'
      USING ERRCODE = '23514', MESSAGE = 'Dieser Garten hat bereits 2 Mitglieder.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER garden_members_limit_2
  BEFORE INSERT ON public.garden_members
  FOR EACH ROW EXECUTE FUNCTION public.tg_garden_members_limit_2();

-- ──────────────────────────────────────────────────────────────
-- 3. profiles: display_name (D-05)
--    Pitfall 4: do NOT drop plz/klimazone/archetype here — Two-phase refactor,
--    future Migration 004 will drop them once all code is switched over.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN display_name text;
-- Default: Email-Prefix für Bestandsuser (Pitfall 7)
UPDATE public.profiles p
SET display_name = split_part(u.email, '@', 1)
FROM auth.users u
WHERE u.id = p.id AND p.display_name IS NULL;

-- ──────────────────────────────────────────────────────────────
-- 4. Default-Gärten seeden für Bestandsuser
--    Ein Garten pro existierendem profile. Metadaten aus profiles kopieren.
-- ──────────────────────────────────────────────────────────────
INSERT INTO public.gardens (id, name, plz, klimazone, archetype, created_by_user_id)
SELECT gen_random_uuid(), 'Mein Garten', p.plz, p.klimazone, p.archetype, p.id
FROM public.profiles p;

INSERT INTO public.garden_members (garden_id, user_id, role)
SELECT g.id, g.created_by_user_id, 'owner'
FROM public.gardens g;

-- ──────────────────────────────────────────────────────────────
-- 5. garden_id + updated_by_user_id auf Phase-2-Tabellen (nullable initial)
--    ai_jobs.updated_at existiert bereits aus Migration 001 → nicht re-adden.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.vereinsregeln ADD COLUMN garden_id uuid REFERENCES public.gardens(id) ON DELETE CASCADE;
ALTER TABLE public.vereinsregeln ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.vereinsregeln ADD COLUMN updated_by_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.ai_jobs ADD COLUMN garden_id uuid REFERENCES public.gardens(id) ON DELETE CASCADE;
ALTER TABLE public.ai_jobs ADD COLUMN updated_by_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.ai_results ADD COLUMN garden_id uuid REFERENCES public.gardens(id) ON DELETE CASCADE;

-- ──────────────────────────────────────────────────────────────
-- 6. Backfill garden_id from existing user_id → SET NOT NULL
-- ──────────────────────────────────────────────────────────────
UPDATE public.vereinsregeln v
SET garden_id = g.id
FROM public.gardens g
WHERE g.created_by_user_id = v.user_id AND v.garden_id IS NULL;

UPDATE public.ai_jobs j
SET garden_id = g.id
FROM public.gardens g
WHERE g.created_by_user_id = j.user_id AND j.garden_id IS NULL;

UPDATE public.ai_results r
SET garden_id = g.id
FROM public.gardens g
WHERE g.created_by_user_id = r.user_id AND r.garden_id IS NULL;

-- SET NOT NULL nachdem Backfill komplett
ALTER TABLE public.vereinsregeln ALTER COLUMN garden_id SET NOT NULL;
ALTER TABLE public.ai_jobs ALTER COLUMN garden_id SET NOT NULL;
ALTER TABLE public.ai_results ALTER COLUMN garden_id SET NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- 7. user_id → created_by_user_id rename (D-06, retain for audit) + neue garden_id Indexe
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.vereinsregeln RENAME COLUMN user_id TO created_by_user_id;
ALTER TABLE public.ai_jobs RENAME COLUMN user_id TO created_by_user_id;
ALTER TABLE public.ai_results RENAME COLUMN user_id TO created_by_user_id;

-- Neue Indexe auf garden_id für RLS-Performance (Pattern 5)
CREATE INDEX vereinsregeln_garden_idx ON public.vereinsregeln (garden_id);
CREATE INDEX ai_jobs_garden_status_idx ON public.ai_jobs (garden_id, status);
CREATE INDEX ai_results_garden_idx ON public.ai_results (garden_id, created_at desc);

-- ──────────────────────────────────────────────────────────────
-- 8. Alte *_own Policies droppen + neue Member-Check-Policies (Pitfall 1: DROP + CREATE in same migration)
--    Alle neuen Policies wrappen auth.uid() in (select auth.uid()) für initPlan caching (Pattern 5).
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.gardens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- gardens
CREATE POLICY "gardens_member_select" ON public.gardens FOR SELECT
  USING ((select auth.uid()) IN (SELECT user_id FROM public.garden_members WHERE garden_id = gardens.id));
CREATE POLICY "gardens_member_update" ON public.gardens FOR UPDATE
  USING ((select auth.uid()) IN (SELECT user_id FROM public.garden_members WHERE garden_id = gardens.id))
  WITH CHECK ((select auth.uid()) IN (SELECT user_id FROM public.garden_members WHERE garden_id = gardens.id));
-- INSERT auf gardens nur via ensure_default_garden_for_user RPC (SECURITY DEFINER) — kein direkter Client-Insert.
-- DELETE nur via delete_garden RPC — Policy erlaubt zusätzlich Owner-Direct-Delete als Defense-in-Depth:
CREATE POLICY "gardens_owner_delete" ON public.gardens FOR DELETE
  USING ((select auth.uid()) IN (
    SELECT user_id FROM public.garden_members WHERE garden_id = gardens.id AND role = 'owner'
  ));

-- garden_members
-- SELECT: alle Member können die Member-Liste ihres Gartens sehen
CREATE POLICY "garden_members_member_select" ON public.garden_members FOR SELECT
  USING ((select auth.uid()) IN (
    SELECT user_id FROM public.garden_members gm2 WHERE gm2.garden_id = garden_members.garden_id
  ));
-- INSERT: nur über RPC consume_invite_code (SECURITY DEFINER), kein direkter Client-Insert (keine Policy → deny by default).
-- UPDATE: Owner darf Rollen ändern (transfer_ownership RPC; auch direkter Update erlaubt für Defense-in-Depth).
CREATE POLICY "garden_members_owner_update" ON public.garden_members FOR UPDATE
  USING ((select auth.uid()) IN (
    SELECT user_id FROM public.garden_members gm3 WHERE gm3.garden_id = garden_members.garden_id AND gm3.role = 'owner'
  ));
-- DELETE: Self (User entfernt sich selbst) ODER Owner entfernt andere.
CREATE POLICY "garden_members_self_or_owner_delete" ON public.garden_members FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT user_id FROM public.garden_members gm4 WHERE gm4.garden_id = garden_members.garden_id AND gm4.role = 'owner'
    )
  );

-- invite_codes: kein direkter Client-Access; nur via RPCs
CREATE POLICY "invite_codes_member_select" ON public.invite_codes FOR SELECT
  USING ((select auth.uid()) IN (
    SELECT user_id FROM public.garden_members WHERE garden_id = invite_codes.garden_id
  ));

-- vereinsregeln — OLD POLICY DROP + NEW POLICY CREATE
DROP POLICY IF EXISTS "vereinsregeln_own" ON public.vereinsregeln;
CREATE POLICY "vereinsregeln_member" ON public.vereinsregeln FOR ALL
  USING ((select auth.uid()) IN (
    SELECT user_id FROM public.garden_members WHERE garden_id = vereinsregeln.garden_id
  ))
  WITH CHECK ((select auth.uid()) IN (
    SELECT user_id FROM public.garden_members WHERE garden_id = vereinsregeln.garden_id
  ));

-- ai_jobs — OLD POLICIES DROP + NEW
DROP POLICY IF EXISTS "ai_jobs_read_own" ON public.ai_jobs;
DROP POLICY IF EXISTS "ai_jobs_insert_own" ON public.ai_jobs;
-- ai_jobs_update_service bleibt — service_role hat nichts mit garden zu tun.
CREATE POLICY "ai_jobs_member_read" ON public.ai_jobs FOR SELECT
  USING ((select auth.uid()) IN (
    SELECT user_id FROM public.garden_members WHERE garden_id = ai_jobs.garden_id
  ));
CREATE POLICY "ai_jobs_member_insert" ON public.ai_jobs FOR INSERT
  WITH CHECK ((select auth.uid()) IN (
    SELECT user_id FROM public.garden_members WHERE garden_id = ai_jobs.garden_id
  ));

-- ai_results — OLD POLICY DROP + NEW
DROP POLICY IF EXISTS "ai_results_read_own" ON public.ai_results;
-- ai_results_insert_service bleibt.
CREATE POLICY "ai_results_member_read" ON public.ai_results FOR SELECT
  USING ((select auth.uid()) IN (
    SELECT user_id FROM public.garden_members WHERE garden_id = ai_results.garden_id
  ));

-- profiles — RLS bleibt id-basiert (ein User sieht nur SEIN Profile).
-- (profiles wird nicht garden-scoped — es ist user-level Metadata.)

-- ──────────────────────────────────────────────────────────────
-- 9a. gen_invite_code — Helper: 6-char Crockford-Alphabet (no 0/O/I/L/U)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gen_invite_code() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  alphabet text := '123456789ABCDEFGHJKMNPQRSTVWXYZ';
  result text := '';
  rnd_bytes bytea;
  idx int;
  i int;
BEGIN
  rnd_bytes := gen_random_bytes(6);
  FOR i IN 0..5 LOOP
    idx := (get_byte(rnd_bytes, i) % length(alphabet)) + 1;
    result := result || substring(alphabet from idx for 1);
  END LOOP;
  RETURN result;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 9b. create_invite_for_garden (D-07 Owner-only, D-11 single-active)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_invite_for_garden(p_garden_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_owner boolean;
  v_code text;
  v_attempts int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Owner-Check (D-07)
  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = v_user AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  -- D-11: alte aktive Codes dieses Gartens invalidieren
  UPDATE public.invite_codes
  SET consumed_at = now()
  WHERE garden_id = p_garden_id AND consumed_at IS NULL;

  -- Neuen Code generieren (bei Unique-Collision retry, max 10)
  LOOP
    v_attempts := v_attempts + 1;
    v_code := public.gen_invite_code();
    BEGIN
      INSERT INTO public.invite_codes (garden_id, code, created_by_user_id)
      VALUES (p_garden_id, v_code, v_user);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts >= 10 THEN
        RAISE EXCEPTION 'code_generation_failed' USING ERRCODE = 'P0001';
      END IF;
    END;
  END LOOP;

  RETURN v_code;
END $$;

REVOKE ALL ON FUNCTION public.create_invite_for_garden(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invite_for_garden(uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 9c. consume_invite_code (D-09 atomic — UPDATE … RETURNING serializes races)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_invite_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_garden_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Atomic claim: the first UPDATE wins, concurrent callers get NULL RETURNING.
  UPDATE public.invite_codes
  SET consumed_at = now(), consumed_by_user_id = v_user
  WHERE upper(code) = upper(p_code)
    AND consumed_at IS NULL
    AND expires_at > now()
  RETURNING garden_id INTO v_garden_id;

  IF v_garden_id IS NULL THEN
    RAISE EXCEPTION 'invite_invalid_or_expired' USING ERRCODE = 'P0002';
  END IF;

  -- BEFORE INSERT Trigger enforces 2-Member-Limit.
  INSERT INTO public.garden_members (garden_id, user_id, role)
  VALUES (v_garden_id, v_user, 'member')
  ON CONFLICT (garden_id, user_id) DO NOTHING;

  RETURN v_garden_id;
END $$;

REVOKE ALL ON FUNCTION public.consume_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_invite_code(text) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 9d. ensure_default_garden_for_user (D-12 idempotent)
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

  -- Lazy profile upsert, falls User sich neu registriert hat
  SELECT split_part(email, '@', 1) INTO v_display_name FROM auth.users WHERE id = v_user;
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

REVOKE ALL ON FUNCTION public.ensure_default_garden_for_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_garden_for_user() TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 9e. delete_garden (D-16: Owner darf Garten löschen)
--     Owner-only. Refuses if garden has > 1 member (force explicit
--     member-removal first — prevents accidental data-loss for co-member).
--     CASCADE on gardens deletes garden_members + all garden_id-scoped rows.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_garden(p_garden_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_owner boolean;
  v_member_count int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Owner-Check (D-16)
  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = v_user AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  -- Refuse if garden has > 1 member (force explicit removal first).
  SELECT count(*) INTO v_member_count
  FROM public.garden_members
  WHERE garden_id = p_garden_id;

  IF v_member_count > 1 THEN
    RAISE EXCEPTION 'garden_has_members' USING ERRCODE = 'P0003';
  END IF;

  -- CASCADE delete: garden_members + vereinsregeln + ai_jobs + ai_results
  -- all drop via ON DELETE CASCADE on their garden_id FK.
  DELETE FROM public.gardens WHERE id = p_garden_id;

  RETURN json_build_object('status', 'deleted', 'garden_id', p_garden_id);
END $$;

REVOKE ALL ON FUNCTION public.delete_garden(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_garden(uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 9f. transfer_ownership (D-16: Owner darf eigenen Owner-Status abgeben)
--     Owner-only. Target must already be a member (role = 'member').
--     Atomic: demotes caller to member + promotes target to owner +
--     updates gardens.created_by_user_id metadata.
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
    RAISE EXCEPTION 'cannot_transfer_to_self' USING ERRCODE = 'P0004';
  END IF;

  -- Caller-is-owner check
  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = v_user AND role = 'owner'
  ) INTO v_caller_is_owner;

  IF NOT v_caller_is_owner THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  -- Target-must-be-existing-member check (role = 'member' specifically —
  -- if target is already owner, the transfer is redundant and 'target_not_member' is correct).
  SELECT exists(
    SELECT 1 FROM public.garden_members
    WHERE garden_id = p_garden_id AND user_id = p_to_user_id AND role = 'member'
  ) INTO v_target_is_member;

  IF NOT v_target_is_member THEN
    RAISE EXCEPTION 'target_not_member' USING ERRCODE = 'P0005';
  END IF;

  -- Atomic role swap (one implicit transaction — Supabase CLI wraps file).
  UPDATE public.garden_members
  SET role = 'member'
  WHERE garden_id = p_garden_id AND user_id = v_user;

  UPDATE public.garden_members
  SET role = 'owner'
  WHERE garden_id = p_garden_id AND user_id = p_to_user_id;

  -- Update metadata (optional but reflects new owner in gardens row).
  UPDATE public.gardens
  SET created_by_user_id = p_to_user_id,
      updated_by_user_id = v_user
  WHERE id = p_garden_id;

  RETURN json_build_object(
    'status', 'transferred',
    'garden_id', p_garden_id,
    'new_owner_id', p_to_user_id
  );
END $$;

REVOKE ALL ON FUNCTION public.transfer_ownership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_ownership(uuid, uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 10. updated_at + updated_by_user_id Trigger-Attachments (Pattern 6)
--     ai_jobs_updated_at existiert bereits aus Migration 001 → nur _updated_by neu.
--     ai_results hat kein updated_at (append-only Audit-Log).
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_set_updated_by_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.updated_by_user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.updated_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER gardens_updated_at BEFORE UPDATE ON public.gardens
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER gardens_updated_by BEFORE UPDATE ON public.gardens
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_by_user_id();

CREATE TRIGGER vereinsregeln_updated_at BEFORE UPDATE ON public.vereinsregeln
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER vereinsregeln_updated_by BEFORE UPDATE ON public.vereinsregeln
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_by_user_id();

CREATE TRIGGER ai_jobs_updated_by BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_by_user_id();
-- ai_jobs_updated_at bleibt aus Migration 001.
-- profiles updated_at bleibt aus Migration 002; kein updated_by (profile ist user-owned).

-- ──────────────────────────────────────────────────────────────
-- 11. Post-migration invariants (defensive — fails migration if violated)
-- ──────────────────────────────────────────────────────────────
do $$
declare cnt int;
begin
  -- Every profile has an owner garden_members row
  select count(*) into cnt from public.profiles p
    where not exists (select 1 from public.garden_members gm where gm.user_id = p.id and gm.role = 'owner');
  if cnt <> 0 then raise exception 'migration_003_invariant: % profiles without owner garden_members row', cnt; end if;

  -- No garden-scoped row has null garden_id
  select count(*) into cnt from public.vereinsregeln where garden_id is null;
  if cnt <> 0 then raise exception 'migration_003_invariant: % vereinsregeln rows with null garden_id', cnt; end if;
  select count(*) into cnt from public.ai_jobs where garden_id is null;
  if cnt <> 0 then raise exception 'migration_003_invariant: % ai_jobs rows with null garden_id', cnt; end if;
  select count(*) into cnt from public.ai_results where garden_id is null;
  if cnt <> 0 then raise exception 'migration_003_invariant: % ai_results rows with null garden_id', cnt; end if;

  raise notice 'migration_003 invariants ok: all profiles seeded + backfill complete';
end $$;
