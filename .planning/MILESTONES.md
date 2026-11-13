# Milestones

## v2.0 Handy-Ready (Shipped: 2026-09-29, vorzeitig geschlossen 2026-11-13)

**Phases completed:** 1 von 6 (Phase 20), 4 Pläne (20-04 ohne Geräte-Abnahme)
**Delivered:** Repo-Hygiene und grüne CI, Legacy entfernt (Foto-Pipeline, Feature-Flags, GPS-Opt-in, Migration 020), PWA-Shell mit Teilen-Ziel und Service Worker, Deploy nach Cloudflare Pages (`spatenstich.pages.dev`), Supabase-Keep-alive, Backup-Skript.
**Nicht ausgeliefert:** Phasen 21–25 (Sync, ein Editor für Maus und Touch, Navigation/Onboarding/Auth, Design-System, Geräte-Abnahme) wurden nie begonnen und sind in v3.0 „Garten mit KI" aufgegangen. Die geplanten v2.1-Phasen 26–29 entfallen als eigener Milestone: Wochenaufgaben sind Teil von v3.0, Journal, Saisonwechsel und SDK-Angleichung sind Backlog.
**Grund für den vorzeitigen Schluss:** Pivot vom 2026-11-13 — In-App-KI mit eigenem API-Schlüssel, neue Design-Richtung „Feldführer", Editor zuerst.
**Offen übernommen:** Geräte-Abnahme von Phase 20 (Installation auf beiden Handys, Teilen-Menü, Offline-Start) → v3.0 UAT. Supabase-Projekt seit Anfang Oktober 2026 nicht erreichbar → v3.0 Sync-Phase.
**Archiv:** `milestones/v2.0-ROADMAP.md`, `milestones/v2.0-REQUIREMENTS.md`, `milestones/v2.0-phases/`; Detail-Spezifikation weiterhin `MASTERPLAN-v2.md`.

---

## v1.1 Saison 2026 Ready (Shipped: 2026-09-09)

**Phases completed:** 4 phases (8, 9, 9.1, 10), 23 plans, 30 tasks
**Delivered:** Pflanzen-Datenbank (90 Pflanzen, 38 Mischkultur-Paare), Companion-Hinweis im Editor, Element-Bearbeitung (Resize/Rotate/Properties/Z-Order), Aussaatkalender mit Wochen-View, Gantt, Klimazonen-Anpassung und Fruchtfolge-Warnung — die App ist im Desktop-Browser täglich nutzbar.
**Git range:** 7afec0f (2026-05-14) → bd3330c (2026-06-16), 202 Commits, 242 Dateien, +56.443/−363 Zeilen
**Test-Stand beim Abschluss (2026-09-08):** 777 App-Tests + 87 Shared-Tests grün, Typecheck grün, Lint rot (13 Test-Datei-Fehler), Web-Export 6,2 MB

**Known verification overrides:** 24 newly acknowledged, 0 carried forward from a prior close (see STATE.md Deferred Items). Darunter: Cross-Device-UAT Phase 3 (übersprungen), HUMAN-VERIFY Phase 7/9.1 (nie auf Gerät gelaufen), Phase 4/5/6.5-Verifikationen (superseded durch M07), 12 Quick-Task-Verzeichnisse ohne Abschluss-Marker. Alle offenen Punkte sind im `MASTERPLAN-v2.md` adressiert (v2.0 Phasen 20–25).

**Known gaps (nach REQUIREMENTS-Traceability):** AUTH-01/02/03/05, PROF-01..04, GARDEN-03, REMOVE-01..03, IMPORT-03, EDIT-03/05/06/07/09/12, SYNC-01..04, NFR-01/04/05 waren nie formal abgehakt, obwohl der Code größtenteils existiert; Phase 4 (PHOTO-*) superseded. Die v2.0-Requirements (`REQUIREMENTS.md`) ersetzen diese Liste vollständig.

**Key accomplishments:**

- 90 real German Kleingarten plants + 38 canonical-ordered Mischkultur companion pairs landed in plants.json with native UTF-8 Umlaute, three-walled license hygiene (PLANT-DB-09), and 16 GREEN smoke tests covering PLANT-DB-01/02/08/09.
- Wave-0 skeleton established: 4 pure-function stubs (zOrder/rotationSnap/handleGeometry/hitTest) + 97 it.todo() RED pins across 14 test files + picker libs installed; tsc and jest gates green.
- Wave-1 store foundation delivered: editingElementId state, zundo pause/resume on gestureActive, and 6 z-order + 1 rotation-snap pure functions GREEN with 70 passing tests.
- German i18n block (34 keys, UTF-8 native) + provenance round-trip tests GREEN + HUMAN-VERIFY with 7 manual test cases + ROADMAP Phase 09.1 finalized.
- Pure DOY-to-ISO-KW engine (kalenderEngine.ts) mit Klimazonenoffset-Guard + de.json kalender.* Schlüsselbaum + Wave-0 Test-Stubs für Downstream-Plans.
- `useKalenderData` hook mit loadAcceptedElements-Datenpfad + `findBeeteForPlant` PiP-Helper — füllt Wave-0 Stubs für CAL-04/CAL-05.
- GanttStreifen/GanttLegende View-bar Gantt-Komponenten + KalenderWochenCard mit farbigen CAL-03-Aktions-Badges + Wochen-View Screen + Home-Einstieg — CAL-01/CAL-03 vollständig.
- Pflanzen-Detail route `/(app)/kalender/[slug]` mit vollem 12-Monats-Gantt + Phase-8-Infos + Auf-welchem-Beet-Lookup + CAL-05-CTA + CAL-06-Fruchtfolge-Warnung — 4 Tests grün, TypeScript sauber.
- DST-sichere UTC-KW-Berechnung + ISO-Wrap-Kantenpinning in kalenderEngine; defensiver Breiten-Guard in GanttStreifen
- WR-01-Fix (Top-Left→CENTER bbox) + neuer beet-scoped Helper `findPflanzenInBeet` für CAL-06-Fruchtfolge-Scoping.
- Hook-stabiler PflanzenDetailScreen: CR-01 (Rules-of-Hooks-Crash bei unbekanntem Slug) und WR-02 (CAL-06 Fruchtfolge plan-global statt beet-scoped) geschlossen; toter Import und 2 hartkodierte Strings bereinigt.
- WR-06 In-Bed-Placement (Beet-Center + parentBedId), WR-07 cancelled-Flag + stale-Reset, IN-04 expliziter mode-Guard — alle drei Lücken im Daten-Layer-Hook geschlossen.
- WR-05 geschlossen — Filter-Chip "Nur meine Pflanzen" steuert KalenderWochenCard via `useKalenderData({ nurMeinePflanzen })`; userToggled-Ref verhindert useEffect-Override nach Nutzer-Opt-out.

---
