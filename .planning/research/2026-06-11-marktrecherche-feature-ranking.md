# Marktrecherche: Meistgeliebte & meistgefragte Features von Garten-Apps

**Erstellt:** 2026-06-11 · **Methode:** Deep-Research-Workflow (5 Suchwinkel, 20 Quellen, 96 Claims extrahiert, Top 25 zur Verifikation; 5 Claims hart verifiziert 3-0, Rest einzelquellen-basiert — Verify-Phase brach am Session-Limit ab, Quellen+Zitate liegen aber vor)
**Schwester-Dokument:** `2026-06-10-ref-apps-feature-synthesis.md` (Code-Analyse der 4 lokalen Referenz-Apps)

Konfidenz-Legende: ✅ = adversarial verifiziert (3-0) · ◐ = Einzelquelle mit Originalzitat, plausibel · ✗ = widerlegt

---

## A. Härteste Nachfrage-Signale (verifiziert)

1. ✅ **Wiederkehrende Aufgaben/Erinnerungen** sind das meist-upgevotete Feature-Request der gesamten HortusFox-Historie (Issue #9, 22 👍). → Stärkste Einzelvalidierung für **Phase 12 Task-Generator**.
2. ✅ **Pflanzen-verknüpfte Gieß-Erinnerungen** (Tasks automatisch aus Pflanzen-Pflegedaten statt manuell) sind Signal Nr. 2 (HortusFox #281, 14 Reaktionen, 15 Kommentare). → Phase 12: Tasks MÜSSEN aus Plan + Plant-DB generiert werden, nicht manuell.
3. ✅ **Mitgelieferte Pflanzen-Datenbank mit Pflegedaten** ist eine dauerhaft geforderte, von HortusFox nie gelieferte Lücke (#97 wontfix, 7 👍; #361 on-hold, 6 👍). → Unsere 90-Pflanzen-DB (Phase 8) füllt eine real nachgefragte Lücke.
4. ✅ **Kalender-Automatisierung aus Pflanzendaten** ist aktives 2026-Thema (HortusFox #511 Auto-Befüllung, #502 iCal-Abo, #509 Datums-Events pro Pflanze). → Phase 10: Kalender muss sich aus Plan+DB selbst befüllen; iCal-Export als Backlog-Idee.
5. ✅ **Companion-Relationen + Familien + Abstand + frostrelative Fenster** sind Baseline-Erwartung (Gardeneus 78-Pflanzen-Modell konvergiert unabhängig auf unser Schema).
6. ✗ Widerlegt wurde nur die Zuschreibung der Fruchtfolge-Warnung ans öffentliche gabrielcsapo/Gardeneus-Repo — **irrelevant für uns**: unsere lokale Gardeneus-Kopie enthält `plant-families.ts` mit `checkRotationConflict()` nachweislich (eigene Code-Analyse, siehe Schwester-Doc).

## B. Deutscher Markt — Fryd/Alphabeet als Benchmark (◐ Einzelquellen: App Store DE / Play Store / krautundrueben.de)

- ◐ Fryd iOS 4,2★ (1.046 Bewertungen, polarisiert), **Android nur ~3,5★ bei 100.000+ Downloads** → großer Markt, mittelmäßige Zufriedenheit = Lücke für uns.
- ◐ **Meistgelobt:** visuelle Beet-Übersicht + Mischkultur-Anzeige + Vor-/Nachkultur-Planung. Deckt sich 1:1 mit unserem Kern (Editor + Phase 9 + Phase 15).
- ◐ **Dominante Beschwerde (Jan–Mai 2026):** Beet-Editor auf dem Smartphone hakelig (Drag von Pflanzen, Beete verschieben) — am PC ok. → Unser touch-optimierter Skia-Editor + Desktop-Web-Editor adressiert exakt den größten Schmerzpunkt des Marktführers.
- ◐ **Konkrete Editor-Lücken bei Fryd:** keine Laufwege/Leerflächen modellierbar, **keine Maßangaben im Plan** (User zählen Rasterzellen!). → Wir haben Infrastruktur-Layer + Meter-Koordinaten bereits; sichtbare **Bemaßung** als kleines Differenzierungs-Feature ins Backlog.
- ◐ Beschwerden über langsames Laden / verlorene Beete bei Fryd → bestätigt unsere Offline-First-Architektur.
- ◐ Fryd v9.0.0 (02.06.2026) bringt **Foto-Gartentagebuch** → Journaling ist die aktuelle Feature-Front im Markt; Phase 11 ist richtig platziert.
- ◐ Fryd-Gründungs-These („Was muss ich diese Woche im Garten tun?" + Mischkultur-Wissen) = exakt unsere Phase-10+12-Kombi.
- ◐ Preisanker: Super Fryd 49,99 €/Jahr bzw. 199,99 € lifetime.

## C. Englischer Markt — GrowVeg als Feature-Messlatte (◐)

- ◐ GrowVeg gilt als führend wegen der Trias **Drag&Drop-Editor + große Plant-DB + mehrjährige Fruchtfolge** (genau unsere Roadmap); Haupt-Kritik: ~50 $/Jahr, nur zonen- statt ortsgenaue Aussaatdaten, überladenes Mobile-UI.
- ◐ Meistgelobtes GrowVeg-Einzel-Feature: **frostdatums-angepasste Pflanzliste** (Abstand + lokale Aussaat-/Erntedaten). → Phase 10 muss klimazonen-/frostbasiert rechnen (haben wir via PLZ→Klimazone vorbereitet).
- ◐ OSS-Lücke: Open-Source-Planner liefern Companion-Daten chronisch leer/nicht (Smigo, Crop Planning) → unsere kuratierte DE-Companion-DB ist ein echtes Asset.
- ◐ Käufer-Wunsch hinter allem (ecohackerfarm-Wiki): EIN Tool, das Planung + Mischkultur + Fruchtfolge + Erntedaten + Aufgaben bündelt, ohne Abo.

## D. Selfhosted-/Power-User-Szene (◐ XDA, HN)

- ◐ Wirkungsvollstes HortusFox-Feature im Langzeit-Nutzungsbericht: **Pflege-Timeline mit done/snooze** („von reaktiv zu proaktiv"). 
- ◐ **Leichtgewichtiges Notiz-Journal** wird rückblickend wertvoll (Diagnose-Historie) → Phase 11: Quick-Notes wichtiger als Hochglanz-Features.
- ◐ HortusFox-Hauptkritik: grobes UI, keine richtige Mobile-App → unser Expo-Ansatz adressiert das.

---

## Integriertes Feature-Ranking für Spatenstich (Recherche × Ref-App-Code × Roadmap-Fit)

| # | Feature-Kategorie | Nachfrage-Evidenz | Status bei uns |
|---|---|---|---|
| 1 | **Aussaatkalender, frost-/klimazonengenau, auto-befüllt aus Plan** | ✅ Kalender-Automation, ◐ GrowVeg-Lob, ◐ Fryd-These | **Phase 10 — als Nächstes. Richtig priorisiert.** |
| 2 | **Task-Generator + wiederkehrende Erinnerungen, pflanzen-verknüpft** | ✅✅ Top-2-Signale überhaupt | Phase 12 (v1.2). Evidenz spricht dafür, 12 direkt nach 10 zu ziehen — Wochenliste ist Teil derselben User-Frage |
| 3 | **Touch-tauglicher 2D-Editor (mobil!) + Wege/Strukturen + Maße** | ◐ größter Fryd-Schmerzpunkt | ✅ Kern fertig (Phase 7/7.5/9.1); Bemaßung als Backlog-Polish |
| 4 | **Kuratierte Pflanzen-DB mit Pflegedaten + Companions** | ✅ HortusFox-Lücke, ◐ OSS-Lücke | ✅ Phase 8 fertig (90 Pflanzen, 38 Paare) |
| 5 | **Mischkultur-Anzeige beim Planen** | ◐ meistgelobtes Fryd-Feature | ✅ Phase 9 fertig (Live-Banner beider Editoren) |
| 6 | **Foto-/Notiz-Journal pro Beet/Pflanze** | ◐ Markt-Front (Fryd v9), ◐ XDA-Langzeitwert | Phase 11 (v1.2) — richtig platziert |
| 7 | **Fruchtfolge-Memory (3-Jahres-Regel)** | ◐ GrowVeg-Trias, ◐ Fryd-Paid-Lob | Phase 15 (v1.3); Algorithmus liegt MIT-lizenziert lokal vor |
| 8 | **Saatgut-Inventar** | ◐ (Fryd Saatgut-Manager) | Phase 13 — Bestätigung, kein Top-Signal |
| 9 | **Offline-Zuverlässigkeit / nichts geht verloren** | ◐ Fryd-Beschwerden | ✅ Architektur-Vorteil, beibehaltenswert |
| 10 | **Zukunftskandidaten:** iCal-Export, Frost-Warnung (Open-Meteo), Gießplan, Companion-Score „bestes Beet", Plan-Export/Druck, Einkaufsliste | ✅ #502 / ◐ diverse | Backlog (siehe BACKLOG.md) |

**Kernaussage:** Die Recherche bestätigt die Roadmap-Reihenfolge fast vollständig. Einzige evidenzbasierte Empfehlung zur Änderung: **Phase 12 (Task-Generator) eng an Phase 10 koppeln** (gleiche User-Frage „Was tue ich diese Woche?", stärkste Nachfrage-Signale) statt sie nach Phase 11 zu legen.

## Quellen (Auswahl)

- github.com/danielbrendel/hortusfox-web/issues (#9, #97, #281, #361, #502, #509, #511) — primär
- apps.apple.com/de … gartenplaner-von-fryd/id1492138640 · play.google.com … org.alphabeet.app
- krautundrueben.de/fryd-gaertnern-mit-plan-app-2649
- xda-developers.com/this-self-hosted-app-helped-me-stop-killing-my-houseplants/
- wiki.ecohackerfarm.org/companion_planting:software · leaftide.com/learn/best-garden-planning-apps/ · suburbanhobbyfarmer.com/product-review-growveg-com/
- news.ycombinator.com/item?id=46631182
