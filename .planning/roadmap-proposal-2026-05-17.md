# Roadmap-Vorschlag — Saison 2026 Hot Path

**Erstellt:** 2026-05-17
**Status:** PROPOSAL — User-Review benötigt bevor ROADMAP.md ersetzt wird
**Basis:** Inspektion von 4 Open-Source-Garden-Apps + aktueller Code-Stand nach Phase 7 + 7.5a

---

## TL;DR

Du willst **diese Saison schon mit der App arbeiten**. Realistisch nutzbar in 3-5 Wochen, wenn wir die richtigen Phasen in der richtigen Reihenfolge bauen.

**Drei Phasen für Saison-Usability** (in dieser Reihenfolge):
1. **Phase 8 — Plant-DB** (Foundation): Pflanzen-Datenbank mit deutschen Namen, Mischkultur-Beziehungen, Aussaat-/Pflanz-/Erntefenstern. Geliftet aus 2 Repos.
2. **Phase 9 — Companion-Hinweis**: Roter/grüner Banner beim Pflanze-Setzen wenn Nachbarn schlecht/gut zusammenpassen.
3. **Phase 10 — Aussaatkalender v1**: "Was soll ich diese Woche aussäen/pflanzen?" — gefiltert nach Klimazone.

Alles andere (Task-Generator, Journal, Saatgut-Inventar, Vereinsregeln) wird zurückgestellt — kann **nach Saisonstart** gebaut werden, ohne dass du diese Saison was verpasst.

---

## Was ich aus den Reference-Repos gelernt habe

### Gardeneus (gabrielcsapo/backyard-garden) — MIT
**Wert:** GOLD für Schema und Algorithmen.
**Lift:**
- `plants.ts` (78 Pflanzen, reiches Schema: family/sun/frost/succession/GDD) — **Schema-Vorlage**
- `plant-families.ts` (18 Familien + Fruchtfolge-Check) — **direkt portierbar**
- `companion-scoring.ts` (Beet-Empfehlung via Companions×3 - Conflicts×10 + Sun-Match) — **direkt portierbar**
- `task-generator.ts` (Tasks aus Plantings + Frost-Daten) — **für Phase 12**
- Gantt-Kalender-Mathe (`dateToYearPercent`, `weeksFromFrost`) — **für Phase 10**

**NICHT geliftet:** React Server Components, Hono, Drizzle — alles Server-First, passt nicht zu Expo.

### garden-planner (mvrieperry) — MIT
**Wert:** Companion-Banner-Pattern.
**Lift:**
- Banner-HTML/CSS-Pattern für *"Conflicts detected"* / *"Good companions"* — direkt nachbaubar
- 55 Pflanzen mit einfacher `companions`/`avoid`-Struktur — als Vergleichsdatensatz

### Gartenplaner (cognitiveresources) — License UNCLEAR ⚠
**Wert:** Deutsche Pflanzennamen + Mischkultur-Logik + Open-Meteo.
**Lift:** Die Pflanzennamen + Companion-Beziehungen sind **Fakten** (nicht copyrightbar) — wir bauen unsere eigene CSV/JSON aus mehreren Quellen (Gartenplaner als eine, BKleingG-Wiki/Permapeople als andere). Open-Meteo-Client portieren wir nicht (haben Klimazone aus PLZ statisch — reicht für v1.1).

### HortusFox — MIT
**Wert:** UI-Patterns + Task-Schema.
**Lift:**
- Task-Schema (`title`, `due_date`, `recurring_time`, `recurring_scope`, `done`) — direkt für Phase 12
- Dashboard-Stats-Card-Design (Count + Label, clickable) — UI-Inspiration
- "Upcoming Tasks (4 max)"-Widget-Pattern — UI-Inspiration

**NICHT geliftet:** Pl@ntNet-Integration (M07-Pivot verbietet alle in-app AI-Calls).

---

## Aktueller Stand (was schon läuft)

| Wave | Was geht heute |
|---|---|
| ✅ Auth + Onboarding (PLZ→Klimazone, Archetyp) | Phase 2+2.5 |
| ✅ Shared Garden (Dirk+Frau, RLS) | Phase 2.5 |
| ✅ Offline Sync (Outbox + LWW) | Phase 3 |
| ✅ Import aus Claude.ai (Share-Intent + Paste) | Phase 6 |
| ✅ Sichtungs-Screen (Drafts annehmen/verwerfen) | Phase 6.5 |
| ✅ Skia Editor auf iPhone (Drag/Polygon/Undo/Tray) | Phase 7 |
| ✅ Web SVG Editor (Drag/Delete/Add, basic) | Phase 7.5a (heute) |
| ⚠ Web Read-Only Plan-Vorschau auf Home | Phase 7.5a |

**Was offen ist, was diese Saison NICHT zwingend braucht:**
- Skia Web richtig zum Laufen bringen (CanvasKit+Headers) — Web hat schon SVG-Editor
- Vereinsregeln-Aktivierung (Phase 10 alt) — explizit deferred zu v1.2
- Multi-Garden — 1 Garten reicht für Dirk+Frau

---

## NEUE Milestone-Struktur

### v1.1 "Saison 2026 Ready" — **Mai–Juli 2026** (Hot Path)

Goal: Du kannst diese Saison **die App täglich nutzen**, um zu planen, zu sehen "was passt zusammen?", und zu wissen "was soll ich diese Woche tun?".

| Phase | Name | Wert | Geschätzter Aufwand | Lift aus |
|---|---|---|---|---|
| **8** | **Plant-DB Foundation** | Foundation — alles andere baut darauf | 1 Woche | Gardeneus schema + Gartenplaner DE-Namen |
| **9** | **Companion-Hinweis** | Sofort UX-Win beim Pflanzen-Setzen | 3-4 Tage | garden-planner Banner + Gardeneus Scoring |
| **10** | **Aussaatkalender v1** | "Diese Woche aussäen: …" — Praktisch täglich nutzbar | 1-1.5 Wochen | Gardeneus Gantt + Gartenplaner Monats×Woche-Grid |

**Lieferdatum-Ziel:** **15. Juli 2026** für vollständiges v1.1.

Wenn das fertig ist, hast du:
- Plan zeichnen ✓ (heute schon)
- Pflanzen ins Beet legen mit Warnung wenn schlechte Nachbarschaft ✓
- Kalender mit "diese Woche → das aussäen, das pflanzen, das ernten" ✓
- Alles auf Desktop + iPhone synchron ✓

### v1.1b "Polish" — **parallel oder direkt nach v1.1** (optional, Juli–August)

Nicht-blockierend. Falls Zeit/Lust:
- **Phase 7.5b** — Polygon-Zeichnen auf Web (Skia hat's, Web braucht Multi-Click + "Beet abschließen")
- **Phase 7.5c** — Drafts-Tray auf Web (heute über Sichtungs-Screen mit Auto-Layout — funktioniert, aber Drag-in-Plan wäre schöner)

### v1.2 "Saison-Tools" — **August–September 2026**

Goal: Plan-Pflege erleichtern, Erfahrungen sammeln, Lerneffekt für nächstes Jahr.

| Phase | Name | Wert | Geschätzter Aufwand |
|---|---|---|---|
| **11** | **Garten-Journal** | Beobachtungen, Ernten, Fotos pro Beet/Pflanze | 4-5 Tage |
| **12** | **Task-Generator** | Auto-Wochenliste aus Aussaatkalender | 3-4 Tage |
| **13** | **Saatgut-Inventar** | Welche Tüten hast du, wann abgelaufen, wieviel Keimfähigkeit | 4-5 Tage |

### v1.3 "Modern + Mehrjährig" — **Winter 2026/27**

Goal: Vorbereitung für Saison 2027.

| Phase | Name | Wert |
|---|---|---|
| **14** | **Modernes Design** | Visueller Schliff, Animations, schickes Branding |
| **15** | **Fruchtfolge-Memory** | "Was war letztes Jahr auf Beet 3?" — Familie-Konflikt-Warnung |
| **16** | **Vereinsregeln-Aktivierung** | (was alte Phase 10 war) |
| **17** | **Stale-Imports + Sharing-UX** | Aufräumen, Polish |

---

## Phasen im Detail (nur v1.1 hot path)

### Phase 8 — Plant-DB Foundation

**Goal:** Eine zentrale Pflanzen-Datenbank mit allen Infos die nachfolgende Phasen brauchen.

**Was reinkommt** (~80-120 Pflanzen):
- **Identifikation:** ID, Deutscher Name, Botanischer Name, Synonyme
- **Familie:** Liliengewächse, Doldenblütler, etc. (für spätere Fruchtfolge)
- **Anbau:** Mindestabstand (cm), Sonnenbedarf (sonnig/halb/schattig), Wasserbedarf
- **Zeitlich:** Aussaat-Fenster (Freiland-Wochen, Vorkultur-Wochen), Pflanz-Fenster, Tage bis Ernte
- **Beziehungen:** Companions[], Inkompatibel[]
- **Klimazone:** min/max-Zone (für PLZ-Filter)

**Implementation:**
- Master-Daten als `packages/shared/src/data/plants.json` (TypeScript-getypt)
- Migration 019: neue Supabase-Tabelle `plants` (read-only seed) + `plant_companions` (M:N)
- Seed-Script aus JSON nach Supabase
- Lokal cached via expo-sqlite (immer offline verfügbar)

**Was wir lifen:**
- Schema aus Gardeneus `plants.ts` (englische Felder, übersetzen zu deutsch wo nötig)
- Deutsche Namen + Companion-Pairs aus Gartenplaner-CSV als Startpunkt (Faktendaten, nicht copyright-gefährdet)
- Erweitern auf 100-150 Pflanzen relevanten für Klimazone 7a/7b/8a (Mitteldeutschland)

**Acceptance:**
- `plants` table in Supabase mit ≥80 Pflanzen
- TypeScript-Type `Plant` shared package
- `usePlants()` hook der lokal cached + Realtime-Update bei Schema-Refresh

### Phase 9 — Companion-Hinweis

**Goal:** Beim Setzen einer Pflanze auf ein Beet sofort sehen: passt das?

**Implementation:**
- Wenn Pflanze in Beet platziert (sowohl Web als auch Skia): finde alle anderen Pflanzen-Elemente innerhalb des Beet-Polygons
- Gegen Companion/Incompatible-Listen prüfen
- **Roter Banner** im Editor: *"⚠ Konflikt: Tomate verträgt sich nicht mit Fenchel"*
- **Grüner Banner**: *"✓ Gute Nachbarschaft: Tomate + Basilikum"*
- Persistent als kleine Markierung an den Pflanzen (rotes Dreieck bei Konflikt)

**Was wir lifen:**
- Banner-Pattern aus garden-planner (`#fee2e2` red, `#e8f4e8` green, gleiche CSS-Struktur)
- Detection-Logik aus garden-planner (lines 2800-2811) — Adjacency-Check innerhalb desselben Beets

**Acceptance:**
- Pflanze auf Beet legen mit existierender inkompatibler Nachbar → roter Banner sichtbar
- Pflanze auf Beet legen mit Companion → grüner Banner sichtbar
- Pflanze auf leeres Beet → kein Banner
- Banner verschwindet wenn man die Pflanze wieder wegnimmt

### Phase 10 — Aussaatkalender v1

**Goal:** "Was sollte ich diese Woche im Garten tun?"

**Drei Views:**
1. **Wochen-View** (Default, neue Home-Card oder eigener Tab): aktuelle Kalenderwoche, Liste von "diese Woche aussäen / pflanzen / ernten"
2. **Jahres-Gantt** (Pflanzen-Detail-View): pro Pflanze ein horizontaler Streifen über 12 Monate mit Aussaat / Vorkultur / Pflanzen / Ernten farbig
3. **Pflanzen-Filter:** nur die Pflanzen anzeigen die in deiner Klimazone empfohlen sind UND deren Sorten du angelegt hast

**Implementation:**
- Daten aus Phase 8 (Aussaat-Fenster pro Pflanze)
- Klimazone aus Profil (Phase 2 hat PLZ → Klimazone)
- Frost-Datum: statisch pro Klimazone (z.B. Klimazone 7a: letzte Frost Mitte-April, erster Frost Mitte-Oktober)
- Gantt-Logik portiert aus Gardeneus `calendar.client.tsx` lines 125-195 (`dateToYearPercent`, `weeksFromFrost`)

**Acceptance:**
- Home-Screen zeigt Card "Diese Woche": Liste von Aktionen mit Pflanze + Tätigkeit
- Klick auf Pflanze → Detail-View mit Gantt-Streifen + alle Infos aus Phase 8
- Filter "Nur deine Pflanzen" funktioniert (= alle die im Plan stehen)

---

## Was bewusst NICHT in v1.1 ist

| Feature | Warum nicht v1.1 | Wann |
|---|---|---|
| Garten-Journal / Notizen | Nice-to-have, aber nicht Saison-blockierend. Kannst zur Not ein Notebook führen. | v1.2 |
| Task-Generator | Hängt von Phase 10 ab, kann danach kommen. Phase 10 zeigt diese Woche schon. | v1.2 |
| Saatgut-Inventar (Tüten-Tracking) | Du weißt welche Tüten du hast. Nicht-blockierend. | v1.2 |
| Crop-Family-Fruchtfolge | Memory-Feature — Wert erst 2027. | v1.3 |
| Modernes Design / Branding | Erst funktional, dann hübsch. | v1.3 |
| Vereinsregeln | Code liegt seit Phase 2 — UI-Aktivierung erst wenn ihr's wollt. | v1.3 |
| Open-Meteo-Integration | Statische Klimazone reicht für Saison 1. | v2.0? |
| Pl@ntNet / Photo-ID | Per M07-Pivot ausgeschlossen. | nie |
| Multi-Garden | Dirk+Frau haben EINEN Kleingarten. Nicht benötigt. | v2.0? |

---

## Aufwand-Realismus

| Phase | Optimistisch | Realistisch | Pessimistisch |
|---|---|---|---|
| 8 (Plant-DB) | 5 Tage | 7 Tage | 10 Tage |
| 9 (Companion-Hinweis) | 2 Tage | 3-4 Tage | 5 Tage |
| 10 (Aussaatkalender) | 6 Tage | 9 Tage | 14 Tage |
| **v1.1 gesamt** | **~13 Tage** | **~20 Tage** | **~29 Tage** |

Bei "ein paar Stunden pro Woche" ≈ realistisch in **4-6 Wochen** komplett. Sprich: **Mitte Juli** machbar.

Wenn du **schnell** willst (Hauptfokus 1-2h pro Tag), sind 2-3 Wochen drin.

---

## Konkrete nächste Schritte (Bitte absegnen oder ändern)

1. **Diese Roadmap absegnen** → ich update `.planning/ROADMAP.md`, archiviere alte Phase 8-10
2. **Phase 8 starten** mit `/gsd-discuss-phase 8 --auto` (Plant-DB)
3. **Phasenreihenfolge:** 8 → 9 → 10 strikt sequentiell (jede baut auf vorherige)
4. **Parallel optional:** Phase 7.5b (Web Polygon) — kann ein Wochenend-Quickie sein zwischen Phase 8 und 9

**Frage an dich:**
- ✅ Sieht die Reihenfolge gut aus?
- 🤔 Würdest du Phase 11 (Garten-Journal) lieber vor Phase 10 (Kalender)? Nur wenn du sehr Notiz-getrieben planst.
- 🤔 Sollen die geklonten Repos in `D:\AiProjects\` bleiben oder kann ich `gardeneus`/`ref-*` entfernen sobald wir die Daten extrahiert haben? Sie verbrauchen ~150-300 MB.

---

*Mehr Details / Phasenpläne kommen pro Phase im Discuss-Phase-Workflow. Dieses Dokument ist die Milestone-Sicht.*
