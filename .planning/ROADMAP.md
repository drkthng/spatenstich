# Roadmap: Kleingarten-App (Spatenstich)

> **Pivot 2026-05-08 (M07):** Kompletter Wegfall von In-App-AI-Calls (Claude Vision, Pl@ntNet). Ersetzt durch manuellen Garten-Plan-Editor + One-Way-Bridge aus externem Claude.ai-Projekt (Dirks Max-Abo). App macht null ausgehende KI-API-Aufrufe. Import ist strukturiertes JSON — kein AI in der App.

> **Pivot 2026-04-21:** MVP-Scope fokussiert auf 2-User Shared Garden (Dirk + Frau). Vereinsregeln-Features per Feature-Flag aus bis Post-MVP.

## Overview

**v1.0 MVP (Saison 2026):** Spatenstich ermöglicht Dirk und seiner Frau, ihre Parzelle manuell als 2D-Plan anzulegen, Beete und Pflanzen zu verwalten, Saatgut zu tracken und einen klimaangepassten Pflanzkalender zu nutzen. Optional: KI-gestützte Analyse über externes Claude.ai-Projekt, dessen strukturierte Ergebnisse per Import-Bridge in die App fließen.

- Phasen 1–2.5 bauen das technische Fundament + Auth + Shared Garden.
- Phase 3 stellt Offline-Sync sicher.
- Phase 4 (alte Garten-Erfassung per Claude Vision) ist **SUPERSEDED** durch M07-Pivot.
- Phase 5 entfernt allen AI-Code und etabliert das Import-Schema.
- Phase 6 baut den Import-Flow + Claude.ai-Companion-Prompt.
- Phase 7 liefert den interaktiven Plan-Editor mit Drafts-Integration.
- Phasen 8–9 schließen mit Saatgut-Inventar und Kalender.

**v1.1 Post-MVP:** Phase 10 (Vereinsregeln-Aktivierung) folgt nach Saison-Einsatz 2026.

## Phases

### v1.0 (MVP — Saison 2026)
- [x] **Phase 1: Foundation** - Monorepo, StorageAdapter, Supabase schema + RLS, pgmq, feature flags, EAS CI (completed 2026-04-17)
- [x] **Phase 2: Auth & Profile** - Account/local mode, PLZ/Klimazone, Archetyp, Onboarding. Vereinsregeln-Code liegt vor, per Feature-Flag ausgeblendet (code-complete 2026-04-20, scope reduziert 2026-04-21)
- [x] **Phase 2.5: Shared Garden Model** - `gardens`-Table + `garden_members`, RLS von `user_id = auth.uid()` auf Member-Check; Invite-Code-Flow (code-complete 2026-04-23; human-verify pending) (NEU — Pivot 2026-04-21)
- [ ] **Phase 3: Offline & Sync** - Outbox sync mit 2-User-LWW, network detection, cross-platform storage, photo queue
- [x] ~~**Phase 4: Garten-Erfassung (M1)**~~ - **SUPERSEDED (Pivot M07 2026-05-08)** — Claude Vision capture flow wurde durch manuellen Plan-Editor + Import-Bridge ersetzt. Code wird in Phase 5 entfernt. (code-complete 2026-05-03, nie human-verified)
- [ ] **Phase 5: AI-Removal + Import-Schema (M07.1 + M07.2)** - Entfernung aller AI-Clients (Claude Vision, Pl@ntNet), Env-Vars, Screens, Tests. JSON-Schema `spatenstich-import.v1` + Referenz-Payloads erstellen.
- [ ] **Phase 6: Import-Flow + Companion-Prompt (M07.3 + M07.4)** - Claude.ai-Projekt-System-Prompt schreiben. `ImportFromClaudeAiScreen` mit Share-Intent + Paste-Fallback + Preview-Screen + Supabase-Draft-Tables.
- [ ] **Phase 7: Plan-Editor + Drafts-Integration (M2 + M07.5)** - Interaktiver Canvas, Drag & Drop, Layers, Undo/Redo, 60fps. Import-Drafts als "Recent Imports"-Tray im Editor. Manueller Einstieg bleibt Default.
- [ ] **Phase 8: Saatgut-Inventar (M3)** - Sorten-DB, manuelle Texteingabe mit Autocomplete, Inventar CRUD, Haltbarkeits-Tracking. Kein KI-Foto-Scan (manuell only).
- [ ] **Phase 9: Pflanz- & Aussaatkalender (M4)** - 12-month timeline, climate-adjusted dates, placement suggestions, plan integration

### v1.1 (Post-MVP)
- [ ] **Phase 10: Vereinsregeln-Aktivierung** - Feature-Flag on, manuelle Regeleingabe live, Editor-Warnings, BKleingG 1/3-Warnung. (Claude PDF-Extraktion entfernt; Regeln werden manuell oder per Claude.ai-Import eingegeben)

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
**Status:** Code Complete 2026-04-20; scope-reduziert per Pivot 2026-04-21. Vereinsregeln-Schicht (Plan 02-03 Edge Function + Plan 02-04 UI) liegt im Code, aber per Feature-Flag ausgeblendet bis Phase 10.
**Goal**: Dirk und seine Frau können sich registrieren / einloggen oder lokal starten, PLZ + Archetyp setzen, und ihr Profil überlebt Neustart. Onboarding < 5 Min.
**Depends on**: Phase 1
**Requirements (aktiv im MVP)**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, PROF-02, PROF-03, PROF-04, NFR-07
**Requirements (deferred to Phase 10)**: RULES-01, RULES-02, RULES-03, RULES-04, RULES-05
**Success Criteria (MVP-aktiv)** (what must be TRUE):
  1. User can create an account with email/password, log in, and remain logged in after app restart
  2. User can tap "lokal nutzen", complete onboarding, and use the app without ever entering an email — data survives app restart via expo-secure-store UUID
  3. User enters PLZ 12345 and the app displays the correct Klimazone label without network call; changing PLZ updates Klimazone immediately
  4. User selects an Archetyp (e.g. "Selbstversorger") and the selection is reflected in profile data that downstream features can read
  5. ~~User uploads a Vereinssatzung PDF...~~ — **DEFERRED zu Phase 10 (v1.1)**
**Plans**: 4 plans — alle code-complete; Vereinsregeln-Scope aus Plan 02-03 + 02-04 per Feature-Flag inaktiv
- [x] 02-01-PLAN.md — Schema (profiles + vereinsregeln + storage bucket) + Auth core (Wave 1)
- [x] 02-02-PLAN.md — Onboarding & Profile UI (Wave 2)
- [x] 02-03-PLAN.md — Vereinsregeln Edge Function — **flagged off, live-deploy deferred zu Phase 10** (Wave 2)
- [x] 02-04-PLAN.md — Vereinsregeln UI — **flagged off, human-verify deferred zu Phase 10** (Wave 3)
**UI hint**: yes

### Phase 2.5: Shared Garden Model (NEU — Pivot 2026-04-21)
**Goal**: Dirk und seine Frau können denselben Kleingarten über zwei Accounts gemeinsam bearbeiten — beide Geräte (iPhone + Desktop) zeigen nach Sync den identischen Plan, Saatgut-Inventar, Kalender.
**Depends on**: Phase 2
**Requirements (neu)**: GARDEN-01, GARDEN-02, GARDEN-03, GARDEN-04
**Success Criteria** (what must be TRUE):
  1. `gardens`-Table und `garden_members`-Table existieren mit RLS-Policies
  2. Owner kann einen 6-stelligen Invite-Code generieren; zweiter Account kann per Code beitreten
  3. Alle bestehenden Phase-02-Daten werden bei Migration pro User einer Default-Garden-Entität zugeordnet
  4. Wenn beide Accounts dieselbe Zeile editieren, gewinnt der spätere Schreibvorgang (LWW)
**Plans**: 4 plans (4/4 complete; human-verify pending)
  - [x] 02.5-01-PLAN.md — Requirements + Domain-Typen + i18n (Wave 1) — completed 2026-04-23
  - [x] 02.5-02-PLAN.md — Migration 003 + RLS-Refactor (Wave 2) — completed 2026-04-23
  - [x] 02.5-03-PLAN.md — Repos + authStore + migrateLocalToAccount (Wave 3a) — completed 2026-04-23
  - [x] 02.5-04-PLAN.md — UI: join-by-code + Mein-Garten (Wave 3b) — completed 2026-04-23
**UI hint**: yes

### Phase 3: Offline & Sync (2-User Shared State)
**Goal**: Dirk und seine Frau können die App ohne Internet öffnen, den gemeinsamen Plan sehen und bearbeiten, und alle Änderungen (inkl. Foto-Queue) werden bei Reconnect automatisch synchronisiert.
**Depends on**: Phase 2.5
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, NFR-01, NFR-04, NFR-05
**Success Criteria** (what must be TRUE):
  1. App opens and renders the last-seen plan with no network — no spinner, no error, no blank screen
  2. A photo captured offline is stored locally; when the network returns the photo is uploaded automatically
  3. Edits made offline appear in Supabase within 30 seconds of reconnection
  4. The app runs on desktop browser with IndexedDB as the storage backend
  5. Dirk und Frau editieren denselben Plan offline → LWW-Merge bei Reconnect
**Plans**: 7 plans
  - [x] 03-01-PLAN.md — Supabase-Migrationen (Wave 1)
  - [x] 03-02-PLAN.md — StorageAdapter Row-Tables (Wave 2)
  - [x] 03-03-PLAN.md — Repo-Umbau offline-first (Wave 3)
  - [x] 03-04-PLAN.md — SyncWorker + SyncTriggers (Wave 3)
  - [x] 03-05-PLAN.md — Photo-Queue + PhotoUploader (Wave 4)
  - [x] 03-06-PLAN.md — Sync-Status-UI (Wave 4)
  - [ ] 03-07-PLAN.md — Gap Closure: uploadPending() wiring (Wave 5)
**UI hint**: partial

### Phase 4: Garten-Erfassung (M1) — SUPERSEDED
**Status:** ⚠️ **SUPERSEDED by Pivot M07 (2026-05-08).** Code-complete 2026-05-03, but never human-verified. All Claude Vision code, Edge Functions, and capture screens from this phase will be removed in Phase 5. Phase 4 artifacts remain for historical reference only.
**Original Goal**: Dirk photographs his allotment, Claude Vision analyzes photos, user confirms detected elements, app renders 2D plan.
**Why superseded**: Claude Vision API costs out of scope for v1 economics. Replaced by manual garden planning + Claude.ai bridge import.
**Plans**: 4 plans (all superseded)
  - [x] ~~04-01-PLAN.md — Schema + gardenPlanRepo + photoResizer~~
  - [x] ~~04-02-PLAN.md — Edge Function: Claude Vision integration~~
  - [x] ~~04-03-PLAN.md — Capture Flow UI~~
  - [x] ~~04-04-PLAN.md — Analysis polling + Element confirmation + GardenPlanView~~
**UI hint**: superseded

### Phase 5: AI-Removal + Import-Schema (M07.1 + M07.2)
**Goal**: Zero AI-API-Aufrufe aus der App. Alle Claude Vision / Pl@ntNet Clients, Edge Functions, Env-Vars, Screens und Tests entfernt. Import-Schema `spatenstich-import.v1` als JSON Schema (draft 2020-12) definiert und mit Referenz-Payloads validiert.
**Depends on**: Phase 3
**Requirements**: REMOVE-01, REMOVE-02, REMOVE-03, IMPORT-01, IMPORT-02
**Success Criteria** (what must be TRUE):
  1. `grep -ri "anthropic\|plantnet\|vision" src/` returns no functional code, only comments referencing the historical pivot
  2. App builds and ships green on iOS + Android; zero outbound network calls beyond Supabase + Expo update channel
  3. `schemas/spatenstich-import.v1.json` exists as valid JSON Schema (draft 2020-12)
  4. Three reference payloads (`full.json`, `minimal.json`, `edge-cases.json`) all validate against the schema
  5. Onboarding, README, and privacy policy scrubbed of AI-call language
**Plans**: 3 plans
Plans:
- [x] 05-01-PLAN.md — Backend-Bereinigung: Migration 015 (DROP ai_tables), Edge Functions loeschen, Shared Types bereinigen (Wave 1)
- [ ] 05-02-PLAN.md — App-Level AI-Code-Bereinigung: Client-Libs, Screens, Sync, i18n, README (Wave 2)
- [ ] 05-03-PLAN.md — Import-Schema v1 + Referenz-Payloads + Validierungsscript + DB Push (Wave 2)
**UI hint**: no

### Phase 6: Import-Flow + Companion-Prompt (M07.3 + M07.4)
**Goal**: Claude.ai-Projekt-System-Prompt fertig. Import-Screen in der App: Share-Intent für JSON-Dateien + Paste-Fallback → Preview mit Confidence-Badges → selektive Übernahme als Drafts in Supabase.
**Depends on**: Phase 5
**Requirements**: IMPORT-03, IMPORT-04, IMPORT-05, IMPORT-06, IMPORT-07, IMPORT-08
**Success Criteria** (what must be TRUE):
  1. `prompts/garden-project-system-prompt.md` exists; drei Test-Gartenfotos → drei valide v1-Payloads im Claude.ai-Projekt (first try, kein manuelles Reformatieren)
  2. App registriert sich als Handler für `application/json` + Custom URL Scheme `spatenstich://import`
  3. `ImportFromClaudeAiScreen` zeigt Preview mit Entity-Toggles; Confidence < 0.6 mit Warning-Chip
  4. Invalid Payload zeigt actionable Fehler + "Schema kopieren"-Button
  5. Supabase-Tables `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts` mit RLS
  6. Round-trip: handcrafted Payload → Share Intent → Preview → Confirm → Drafts sichtbar im Editor
**Plans**: 3 plans
Plans:
- [ ] 05-01-PLAN.md — Backend-Bereinigung: Migration 015 (DROP ai_tables), Edge Functions loeschen, Shared Types bereinigen (Wave 1)
- [ ] 05-02-PLAN.md — App-Level AI-Code-Bereinigung: Client-Libs, Screens, Sync, i18n, README (Wave 2)
- [ ] 05-03-PLAN.md — Import-Schema v1 + Referenz-Payloads + Validierungsscript + DB Push (Wave 2)
**UI hint**: yes

### Phase 7: Plan-Editor + Drafts-Integration (M2 + M07.5)
**Goal**: Dirk kann Gartenelemente interaktiv auf einem Canvas platzieren, bewegen, rotieren und löschen — manuell oder aus importierten Drafts. 60fps auf iPhone, Undo/Redo, Auto-Save. Import-Drafts erscheinen als "Letzte Importe"-Tray.
**Depends on**: Phase 6
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, EDIT-09, EDIT-11, EDIT-12, DRAFT-01, DRAFT-02, DRAFT-03
**Success Criteria** (what must be TRUE):
  1. Canvas renders at 60fps with 200 elements on real iPhone; 1×1 m grid toggleable
  2. User drags element from palette onto canvas; coordinates in garden-meters
  3. User draws bed polygon by tapping corner points
  4. Undo reverts last 20 actions; auto-save fires 5s after last change
  5. Imported drafts appear in "Recent imports" tray; drag bed draft → canvas places it
  6. Accepting a plant draft into a bed lifts it to a real planted entity with `importedFrom` provenance
  7. Drafts not promoted within 30 days flagged as "Stale imports", never auto-deleted
**Plans**: 3 plans
Plans:
- [ ] 05-01-PLAN.md — Backend-Bereinigung: Migration 015 (DROP ai_tables), Edge Functions loeschen, Shared Types bereinigen (Wave 1)
- [ ] 05-02-PLAN.md — App-Level AI-Code-Bereinigung: Client-Libs, Screens, Sync, i18n, README (Wave 2)
- [ ] 05-03-PLAN.md — Import-Schema v1 + Referenz-Payloads + Validierungsscript + DB Push (Wave 2)
**UI hint**: yes

### Phase 8: Saatgut-Inventar (M3)
**Goal**: Dirk kann Saatgut-Sorten manuell per Autocomplete gegen die Sorten-DB hinzufügen, Inventar verwalten und Haltbarkeit tracken. Kein KI-Foto-Scan — manuelle Eingabe ist der einzige Weg.
**Depends on**: Phase 3
**Requirements**: SEED-02, SEED-03, SEED-04, SEED-05, SEED-06
**Success Criteria** (what must be TRUE):
  1. User types "Tom" → Autocomplete-Vorschläge aus Sorten-DB (100–150 Einträge); Auswahl füllt Metadaten
  2. Sorte nicht in DB → Freitext-Eintrag möglich, wird nicht verworfen
  3. Inventar zeigt Haltbarkeits-Badge: grün/gelb/rot
  4. User kann Einträge bearbeiten und löschen
**Plans**: 3 plans
Plans:
- [ ] 05-01-PLAN.md — Backend-Bereinigung: Migration 015 (DROP ai_tables), Edge Functions loeschen, Shared Types bereinigen (Wave 1)
- [ ] 05-02-PLAN.md — App-Level AI-Code-Bereinigung: Client-Libs, Screens, Sync, i18n, README (Wave 2)
- [ ] 05-03-PLAN.md — Import-Schema v1 + Referenz-Payloads + Validierungsscript + DB Push (Wave 2)
**UI hint**: yes

### Phase 9: Pflanz- & Aussaatkalender (M4)
**Goal**: Dirk sees a 12-month scrollable calendar of when to sow, plant, and harvest each variety in his inventory, adjusted for his Klimazone, with placement suggestions that land directly in the plan.
**Depends on**: Phase 7, Phase 8
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06
**Success Criteria** (what must be TRUE):
  1. 12-month timeline shows task cards per inventory variety; dates differ by Klimazone
  2. Four task types visually distinguishable: Vorkultur, Direktsaat, Auspflanzen, Ernte
  3. Placement suggestion points to unoccupied sunny bed area for sunny-requirement variety
  4. Accepting placement adds plant to plan canvas and activates calendar task
  5. Fruchtfolge warning when replanting same family in same bed as last season
**Plans**: 3 plans
Plans:
- [ ] 05-01-PLAN.md — Backend-Bereinigung: Migration 015 (DROP ai_tables), Edge Functions loeschen, Shared Types bereinigen (Wave 1)
- [ ] 05-02-PLAN.md — App-Level AI-Code-Bereinigung: Client-Libs, Screens, Sync, i18n, README (Wave 2)
- [ ] 05-03-PLAN.md — Import-Schema v1 + Referenz-Payloads + Validierungsscript + DB Push (Wave 2)
**UI hint**: yes

---

## v1.1 Post-MVP

### Phase 10: Vereinsregeln-Aktivierung (NEU — Pivot 2026-04-21, aktualisiert M07 2026-05-08)
**Goal**: Die in Phase 02 implementierte Vereinsregeln-Schicht wird per Feature-Flag aktiviert. Regeleingabe erfolgt manuell (Checkliste) oder per Claude.ai-Import. Claude PDF-Extraktion Edge Function wird entfernt (keine In-App AI). Editor-Warnings aktiv, BKleingG 1/3-Warnung erscheint.
**Depends on**: Phase 2 (Code), Phase 7 (Editor-Hook)
**Requirements**: RULES-02, RULES-03, RULES-04, RULES-05
**Success Criteria** (what must be TRUE):
  1. Feature-Flag `vereinsregeln_enabled` auf `true` → UI sichtbar
  2. Manuelle Checklisten-Eingabe funktioniert (keine PDF-Upload-Edge-Function)
  3. Im Plan-Editor: Platzierung eines regelwidrigen Elements zeigt Inline-Warnung
  4. BKleingG-Badge wird rot/gelb/grün je nach Nutz/Zier-Verhältnis
**Plans**: 3 plans
Plans:
- [ ] 05-01-PLAN.md — Backend-Bereinigung: Migration 015 (DROP ai_tables), Edge Functions loeschen, Shared Types bereinigen (Wave 1)
- [ ] 05-02-PLAN.md — App-Level AI-Code-Bereinigung: Client-Libs, Screens, Sync, i18n, README (Wave 2)
- [ ] 05-03-PLAN.md — Import-Schema v1 + Referenz-Payloads + Validierungsscript + DB Push (Wave 2)
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-04-17 |
| 2. Auth & Profile | 4/4 | Code Complete (verify pending) | 2026-04-20 |
| 2.5. Shared Garden Model | 4/4 | Code Complete (human-verify pending) | 2026-04-23 |
| 3. Offline & Sync | 6/7 | Gap Closure pending | - |
| ~~4. Garten-Erfassung (M1)~~ | 4/4 | **SUPERSEDED** (Pivot M07) | - |
| 5. AI-Removal + Import-Schema (M07.1+2) | 1/3 | In Progress|  |
| 6. Import-Flow + Companion-Prompt (M07.3+4) | 0/TBD | Not started | - |
| 7. Plan-Editor + Drafts (M2 + M07.5) | 0/TBD | Not started | - |
| 8. Saatgut-Inventar (M3) | 0/TBD | Not started | - |
| 9. Pflanz-/Aussaatkalender (M4) | 0/TBD | Not started | - |
| **— v1.1 Post-MVP —** | | | |
| 10. Vereinsregeln-Aktivierung | 0/TBD | Not started | - |

---
*Last updated: 2026-05-08 — M07 Pivot (Manual Planning + Claude.ai Bridge)*
