# Roadmap: Kleingarten-App (Spatenstich)

> **Pivot 2026-05-17 (User Decision):** Desktop ist primärer Use Case, nicht mobile-first. Phase 7.5 (Web SVG Editor) eingefügt. **Saison-2026-Hot-Path** umgestellt: Plant-DB + Companion-Hinweis + Aussaatkalender vorgezogen, Saatgut-Inventar zurückgestellt. Begründung in `.planning/roadmap-proposal-2026-05-17.md`.

> **Pivot 2026-05-08 (M07):** Kompletter Wegfall von In-App-AI-Calls (Claude Vision, Pl@ntNet). Ersetzt durch manuellen Garten-Plan-Editor + One-Way-Bridge aus externem Claude.ai-Projekt (Dirks Max-Abo). App macht null ausgehende KI-API-Aufrufe.

> **Pivot 2026-04-21:** MVP-Scope fokussiert auf 2-User Shared Garden (Dirk + Frau). Vereinsregeln-Features per Feature-Flag aus bis v1.3.

## Overview

**v1.0 Foundation (abgeschlossen):** Tech-Fundament, Auth, Shared Garden, Sync, Import-Pipeline, Plan-Editor auf iPhone + Web.

**v1.1 "Saison 2026 Ready"** (Mai–Juli 2026): Plant-DB + Companion-Warnung + Aussaatkalender — die drei Phasen die die App **diese Saison täglich nutzbar** machen.

**v1.2 "Saison-Tools"** (August–September 2026): Journal, Task-Generator, Saatgut-Inventar — Tooling fürs Tagesgeschäft während der Saison.

**v1.3 "Modern + Mehrjährig"** (Winter 2026/27): Design-Polish, Fruchtfolge-Memory, Vereinsregeln-Aktivierung — Vorbereitung für Saison 2027.

## Phases

### v1.0 Foundation (abgeschlossen)

- [x] **Phase 1: Foundation** — Monorepo, StorageAdapter, Supabase + RLS, pgmq, feature flags, EAS CI (2026-04-17)
- [x] **Phase 2: Auth & Profile** — Account/local mode, PLZ/Klimazone, Archetyp. Vereinsregeln-Code flagged off bis v1.3 (2026-04-20)
- [x] **Phase 2.5: Shared Garden Model** — gardens + garden_members, Member-RLS, Invite-Code-Flow (2026-04-23)
- [x] **Phase 3: Offline & Sync** — Outbox + 2-User-LWW, Photo-Queue. uploadPending()-Wiring via SyncTriggers.ts (reconnect + foreground syncAll) bestätigt geschlossen (2026-06-10)
- [x] ~~**Phase 4: Garten-Erfassung (M1)**~~ — **SUPERSEDED durch Pivot M07** (2026-05-08)
- [x] **Phase 5: AI-Removal + Import-Schema** — Alle AI-Clients entfernt, `spatenstich-import.v1` Schema (2026-05-09)
- [x] **Phase 6: Import-Flow + Companion-Prompt** — Claude.ai-Prompt, Share-Intent, Preview, Draft-Tables (2026-05-09)
- [x] **Phase 6.5: Draft-Sichtung + Promotion** — Sichtungs-Screen, Promotion-Repo, Migration 017 live (2026-05-12)
- [x] **Phase 7: Plan-Editor (Skia)** — iPhone-Editor mit Drag/Polygon/Layer/Undo/Save, Migration 018 live (2026-05-13)
- [x] **Phase 7.5a: Web Plan-Editor (SVG)** — Desktop-Editor mit Drag/Delete/Add, parallel zum Skia (2026-05-17)

### v1.1 "Saison 2026 Ready" — Hot Path

- [ ] **Phase 7.5b: Web Editor Polish** — Polygon-Zeichnen + Drafts-Tray + Pflanzenabstand-Ring im Web *(optional, parallel)*
- [x] **Phase 8: Plant-DB Foundation** — 90 Pflanzen + 38 Companion-Paare + Edge Function seed (2026-05-17)
- [x] **Phase 9: Companion-Hinweis** — Roter/grüner Banner beim Pflanzen-Setzen wenn Nachbarn schlecht/gut zusammenpassen (2026-05-29)
- [x] **Phase 9.1: Editor-Element-Bearbeitung** *(INSERTED)* — Resize/Rotate per Doppelklick, Properties (Name etc.), Z-Order für überlappende Elemente (completed 2026-05-29)
- [x] **Phase 10: Aussaatkalender v1** — "Diese Woche" Wochenview + Gantt-Detail pro Pflanze, klimazonen-angepasst (completed 2026-06-11)

### v1.2 "Saison-Tools" — August–September 2026

- [ ] **Phase 11: Garten-Journal** — Beobachtungen, Ernten, optional Fotos pro Beet/Pflanze
- [ ] **Phase 12: Task-Generator** — Auto-Wochenliste aus Aussaatkalender + Klimazone
- [ ] **Phase 13: Saatgut-Inventar** — Welche Tüten hast du, wann abgelaufen, Keimfähigkeit *(war v1.0 Phase 8)*

### v1.3 "Modern + Mehrjährig" — Winter 2026/27

- [ ] **Phase 14: Modernes Design** — Visueller Schliff, Animations, Branding
- [ ] **Phase 15: Fruchtfolge-Memory** — "Was war letztes Jahr auf Beet 3?" — Familien-Konflikt-Warnung
- [ ] **Phase 16: Vereinsregeln-Aktivierung** — Feature-Flag on, manuelle Regeleingabe, BKleingG-Warnung *(war v1.1 Phase 10)*
- [ ] **Phase 17: Stale-Imports + Sharing-UX** — Aufräumen, Polish

## Phase Details

### Phase 1: Foundation

**Goal**: Monorepo compiles, tests pass in CI, Supabase schema live with RLS.
**Status**: ✅ Complete 2026-04-17. Details siehe archivierter Eintrag.

### Phase 2: Auth & Profile (Vereinsregeln-Code flagged off)

**Goal**: Auth + PLZ/Klimazone + Archetyp + lokaler Modus.
**Status**: ✅ Code Complete 2026-04-20. Vereinsregeln-Subscope flagged off bis Phase 16.

### Phase 2.5: Shared Garden Model

**Goal**: 2-User Shared Garden mit Invite-Code-Flow + Member-RLS.
**Status**: ✅ Code Complete 2026-04-23. Human-Verify deferred.

### Phase 3: Offline & Sync (2-User Shared State)

**Goal**: Offline-First, Outbox-Sync, 2-User-LWW.
**Status**: ✅ Code Complete 2026-06-10. 7/7 Plans: uploadPending()-Wiring-Lücke bestätigt geschlossen — `app/src/lib/sync/SyncTriggers.ts` ruft `syncAll()` beim NetInfo-Reconnect (Zeile 50) und AppState-Foreground (Zeile 59) auf, registriert via `registerSyncTriggers()`. Wiring war vorhanden aber im ROADMAP als offen markiert.

### Phase 5: AI-Removal + Import-Schema

**Goal**: Zero AI calls. `spatenstich-import.v1` JSON Schema.
**Status**: ✅ Complete 2026-05-09.

### Phase 6: Import-Flow + Companion-Prompt

**Goal**: Claude.ai Companion-Prompt, Share-Intent, Preview-Screen, Draft-Tables.
**Status**: ✅ Code Complete 2026-05-09. DB push (Migration 016) live.

### Phase 6.5: Draft-Sichtung + Promotion

**Goal**: Drafts annehmen/verwerfen/editieren; Promotion zu `plan_elements`.
**Status**: ✅ Complete 2026-05-12. Migration 017 live auf Supabase Frankfurt.

### Phase 7: Plan-Editor (Skia, iPhone)

**Goal**: Skia-Canvas mit Drag, Polygon, Layer, Undo (20), Save (5s debounce). 60fps@200 Elemente.
**Status**: ✅ Code Complete 2026-05-13. Migration 018 (`plan_elements.layer`) live. Manual smoke (60fps + crash recovery) deferred zu User-iPhone-Session.

### Phase 7.5a: Web Plan-Editor (SVG)

**Goal**: Web-natives interaktives SVG-Editor — Drag/Move, Click-to-Select, Del löscht, Klick-zu-Platzieren via Palette, Undo/Redo, Layer/Grid Toggle, Save.
**Depends on**: Phase 7 (shared editorStore + repos)
**Requirements**: (lifted from Phase 7) EDIT-03 (drag&drop), EDIT-04 (rotate via separate iter), EDIT-08 (layer), EDIT-09 (autosave), EDIT-11 (undo/redo)
**Status**: ✅ Code Complete 2026-05-17. SVG via react-native-svg, Mouse-Events (kein Skia/WASM auf Web), shared `editorStore` (Zustand+zundo).
**Was geliefert wurde**:

  - `WebPlanEditor.tsx` (SVG + Mouse-Drag + Click-to-Select + Del-Key)
  - `WebPaletteBar.tsx` (3 Tabs + Click-to-Place)
  - `WebEditorToolbar.tsx` (Save/Undo/Redo/Layer/Grid/Delete + 3-State Layer Cycle)

**Was offen ist** → Phase 7.5b:

  - Polygon-Zeichnen auf Web (Multi-Click + "Beet abschließen")
  - Drafts-Tray (heute über Sichtungs-Screen mit Auto-Layout — funktioniert, aber Drag-in-Plan wäre schöner)
  - Pflanzenabstand-Ring beim Pflanze-Setzen

---

## v1.1 Hot Path

### Phase 7.5b: Web Editor Polish *(optional, parallel zu Phase 8/9)*

**Goal**: Feature-Parity zwischen Web-Editor und Skia-iPhone-Editor wo es Sinn macht.
**Depends on**: Phase 7.5a
**Scope**:

  - Polygon-Zeichnen (Click-Corners + "Beet abschließen" Button + dashed live-line)
  - Drafts-Tray als Bottom-Sheet auch im Web (mit Click-to-Promote, kein Drag)
  - Pflanzenabstand-Ring (Ghost-Circle) beim Hover über Pflanze

**Success Criteria**:

  1. User kann Polygon-Beete im Web zeichnen, identisch zur Skia-Erfahrung auf iPhone
  2. Drafts-Tray im Web zeigt offene Importe; Click "Annehmen" promoted via existierendem `promoteBedDraft`
  3. Pflanzenabstand-Hinweis sichtbar wenn man eine Pflanze setzt und Nachbar zu nah ist

**Plans**: TBD (vermutlich 2-3 Plans)
**UI hint**: yes

### Phase 8: Plant-DB Foundation

**Goal**: Eine zentrale, deutschsprachige Pflanzen-Datenbank mit allen Infos die Phase 9 + 10 brauchen — Mindestabstand, Sonnenbedarf, Aussaat-Fenster, Familie, Companions.
**Depends on**: Phase 1 (Schema-Foundation)
**Requirements**: SEED-02 (Sorten-DB; aus old Phase 8 portiert), neue PLANT-DB-* Requirements werden in `/gsd-discuss-phase` ausgearbeitet
**Success Criteria** (what must be TRUE):

  1. `plants`-Tabelle in Supabase mit ≥80 Pflanzen (Schwerpunkt deutsche Kleingarten-Realität: Tomaten, Bohnen, Möhren, Salate, Kohl-Arten, Kürbis, Beeren, Kräuter)
  2. Pro Pflanze: ID, Deutscher Name, Botanischer Name, Familie, MinAbstandCm, Sonnenbedarf, Wasserbedarf, KlimazoneMin/Max, AussaatFreilandWochen, AussaatVorkulturWochen, PflanzenWochen, TagebisErnte, Companions[], Inkompatibel[]
  3. `plant_companions`-Tabelle (M:N) mit `relationship: 'companion' | 'incompatible'`
  4. Migration 019 erstellt + seeded
  5. `usePlants()` Hook lädt + cacht lokal (expo-sqlite oder JSON-Bundle)
  6. Datenquellen dokumentiert (Gardeneus MIT, garden-planner MIT, Gartenplaner als Inspiration, eigene Recherche)

**Plans:** 4 plans

Plans:

- [x] 08-01-PLAN.md — Wave 0 test scaffold ✅ (2026-05-17) — 10 new files + 2 config mods + lockfile; 42 it.todo entries pin PLANT-DB-01/02/03/04/06/07/08/09; `pnpm --filter @spatenstich/shared exec jest plants` → 16 todo / 16 total; gartenplaner literal three-walled out (schema enum + smoke-test + LICENSES.md)
- [ ] 08-02-PLAN.md — Wave 1 schema + types + validator (Migration 019 + filled validator with cross-ref checks + filled pgTAP RLS test + 9 PLANT-DB-* in REQUIREMENTS.md)
- [ ] 08-03-PLAN.md — Wave 2 data curation (100-120 real plant entries + 30+ companion pairs + filled smoke tests, license-hygiene PLANT-DB-09 enforced)
- [ ] 08-04-PLAN.md — Wave 3 Edge Function + repo + hook + Migration 019 push + manual seed deploy (autonomous 3-gate push + Docker deploy + curl invoke)

**UI hint**: no *(reine Daten-Phase, UI in Phase 9 + 10)*

### Phase 9: Companion-Hinweis

**Goal**: Beim Setzen einer Pflanze auf ein Beet (oder einer existierenden Pflanze in dasselbe Beet) sofort visuell sehen: passt das zusammen?
**Depends on**: Phase 7, Phase 7.5a, Phase 8
**Requirements**: SC-1 (Detection), SC-2 (roter Banner), SC-3 (grüner Banner), SC-4 (nicht-blockierend), SC-5 (persistente Markierung), SC-6 (plant_companions)
**Success Criteria** (what must be TRUE):

  1. Beim Setzen einer Pflanze in ein Beet (Web + iPhone): Detection läuft gegen alle anderen Pflanzen in demselben Beet-Polygon
  2. **Roter Banner** bei Konflikt: *"⚠ Konflikt: Tomate verträgt sich nicht mit Fenchel"* (i18n)
  3. **Grüner Banner** bei Companion: *"✓ Gute Nachbarschaft: Tomate + Basilikum"*
  4. Beide Banner sind nicht-blockierend (Dirk darf trotzdem platzieren — er kennt seinen Garten besser)
  5. Persistente Markierung: rotes Dreieck-Icon an Pflanzen mit aktivem Konflikt (visible auch nach Banner-Dismiss)
  6. Adjacency-Logik via Phase 8 `plant_companions`-Tabelle

**Plans:** 4 plans

Plans:

- [x] 09-01-PLAN.md — Foundation: PiP utility, InlineBanner variant extension, i18n keys
- [x] 09-02-PLAN.md — Core: useCompanionDetection hook + plantSlug write path
- [x] 09-03-PLAN.md — UI: CompanionToast floating toast component
- [x] 09-04-PLAN.md — Integration: Canvas overlays (Skia + SVG) + wiring into editor screen

**UI hint**: yes

### Phase 09.1: Editor-Element-Bearbeitung (INSERTED)

**Goal:** Vollständige Element-Bearbeitung im Plan-Editor — Resize-Handles (Eck-4-Punkt), Rotations-Handle (15°-Snap mit Shift-Bypass auf Web), Properties-Modal mit Name/Breite/Höhe/Rotation/Notiz/Pflanzdatum/Akzentfarbe und Photoshop-Style Z-Order-Buttons. Konsistent auf Web (Doppelklick öffnet Modal) und Mobile (Long-Press öffnet Modal).
**Requirements**: D-01..D-24 (siehe 09.1-CONTEXT.md)
**Depends on:** Phase 9
**Plans:** 6/6 plans complete

Plans:

- [x] 09.1-00-test-scaffold-helper-modules-PLAN.md — Wave 0: Test-Stubs + Picker-Installs + 4 Helper-Module
- [x] 09.1-01-store-layer-PLAN.md — Wave 1: editorStore.editingElementId + zundo pause/resume + zOrder/rotationSnap algorithms
- [x] 09.1-02-modal-trigger-PLAN.md — Wave 2: ElementEditorModal + Doppelklick (Web) + LongPress (Skia) + hitTest.ts GREEN + Mount in plan/index.tsx
- [x] 09.1-03-canvas-handles-PLAN.md — Wave 3: ResizeHandle/RotationHandle für Skia + Web (4+1 Komponenten)
- [x] 09.1-04-render-pipeline-PLAN.md — Wave 3: sortByZOrder + Rotation-Transform in beiden Renderern
- [x] 09.1-05-i18n-verification-PLAN.md — Wave 3: editor.elementEditor.* keys + Mapper round-trip + HUMAN-VERIFY

### Phase 10: Aussaatkalender v1

**Goal**: "Was sollte ich diese Woche im Garten tun?" — eine Wochen-Übersicht + Gantt-Detail pro Pflanze, gefiltert nach Klimazone und den Pflanzen in deinem Plan.
**Depends on**: Phase 2 (Klimazone), Phase 7+7.5 (Plan-Elemente), Phase 8 (Plant-DB)
**Requirements**: CAL-01..CAL-06 (aus alter Phase 9 übernommen)
**Success Criteria** (what must be TRUE):

  1. **Wochen-View** (Home-Card oder eigener Tab): aktuelle Kalenderwoche zeigt Aktionen "diese Woche aussäen / pflanzen / ernten" — pro Aktion: Pflanze + Methode (Freiland/Vorkultur/Frühbeet)
  2. **Jahres-Gantt** (Pflanzen-Detail-View): pro Pflanze ein horizontaler Streifen über 12 Monate mit farbig markierten Phasen (Vorkultur/Direktsaat/Pflanzen/Ernte)
  3. Klimazonen-Anpassung: Pflanze "Tomate" zeigt in Klimazone 7a andere Aussaat-Wochen als in 8a
  4. Filter "Nur meine Pflanzen" zeigt nur Pflanzen die im aktuellen Plan stehen
  5. Frost-Daten statisch pro Klimazone (last frost / first frost als ISO-Datum-Tabelle)
  6. Klick auf Pflanze in Wochen-View → Detail-View mit Gantt + Phase-8-Pflanzen-Infos + "Auf welchem Beet?"

**Markt-Evidenz (Recherche 2026-06-11)**: Kalender-Automation aus Pflanzendaten = verifiziertes Top-Demand-Signal (HortusFox #511/#502/#509); GrowVegs frostgenaue Pflanzliste = meistgelobtes Feature des Marktführers; Fryd-Gründungs-These ist exakt diese Wochen-Frage. → Kalender MUSS sich aus Plan + Plant-DB selbst befüllen (kein manuelles Eintragen).
**Implementierungs-Vorbilder**: Gardeneus `dates.ts` (frostrelative Fenster, MIT — lokal vorhanden) für die Logik; PyQt-Gartenplaner für die UX (2-Wochen-Raster × 3 Methoden Freiland/Vorkultur/Frühbeet, eingefrorene Pflanzen-Spalte) — nur Idee, kein Code/Daten (keine Lizenz). Details: `.planning/research/2026-06-10-ref-apps-feature-synthesis.md`.

**Plans:** 4/4 plans complete
Plans:
**Wave 1**

- [x] 10-01-PLAN.md — Kalender-Engine (DOY→KW, Klimazonenoffset, Fruchtfolge-Check) + i18n kalender.* + Test-Scaffold (CAL-02/03/06)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-02-PLAN.md — useKalenderData Hook (lädt Plan-Elemente via Repo) + findBeeteForPlant + addPlantToPlan (CAL-04/05)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 10-03-PLAN.md — Gantt/Legende/Wochen-Card Komponenten + Wochen-View Screen + Home-Button (CAL-01/03)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 10-04-PLAN.md — Pflanzen-Detail [slug] Screen + Fruchtfolge-Warnung + Human-Verify (CAL-05/06)

**UI hint**: yes

---

## v1.2 Saison-Tools (August–September 2026)

> **Empfehlung aus Marktrecherche 2026-06-11:** Phase 12 (Task-Generator) eng an Phase 10 koppeln oder direkt danach ziehen — wiederkehrende, pflanzen-verknüpfte Aufgaben sind die zwei stärksten verifizierten Nachfrage-Signale des gesamten Marktes (HortusFox #9: 22👍, #281: 14 Reaktionen) und beantworten dieselbe User-Frage wie der Kalender.

### Phase 11: Garten-Journal

**Goal**: Freitext-Beobachtungen, Ernten, optional Fotos pro Beet/Pflanze/Garten.
**Inspiration**: HortusFox `PlantLogModel` (paginiert, audit-log, plant-FK) + `PlantPhotoModel` (thumb/original/label/author) + Health-States (10 Zustände). Markt-Signal: Fryd v9.0 (06/2026) macht Foto-Journal zum Headline-Feature; XDA-Langzeitbericht: leichtgewichtige Quick-Notes schlagen Hochglanz.
**Plans**: TBD

### Phase 12: Task-Generator

**Goal**: Auto-generierte Wochenliste aus Phase-10-Kalender (z.B. "Diese Woche fällig: Tomaten ausgeizen, Erbsen säen") + Klimazone-spezifisch.
**Inspiration**: Gardeneus `task-generator.ts` (deterministisch aus Plantings × Frost-Daten, Dedupe über (plantingId, taskType)); HortusFox Task-Schema (recurring_time, recurring_scope, done) + M:N plant_tasks_ref.
**Markt-Evidenz**: ✅ verifiziert stärkste Nachfrage-Kategorie überhaupt (siehe `.planning/research/2026-06-11-marktrecherche-feature-ranking.md` A.1+A.2). Pflanzen-Verknüpfung der Tasks ist Pflicht, nicht optional.
**Plans**: TBD

### Phase 13: Saatgut-Inventar *(was v1.0 Phase 8)*

**Goal**: Welche Tüten hast du, wann abgelaufen, Keimfähigkeit.
**Depends on**: Phase 8 (Plant-DB für Autocomplete)
**Requirements**: SEED-02..SEED-06 (aus original Phase 8 übernommen, jetzt auf Phase 8 Plant-DB aufbauend)
**Plans**: TBD

---

## v1.3 Modern + Mehrjährig (Winter 2026/27)

### Phase 14: Modernes Design

**Goal**: Polish, Animations, professional branding. Schick aussehen.
**Plans**: TBD

### Phase 15: Fruchtfolge-Memory

**Goal**: "Was war letztes Jahr auf Beet 3?" — mehrjähriges Pflanzen-History-Tracking + Familien-Konflikt-Warnung.
**Inspiration**: Gardeneus `plant-families.ts` (18 Familien, `checkRotationConflict()` 3-Jahres-Regel, MIT — lokal vorhanden, ~20 Zeilen). Markt-Evidenz: Fruchtfolge ist Teil der GrowVeg-Sieger-Trias und Fryd-Paid-Lob (Vor-/Nachkultur). Voraussetzung klären: Pflanz-Historie (season-Feld an plan_elements oder deletedAt-Auswertung).
**Plans**: TBD

### Phase 16: Vereinsregeln-Aktivierung *(was v1.1 Phase 10)*

**Goal**: Die in Phase 02 implementierte Vereinsregeln-Schicht aktivieren. Feature-Flag on, manuelle Regeleingabe, Editor-Warnings, BKleingG 1/3-Warnung.
**Depends on**: Phase 2 (Code), Phase 7 + 7.5 (Editor-Hook)
**Requirements**: RULES-02, RULES-03, RULES-04, RULES-05
**Plans**: TBD

### Phase 17: Stale-Imports + Sharing-UX

**Goal**: Aufräumen alte Drafts, Mehr-Garden-Vorbereitung, Polish-Iteration.
**Plans**: TBD

---

## Progress

| Phase | Plans | Status | Completed |
|-------|-------|--------|-----------|
| 1. Foundation | 3/3 | ✅ Complete | 2026-04-17 |
| 2. Auth & Profile | 4/4 | ✅ Code Complete | 2026-04-20 |
| 2.5. Shared Garden Model | 4/4 | ✅ Code Complete | 2026-04-23 |
| 3. Offline & Sync | 7/7 | ✅ Code Complete | 2026-06-10 |
| ~~4. Garten-Erfassung (M1)~~ | 4/4 | **SUPERSEDED** (M07) | - |
| 5. AI-Removal + Import-Schema | 3/3 | ✅ Complete | 2026-05-09 |
| 6. Import-Flow + Companion-Prompt | 4/4 | ✅ Code Complete | 2026-05-09 |
| 6.5. Draft-Sichtung + Promotion | 5/5 | ✅ Complete | 2026-05-12 |
| 7. Plan-Editor (Skia) | 6/6 | ✅ Code Complete | 2026-05-13 |
| 7.5a. Web Plan-Editor (SVG) | 1/1 | ✅ Code Complete | 2026-05-17 |
| **--- v1.1 Saison 2026 Ready ---** | | | |
| 7.5b. Web Editor Polish | 0/TBD | Not started (optional) | - |
| 8. Plant-DB Foundation | 4/4 | ✅ Complete | 2026-05-17 |
| 9. Companion-Hinweis | 4/4 | ✅ Complete | 2026-05-29 |
| 10. Aussaatkalender v1 | 4/4 | Complete   | 2026-06-11 |
| **--- v1.2 Saison-Tools ---** | | | |
| 11. Garten-Journal | 0/TBD | Not started | - |
| 12. Task-Generator | 0/TBD | Not started | - |
| 13. Saatgut-Inventar | 0/TBD | Not started | - |
| **--- v1.3 Modern + Mehrjährig ---** | | | |
| 14. Modernes Design | 0/TBD | Not started | - |
| 15. Fruchtfolge-Memory | 0/TBD | Not started | - |
| 16. Vereinsregeln-Aktivierung | 0/TBD | Not started | - |
| 17. Stale-Imports + Sharing-UX | 0/TBD | Not started | - |

---

## Roadmap Evolution (Decisions Log)

- **2026-06-11**: Feature-Sweep abgeschlossen (Marktrecherche + 4 Referenz-App-Analysen). Roadmap-Reihenfolge bestätigt; Phase 10/11/12/15 mit Markt-Evidenz + Implementierungs-Vorbildern angereichert; 11 neue Backlog-Items (999.2–999.12). Empfehlung notiert: Phase 12 eng an Phase 10 koppeln. Quellen: `.planning/research/2026-06-11-marktrecherche-feature-ranking.md` + `2026-06-10-ref-apps-feature-synthesis.md`.
- **2026-06-10**: Forensik-Sweep quick-260610-jtf: CI grün (640/640), rotated-resize fertig, Phase 3+9 Status mit Code-Realität abgeglichen.
- **2026-05-17**: Major re-prioritization nach User-Feedback "Desktop primär + Saison 2026 nutzbar". Plant-DB + Companion-Hinweis + Aussaatkalender vorgezogen (neue Phase 8-10). Saatgut-Inventar zurück zu v1.2 (Phase 13). Vereinsregeln zu v1.3 (Phase 16). Web-SVG-Editor als Phase 7.5a eingefügt nach Skia-Web-Crash auf Frau's Browser. Begründungsdokument: `.planning/roadmap-proposal-2026-05-17.md`.
- **2026-05-13**: Migration 018 live. Phase 7 strukturell complete.
- **2026-05-12**: Phase 6.5 (Draft-Sichtung) inserted nach Debug-Session `import-uebernehmen-noop`. Schloss die Lücke zwischen Phase 6 (Drafts speichern) und Phase 7 (Plan rendern).
- **2026-05-08 (Pivot M07)**: Kompletter Wegfall aller In-App-AI-Calls. Phase 4 SUPERSEDED. Phasen 5+6+6.5 ersetzen das alte Vision-Capture-Flow.
- **2026-04-21 (Pivot)**: 2-User Shared Garden Model. Vereinsregeln eingefroren bis Post-MVP.

---

*Last updated: 2026-06-11 — Feature-Sweep: Markt-Evidenz eingearbeitet, Backlog erweitert*
