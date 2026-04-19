# Phase 2: Auth, Profile & Vereinsregeln - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Delivers the complete onboarding foundation: Auth choice (Account or local mode), optional PLZ/Klimazone setup, optional Archetyp selection, optional Vereinsregeln input (PDF extraction or checklist), BKleingG 1/3-warning in profile. After this phase, Dirk can start the app, choose his identity mode, and reach a Garten-Plan placeholder screen — with contextual hints guiding him to fill in profile data at his own pace.

No plan editor, no photo capture, no seed inventory — those are Phase 4+. Profile data entered here flows into all downstream phases.

</domain>

<decisions>
## Implementation Decisions

### Onboarding-Struktur

- **D-01:** No mandatory wizard. Free navigation after auth choice — user can skip PLZ, Archetyp, and Vereinsregeln and set them later. No forced sequence post-auth.
- **D-02:** One mandatory first step: on first app launch, user MUST choose "Account erstellen" or "Lokal nutzen". This guarantees a user_id (Supabase UID or local UUID via expo-secure-store) for all subsequent data records.
- **D-03:** Both auth paths (Account and local mode) go through the same profile screens (PLZ, Archetyp, Vereinsregeln). The difference is only in persistence — same UI, different storage backend.
- **D-04:** Missing-data guidance: contextual inline banners per feature (e.g., on the Kalender screen: "PLZ noch nicht gesetzt — Klimazone unbekannt. Jetzt eingeben."). No global setup checklist. User is never blocked, but always informed.

### Navigation & Route-Schutz

- **D-05:** Expo Router file groups: `(auth)/` for auth choice, login, and registration screens. `(app)/` for all protected screens. Root `_layout.tsx` checks session/local-UUID and redirects to `(auth)` if no identity exists, otherwise to `(app)`.
- **D-06:** Post-auth destination: user lands directly on the Garten-Plan placeholder screen (within `(app)/`). This screen will be replaced by the real plan editor in Phase 4/5. From there, navigation to Profile/Settings is free.

### Vereinsregeln-UX

- **D-07:** PDF/image upload → Claude extraction runs synchronously with a loading screen ("Regeln werden extrahiert…", ~10–30 s). No async pgmq queue for this feature in Phase 2. If extraction times out, show error with retry option.
- **D-08:** Confirmation UI: scrollable list view showing all extracted rules at once. Each rule has a toggle (accept/reject) and an inline edit button. User taps "Speichern" to confirm the entire set.
- **D-09:** Checklist alternative (RULES-03): ~10–15 pre-defined common rules with checkboxes + numeric value inputs (e.g., "Maximale Heckenhöhe: ___ cm", "Maximale Laubengröße: ___ m²", "Baumarten verboten: Hochstämme"). BKleingG base rules (RULES-04) are always active, displayed grayed-out and non-toggleable at the top of both the extracted and checklist views.
- **D-10:** BKleingG 1/3 warning (RULES-05): shown in the Profile screen as a status indicator (traffic-light: green/amber/red) showing current Nutz/Zier ratio. In Phase 2 this is a placeholder — the actual ratio calculation requires plan data from Phase 5. Display a neutral "Plan noch nicht vorhanden" state until then.

### Local-Modus-Datenspeicherung

- **D-11:** Storage split in Phase 2:
  - **Local mode users:** All profile data (PLZ, Klimazone, Archetyp, Vereinsregeln) stored via StorageAdapter (SQLite on native, IndexedDB on web). Local UUID stored in expo-secure-store.
  - **Account mode users:** Profile data written directly to Supabase. No local cache layer in Phase 2 — offline caching for account users is Phase 3 scope.
- **D-12:** Migration from local to account: explicit "Account erstellen und Daten übertragen" button in the Profile screen. On click, opens registration screen; after successful signup, local StorageAdapter data is transferred to Supabase in a one-time migration operation.

### Claude's Discretion

- **Haftungsausschluss (NFR-07):** When and how to display "Die App gibt Empfehlungen ohne Gewähr. BKleingG-Compliance liegt in der Verantwortung des Nutzers." (e.g., during first launch, in profile, or as a collapsible note in Vereinsregeln screen).
- **PDF upload availability in local mode:** PDF upload via Supabase Storage is not available to local-mode users (no Supabase auth token). Local-mode users are directed to the checklist alternative. Exact UX for this redirect is Claude's call.
- **Loading screen design** for PDF extraction (progress animation, estimated time hint, cancel option).
- **Inline banner design** for missing profile data (icon, color, dismiss behavior).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §AUTH-01–AUTH-05, PROF-01–PROF-04, RULES-01–RULES-05, NFR-07 — the exact requirements this phase must satisfy
- `.planning/ROADMAP.md` §Phase 2 — success criteria that define done for this phase

### Tech Stack & Constraints
- `CLAUDE.md` — full recommended stack table (Expo Router 4.x, NativeWind 4.x, Zustand 5.x, TanStack Query 5.x, supabase-js 2.49.5+), rejected libraries
- `.planning/PROJECT.md` — Key Decisions table, constraints (DSGVO, EU hosting, single-user MVP, KI server-side only)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions: StorageAdapter interface (CRUD only, D-08), Supabase schema (D-01–D-03), pnpm workspace structure

### Phase 1 Artifacts (reuse these)
- `app/src/lib/supabase.ts` — Supabase client (persistSession: true, autoRefreshToken: true already configured)
- `app/src/storage/` — StorageAdapter, SqliteAdapter, IndexedDbAdapter, migrations.ts
- `app/src/hooks/useFlag.ts` — feature flag hook pattern to follow for any new hooks
- `packages/shared/src/constants/klimazonen.ts` — PLZ → Klimazone lookup table (already built)
- `packages/shared/src/constants/archetypes.ts` — 6 Archetyp definitions (already built)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/src/lib/supabase.ts`: Supabase client fully configured — use directly for auth calls (signUp, signInWithPassword, signOut, onAuthStateChange)
- `app/src/storage/StorageAdapter.ts`: CRUD interface (get/set/delete/list) — use for all local-mode profile persistence
- `packages/shared/src/constants/klimazonen.ts`: Static PLZ → Klimazone lookup already exists — no network call needed (PROF-01)
- `packages/shared/src/constants/archetypes.ts`: 6 Archetyp definitions already exist — use directly for selection UI

### Established Patterns
- Hook pattern: `useFlag.ts` uses `supabase` import directly — new auth/profile hooks should follow the same pattern
- StorageAdapter is always accessed via `app/src/storage/index.ts` (Platform.select export) — never import SqliteAdapter or IndexedDbAdapter directly
- Schema migrations via `migrations.ts` version + up-migration pattern — Phase 2 will need new tables/keys in this migration file
- i18n strings: all UI strings go into `packages/shared/src/i18n/de.json` (NFR-06)

### Integration Points
- `app/app/_layout.tsx`: Root layout — extend here to add session check and route guard logic
- `packages/shared/src/types/domain.ts`: Add UserProfile, VereinsRegel types here for shared use by app/ and Edge Functions
- `packages/shared/src/constants/`: PLZ and Archetyp constants already exist — Vereinsregeln schema constants go here too
- Edge Function for Vereinssatzung extraction: new Deno function in `supabase/functions/` — follows same pattern as existing pgmq consumer

</code_context>

<specifics>
## Specific Ideas

- "Freies Navigieren mit Hinweis welche Funktionen nicht gehen wenn man Punkt nicht eingibt" — the app must never block the user, but contextually surface what's missing exactly where it matters.
- Auth-Wahl screen should feel like a product entry point, not a gate — warm, welcoming, not a compliance form.
- Inline banner design: contextual, dismissible, and actionable (tap banner → go to the missing setting directly).

</specifics>

<deferred>
## Deferred Ideas

- **Multi-User / gemeinsamer Garten:** User möchte App mit Partnerin teilen (jeder vom eigenen Gerät aus). Eigene Phase — requires shared garden data model, RLS for multi-user, invite flow. Explicitly Out of Scope for MVP (see REQUIREMENTS.md Out of Scope table: "Mehrpersonen-Gärten (Shared Access)"). Capture for post-MVP planning.

</deferred>

---

*Phase: 02-auth-profile-vereinsregeln*
*Context gathered: 2026-04-19*
