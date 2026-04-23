# Roadmap: Kleingarten-App (Spatenstich)

> **Pivot 2026-04-21:** MVP-Scope fokussiert auf Foto→Plan→Editor→Kalender für 2-User Shared Garden (Dirk + Frau). Vereinsregeln-Features (Code aus Phase 02 bleibt, per Feature-Flag aus) und Fotorealismus wurden auf v1.1 verschoben.

## Overview

**v1.0 MVP (Saison 2026):** Acht Phasen bringen Spatenstich von leerem Monorepo zu einem nutzbaren MVP: Dirk und seine Frau fotografieren ihre Parzelle, sehen einen bestätigten 2D-Plan, bearbeiten ihn gemeinsam auf Canvas, tracken Saatgut, und bekommen einen klimaangepassten Pflanzkalender — alles offline-fähig und synchronisiert zwischen beiden Accounts.

- Phase 1 baut das technische Fundament.
- Phase 2 liefert Auth + Profil (Vereinsregeln-Code vorhanden, aber per Flag aus bis v1.1).
- Phase 2.5 erweitert das Datenmodell um Shared Garden (gardens + garden_members).
- Phase 3 stellt Offline-Sync für 2-User-Edits sicher.
- Phasen 4–5 liefern das Core-USP (Foto → Plan → Editor).
- Phasen 6–7 schließen die Kalender-Schleife.

**v1.1 Post-MVP:** Phase 8 (Fotorealistisches Beet-Preview) + Phase 9 (Vereinsregeln-Aktivierung) folgen nach Saison-Einsatz 2026.

## Phases

### v1.0 (MVP — Saison 2026)
- [x] **Phase 1: Foundation** - Monorepo, StorageAdapter, Supabase schema + RLS, pgmq, feature flags, EAS CI (completed 2026-04-17)
- [x] **Phase 2: Auth & Profile** - Account/local mode, PLZ/Klimazone, Archetyp, Onboarding. Vereinsregeln-Code liegt vor, per Feature-Flag ausgeblendet (reaktiviert in Phase 9) (code-complete 2026-04-20, scope reduziert 2026-04-21)
- [ ] **Phase 2.5: Shared Garden Model** - `gardens`-Table + `garden_members`, RLS von `user_id = auth.uid()` auf Member-Check; Invite-Code-Flow für Frau/Partner (NEU — Pivot)
- [ ] **Phase 3: Offline & Sync** - Outbox sync mit 2-User-LWW, network detection, cross-platform storage, photo queue
- [ ] **Phase 4: Garten-Erfassung (M1)** - Guided photo capture, Claude Vision analysis, element confirmation, 2D plan render
- [ ] **Phase 5: Plan-Editor (M2)** - Interactive canvas, drag & drop, layers, undo/redo, 60fps (Vereinsregel-Warnings deferred to Phase 9)
- [ ] **Phase 6: Saatgut-Inventar (M3)** - Seed packet scan, Sorten-DB, inventory CRUD, expiry tracking
- [ ] **Phase 7: Pflanz- & Aussaatkalender (M4)** - 12-month timeline, climate-adjusted dates, placement suggestions, plan integration

### v1.1 (Post-MVP)
- [ ] **Phase 8: Fotorealistisches Beet-Preview** - Gemini 2.5 Flash Image / Nano Banana: Foto vom Beet + Pflanzplan → fotorealistisches Vorschau-Bild (NEU — Pivot)
- [ ] **Phase 9: Vereinsregeln-Aktivierung** - Feature-Flag on, PDF-Edge-Function live (API-Key-Strategie geklärt), Editor-Warnings, BKleingG 1/3-Warnung (NEU — Pivot, reaktiviert Phase-02-Code)

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

### Phase 2: Auth & Profile (Vereinsregeln-Code flagged off)
**Status:** Code Complete 2026-04-20; scope-reduziert per Pivot 2026-04-21. Vereinsregeln-Schicht (Plan 02-03 Edge Function + Plan 02-04 UI) liegt im Code, aber per Feature-Flag ausgeblendet bis Phase 9.
**Goal**: Dirk und seine Frau können sich registrieren / einloggen oder lokal starten, PLZ + Archetyp setzen, und ihr Profil überlebt Neustart. Onboarding < 5 Min.
**Depends on**: Phase 1
**Requirements (aktiv im MVP)**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, PROF-02, PROF-03, PROF-04, NFR-07
**Requirements (deferred to Phase 9)**: RULES-01, RULES-02, RULES-03, RULES-04, RULES-05
**Success Criteria (MVP-aktiv)** (what must be TRUE):
  1. User can create an account with email/password, log in, and remain logged in after app restart
  2. User can tap "lokal nutzen", complete onboarding, and use the app without ever entering an email — data survives app restart via expo-secure-store UUID
  3. User enters PLZ 12345 and the app displays the correct Klimazone label without network call; changing PLZ updates Klimazone immediately
  4. User selects an Archetyp (e.g. "Selbstversorger") and the selection is reflected in profile data that downstream features can read
  5. ~~User uploads a Vereinssatzung PDF...~~ — **DEFERRED zu Phase 9 (v1.1)**
**Plans**: 4 plans — alle code-complete; Vereinsregeln-Scope aus Plan 02-03 + 02-04 per Feature-Flag inaktiv
- [x] 02-01-PLAN.md — Schema (profiles + vereinsregeln + storage bucket) + Auth core (LargeSecureStore + getOrCreateLocalUUID + authStore + NativeWind 4.1.23) + Domain types/i18n/seed (Wave 1)
- [x] 02-02-PLAN.md — Onboarding & Profile UI (Stack.Protected route guards, Auth-Wahl with NFR-07 Haftungsausschluss, signUp/signIn/verify-email, Garten-Plan-Placeholder, Profile-Übersicht with InlineBanner + TrafficLightBadge, PLZ + Archetype screens) (Wave 2)
- [x] 02-03-PLAN.md — Vereinsregeln Edge Function — **flagged off, live-deploy deferred zu Phase 9** (Wave 2)
- [x] 02-04-PLAN.md — Vereinsregeln UI — **flagged off, human-verify 22–26 deferred zu Phase 9** (Wave 3)
**UI hint**: yes

### Phase 2.5: Shared Garden Model (NEU — Pivot 2026-04-21)
**Goal**: Dirk und seine Frau können denselben Kleingarten über zwei Accounts gemeinsam bearbeiten — beide Geräte (iPhone + Desktop) zeigen nach Sync den identischen Plan, Saatgut-Inventar, Kalender.
**Depends on**: Phase 2
**Requirements (neu)**: GARDEN-01, GARDEN-02, GARDEN-03, GARDEN-04 (Shared-Garden-Suite, in Phase 2.5 aus Pivot abgeleitet)
**Success Criteria** (what must be TRUE):
  1. `gardens`-Table und `garden_members`-Table existieren mit RLS-Policies `auth.uid() IN (SELECT user_id FROM garden_members WHERE garden_id = ...)` statt direktem `user_id`-Check
  2. Owner kann einen 6-stelligen Invite-Code generieren; zweiter Account kann per Code beitreten → landet als Member im selben `garden_id`
  3. Alle bestehenden Phase-02-Daten (profiles, vereinsregeln, plans — sobald vorhanden) werden bei Migration pro User einer Default-Garden-Entität zugeordnet; Dirks lokaler Datenbestand bleibt erhalten
  4. Wenn beide Accounts dieselbe Zeile innerhalb von 30 s editieren, gewinnt der spätere Schreibvorgang (LWW über `updated_at`-Timestamp); UI zeigt "zuletzt bearbeitet von <Name>"
**Plans**: 4 plans (2/4 complete)
  - [x] 02.5-01-PLAN.md — Requirements + Domain-Typen + i18n + Wave-0 Test-Stubs (SQL + Jest) (Wave 1) — completed 2026-04-23
  - [x] 02.5-02-PLAN.md — Migration 003 (gardens + garden_members + invite_codes + RLS-Refactor + 5 RPCs inkl. D-16) + Rule-1-Fix-Migrations 004/005/006 + supabase db push --linked + types regen + 11 grüne SQL-Tests (Wave 2) — completed 2026-04-23
  - [ ] 02.5-03-PLAN.md — Repos (gardenRepo + inviteCodeRepo new; profileRepo shrink; vereinsregelnRepo extend) + authStore activeGardenId + migrateLocalToAccount extension (Wave 3)
  - [ ] 02.5-04-PLAN.md — UI (join-by-code + settings/garden + 3rd AuthChoiceCard + settings link + _layout bootstrap useEffect) + human-verify checkpoint (Wave 3)
**UI hint**: yes (Invite-Code-Screen + Member-Liste in Settings)

### Phase 3: Offline & Sync (2-User Shared State)
**Goal**: Dirk und seine Frau können die App ohne Internet öffnen, den gemeinsamen Plan sehen und bearbeiten, und alle Änderungen (inkl. Foto-Queue) werden bei Reconnect automatisch synchronisiert — LWW bei gleichzeitigen Edits, Sync-Status sichtbar.
**Depends on**: Phase 2.5
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, NFR-01, NFR-04, NFR-05
**Success Criteria** (what must be TRUE):
  1. App opens and renders the last-seen plan with no network — no spinner, no error, no blank screen
  2. A photo captured offline is stored locally; when the network returns the photo is uploaded and the AI analysis job is enqueued automatically without user action
  3. Edits made offline appear in Supabase Postgres within 30 seconds of reconnection; the sync-status indicator shows "synced" when complete
  4. The app runs on desktop browser (Chrome/Safari) with IndexedDB as the storage backend — the same plan data is visible on both iPhone and browser after sync
  5. Dirk und Frau editieren denselben Plan offline auf zwei Geräten; bei Reconnect triggert LWW-Merge ohne manuelle Konfliktauflösung; "zuletzt bearbeitet von"-Hinweis zeigt den Gewinner
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
  5. ~~Placing an element that violates a Vereinsregel...~~ — **DEFERRED zu Phase 9 (v1.1)** (Editor-Hook vorbereiten, Regel-Check inaktiv im MVP)
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

---

## v1.1 Post-MVP

### Phase 8: Fotorealistisches Beet-Preview (NEU — Pivot 2026-04-21)
**Goal**: Dirk fotografiert ein leeres oder teilbepflanztes Beet, wählt einen Pflanzplan aus dem Editor (Phase 5) oder Kalender (Phase 7), und die App erzeugt ein fotorealistisches Vorschau-Bild, wie das Beet nach der geplanten Bepflanzung in 4–8 Wochen aussehen wird.
**Depends on**: Phase 5, Phase 7
**Requirements (neu)**: PREVIEW-01 bis PREVIEW-04 (in Phase 8 Spec abzuleiten)
**Success Criteria** (what must be TRUE):
  1. Edge Function nimmt Foto + Plan-JSON + Sorten-Metadaten entgegen, ruft Gemini 2.5 Flash Image (oder Nano Banana / SeeDream) auf, gibt fotorealistisches PNG zurück
  2. Generierung dauert < 30 s auf gängigem Input; Preview wird persistiert in Storage und kann später erneut aufgerufen werden
  3. User kann zwischen "in 4 Wochen", "in 8 Wochen" und "Hochsaison" wechseln; Modell bekommt entsprechenden Zeit-Hint im Prompt
  4. API-Key-Strategie geklärt (Spike davor: entweder Gemini-Free-Tier, eigener Proxy auf 24/7-Rechner, oder bezahlter API-Key)
**Plans**: TBD
**UI hint**: yes

### Phase 9: Vereinsregeln-Aktivierung (NEU — Pivot 2026-04-21)
**Goal**: Die in Phase 02 bereits implementierte Vereinsregeln-Schicht wird per Feature-Flag aktiviert; Edge Function `extract-vereinsregeln` geht live (API-Key-Strategie wie Phase 8), Editor-Warnings (Phase 5 Hook) werden aktiv, BKleingG 1/3-Warnung erscheint bei Nutz/Zier-Verstoß.
**Depends on**: Phase 2 (Code), Phase 5 (Editor-Hook), Phase 8 (API-Key-Strategie geklärt)
**Requirements**: RULES-01, RULES-02, RULES-03, RULES-04, RULES-05 (aus Phase 2 übernommen) + BKLEINGG-01 (1/3-Warnung)
**Success Criteria** (what must be TRUE):
  1. Feature-Flag `vereinsregeln_enabled` auf `true` → Profil-Banner + Settings-PDF-Upload-Karte wieder sichtbar
  2. Edge Function deployed, ACTIVE; PDF-Upload → extrahierte Regeln in < 55 s
  3. Im Plan-Editor (Phase 5): Platzierung eines Elements, das gegen eine Regel verstößt, zeigt Inline-Warnung ohne Blockade
  4. BKleingG-Badge im Profil wird rot/gelb/grün je nach Nutz/Zier-Verhältnis im aktuellen Plan
  5. Human-verify-Checkpoint aus Phase 02 (Schritte 22–33) wird vollständig abgearbeitet
**Plans**: TBD
**UI hint**: yes (reaktiviert bestehende Screens aus Phase 02-04)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-04-17 |
| 2. Auth & Profile (Vereinsregeln flagged off) | 4/4 | Code Complete (MVP-scope verify pending: NFR-07, AUTH-05, AUTH-04, Logout-Guard) | 2026-04-20 |
| 2.5. Shared Garden Model | 0/4 | Planned (NEU — Pivot) | - |
| 3. Offline & Sync | 0/TBD | Not started | - |
| 4. Garten-Erfassung (M1) | 0/TBD | Not started | - |
| 5. Plan-Editor (M2) | 0/TBD | Not started | - |
| 6. Saatgut-Inventar (M3) | 0/TBD | Not started | - |
| 7. Pflanz- & Aussaatkalender (M4) | 0/TBD | Not started | - |
| **— v1.1 Post-MVP —** | | | |
| 8. Fotorealistisches Beet-Preview | 0/TBD | Not started (NEU — Pivot) | - |
| 9. Vereinsregeln-Aktivierung | 0/TBD | Not started (NEU — Pivot, reaktiviert Phase-02-Code) | - |
