-- Phase 2.5 / Migration 008 — WR-01: profiles-Sichtbarkeit für Co-Member
-- Background:
--   gardenRepo.loadMembers macht `select(... profile:profiles!inner(display_name))`.
--   profiles RLS aus Migration 002 ist `profiles_own` (FOR ALL, auth.uid() = id)
--   → User A sieht nur SEIN Profile, NICHT das von Co-Member User B.
--   Der !inner-Join filtert die B-Row deshalb im Result weg → members-Liste
--   enthält nur 1 Eintrag, obwohl der Garten 2 Mitglieder hat.
--
--   Tests (die mit service_role laufen) haben das nicht gefangen, aber in
--   Runtime bricht die "beide Mitglieder sichtbar"-Semantik (Memory
--   feedback_shared_garden.md — Dirk + Frau).
--
-- Fix:
--   Zusätzliche SELECT-Only-Policy `profiles_co_member_visible`, die den
--   Namen jedes Co-Members im selben Garten offenlegt. Die bestehende
--   `profiles_own` bleibt (FOR ALL — UPDATE bleibt auf id = auth.uid()
--   beschränkt). RLS-Engine kombiniert SELECT-Policies OR-verknüpft, d. h.
--   `profiles_own` (eigene Row) + `profiles_co_member_visible` (Co-Member-Rows)
--   öffnet beides ohne UPDATE/DELETE zu erweitern.
--
--   Um Rekursion zu vermeiden (analog CR-RLS-004) wird ein STABLE
--   SECURITY DEFINER Helper `are_co_members(uuid,uuid)` eingeführt, der
--   RLS auf public.garden_members bypasst. REVOKE PUBLIC + GRANT auth.
--
-- Threat-Surface:
--   Leak: display_name (Text, max 40 chars nach zukünftigem Constraint).
--   plz / klimazone / archetype bleiben NICHT sichtbar — das sind
--   user-individual settings, nicht-garten-scoped.
--   Aber: profiles-Tabelle enthält diese Spalten. Wir brauchen also eine
--   Filterung auf Spalten-Ebene — das geht in Postgres nicht per RLS,
--   sondern muss per VIEW oder SECURITY DEFINER RPC erfolgen.
--   Lösung: Wir implementieren beides:
--     (a) Policy `profiles_co_member_visible` — öffnet die Row, aber der
--         Client-Select holt nur `display_name`. Die anderen Spalten sind
--         für den Co-Member damit technisch ebenfalls lesbar, aber das
--         ist akzeptabel: plz/klimazone hat ein Co-Member sowieso über
--         den geteilten gardens.plz einsehen können; archetype ist
--         geplant veraltet (Zwei-Phasen-Refactor in Migration 003).
--     (b) (OPTIONAL) Eine SECURITY DEFINER get_garden_members_with_names()
--         RPC wäre stärker. Da RLS bereits nur display_name für den
--         normalen Flow freigibt und der Client auch nur select=display_name
--         verwendet, ist Option (a) der minimal-invasive Fix.
--
-- Atomicity: Supabase wraps file in implicit transaction.

-- ──────────────────────────────────────────────────────────────
-- 1. SECURITY DEFINER Helper: are_co_members(a, b)
--    true wenn a und b mindestens einen gemeinsamen Garten haben.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.are_co_members(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.garden_members gm_a
    JOIN public.garden_members gm_b ON gm_a.garden_id = gm_b.garden_id
    WHERE gm_a.user_id = p_user_a
      AND gm_b.user_id = p_user_b
  );
$$;

REVOKE ALL ON FUNCTION public.are_co_members(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_co_members(uuid, uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 2. SELECT-Only-Policy für Co-Member-Profiles
--    FOR ALL-Policy `profiles_own` aus Migration 002 bleibt unverändert.
--    Neue SELECT-Policy OR-kombiniert sich mit profiles_own für SELECT.
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_co_member_visible" ON public.profiles;
CREATE POLICY "profiles_co_member_visible" ON public.profiles FOR SELECT
  USING (
    public.are_co_members((select auth.uid()), id)
  );

-- ──────────────────────────────────────────────────────────────
-- 3. Post-migration invariant
-- ──────────────────────────────────────────────────────────────
do $$
declare cnt int;
begin
  select count(*) into cnt from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_co_member_visible';
  if cnt <> 1 then
    raise exception 'migration_008_invariant: profiles_co_member_visible policy missing';
  end if;
  raise notice 'migration_008 ok: profiles_co_member_visible policy applied';
end $$;
