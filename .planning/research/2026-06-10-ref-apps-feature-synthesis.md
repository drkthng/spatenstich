# Referenz-Apps Feature-Synthese (Code-Analyse)

**Erstellt:** 2026-06-10 (Forensik-/Feature-Sweep)
**Quellen:** Vollständige Code-Analysen der 4 lokalen Referenz-Apps (parallele Explore-Agents)
**Zweck:** Futter für Phasenplanung v1.1–v1.3 (Phase 10 Aussaatkalender, Phase 11 Journal, Phase 12 Task-Generator, Phase 13 Saatgut, Phase 15 Fruchtfolge) + Backlog-Kandidaten

---

## Lizenz-Übersicht (entscheidend für Datenübernahme)

| App | Pfad | Lizenz | Konsequenz |
|---|---|---|---|
| Gardeneus | D:\AiProjects\gardeneus | **MIT** (package.json) | Daten + Algorithmen mit Attribution direkt portierbar |
| HortusFox | D:\AiProjects\ref-hortusfox | **MIT** (Daniel Brendel) | Schema-/Architektur-Ideen frei; PHP-Code neu implementieren |
| garden-planner | D:\AiProjects\ref-garden-planner | **MIT** (Marie Perry) | Algorithmen (Bin-Packing, SqFt-Grid) + Datenstrukturen frei mit Attribution |
| Gartenplaner (PyQt) | D:\AiProjects\ref-Gartenplaner | **KEINE Lizenz** → Copyright by default | NUR Ideen/UX-Patterns. KEINE Daten (aussaatkalender.csv, Pflanznachbarn.csv), KEIN Code. Bestehende Drei-Wälle-Regel (PLANT-DB-09) bleibt. |

---

## Gardeneus (ergiebigste Quelle — MIT, TypeScript, deterministisch, offline-first)

Kleine, in sich geschlossene Algorithmen-Module, fast 1:1 portierbar:

1. **Task-Generator** (`app/lib/task-generator.ts`): 4 Task-Typen pro Pflanzung (Vorkultur-Start, Direktsaat, Pflanzen, Ernte) aus frostrelativen Wochen-Offsets × lastFrostDate. Dedupe über (plantingId, taskType). → **Phase 12 Blaupause.**
2. **Fruchtfolge-Checker** (`app/lib/plant-families.ts`): 18 Familien, 3-Jahres-Regel, `checkRotationConflict(family, history) → {hasConflict, lastUsedSeason, yearsAgo}` (~20 Zeilen). → **Phase 15 Blaupause.**
3. **Frostrelative Aussaatfenster** (`app/lib/dates.ts`): `getPlantingWindows(plant, lastFrostDate)` + Saison-Verlängerung (Frühbeet +3W, Vlies +2W, Folientunnel +4W, Gewächshaus +8W). Passt zu unserem Klimazonen-Modell (Frost-Daten pro Klimazone statt USDA-Zone). → **Phase 10 Kernlogik.**
4. **Companion-Scoring pro Beet** (`app/lib/companion-scoring.ts`): score = companions×3 − conflicts×10 + sunMatch ±, + Kapazität via Fläche/Pflanzabstand. Erweiterung unseres binären Companion-Hinweises (Phase 9) zu „bestes Beet für Pflanze X". → Backlog v1.2+.
5. **Succession Planting** (`app/lib/succession.ts`): Re-Aussaat-Fenster von sowStart bis firstFrost−2W im Intervall `successionIntervalWeeks` (Salat, Radieschen, Spinat …). → Phase 10 Erweiterung oder v1.2.
6. **Gießplan-Logik** (`app/lib/watering.ts`): Schwellen nach Wasserbedarf (sehr hoch 1d … niedrig 5d), Boni: Mulch +1d, Tropf +2d, Regen >5mm +1d. Sortierung nach Dringlichkeit. → Backlog (braucht „zuletzt gegossen"-Logging aus Phase 11).
7. **GDD-Tracking** (`app/lib/gdd.ts`): Wachstumsgradtage via Open-Meteo (gratis, kein Key, DSGVO-tauglich da keine personenbezogenen Daten). Ernte-Fortschritt unabhängig vom Kalender. → Backlog v1.3 (nice-to-have).
8. **Pest/Disease-Bibliothek** (`app/db/pests.ts`, ~50+ Einträge, MIT): organische Behandlungen, Nützlinge, aktive Monate. Englisch → bräuchte Übersetzung. → Backlog.
9. **Plant-DB-Felder, die wir noch nicht haben** (`app/db/plants.ts`, 78 Pflanzen, 27 Felder): successionIntervalWeeks, frostTolerance, expectedYieldPerPlant, seedViabilityYears, minSoilTemp, gddBase/gddToHarvest, rootDepth, commonPests/Diseases. → Selektive Schema-Erweiterung in Phase 10/13.

## HortusFox (bestes Datenmodell für Pflege/Journal/Aufgaben — MIT, PHP)

1. **Recurring Tasks**: `due_date` + `recurring_time` (Stunden) + `recurring_scope` (hours/days/weeks/months/years) + Cronjob-Reschedule. M:N `PlantTasksRef`. → **Phase 12 Schema-Vorbild.**
2. **Pflege-Timestamps pro Pflanze**: last_watered / last_fertilised / last_repotted als simple Timestamps + „Bulk-Aktion pro Location". → Phase 11/12.
3. **Health-States** (10 Zustände: gesund, überwässert, Schädlingsbefall, Frostschaden …) mit Dashboard-Warnliste. → Phase 11 (Beobachtungen) — passt zu unserem observation_drafts-Kind-Feld.
4. **Foto-Journal pro Pflanze** (PlantPhotoModel: thumb, original, label, author) + **Text-Log** (PlantLogModel, paginiert, System-Auto-Einträge optional). → **Phase 11 Blaupause** (bereits als Inspiration in ROADMAP vermerkt).
5. **Audit-Log / Multi-User-Tracking** (LogModel: user, target, property, value): leichtgewichtiges „wer hat was geändert" — für unser 2-User-Shared-Garden als einfaches Activity-Feed interessant. → Backlog v1.2.
6. **Inventar mit Gruppen + Mengen** (InventoryModel) + Export JSON/CSV/PDF. → Phase 13 Vorbild.
7. **Workspace-Backup/Restore** (JSON-Vollexport aller Module). → Backlog: „Garten-Export" als DSGVO-/Datenhoheit-Feature.

## garden-planner (Canvas-UX-Ideen — MIT, Vanilla JS, 1 Datei)

1. **Square-Foot-Grid pro Beet**: Zellen à 1 Quadrat (bei uns: 25–30cm-Raster), Pflanzen mit sqft-Footprint → rowSpan/colSpan, ×N-Badge für >1 Pflanze/Zelle. Intra-Beet-Planung ergänzt unseren Element-Editor. → Backlog v1.2/v1.3 (groß).
2. **Material-/Einkaufsliste mit First-Fit-Decreasing Bin-Packing** für Hochbeet-Holz + Erde (Liter/Säcke) — auf deutsche Baumärkte adaptierbar. Distinktives Feature. → Backlog.
3. **PNG-Export + Druckansicht** des Plans (Layout + Beet-Tabelle). Klein, hoher Alltagsnutzen (Aushang in der Laube, Teilen). → Backlog v1.2, geringer Aufwand: SVG→PNG im Web-Editor.
4. **JSON-Save/Load mit Versionsfeld + Migration** alter Formate. Wir haben Sync — aber ein lokaler Plan-Export (Datenhoheit) wäre konsistent mit Spatenstich-Philosophie. → mit HortusFox-Backup bündeln.

## Gartenplaner PyQt (NUR Ideen — keine Lizenz!)

1. **Aussaatkalender mit 2-Wochen-Granularität × 3 Anbaumethoden** (Freiland / Vorkultur im Haus / Frühbeet) als Jahresmatrix mit eingefrorener Pflanzen-Spalte (Frozen-Column-Pattern). → **Phase 10 UX-Vorbild Nr. 1** — deckt sich exakt mit CAL-Anforderungen (Wochen-View + Methoden-Icons).
2. **Beet-Check**: paarweise Companion-Validierung pro Beet mit 3-Status-Ampel (gut / schlecht / unbekannt). Haben wir in Phase 9 bereits eleganter (live im Editor).
3. **Editierbare Kommentar-/Plan-Spalten** im Kalender („Geplante Pflanzung", „Kommentar" pro Pflanze/Jahr). → Phase 10: Notizfeld pro Pflanze-Jahr erwägen.
4. Open-Meteo-Wetterintegration (gratis, kein API-Key) — gleiche Quelle wie Gardeneus. → Backlog (Frost-Warnung „nächste 3 Tage" wäre die Killer-Anwendung im Frühjahr, rein lesend, DSGVO-ok).

---

## Konsequenzen-Kurzliste (für ROADMAP/Backlog-Pflege)

- **Phase 10 (Aussaatkalender)**: Gardeneus `dates.ts`-Logik + Gartenplaner-UX (2-Wochen-Raster, 3 Methoden, Frozen-Column) + plants.json-DOY-Felder. Succession-Fenster als optionales Add-on.
- **Phase 11 (Journal)**: HortusFox PlantLog + PlantPhoto + Health-States als Schema-Vorbild (bereits in ROADMAP vermerkt — jetzt mit konkreten Feldlisten).
- **Phase 12 (Task-Generator)**: Gardeneus task-generator (deterministisch) + HortusFox recurring-Schema (bereits vermerkt — Feldliste konkretisiert).
- **Phase 13 (Saatgut)**: Gardeneus seedInventory-Felder (expirationDate, quantityRemaining, lotNumber) + seedViabilityYears in Plant-DB.
- **Phase 15 (Fruchtfolge)**: Gardeneus plant-families 3-Jahres-Regel; braucht Pflanz-Historie (deletedAt-Rows oder season-Feld an plan_elements).
- **Neue Backlog-Kandidaten**: Plan-Export PNG/Druck; Garten-JSON-Vollexport; Frost-Warnung via Open-Meteo; Companion-Score „bestes Beet"; Square-Foot-Intra-Beet-Grid; Gießplan; Material-/Einkaufsliste Hochbeet; Pest/Disease-Bibliothek (übersetzt); GDD-Tracking.
