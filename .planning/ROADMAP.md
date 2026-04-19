# Roadmap: Kleingarten-App (Spatenstich)

## Overview

Seven phases take the project from empty monorepo to a fully working MVP: Dirk photographs his allotment, sees a confirmed 2D plan, edits it on canvas, tracks his seed inventory, and gets a climate-aware planting calendar — all offline-capable and BKleingG-compliant. Phase 1 builds the technical foundation that every subsequent phase depends on. Phases 2–3 establish identity, location, and offline sync. Phases 4–5 deliver the core USP (photo → plan → editor). Phases 6–7 complete the calendar loop.

## Phases

- [x] **Phase 1: Foundation** - Monorepo, StorageAdapter, Supabase schema + RLS, pgmq, feature flags, EAS CI (completed 2026-04-17)
- [ ] **Phase 2: Auth, Profile & Vereinsregeln** - Account or local mode, PLZ/Klimazone, Archetyp, Vereinsregeln input, onboarding flow
- [ ] **Phase 3: Offline & Sync** - Outbox sync, network detection, cross-platform storage, photo queue
- [ ] **Phase 4: Garten-Erfassung (M1)** - Guided photo capture, Claude Vision analysis, element confirmation, 2D plan render
- [ ] **Phase 5: Plan-Editor (M2)** - Interactive canvas, drag & drop, layers, undo/redo, rule warnings, 60fps
- [ ] **Phase 6: Saatgut-Inventar (M3)** - Seed packet scan, Sorten-DB, inventory CRUD, expiry tracking
- [ ] **Phase 7: Pflanz- & Aussaatkalender (M4)** - 12-month timeline, climate-adjusted dates, placement suggestions, plan integration

## Phase Details

### Phase 1: Foundation
**Goal**: The monorepo compiles, tests pass in CI, Supabase schema is live with RLS, and every subsequent phase can start without revisiting infrastructure.
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, NFR-06, NFR-08
**Success Criteria** (what must be TRUE):
  1. `pnpm install && pnpm build` succeeds in the monorepo; app/, supabase/, and packages/shared are all referenced correctly
  2. EAS Build produces a runnable iOS build and a Web export from CI without manual intervention
  3. Supabase migration 001 is applied: every table has RLS enabled, user_id FK, and auth.uid() policy — confirmed by querying as an authenticated test user and receiving only own rows
  4. Feature flag `example_flag` can be toggled in Supabase dashboard and read in the app via `useFlag()` without a redeploy
  5. A test AI job inserted into pgmq is picked up by the Edge Function consumer and the raw response is persisted in `ai_results` — Claude API key never appears in any client bundle
**Plans**: 3 plans
  - [x] 01-01-PLAN.md — Monorepo + packages/shared + StorageAdapter (Wave 1)
  - [x] 01-02-PLAN.md — Supabase schema + RLS + pgmq + feature flags (Wave 2)
  - [x] 01-03-PLAN.md — EAS CI + Edge Function consumer + E2E verification (Wave 3)
**UI hint**: no

### Phase 2: Auth, Profile & Vereinsregeln
**Goal**: Dirk can complete the full onboarding in under 5 minutes — choosing account or local mode, entering his PLZ, picking an Archetyp, optionally uploading or entering Vereinsregeln — and his profile persists across restarts.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, PROF-02, PROF-03, PROF-04, RULES-01, RULES-02, RULES-03, RULES-04, RULES-05, NFR-07
**Success Criteria** (what must be TRUE):
  1. User can create an account with email/password, log in, and remain logged in after app restart
  2. User can tap "lokal nutzen", complete onboarding, and use the app without ever entering an email — data survives app restart via expo-secure-store UUID
  3. User enters PLZ 12345 and the app displays the correct Klimazone label without network call; changing PLZ updates Klimazone immediately
  4. User selects an Archetyp (e.g. "Selbstversorger") and the selection is reflected in profile data that downstream features can read
  5. User uploads a Vereinssatzung PDF; the app shows extracted rules for confirmation; user can edit, delete, or accept each rule; the BKleingG 1/3-Nutzgartenpflicht warning appears in the profile when the plan violates the threshold
**Plans**: 4 plans
Plans:
- [x] 02-01-PLAN.md — Schema (profiles + vereinsregeln + storage bucket) + Auth core (LargeSecureStore + getOrCreateLocalUUID + authStore + NativeWind 4.1.23) + Domain types/i18n/seed (Wave 1)
- [ ] 02-02-PLAN.md — Onboarding & Profile UI (Stack.Protected route guards, Auth-Wahl with NFR-07 Haftungsausschluss, signUp/signIn/verify-email, Garten-Plan-Placeholder, Profile-Übersicht with InlineBanner + TrafficLightBadge, PLZ + Archetype screens) (Wave 2)
- [ ] 02-03-PLAN.md — Vereinsregeln Edge Function (synchronous Claude Files API extraction with 55s client AbortController, parseRules pure module, FOUND-06 inheritance) (Wave 2)
- [ ] 02-04-PLAN.md — Vereinsregeln UI (entry/upload/confirm/checklist) + VereinsregelRow + ExtractionLoader + Settings (Logout + Local→Account Migration per AUTH-04/D-12) + end-to-end manual checkpoint (Wave 3)
**UI hint**: yes

### Phase 3: Offline & Sync
**Goal**: Dirk can open the app without internet, view and edit his plan, and all changes sync automatically — including queued photo uploads — when connectivity returns.
**Depends on**: Phase 2
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, NFR-01, NFR-04, NFR-05
**Success Criteria** (what must be TRUE):
  1. App opens and renders the last-seen plan with no network — no spinner, no error, no blank screen
  2. A photo captured offline is stored locally; when the network returns the photo is uploaded and the AI analysis job is enqueued automatically without user action
  3. Edits made offline appear in Supabase Postgres within 30 seconds of reconnection; the sync-status indicator shows "synced" when complete
  4. The app runs on desktop browser (Chrome/Safari) with IndexedDB as the storage backend — the same plan data is visible on both iPhone and browser after sync
**Plans**: TBD
**UI hint**: no

### Phase 4: Garten-Erfassung (M1)
**Goal**: Dirk photographs his allotment from 3 angles, enters the plot dimensions, and sees a confirmed schematic 2D plan populated with the elements Claude Vision detected.
**Depends on**: Phase 3
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, PHOTO-05, PHOTO-06, PHOTO-07, PHOTO-08, NFR-02, NFR-03
**Success Criteria** (what must be TRUE):
  1. The guided capture flow prompts for Overview, Nord, and Süd shots; each photo is resized to max 1.15 MP before upload; a progress indicator is visible while Claude Vision processes (never a blocking UI freeze)
  2. Detected elements appear one by one for confirmation with confidence labels ("sicher" / "unsicher"); user can accept or reject each individually; only accepted elements become plan objects
  3. A schematic plan (drawn style, not photorealistic) renders from the confirmed JSON using the entered garden dimensions as the coordinate space
  4. Uploading only 1 photo shows a warning but still attempts analysis; receiving zero detected elements opens an empty grid template matching the entered dimensions
  5. The app refuses to exceed 200 Claude calls/day hard limit; a soft warning appears at 50 calls; all AI responses (raw + parsed) are persisted in `ai_results`
**Plans**: TBD
**UI hint**: yes

### Phase 5: Plan-Editor (M2)
**Goal**: Dirk can interactively place, move, rotate, and delete garden elements on a metered canvas, with undo/redo, auto-save, and live compliance warnings — running at 60fps on his iPhone.
**Depends on**: Phase 4
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, EDIT-09, EDIT-10, EDIT-11, EDIT-12
**Success Criteria** (what must be TRUE):
  1. Canvas renders the plan at 60fps with 200 elements on a real iPhone (measured via Xcode frame meter); the 1×1 m grid can be toggled on/off without frame drop
  2. User drags an element from the palette onto the canvas; releasing it places the element at the correct garden-meter coordinate (not pixel); a spacing hint appears for plant elements
  3. User draws a bed polygon by tapping corner points; the polygon is saved in garden-meters and renders correctly after zoom or device rotation
  4. Undo reverts the last 20 actions (including drag, rotate, scale, delete); Redo restores them; auto-save fires 5 seconds after the last change without user action
  5. Placing an element that violates a Vereinsregel (e.g. a forbidden tree type) shows an inline warning on the canvas without blocking placement
**Plans**: TBD
**UI hint**: yes

### Phase 6: Saatgut-Inventar (M3)
**Goal**: Dirk can photograph a seed packet and immediately see the extracted variety name, sowing window, and expiry date added to his inventory — or add a variety manually with autocomplete.
**Depends on**: Phase 3
**Requirements**: SEED-01, SEED-02, SEED-03, SEED-04, SEED-05, SEED-06
**Success Criteria** (what must be TRUE):
  1. User photographs a seed packet; Claude Vision extracts the variety name, sowing window, and expiry date; the extracted data appears pre-filled in an editable form before saving
  2. User types "Tom" in the text-add field and sees autocomplete suggestions from the Sorten-DB (100–150 entries); selecting one pre-fills all metadata fields
  3. A variety not found in the DB can be saved as a free-text entry; it appears in inventory with the user's entered data and is not discarded
  4. Inventory list shows a visual expiry badge: green (ok), amber (expires within 6 months), red (expired); user can edit or delete any entry
**Plans**: TBD
**UI hint**: yes

### Phase 7: Pflanz- & Aussaatkalender (M4)
**Goal**: Dirk sees a 12-month scrollable calendar of when to sow, plant, and harvest each variety in his inventory, adjusted for his Klimazone, with placement suggestions that land directly in the plan.
**Depends on**: Phase 5, Phase 6
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06
**Success Criteria** (what must be TRUE):
  1. The 12-month timeline shows a task card for each inventory variety; task dates differ between Klimazone 1 and Klimazone 7 by the documented offset (verifiable by switching PLZ in profile)
  2. Each variety shows distinct bars or labels for Vorkultur (indoor), Direktsaat, Auspflanzen, and Ernte — four task types are visually distinguishable
  3. For a variety with a "sonnig" standort requirement, the placement suggestion points to an unoccupied bed area marked as sunny in the plan; user can accept, relocate, or skip the suggestion
  4. Accepting a placement suggestion adds the plant element to the plan canvas and activates the calendar task — both are visible without any additional manual step
  5. Replanting a variety from the same plant family (e.g. Solanaceae) in the same bed that contained it last season shows a fruchtfolge warning before the placement is confirmed
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-04-17 |
| 2. Auth, Profile & Vereinsregeln | 0/4 | Planned | - |
| 3. Offline & Sync | 0/TBD | Not started | - |
| 4. Garten-Erfassung (M1) | 0/TBD | Not started | - |
| 5. Plan-Editor (M2) | 0/TBD | Not started | - |
| 6. Saatgut-Inventar (M3) | 0/TBD | Not started | - |
| 7. Pflanz- & Aussaatkalender (M4) | 0/TBD | Not started | - |
