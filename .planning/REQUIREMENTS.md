# Requirements: Kleingarten-App (Spatenstich)

**Defined:** 2026-04-15
**Updated:** 2026-05-08 (Pivot M07 — Manual Planning + Claude.ai Bridge)
**Core Value:** Manueller Plan-Editor + strukturierter Import aus Claude.ai: Dirk plant seine Parzelle digital — per Hand oder beschleunigt durch KI-Analyse im externen Claude.ai-Projekt.

## v1 Requirements

### Foundation (Technische Basis)

- [x] **FOUND-01**: Monorepo mit pnpm workspaces läuft lokal (app/, supabase/, packages/shared)
- [x] **FOUND-02**: StorageAdapter-Interface abstrahiert expo-sqlite (native) und IndexedDB (web)
- [x] **FOUND-03**: Supabase-Schema mit Row Level Security auf allen Tabellen aktiviert ab Migration 001
- [x] **FOUND-04**: Feature-Flag-System über Supabase-Tabelle (`feature_flags`) operabel
- [x] **FOUND-05**: EAS Build funktioniert in CI für iOS und Web-Export
- [x] **FOUND-06**: ~~Alle KI-API-Keys nur server-seitig~~ — **SUPERSEDED: Keine KI-API-Keys mehr nötig (Pivot M07)**
- [x] **FOUND-07**: ~~pgmq-Queue für asynchrone KI-Jobs~~ — **SUPERSEDED: pgmq bleibt als Infrastruktur, aber keine AI-Jobs mehr**
- [x] **FOUND-08**: ~~KI-Antworten persistiert in `ai_results`~~ — **SUPERSEDED: Tabelle bleibt, aber keine neuen AI-Ergebnisse**

### Authentifizierung & Onboarding

- [ ] **AUTH-01**: User kann Account mit E-Mail/Passwort anlegen (Supabase Auth)
- [ ] **AUTH-02**: User kann sich einloggen und bleibt eingeloggt (persistente Session)
- [ ] **AUTH-03**: User kann App ohne Account nutzen ("lokal nutzen"-Modus)
- [x] **AUTH-04**: User kann später aus lokalem Modus in Account-Modus wechseln
- [ ] **AUTH-05**: Onboarding-Flow führt in < 5 Minuten zu erstem nutzbaren Plan: Account/lokal → PLZ → Archetyp → Garten erstellen/beitreten → Plan-Editor

### Shared Garden (Phase 2.5 — Pivot 2026-04-21)

- [x] **GARDEN-01**: `gardens`-Tabelle + `garden_members`-Tabelle + RLS-Policies auf Member-Check
- [x] **GARDEN-02**: 6-stelliger Invite-Code-Flow über Postgres-RPCs (SECURITY DEFINER)
- [ ] **GARDEN-03**: Migration 003 seeded Default-Garten pro Bestands-`profiles`-Row
- [x] **GARDEN-04**: LWW-Tracking via `updated_at` + `updated_by_user_id`

### Profil & Standort

- [ ] **PROF-01**: User kann PLZ eingeben, App ordnet automatisch Klimazone zu
- [ ] **PROF-02**: User kann Garten-Archetyp wählen (6 Optionen)
- [ ] **PROF-03**: Profil-Daten beeinflussen Aussaatdaten und Sortenvorschläge
- [ ] **PROF-04**: User kann Profil jederzeit ändern

### AI-Removal (Phase 5 — Pivot M07)

- [ ] **REMOVE-01**: Alle Claude Vision / Anthropic SDK Clients, Edge Functions (`ai-job-consumer`), und zugehörige Screens entfernt
- [ ] **REMOVE-02**: Alle KI-bezogenen Env-Vars (`ANTHROPIC_API_KEY`, `PLANTNET_API_KEY`) entfernt
- [ ] **REMOVE-03**: Onboarding, README, Privacy Policy von AI-Call-Sprache bereinigt

### Import-Schema (Phase 5 — Pivot M07)

- [x] **IMPORT-01**: JSON-Schema `spatenstich-import.v1.json` (draft 2020-12) definiert und committed
- [x] **IMPORT-02**: Drei Referenz-Payloads (`full.json`, `minimal.json`, `edge-cases.json`) validieren gegen Schema

### Import-Flow (Phase 6 — Pivot M07)

- [x] **IMPORT-03**: Claude.ai-Projekt-System-Prompt in `prompts/garden-project-system-prompt.md`
- [x] **IMPORT-04**: App registriert Share-Intent-Handler für `application/json` + Custom URL Scheme `spatenstich://import`
- [x] **IMPORT-05**: Paste-Fallback (Textarea) für Desktop-Claude.ai-Chat
- [x] **IMPORT-06**: Preview-Screen zeigt geparste Entities mit Toggle pro Entity; Confidence < 0.6 mit Warning-Chip
- [x] **IMPORT-07**: Invalid Payload zeigt actionable Fehler + "Schema kopieren"-Button
- [x] **IMPORT-08**: Supabase-Tables `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts` mit RLS, alle Imports getaggt mit `source`, `importedAt`, optional `chatReference`

### Drafts-Integration (Phase 7 — Pivot M07)

- [x] **DRAFT-01**: Import-Drafts erscheinen als "Letzte Importe"-Tray im Plan-Editor
- [x] **DRAFT-02**: Bed-Draft auf Canvas ziehen → platziert als echtes Beet-Element mit `importedFrom`-Provenance
- [x] **DRAFT-03**: Drafts nicht promoted innerhalb 30 Tagen → "Stale Imports"-Ansicht, nie auto-gelöscht

### Plan-Editor (M2)

- [x] **EDIT-01**: Canvas mit Maß-Gitter (1×1 m, ein-/ausblendbar) — @shopify/react-native-skia (GPU-threaded, 60fps)
- [x] **EDIT-02**: Element-Palette: Beete, Pflanzen, Infrastruktur
- [ ] **EDIT-03**: Drag & Drop auf Canvas (react-native-gesture-handler)
- [x] **EDIT-04**: Rotation und Skalierung
- [ ] **EDIT-05**: Beet-Polygon zeichnen
- [ ] **EDIT-06**: Koordinaten in Gartenmetern (nicht Pixel)
- [ ] **EDIT-07**: Pflanzenabstand-Hinweis beim Platzieren
- [x] **EDIT-08**: Zwei Layer: Infrastruktur (dauerhaft) und Jahresplan (saison-spezifisch)
- [ ] **EDIT-09**: Auto-Save alle 5 Sekunden + manuelles Speichern
- [ ] ~~**EDIT-10**: Vereinsregel-Warnung inline~~ — **DEFERRED zu Phase 10 (v1.1)**
- [x] **EDIT-11**: Undo/Redo (mind. 20 Schritte)
- [ ] **EDIT-12**: 60fps bei bis zu 200 Elementen auf echtem iOS-Gerät

### Plant-DB Foundation (Phase 8 — neu 2026-05-17)

- [ ] **PLANT-DB-01**: `plants` Supabase-Tabelle mit ≥80 (Ziel: 100–120) Pflanzen + reichem Schema (id, slug, nameDe, nameAltDe[], nameBotanical, family, category, spacing/depth, sun/water, climate zone, sow/plant/harvest DOY ranges, daysToHarvest, nitrogenFixing, perennial, notesDe, iconEmoji, dataSource, timestamps)
- [ ] **PLANT-DB-02**: `plant_companions`-Tabelle mit kanonischer (plant_a_id < plant_b_id) UUID-Ordnung, UNIQUE-Pair, relationship-CHECK enum (companion | incompatible | neutral)
- [ ] **PLANT-DB-03**: JSON-Bundle in `packages/shared/src/data/plants.json` mit `schemaVersion: "plant-db.v1"`, validiert gegen ajv-Schema in `packages/shared/src/schemas/plant-db.v1.json`
- [ ] **PLANT-DB-04**: Read-only RLS Policy `<table>_read_authenticated` USING `auth.uid() IS NOT NULL` für beide Tables (plants + plant_companions); FOR SELECT TO authenticated; KEINE INSERT/UPDATE/DELETE-Policies
- [ ] **PLANT-DB-05**: Edge Function `seed-plants` idempotent (upsert plants on slug, rebuild companions); static-file-bundled JSON via supabase/config.toml `static_files`
- [ ] **PLANT-DB-06**: `usePlants()` Hook mit TanStack-Query `initialData` aus JSON-Bundle für Cold-Start-Fallback + `initialDataUpdatedAt: 0` für Background-Refetch
- [ ] **PLANT-DB-07**: `plantRepo.ts` reine Read-Funktionen (loadAllPlants, loadPlantBySlug, loadCompanionsFor symmetric, searchPlants ILIKE), KEIN assertAccount (Pflanzen sind global lesbar nach PLANT-DB-04 RLS)
- [ ] **PLANT-DB-08**: Smoke-Test-Suite (Wave 0) deckt Anker-Tests ab (Tomate=Solanaceae, Erdbeere=Rosaceae, Buschbohne=nitrogenFixing, Apfel=perennial, Tomate+Basilikum=companion) + Bundle-Invarianten (≥80 plants, unique slug, no self-companion, canonical pair uniqueness)
- [ ] **PLANT-DB-09**: Quellen-Lizenz-Hygiene — `dataSource`-Enum forbids the literal `"gartenplaner"`; allowed values: `gardeneus` | `garden-planner` | `own-research` | `merged`; LICENSES.md in `packages/shared/src/data/` dokumentiert die Hygiene-Regel

### Saatgut-Inventar (M3) — manuell only

- [ ] ~~**SEED-01**: Claude Vision extrahiert Sorteninfo aus Samentüten-Fotos~~ — **DROPPED (Pivot M07, keine In-App AI)**
- [ ] **SEED-02**: Texteingabe mit Autocomplete gegen Sorten-DB
- [ ] **SEED-03**: Inventar-Einträge bearbeiten und löschen
- [ ] **SEED-04**: Sorten-DB mit 100–150 häufigen Kleingartenpflanzen
- [ ] **SEED-05**: Freitext-Eintrag für unbekannte Sorten
- [ ] **SEED-06**: Haltbarkeits-Status-Anzeige (abgelaufen / bald / ok)

### Pflanz- & Aussaatkalender (M4)

- [ ] **CAL-01**: Zeitachse (12 Monate, scrollbar) mit Aufgaben-Karten pro Sorte
- [x] **CAL-02**: Klimazonenspezifische Aufgaben-Daten
- [x] **CAL-03**: Unterscheidung: Vorkultur, Direktsaat, Auspflanzen, Ernte
- [x] **CAL-04**: Platzierungsvorschlag auf Plan (freie Fläche + Standort)
- [x] **CAL-05**: Bestätigung → Pflanze im Plan + Kalender-Aufgabe aktiv
- [x] **CAL-06**: Einfache Fruchtfolge-Warnung

### Offline & Sync

- [ ] **SYNC-01**: App startet und zeigt letzten Plan ohne Netzverbindung
- [ ] **SYNC-02**: Foto-Queue funktioniert offline (lokal gespeichert, Upload bei Reconnect)
- [ ] **SYNC-03**: Sync-Queue verarbeitet ausstehende Operationen bei Reconnect (LWW)
- [ ] **SYNC-04**: User sieht Sync-Status

### Nicht-funktionale Anforderungen

- [ ] **NFR-01**: App ist auf iPhone und Desktop-Browser nutzbar, Daten synchron
- [ ] **NFR-02**: ~~KI-Analyse asynchron mit Loading-State~~ — **SUPERSEDED: Import ist synchron (lokale JSON-Verarbeitung)**
- [x] ~~**NFR-03**: KI-Budget-Limit~~ — **SUPERSEDED: Keine In-App AI-Calls mehr**
- [ ] **NFR-04**: Alle Fotos verschlüsselt at-rest (Supabase Storage, EU Frankfurt)
- [ ] **NFR-05**: Geo-Daten (EXIF) nur mit explizitem Opt-in
- [x] **NFR-06**: UI-Strings zentralisiert in `de.json`
- [x] **NFR-07**: Haftungsausschluss im UI
- [x] **NFR-08**: Sentry (EU) für Crash-Reporting

## v2 Requirements

### Pflegeerinnerungen (S1)

- **CARE-01**: Aufgaben-Engine generiert Erinnerungen auf Basis Plan
- **CARE-02**: Push-Notifications für fällige Aufgaben

### Fruchtfolge-Assistent (S4)

- **CROP-01**: Mehrjährige Sicht auf Pflanzenfamilien-Rotation pro Beet
- **CROP-02**: Automatischer Vorschlag für optimale Fruchtfolge

### Mischkultur-Check (S5)

- **COMP-01**: Beim Platzieren: gute/schlechte Nachbarn angezeigt
- **COMP-02**: Mischkultur-Score pro Beet-Kombination

### Barcode/EAN-Scan (S6)

- **SCAN-01**: Samentüten per EAN-Barcode scannen und automatisch zuordnen

## Dropped Requirements (Pivot M07 2026-05-08)

| Requirement | Original Phase | Reason |
|-------------|---------------|--------|
| PHOTO-01 | Phase 4 | Guided photo capture superseded — Fotos laufen über Claude.ai |
| PHOTO-02 | Phase 4 | Garden dimensions → wird Teil des manuellen Plan-Editors (Phase 7) |
| PHOTO-03 | Phase 4 | Client-side resize for Vision API → keine Vision API mehr |
| PHOTO-04 | Phase 4 | Claude Vision server-side analysis → komplett entfernt |
| PHOTO-05 | Phase 4 | Element confirmation UI → ersetzt durch Import-Preview (IMPORT-06) |
| PHOTO-06 | Phase 4 | SVG plan render from Vision JSON → SVG render bleibt, aber aus manuellem Editor |
| PHOTO-07 | Phase 4 | 1-photo edge case → nicht mehr relevant |
| PHOTO-08 | Phase 4 | Empty elements fallback → manueller Editor startet leer |
| SEED-01 | Phase 6→8 | Claude Vision seed packet scan → manuell only |
| WEED-01/02 | v2 | Unkraut-Check per Foto → keine In-App AI |
| PREV-01 | v1.1 | Fotorealistisches Preview → Gemini dropped |
| RULES-01 | Phase 2→10 | PDF-Upload + Claude-Extraktion → manuelle Eingabe stattdessen |

## Out of Scope

| Feature | Grund |
|---------|-------|
| In-App KI-API-Aufrufe jeglicher Art | Pivot M07: zero outbound AI calls. Claude Vision, Pl@ntNet, Gemini — alles gestrichen |
| Social features, Community, Chat | Kein Multi-User-Fokus im MVP |
| Marktplatz für Samentausch | Außerhalb Kern-Use-Case |
| AT/CH-Lokalisierung | Anderes Regelwerk; nach MVP |
| Wetter-Integration | v2+; erhöht API-Abhängigkeiten |
| PDF-Export Jahresplan | v2+ |
| 3D-Visualisierung / AR | Over-Engineering |
| Krankheits-/Schädlingsdiagnose per Foto | Keine In-App AI |
| Ernte-Tagebuch / Jahresrückblick | v2+ |
| Sprach-Notizen beim Rundgang | v2+ |
| Vereins-Satzungsdatenbank (Community) | v2+ |
| Two-way Sync Spatenstich ↔ Claude.ai | Evtl. M09 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Superseded (M07) |
| FOUND-07 | Phase 1 | Superseded (M07) |
| FOUND-08 | Phase 1 | Superseded (M07) |
| NFR-06 | Phase 1 | Complete |
| NFR-08 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 2 | Pending |
| PROF-04 | Phase 2 | Pending |
| NFR-07 | Phase 2 | Complete |
| GARDEN-01 | Phase 2.5 | Complete |
| GARDEN-02 | Phase 2.5 | Complete |
| GARDEN-03 | Phase 2.5 | Pending |
| GARDEN-04 | Phase 2.5 | Complete |
| SYNC-01 | Phase 3 | Pending |
| SYNC-02 | Phase 3 | Pending |
| SYNC-03 | Phase 3 | Pending |
| SYNC-04 | Phase 3 | Pending |
| NFR-01 | Phase 3 | Pending |
| NFR-04 | Phase 3 | Pending |
| NFR-05 | Phase 3 | Pending |
| REMOVE-01 | Phase 5 | Pending |
| REMOVE-02 | Phase 5 | Pending |
| REMOVE-03 | Phase 5 | Pending |
| IMPORT-01 | Phase 5 | Complete |
| IMPORT-02 | Phase 5 | Complete |
| IMPORT-03 | Phase 6 | Pending |
| IMPORT-04 | Phase 6 | Complete |
| IMPORT-05 | Phase 6 | Complete |
| IMPORT-06 | Phase 6 | Complete |
| IMPORT-07 | Phase 6 | Complete |
| IMPORT-08 | Phase 6 | Complete |
| DRAFT-01 | Phase 6.5 | Complete |
| DRAFT-02 | Phase 6.5 | Complete |
| DRAFT-03 | Phase 7 | Complete (P05) |
| EDIT-01 | Phase 7 | Complete (P04) |
| EDIT-02 | Phase 7 | Complete (P04) |
| EDIT-03 | Phase 7 | Pending |
| EDIT-04 | Phase 7 | Complete (P04) |
| EDIT-05 | Phase 7 | Pending |
| EDIT-06 | Phase 7 | Pending |
| EDIT-07 | Phase 7 | Pending |
| EDIT-08 | Phase 7 | Complete (P04) |
| EDIT-09 | Phase 7 | Pending |
| EDIT-11 | Phase 7 | Complete (P04) |
| EDIT-12 | Phase 7 | Pending |
| SEED-02 | Phase 13 | Pending |
| SEED-03 | Phase 13 | Pending |
| SEED-04 | Phase 13 | Pending |
| SEED-05 | Phase 13 | Pending |
| SEED-06 | Phase 13 | Pending |
| PLANT-DB-01 | Phase 8 | Pending |
| PLANT-DB-02 | Phase 8 | Pending |
| PLANT-DB-03 | Phase 8 | Pending |
| PLANT-DB-04 | Phase 8 | Pending |
| PLANT-DB-05 | Phase 8 | Pending |
| PLANT-DB-06 | Phase 8 | Pending |
| PLANT-DB-07 | Phase 8 | Pending |
| PLANT-DB-08 | Phase 8 | Pending |
| PLANT-DB-09 | Phase 8 | Pending |
| CAL-01 | Phase 10 | Pending |
| CAL-02 | Phase 10 | Complete |
| CAL-03 | Phase 10 | Complete |
| CAL-04 | Phase 10 | Complete |
| CAL-05 | Phase 10 | Complete |
| CAL-06 | Phase 10 | Complete |
| NFR-02 | - | Superseded (M07) |
| NFR-03 | - | Superseded (M07) |
| RULES-02 | Phase 10 | Deferred (v1.1) |
| RULES-03 | Phase 10 | Deferred (v1.1) |
| RULES-04 | Phase 10 | Deferred (v1.1) |
| RULES-05 | Phase 10 | Deferred (v1.1) |
| EDIT-10 | Phase 10 | Deferred (v1.1) |

**Coverage:**

- v1 active requirements: 71 total (FOUND×5 active, AUTH×5, GARDEN×4, PROF×4, REMOVE×3, IMPORT×8, DRAFT×3, EDIT×11, PLANT-DB×9, SEED×5, CAL×6, SYNC×4, NFR×4 active)
- **Phase 8 (Plant-DB Foundation, new 2026-05-17):** PLANT-DB-01..PLANT-DB-09 (9 requirements)
- Superseded/dropped by M07: 15 (PHOTO×8, SEED-01, FOUND-06/07/08, NFR-02/03, RULES-01)
- Deferred to v1.1: 5 (RULES-02/03/04/05, EDIT-10)
- Mapped to phases: all ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-15*
*Last updated: 2026-05-08 — M07 Pivot (Manual Planning + Claude.ai Bridge)*
