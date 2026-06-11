# Backlog — Parking Lot

Feature-Gaps und Ideen, die nicht in den aktuellen Milestone-Scope fallen.

---

## 999.1 — Web-Editor: Properties Panel (Größe + Name editieren)

**Beschreibung:** Im Web-Editor (WebPlanEditor) können Elemente platziert, verschoben und gelöscht werden, aber es fehlt ein Properties-Panel zum Bearbeiten von:
- Element-Name/Label
- Breite/Höhe (widthM/heightM)
- Rotation (future)

**Entdeckt:** Phase 9 UAT (2026-05-17)
**Priorität:** Mittel — aktuell workaround über Import oder Palette-Dropdown
**Betrifft:** `app/src/components/editor/web/WebPlanEditor.tsx`, neues `WebPropertiesPanel.tsx`

**Status:** ✅ Erledigt (Phase 09.1 ElementEditorModal, 2026-05-29) — ElementEditorModal (Doppelklick Web / LongPress Mobile) liefert Name/Breite/Höhe/Rotation/Notiz/Pflanzdatum/Akzentfarbe. Implementiert in 09.1-02-modal-trigger-PLAN.md.

---

*Einträge 999.2–999.12 stammen aus dem Feature-Sweep 2026-06-10/11 (Marktrecherche + Code-Analyse der 4 Referenz-Apps). Evidenz: `.planning/research/2026-06-11-marktrecherche-feature-ranking.md` + `2026-06-10-ref-apps-feature-synthesis.md`.*

## 999.2 — Bemaßung/Maßanzeige im Plan-Editor

Sichtbare Meter-Maße an Elementen/Beeten (Breite × Höhe, optional Abstände). Fryd-Nutzer beklagen explizit fehlende Maße („Rasterzellen zählen") — wir haben Meter-Koordinaten längst, nur die Anzeige fehlt. **Priorität: Hoch (kleiner Aufwand, Differenzierung).**

## 999.3 — Plan-Export als PNG + Druckansicht

SVG→PNG-Export im Web-Editor + simple Druckseite (Plan + Beet-Tabelle). Vorbild: garden-planner (MIT). Nutzen: Aushang in der Laube, Teilen mit Frau/Verein. **Priorität: Mittel, geringer Aufwand.**

## 999.4 — Garten-Vollexport (JSON-Backup)

Ein-Klick-Export aller Gartendaten als JSON (Datenhoheit, DSGVO-freundlich, Disaster-Recovery). Vorbild: HortusFox BackupModule (MIT). **Priorität: Mittel.**

## 999.5 — Frost-Warnung (Open-Meteo, 3-Tage)

Read-only-Wetterabruf (kein API-Key, keine personenbezogenen Daten): Warnbanner bei Frost in den nächsten 3 Tagen, v. a. während Eisheiligen/Aussaatfenstern. Vorbild: Gardeneus weather.ts + Gartenplaner-Idee. Verstößt NICHT gegen Zero-AI (reine Wetter-API). **Priorität: Mittel-Hoch (Saisonwert enorm).**

## 999.6 — iCal-Export/Abo für Aussaat-/Aufgabenkalender

Kalender als .ics exportieren bzw. abonnierbar machen — nachgefragtes Muster (HortusFox #502). Nach Phase 10/12. **Priorität: Niedrig-Mittel.**

## 999.7 — Companion-Score „Bestes Beet für Pflanze X"

Erweiterung von Phase 9: statt nur Konflikt/Gut-Banner ein Ranking aller Beete (companions×3 − conflicts×10 + Sonne + Kapazität via Pflanzabstand). Algorithmus: Gardeneus companion-scoring.ts (MIT, ~150 Zeilen). **Priorität: Mittel.**

## 999.8 — Gießplan / Watering-Status pro Beet

Schwellen nach Wasserbedarf (1–5 Tage) + Boni für Mulch/Tropf/Regen; sortiert nach Dringlichkeit. Braucht „zuletzt gegossen"-Logging → nach Phase 11 (Journal) + ggf. Phase 12. Vorbild: Gardeneus watering.ts (MIT). **Priorität: Mittel (Top-Demand-Kategorie „Gieß-Erinnerung" ✅ verifiziert).**

## 999.9 — Square-Foot-Raster innerhalb eines Beets

Intra-Beet-Planung: Zellenraster (~30 cm) mit Pflanz-Spans + ×N-Dichte-Badges. Vorbild: garden-planner (MIT). Großes Feature → v1.3+. **Priorität: Niedrig.**

## 999.10 — Material-/Einkaufsliste für Hochbeete

First-Fit-Decreasing Bin-Packing für Holzzuschnitt + Erde (Liter/Säcke), adaptiert auf deutsche Baumärkte. Vorbild: garden-planner (MIT). Distinktiv, aber Nische. **Priorität: Niedrig.**

## 999.11 — Schädlings-/Krankheits-Bibliothek (DE)

~50+ Einträge mit organischen Behandlungen, Nützlingen, aktiven Monaten — aus Gardeneus pests.ts (MIT) übersetzbar; verknüpfbar mit Phase 11 Beobachtungen (kind: pest/disease). **Priorität: Mittel für v1.2/v1.3.**

## 999.12 — GDD-Erntefortschritt (Wachstumsgradtage)

„Tomate ist bei 73 % bis Erntereife" via Open-Meteo-Tageswerte; kalenderunabhängig. Vorbild: Gardeneus gdd.ts (MIT). **Priorität: Niedrig (nice-to-have v1.3+).**
