# Kleingarten-App

## What This Is

Persönlicher digitaler Kleingarten-Assistent für deutsche Kleingärtner. Die App übersetzt eine reale Parzelle per Foto-Analyse in einen interaktiven 2D-Plan und kombiniert jahreszyklische Aussaat-/Pflanzplanung mit rechtlich-regulatorischem Kontext (BKleingG + Vereinssatzungen). MVP für Einzelnutzer (Dirk), optimiert für iPhone und Desktop-Browser.

## Core Value

Foto rein → Plan und Kalender raus: Die KI-gestützte Überführung einer realen Parzelle in einen digital planbaren, regelkonformen Kleingarten-Assistenten.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**M1 – Garten-Erfassung per Foto → 2D-Plan**
- [ ] User kann Garten aus mind. 3 Perspektiven fotografieren (geführter Flow)
- [ ] User gibt Maße ein (L×B in Metern, Formen: Rechteck / L-Form / Trapez / Eckpunkte)
- [ ] Claude Vision analysiert Fotos server-seitig und gibt strukturiertes JSON zurück (Elemente + Koordinaten)
- [ ] App rendert schematischen 2D-Plan aus JSON (SVG, gezeichneter Stil)
- [ ] User kann erkannte Elemente einzeln bestätigen oder verwerfen
- [ ] Edge cases: nur 1 Foto → Warnung, keine Elemente → leere Vorlage mit Maßen

**M2 – Interaktiver 2D-Plan-Editor**
- [ ] Canvas mit Maß-Gitter (1×1 m, ein-/ausblendbar)
- [ ] Element-Palette: Beete, Pflanzen (Gemüse, Kräuter, Blumen, Obstgehölze, Stauden), Infrastruktur (Weg, Zaun, Laube, Kompost)
- [ ] Drag & Drop, Rotation, Skalierung von Elementen
- [ ] Beet-Zeichnen per Polygon-Tool
- [ ] Pflanzenabstand-Hinweise bei Platzierung (aus Sorten-Metadaten)
- [ ] Layer: Infrastruktur (fix) und Jahresplan (saison-spezifisch)
- [ ] Auto-Save alle 5 Sekunden + manuelles Speichern
- [ ] Vereinsregel-Warnungen bei Verstoß (Inline im Editor)
- [ ] Performance: 60 fps bis 200 Elemente

**M3 – Saatgut-Inventar**
- [ ] Foto-Modus: Claude Vision extrahiert Sortenname, Aussaatzeitraum, Haltbarkeitsdatum aus Samentüten-Fotos
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
- [ ] Archetyp-Auswahl (6 Typen: Selbstversorger, Familien-Naschgarten, Mix ausgewogen, Zier- & Erholungsgarten, Biodiversitäts-/Naturgarten, Kräuter-/Apothekergarten)
- [ ] BKleingG-Warnung wenn Nutz/Zier-Verhältnis unter 1/3 Nutzfläche fällt
- [ ] Vereinsregeln-Input: PDF-Upload → Claude extrahiert Regeln → User bestätigt/korrigiert
- [ ] Vereinsregeln alternativ: Checkliste gängiger Regeln (Heckenmaß, Laubengröße, Baumverbote etc.)
- [ ] Option "lokal nutzen" ohne Account (spätere Sync-Option)

**Onboarding**
- [ ] In < 5 Minuten von Installation zu erstem nutzbaren Plan
- [ ] Flow: Account oder lokal → PLZ → Archetyp → Vereinsregeln (optional) → Garten-Erfassung

### Out of Scope

- Social features, Community, Chat — kein Multi-User-Fokus im MVP
- Marktplatz für Samentausch — außerhalb Kern-Use-Case
- Eigenes trainiertes ML-Modell — externe APIs reichen für MVP
- S1 Pflegeerinnerungen — v1.1
- S2 Unkraut-Check per Foto — v1.1
- S3 AI-Bildvorschau des geplanten Gartens — v1.1
- S4 Fruchtfolge-Assistent — v1.1 (MVP: nur einfache Warnung bei offensichtlichen Fehlern)
- S5 Mischkultur-Check beim Platzieren — v1.1
- C1–C8 (Schädlingsdiagnose, Ernte-Tagebuch, Wetter, Bewässerung, Sprach-Notizen, Satzungs-DB, PDF-Export, Mehrpersonen) — v2+
- AT/CH-Lokalisierung — nach MVP
- Barcode-Scan Samentüten — v1.1

## Context

- **Primärer Nutzer:** Dirk (Produktowner), Kleingärtner mit Balkon-Erfahrung, tech-affin, wenig Zeit für Recherche. App wird zuerst für eigene Parzelle eingesetzt (Saison 2026).
- **Regulatorischer Kontext:** Bundeskleingartengesetz (BKleingG) verpflichtet zu mind. 1/3 Nutzgartenfläche. Viele Vereine haben zusätzliche Satzungsregeln (Baumverbote, Heckenmaße, Laubengröße). Bestehende Apps ignorieren diesen Kontext komplett.
- **KI-Kern:** Claude API (Vision + Text) für Foto-Analyse, Plan-Extraktion, PDF-Regelextraktion. Pl@ntNet API für Pflanzenbestimmung (kostenlos bis 500 req/Tag, EU-basiert). KI-Calls laufen ausschließlich server-seitig (Supabase Edge Functions) — API-Keys nie im Client.
- **Geo-Scope MVP:** Deutschland. 7 Klimazonen via PLZ-Lookup (DWD-Daten als Grundlage).
- **Open-Source-Kern:** Lizenz AGPL-3.0. Langfristige Vision: kommerziell erweiterbar (Premium-Features, Vereins-Datenbank).
- **Inspirations-Apps:** GrowVeg/GardenPlanner (Plan-Editor-Referenz), Vera (DE UX), Seek/Pl@ntNet (Erkennungs-Flow). Stil: gezeichnet, warm, nicht-klinisch — kein Fotorealismus.

## Constraints

- **Tech Stack:** Expo (React Native) mit Web-Export — eine Codebase für iOS, Android, Desktop-Browser
- **Backend:** Supabase (Frankfurt, EU) — Postgres + Auth + Storage + Edge Functions. DSGVO-konform.
- **Offline:** App startet und zeigt letzten Plan ohne Netz; Foto-Queue offline. KI-Calls und Sync erfordern Verbindung.
- **Plan-Rendering:** SVG-basiert (react-native-svg / natives SVG im Web). Bei > 50 Elementen: Upgrade auf @shopify/react-native-skia erwogen.
- **Lokale Persistenz:** expo-sqlite (strukturierte Daten) + expo-file-system (Foto-Queue). Sync-Layer: eigene simple Operation-Log-Queue, Last-Write-Wins (Single-User).
- **KI-Budget:** Soft-Limit 50 Claude-Calls/User/Tag, Hard-Limit 200/Tag.
- **Datenschutz:** Fotos verschlüsselt at-rest, Geo-Daten opt-in, DSGVO-Konformität (EU-Hosting).
- **Monorepo:** pnpm workspaces mit `app/`, `supabase/` (Migrations + Edge Functions), `packages/shared`.
- **Timeline:** MVP-Ziel Ende Juni 2026 (realistisch mit Buffer). Harte Deadline: Saison 2026 muss nutzbar sein.
- **Pl@ntNet API:** Nichtkommerzielle Nutzung frei; bei Kommerzialisierung Vereinbarung nötig.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expo (React Native) statt PWA oder Native | Eine Codebase iOS/Android/Web; native Kamera-Zugriff; TypeScript-Präferenz | — Pending |
| Supabase (Frankfurt) als Backend | Postgres + Auth + Storage out-of-box; EU-Hosting; Open-Source-kompatibel; großzügiges Free-Tier | — Pending |
| Claude API für Foto-Analyse (server-seitig) | Beste Vision-Qualität für strukturierte JSON-Ausgaben; API-Keys nie im Client | — Pending |
| Pl@ntNet als Pflanzenbestimmungs-API | Spezialisiert, kostenlos bis 500/Tag, EU-basiert; Flora Incognita ohne offene API | — Pending |
| Foto-Analyse ist Kern-Feature (nicht optional) | Differenzierender USP; Risiko bewusst akzeptiert; manueller Editor als Fallback | — Pending |
| AGPL-3.0 Lizenz | Schützt vor proprietären Clones; ermöglicht spätere Dual-Lizenz für Kommerz | — Pending |
| Single-User MVP (kein Multi-Tenant) | Komplexitätsreduktion; Dirk ist Test-User Nr. 1; RLS-Vorbereitung für später | — Pending |
| KI-Calls server-seitig (Edge Functions) | API-Key-Schutz; Rate-Limiting; Caching-Option; Persistierung aller KI-Antworten (roh + geparst) | — Pending |
| "Lokal nutzen" ohne Account erlaubt | Niedrigere Einstiegshürde; spätere Sync-Option bei Login | — Pending |
| Feature-Flags von Anfang an (Supabase Table) | Schnelle Experimente ohne Deploy; vorbereitet für Post-MVP | — Pending |

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
*Last updated: 2026-04-14 after initialization*
