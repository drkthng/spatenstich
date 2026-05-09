# Kleingarten-App

## What This Is

Persönlicher digitaler Kleingarten-Assistent für deutsche Kleingärtner. Die App ermöglicht manuelle Gartenplanung mit interaktivem 2D-Plan-Editor und kombiniert jahreszyklische Aussaat-/Pflanzplanung. Optional: KI-gestützte Analyse über externes Claude.ai-Projekt (Dirks Max-Abo), dessen strukturierte JSON-Ergebnisse per Import-Bridge in die App fließen. MVP für **2 Nutzer (Dirk + Frau) im Shared Garden Model** — beide bearbeiten unabhängig über eigene Accounts/Geräte (iPhone + Desktop-Browser) denselben Kleingarten. **Die App selbst macht null ausgehende KI-API-Aufrufe.**

## Core Value

Manueller Plan-Editor + strukturierter Import aus Claude.ai: Dirk plant seine Parzelle digital — per Hand oder beschleunigt durch KI-Analyse im externen Claude.ai-Projekt. Die App ist der planbare Kleingarten-Assistent, den Paare gemeinsam pflegen können.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**M07 — Manual Planning + Claude.ai Bridge (Pivot 2026-05-08)**
- [ ] Alle In-App-AI-Clients entfernt (Claude Vision, Pl@ntNet, Env-Vars, Screens, Tests)
- [ ] App macht null ausgehende KI-API-Aufrufe (nur Supabase + Expo Update Channel)
- [ ] JSON-Schema `spatenstich-import.v1` definiert (JSON Schema draft 2020-12)
- [ ] Claude.ai-Projekt-System-Prompt für "Spatenstich Garden"-Projekt
- [ ] Import-Screen: Share-Intent + Paste-Fallback → Preview → selektive Übernahme als Drafts
- [ ] Drafts als Building Blocks im Plan-Editor ("Letzte Importe"-Tray)

**M2 – Interaktiver 2D-Plan-Editor**
- [ ] Canvas mit Maß-Gitter (1×1 m, ein-/ausblendbar)
- [ ] Element-Palette: Beete, Pflanzen, Infrastruktur
- [ ] Drag & Drop, Rotation, Skalierung von Elementen
- [ ] Beet-Zeichnen per Polygon-Tool
- [ ] Pflanzenabstand-Hinweise bei Platzierung
- [ ] Layer: Infrastruktur (fix) und Jahresplan (saison-spezifisch)
- [ ] Auto-Save alle 5 Sekunden + manuelles Speichern
- [ ] Performance: 60 fps bis 200 Elemente

**M3 – Saatgut-Inventar (manuell)**
- [ ] Listen-Modus: Texteingabe mit Autocomplete gegen Sorten-DB
- [ ] Sorten-DB mit 100–150 häufigen Kleingartenpflanzen (initial manuell/KI-erstellt)
- [ ] Freitext-Eintrag für Sorten, die nicht in DB sind
- [ ] Sorten-Datenmodell: art, kategorie, aussaat, pflanzung, ernte, standort, abstand, klimazonenAnpassung, mischkultur, fruchtfolgeKategorie

**M4 – Pflanz-/Aussaatkalender aus Inventar**
- [ ] Zeitachse (12 Monate, scrollbar) mit Aufgaben-Karten pro Sorte
- [ ] Berücksichtigt: Klimazone (PLZ-basiert, 7 Zonen), Archetyp, Inventar, Plan
- [ ] Platzierungsvorschläge pro Sorte auf Basis freier Beet-Flächen + Standortanforderung
- [ ] User bestätigt/ändert Vorschlag → Pflanze landet im Plan, Aufgabe wird aktiv

**M5 – Profil & Standort**
- [ ] PLZ → Klimazone-Zuordnung (7 Zonen, statische Lookup-Tabelle)
- [ ] Archetyp-Auswahl (6 Typen)
- [ ] Option "lokal nutzen" ohne Account (spätere Sync-Option)

**M6 – Shared Garden (Pivot 2026-04-21)**
- [ ] `gardens`-Entity mit Owner + `garden_members`-Assoziation
- [ ] RLS-Policies auf Member-Check umgestellt
- [ ] Beide User sehen identischen Plan nach Sync
- [ ] LWW-Konfliktauflösung bei gleichzeitigen Edits

**Onboarding**
- [ ] In < 5 Minuten von Installation zu erstem nutzbaren Plan
- [ ] Flow: Account (oder lokal) → PLZ → Archetyp → Garten erstellen oder beitreten → manueller Plan-Editor

### Out of Scope

- Social features, Community, Chat — nicht Teil des Shared-Garden-Scopes
- Marktplatz für Samentausch — außerhalb Kern-Use-Case
- **In-App KI-API-Aufrufe jeglicher Art** — kein Claude Vision, kein Pl@ntNet, kein Replicate, kein Gemini. Alle KI-Analyse läuft extern im Claude.ai-Projekt (Pivot M07 2026-05-08)
- **Foto-Analyse in der App** — weder für Gartenerfassung noch für Samentüten-Scan. Fotos werden nur im Claude.ai-Projekt analysiert.
- **Vereinsregeln PDF-Upload + Extraktion** — Code existiert (Phase 02), per Feature-Flag ausgeblendet; reaktiviert in Phase 10 (v1.1) ohne Claude-API (manuelle Eingabe)
- **Vereinsregeln-Checkliste + Editor-Warnings** — v1.1 Phase 10
- **BKleingG 1/3-Nutzgartenpflicht-Warnung** — v1.1 Phase 10
- ~~**Fotorealistisches Beet-Preview (AI-Bildvorschau)**~~ — gestrichen (keine In-App AI)
- S1 Pflegeerinnerungen — v1.1
- S2 Unkraut-Check per Foto — gestrichen (keine In-App AI)
- S4 Fruchtfolge-Assistent — v1.1 (MVP: nur einfache Warnung)
- S5 Mischkultur-Check beim Platzieren — v1.1
- C1–C8 (Schädlingsdiagnose, Ernte-Tagebuch, Wetter, Bewässerung, Sprach-Notizen, Satzungs-DB, PDF-Export, Mehr-als-2-Personen-Gärten) — v2+
- AT/CH-Lokalisierung — nach MVP
- Barcode/EAN-Scan Samentüten — v1.1
- Two-way Sync Spatenstich ↔ Claude.ai — evtl. M09
- Automatische Re-Analyse bei Foto-Update — out of scope
- Multi-User Import Sharing — out of scope
- Web/Desktop Spatenstich Client — out of scope

## Context

- **Primäre Nutzer:** Dirk (Produktowner) + Frau — **Shared Garden Model seit Pivot 2026-04-21**. Beide arbeiten unabhängig über eigene Accounts/Geräte am selben Kleingarten.
- **Regulatorischer Kontext (Post-MVP):** BKleingG verpflichtet zu mind. 1/3 Nutzgartenfläche. Im MVP nicht adressiert — Phase 10 (v1.1) reaktiviert Vereinsregeln-Infrastruktur.
- **KI-Strategie (Pivot M07 2026-05-08):** Null In-App KI-API-Aufrufe. Keine Anthropic SDK, kein Pl@ntNet, kein Replicate in der App. KI-Analyse erfolgt extern im Claude.ai "Spatenstich Garden"-Projekt auf Dirks Max-Abo. Ergebnisse fließen als strukturiertes JSON (`spatenstich-import.v1`) per Share-Intent oder Paste in die App.
- **Geo-Scope MVP:** Deutschland. 7 Klimazonen via PLZ-Lookup.
- **Open-Source-Kern:** Lizenz AGPL-3.0.
- **Inspirations-Apps:** GrowVeg/GardenPlanner (Plan-Editor-Referenz), Vera (DE UX). Stil: gezeichnet, warm, nicht-klinisch.

## Constraints

- **Tech Stack:** Expo (React Native) mit Web-Export — eine Codebase für iOS, Android, Desktop-Browser
- **Backend:** Supabase (Frankfurt, EU) — Postgres + Auth + Storage + Edge Functions. DSGVO-konform.
- **Keine In-App AI:** Zero outbound AI calls. Kein Anthropic SDK, kein Pl@ntNet, kein Replicate. Import-Bridge für Claude.ai-Ergebnisse ist der einzige KI-Weg.
- **Offline:** App startet und zeigt letzten Plan ohne Netz; Import-Queue offline. Sync erfordert Verbindung.
- **Plan-Rendering:** SVG-basiert (react-native-svg / natives SVG im Web). Bei > 50 Elementen: Upgrade auf @shopify/react-native-skia erwogen.
- **Lokale Persistenz:** expo-sqlite (strukturierte Daten) + expo-file-system. Sync-Layer: eigene simple Operation-Log-Queue, Last-Write-Wins.
- **Datenschutz:** Fotos bleiben auf dem Gerät des Users oder im Claude.ai-Chat. Spatenstich importiert Analyse, nicht Bilder. DSGVO-konform (EU-Hosting).
- **Monorepo:** pnpm workspaces mit `app/`, `supabase/` (Migrations + Edge Functions), `packages/shared`.
- **Timeline:** MVP-Ziel Ende Juni 2026. Harte Deadline: Saison 2026 muss nutzbar sein.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expo (React Native) statt PWA oder Native | Eine Codebase iOS/Android/Web; native Kamera-Zugriff; TypeScript-Präferenz | — Pending |
| Supabase (Frankfurt) als Backend | Postgres + Auth + Storage out-of-box; EU-Hosting; Open-Source-kompatibel | — Pending |
| **Null In-App KI-API-Aufrufe (Pivot M07)** | Claude Vision + Pl@ntNet pay-per-call out of scope für v1 Economics. KI-Analyse extern im Claude.ai-Projekt auf Dirks Max-Abo. | **Pivot 2026-05-08** |
| **Claude.ai Bridge statt In-App AI** | One-way Import: Claude.ai emittiert `spatenstich-import.v1` JSON → App importiert strukturierte Daten. Kein API-Key, keine Token-Kosten. | **Pivot 2026-05-08** |
| **Manueller Plan-Editor als Default** | Import ist Power-User-Accelerator, nicht required workflow. App muss komplett ohne Claude.ai nutzbar sein. | **Pivot 2026-05-08** |
| ~~Claude API für Foto-Analyse (server-seitig)~~ | ~~Beste Vision-Qualität~~ — **SUPERSEDED by Pivot M07** | **Superseded 2026-05-08** |
| ~~Pl@ntNet als Pflanzenbestimmungs-API~~ | ~~Spezialisiert, kostenlos~~ — **SUPERSEDED by Pivot M07** | **Superseded 2026-05-08** |
| ~~Foto-Analyse ist Kern-Feature~~ | ~~Differenzierender USP~~ — **SUPERSEDED: Manueller Editor ist Kern, Import ist Beschleuniger** | **Superseded 2026-05-08** |
| AGPL-3.0 Lizenz | Schützt vor proprietären Clones | — Pending |
| 2-User Shared Garden (Dirk + Frau) | Nutzungsrealität: Paar bewirtschaftet gemeinsam | **Pivot 2026-04-21** |
| Vereinsregeln + BKleingG → v1.1 Phase 10 | Nicht differenzierend für Saison 2026; Code aus Phase 02 bleibt, Flag aus | **Pivot 2026-04-21** |
| ~~Fotorealistisches Beet-Preview → v1.1~~ | **DROPPED** — keine In-App AI mehr, Gemini-Preview gestrichen | **Dropped 2026-05-08** |
| "Lokal nutzen" ohne Account erlaubt | Niedrigere Einstiegshürde | — Pending |
| Feature-Flags von Anfang an | Schnelle Experimente ohne Deploy | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-08 — M07 Pivot (Manual Planning + Claude.ai Bridge, zero In-App AI)*
