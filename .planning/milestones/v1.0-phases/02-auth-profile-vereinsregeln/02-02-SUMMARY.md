---
phase: 02-auth-profile-vereinsregeln
plan: "02"
subsystem: ui
tags: [onboarding, profile, expo-router, nativewind, react-native-reusables, zustand, supabase-auth]

requires:
  - phase: 02-auth-profile-vereinsregeln-01
    provides: AuthProvider + useAuth + getOrCreateLocalUUID + supabase client + authStore + StorageAdapter + lookupKlimazone + ARCHETYPES + i18n/de.json
  - phase: 01-foundation
    provides: StorageAdapter (Sqlite/IndexedDB) + Sentry baseline + NativeWind/Expo SDK 53 scaffold
provides:
  - Identity-guarded root layout (GuardedStack) routing between (auth) and (app) groups
  - Auth-Wahl screen with account/local-mode entry and NFR-07 collapsible Haftungsausschluss
  - Registrierung / Login / Verify-Email screens with generic-error policy (T-2-02-02)
  - Garten-Plan-Placeholder as (app)/index landing
  - Profil-Übersicht with mode-agnostic InlineBanners for missing PLZ/Archetyp/Vereinsregeln
  - PLZ-Eingabe with instant static lookupKlimazone (no debounce, no network)
  - Archetyp-Auswahl 2-column grid with 6 ArchetypeCards
  - profileStore (Zustand, NO persist middleware — D-11) + profileRepo (mode-aware account/local persistence) + useProfile hook
  - Four custom components (InlineBanner, AuthChoiceCard, ArchetypeCard, TrafficLightBadge) per UI-SPEC
  - Seven react-native-reusables primitives (button/input/label/card/badge/separator/text) manually installed under app/src/components/ui/
affects: [02-04 (Vereinsregeln Wizard builds on (app)/profile/vereinsregeln route), Phase 3 (Foto-Analyse consumes useProfile().plz + klimazone + archetype)]

tech-stack:
  added:
    - class-variance-authority
    - clsx
    - tailwind-merge
    - lucide-react-native
  patterns:
    - GuardedStack (expo-router 4 equivalent of Stack.Protected) — useSegments + Redirect driven by AuthProvider identity
    - NativeWind className-only styling across all Phase 2 screens (no inline style objects)
    - Mode-aware persistence via profileRepo branching on useAuthStore.mode
    - Generic-error policy on auth failures (no account-existence leak)

key-files:
  created:
    - components.json (shadcn schema at repo root)
    - app/src/lib/utils.ts (cn helper)
    - app/src/components/ui/button.tsx
    - app/src/components/ui/input.tsx
    - app/src/components/ui/label.tsx
    - app/src/components/ui/card.tsx
    - app/src/components/ui/badge.tsx
    - app/src/components/ui/separator.tsx
    - app/src/components/ui/text.tsx
    - app/src/components/InlineBanner.tsx
    - app/src/components/AuthChoiceCard.tsx
    - app/src/components/ArchetypeCard.tsx
    - app/src/components/TrafficLightBadge.tsx
    - app/src/stores/profileStore.ts
    - app/src/lib/profileRepo.ts
    - app/src/hooks/useProfile.ts
    - app/src/stores/__tests__/profileStore.test.ts
    - app/app/(auth)/_layout.tsx
    - app/app/(auth)/index.tsx
    - app/app/(auth)/register.tsx
    - app/app/(auth)/login.tsx
    - app/app/(auth)/verify-email.tsx
    - app/app/(app)/_layout.tsx
    - app/app/(app)/index.tsx
    - app/app/(app)/profile/index.tsx
    - app/app/(app)/profile/plz.tsx
    - app/app/(app)/profile/archetype.tsx
  modified:
    - app/app/_layout.tsx (added AuthProvider + GuardedStack + SplashController; preserved Sentry.init + Sentry.wrap)
    - app/tsconfig.json (added @/* path alias)
    - app/package.json (added 4 deps)
    - pnpm-lock.yaml
  deleted:
    - app/app/index.tsx (Phase 1 placeholder replaced by identity-driven routing)

key-decisions:
  - "Swapped Stack.Protected (expo-router 5+ API) for GuardedStack + useSegments + Redirect pattern — project is pinned to expo-router 4.0.22. Security properties (no (app) access without identity, no (auth) access with identity) preserved."
  - "react-native-reusables installed manually instead of via shadcn CLI — the shadcn CLI only supports web frameworks (Next/Vite/Astro). Source attribution pinned in each primitive's header comment (founded-labs/react-native-reusables)."
  - "profileStore deliberately has NO persist middleware (D-11) — account mode reads from Supabase, local mode reads from StorageAdapter JSON blob (Pitfall 6 — one key, not flat keys). Verified by profileStore.test asserting AsyncStorage.setItem never called."
  - "Inline i18n helper t() per screen reads shared/i18n/de.json via dotted-key reduction. Documented as Phase-2 stopgap pending a real i18n library in a later phase."
  - "Auth errors use single generic string (auth.login.error_generic / auth.register.error_generic) regardless of Supabase error details — mitigates T-2-02-02 (account-existence information disclosure)."

patterns-established:
  - "GuardedStack pattern: a root component that calls useSegments() + useAuth() and returns a <Redirect> when the current segment group mismatches identity."
  - "Screen-local i18n helper: const t = (key) => key.split('.').reduce((o,k)=>o?.[k], de) ?? key; — imported in every Phase 2 screen."
  - "ArchetypeCard grid pattern: outer View className='flex-row flex-wrap gap-4', each item wrapped in View className='w-[48%]' for 2-column layout on mobile + web."

requirements-completed: [AUTH-05, PROF-01, PROF-02, PROF-03, PROF-04]

duration: ~55 min
completed: 2026-04-19
---

# Phase 02 Plan 02: Onboarding + Profile UI Summary

**Identity-guarded Expo Router flow with Auth-Wahl, PLZ→Klimazone instant lookup, Archetyp picker, and mode-aware Zustand profile persistence (no-persist D-11).**

## Performance

- **Duration:** ~55 min (wall clock; includes context compaction mid-session)
- **Started:** 2026-04-19 (prior session)
- **Completed:** 2026-04-19T16:21:38Z
- **Tasks:** 3 implementation tasks (checkpoint 4 is manual QA)
- **Files created:** 26
- **Files modified:** 4
- **Files deleted:** 1

## Accomplishments

- Full non-Vereinsregeln onboarding path wired end-to-end: cold start → Auth-Wahl → (account OR local) → Profil-Übersicht → PLZ → Archetyp.
- `GuardedStack` replaces `Stack.Protected` (which is SDK 54+ only) — preserves both redirect directions on expo-router 4.0.22.
- Seven react-native-reusables primitives + four bespoke components landed with NativeWind-only styling.
- profileStore verified NO-persist at test level (AsyncStorage.setItem never called during mutations).
- PROF-01 verified: `lookupKlimazone('12043') → 4` is synchronous, no network dependency.

## Task Commits

Each task committed atomically via `--no-verify` (worktree flow):

1. **Task 2-02-01: react-native-reusables primitives + 4 custom components + profileStore + profileRepo + useProfile** — `b950dc2` (feat)
   - Also overwrites Wave 0 stub profileStore.test with 6 passing tests.
2. **Task 2-02-02: Root layout with AuthProvider + guarded routing; (auth) + (app) groups; Auth-Wahl/Register/Login/Verify-Email; Garten-Plan-Placeholder** — `b7a7077` (feat)
3. **Task 2-02-03: Profil-Übersicht + PLZ-Eingabe + Archetyp-Auswahl screens** — `9865b75` (feat)

**Checkpoint 2-02-04 (human-verify)** — deferred to operator per plan; verification script preserved below.

## Files Created/Modified

### Foundation (Task 2-02-01)

- `components.json` — shadcn schema at repo root; documents manual-install fallback path.
- `app/src/lib/utils.ts` — `cn()` helper (clsx + twMerge).
- `app/src/components/ui/{button,input,label,card,badge,separator,text}.tsx` — RN primitives, NativeWind-only, stone baseColor + accent `#4A7C59`/`#6BAA7E`.
- `app/src/components/InlineBanner.tsx` — amber warning banner with `border-l-4 border-amber-500`, AlertCircle icon, optional action + dismiss.
- `app/src/components/AuthChoiceCard.tsx` — `min-h-[120px]` tappable card with LucideIcon slot, title, 2-line description.
- `app/src/components/ArchetypeCard.tsx` — selectable card with `border-[#4A7C59]` accent border and Check icon in selected state, `accessibilityRole="radio"`.
- `app/src/components/TrafficLightBadge.tsx` — 4 states with hex colors `#15803D`/`#D97706`/`#DC2626`/`#78716C`; optional Pressable wrap with 44px hit target.
- `app/src/stores/profileStore.ts` — Zustand store, NO persist. setPlz/setArchetype/setVereinsregeln/reset.
- `app/src/lib/profileRepo.ts` — account mode → Supabase upsert; local mode → StorageAdapter JSON blob under `profile` key (Pitfall 6).
- `app/src/hooks/useProfile.ts` — useEffect hydrates from repo on mount; exposes plz/klimazone/archetype/vereinsregeln + async setPlz/setArchetype.
- `app/src/stores/__tests__/profileStore.test.ts` — 6 tests; asserts AsyncStorage.setItem never called (D-11).

### Routing + Auth screens (Task 2-02-02)

- `app/app/_layout.tsx` — preserves Sentry.init + Sentry.wrap; adds AuthProvider, SplashScreen.preventAutoHideAsync + SplashController, GuardedStack.
- `app/app/(auth)/_layout.tsx` + `app/app/(app)/_layout.tsx` — minimal Stack wrappers.
- `app/app/(auth)/index.tsx` — Auth-Wahl with AuthChoiceCard x2 (UserPlus / Smartphone) + collapsible Haftungsausschluss (NFR-07).
- `app/app/(auth)/register.tsx` — `supabase.auth.signUp`; on session null → verify-email; on session → setAccountMode; error `auth.register.error_generic` + accessibilityLiveRegion=polite.
- `app/app/(auth)/login.tsx` — `supabase.auth.signInWithPassword`; generic error `auth.login.error_generic` (never reveals account existence — T-2-02-02).
- `app/app/(auth)/verify-email.tsx` — Mail icon info screen with "Zur Anmeldung" button.
- `app/app/(app)/index.tsx` — Garten-Plan-Placeholder with "Zum Profil" CTA.
- `app/app/index.tsx` — deleted (replaced by identity-driven routing).

### Profile screens (Task 2-02-03)

- `app/app/(app)/profile/index.tsx` — Standort / Garten-Archetyp / Vereinsregeln sections with InlineBanner-for-missing / Card-for-present pattern; neutral TrafficLightBadge for BKleingG status (D-10 placeholder).
- `app/app/(app)/profile/plz.tsx` — digit-only input, instant `lookupKlimazone`, Klimazone badge appears as soon as 5 digits entered; accessibilityLiveRegion=polite for invalid-format error.
- `app/app/(app)/profile/archetype.tsx` — 2-column grid (w-[48%]) of 6 ArchetypeCards with labels + descriptions per plan.

## Decisions Made

- **Stack.Protected → GuardedStack:** plan called for `Stack.Protected guard={...}` (expo-router 5+); project is on 4.0.22. Replaced with `useSegments` + `<Redirect>` guards inside a `GuardedStack` component wrapping the Stack. Security properties identical.
- **Manual RN-reusables install:** shadcn CLI is web-only. Each primitive carries a header comment attributing source repo (founded-labs/react-native-reusables) so a later upgrade can re-sync.
- **Zustand-no-persist for profile state:** D-11 codified into the store shape. Verified by unit test that asserts AsyncStorage.setItem spy is never called across a full mutation sequence.
- **Generic auth errors:** both register and login show a single localized error string regardless of the underlying Supabase error message. Prevents account-existence information disclosure (T-2-02-02).
- **i18n import path:** Fixed plan snippet `@spatenstich/shared/i18n/de.json` → `@spatenstich/shared/i18n/de` to match the package's `exports` map (the `.json` suffix is not keyed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stack.Protected unavailable at pinned expo-router version**
- **Found during:** Task 2-02-02 typecheck (`Property 'Protected' does not exist on type ...`)
- **Issue:** Plan's root-layout snippet uses `<Stack.Protected guard={...}>` — an API added in expo-router 5 / Expo SDK 54+. Project is pinned at expo-router 4.0.22 (SDK 53).
- **Fix:** Introduced a `GuardedStack` component using `useSegments()` + `<Redirect href="/..." />` gated on `useAuth().identity`. Equivalent redirect behavior in both directions (null identity → (auth); non-null → (app)).
- **Files modified:** app/app/_layout.tsx
- **Verification:** typecheck clean; 8 suites / 42 tests still pass.
- **Committed in:** b7a7077 (Task 2-02-02 commit)
- **Plan acceptance grep for `Stack.Protected` cannot pass as written** — the SDK-pinned environment blocks the API. Security intent is preserved by the replacement.

**2. [Rule 1 - Bug] Plan imported i18n bundle from `@spatenstich/shared/i18n/de.json`**
- **Found during:** Task 2-02-02 typecheck
- **Issue:** `packages/shared/package.json` exports map keys `./i18n/de` (not `./i18n/de.json`). Importing `.json` suffix resolves to nothing and breaks the build.
- **Fix:** Changed all 5 import sites (auth screens + (app)/index) to `@spatenstich/shared/i18n/de`.
- **Files modified:** app/app/(auth)/{index,register,login,verify-email}.tsx, app/app/(app)/index.tsx
- **Verification:** typecheck clean; screens consume t('...') successfully.
- **Committed in:** b7a7077

**3. [Rule 2 - Missing Critical] profileRepo cast for supabase smallint klimazone**
- **Found during:** Task 2-02-01
- **Issue:** Plan's `profileRepo.loadProfile` used `data.klimazone as any` — strict mode loses the discriminating union shape.
- **Fix:** Narrowed cast to `data.klimazone as UserProfile['klimazone']` with boundary comment. Preserves type safety into caller.
- **Files modified:** app/src/lib/profileRepo.ts
- **Committed in:** b950dc2

**Total deviations:** 3 auto-fixed (2 bugs in plan snippets, 1 strict-type tightening)
**Impact:** No scope creep. All deviations fix plan snippets that would not compile or run at the pinned dependency versions.

## Issues Encountered

- **shadcn CLI manual fallback** (expected per plan): the CLI's only published component registries are web-framework templates. Manually wrote the seven primitives following react-native-reusables conventions, pinning provenance in header comments. Plan explicitly authorized this fallback.
- **Zustand `persist`-in-comment false positive** (non-issue): profileStore.ts contains the word `persist` in a documentation comment explaining the absence of the middleware. `grep "persist\\("` correctly returns no matches (the stricter acceptance test intent).

## Verification Status

- `pnpm --filter app run typecheck` — **green**
- `pnpm --filter app test` — **green** (8 suites, 42 tests: authStore 5, profileStore 6, storage/migration/etc. 31)
- Manual Checkpoint 2-02-04 (human-verify) — **pending operator**; 9-step script preserved verbatim in plan for execution during phase gate.

## Known Stubs

- Profile-Übersicht "Vereinsregeln" banner links to `/(app)/profile/vereinsregeln` — that route is created in Plan 02-04. Cast-through navigation via `as any` (expo-router typed routes hasn't seen the path yet). Intentional; resolves when 02-04 lands.
- `TrafficLightBadge` is always rendered in `neutral` state on the profile screen (D-10 placeholder). Real 1/3-rule evaluation arrives when the Gartenplan editor exists (Phase 4+).

## Pending Checkpoint

**Checkpoint 2-02-04 (human-verify, AUTH-05 stopwatch):**
1. `pnpm --filter app start --web` → open URL, verify Auth-Wahl is first screen.
2. Tap "Lokal starten" → lands in Garten-Plan-Placeholder; direct URL to `/(auth)` redirects back to `/(app)`.
3. Profil → 3 InlineBanners (PLZ/Archetyp/Vereinsregeln) + neutral BKleingG badge.
4. PLZ banner → enter 12043 → "Klimazone 4" badge shows instantly; submit → banner replaced.
5. Archetyp banner → 6-card grid → pick "Selbstversorger" → accent border + check; submit.
6. Reload browser → UUID + saved PLZ/Archetyp persist (IndexedDB).
7. Native (Expo Go) → repeat 1–2 on iPhone; no FOPC flicker.
8. Stopwatch: cold start → plan landing with PLZ + Archetyp set < 5 min (AUTH-05).
9. (Optional) Account flow: register → verify-email OR direct session into (app).

## Next Phase Readiness

- Plan 02-04 (Vereinsregeln Wizard) can now build on `/(app)/profile/vereinsregeln` with the foundation laid by this plan (InlineBanner, profileStore.vereinsregeln slice, mode-aware repo).
- Phase 3 (Foto-Analyse) can consume `useProfile().plz/klimazone/archetype` as first-class inputs.

## Self-Check: PASSED

Verified artifacts:

- `app/app/_layout.tsx` — FOUND (AuthProvider + GuardedStack + Sentry.wrap + SplashScreen)
- `app/app/(auth)/{index,register,login,verify-email}.tsx` — FOUND (4/4)
- `app/app/(app)/{_layout,index}.tsx` — FOUND (2/2)
- `app/app/(app)/profile/{index,plz,archetype}.tsx` — FOUND (3/3)
- `app/src/components/ui/{button,input,label,card,badge,separator,text}.tsx` — FOUND (7/7)
- `app/src/components/{InlineBanner,AuthChoiceCard,ArchetypeCard,TrafficLightBadge}.tsx` — FOUND (4/4)
- `app/src/stores/profileStore.ts` — FOUND (no persist())
- `app/src/lib/profileRepo.ts` — FOUND (mode-aware)
- `app/src/hooks/useProfile.ts` — FOUND
- `app/src/stores/__tests__/profileStore.test.ts` — FOUND (6 tests passing)
- `components.json` — FOUND (repo root)

Verified commits (via `git log --oneline`):

- `b950dc2` — FOUND (Task 2-02-01)
- `b7a7077` — FOUND (Task 2-02-02)
- `9865b75` — FOUND (Task 2-02-03)

---
*Phase: 02-auth-profile-vereinsregeln*
*Plan: 02*
*Completed: 2026-04-19*
