---
phase: 10-aussaatkalender-v1
verified: 2026-06-11T18:00:00Z
status: human_needed
score: 6/6 must-haves verified (3 gap-closure blockers resolved; WR-08 partial data defect on 2/90 plants classified as WARNING, not BLOCKER)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/6
  gaps_closed:
    - "CR-01: Rules-of-Hooks — Guard jetzt nach allen Hooks in [slug].tsx:129 (RESOLVED)"
    - "WR-01: beetToPolygon center-Konvention — halfW/halfH-Fallback implementiert (RESOLVED)"
    - "WR-02: Fruchtfolge beet-scoped — findPflanzenInBeet in fruchtfolgeGrund-Loop (RESOLVED)"
    - "WR-03: getAktuelleKw Off-by-one — direkte UTC-Arithmetik ohne Math.ceil (RESOLVED)"
    - "WR-04: ISO-Wrap partialfix — Kantenpinning für doyToIsoKw-Grenzen (RESOLVED für KW-Wrap-Artefakte; WR-08 verbleibt für echte Daten-Wrap-Fenster)"
    - "WR-05: Filter-Chip — useKalenderData({ nurMeinePflanzen }) durchgereicht (RESOLVED)"
    - "WR-06: addPlantToPlan In-Bed-Placement — targetBeet.xM/yM + parentBedId (RESOLVED)"
    - "WR-07: cancelled-Flag + null-Reset im Lade-Effekt (RESOLVED)"
  gaps_remaining:
    - "WR-08: Feldsalat/Grünkohl Ernte-Fenster invertiert (2 von 90 Pflanzen)"
    - "WR-09: CAL-06-Warnung bei unplatzierter Pflanze prüft alle Beete, CTA platziert ins erste"
    - "WR-10: findBeeteForPlant ignoriert parentBedId-Hint (konkave Freihand-Polygone)"
  regressions: []
gaps:
  - truth: "Jahres-Gantt zeigt Ernte-Phase für ALLE Pflanzen korrekt (SC-2)"
    status: partial
    reason: |
      WR-08: Feldsalat (harvestDoyStart=280, harvestDoyEnd=90) und Grünkohl (harvestDoyStart=280,
      harvestDoyEnd=60) haben echte jahresüberspannende Ernte-Fenster. Das WR-04-Kantenpinning
      greift nur für KW-Wrap-Artefakte aus doyToIsoKw (s<=7 oder e>=359), NICHT für Pflanzen,
      deren DOY-Werte per Daten den Jahreswechsel überspannen. Für diese Pflanzen gilt nach
      Clamping s=280, e=90 (bzw. 60) — keine Pinning-Bedingung feuert — startKw≈40 > endKw≈13
      wird unverändert pushed. filterAktiveAktionen matcht für KW 1–13 nie (kw>=40 && kw<=13
      ist immer false), und der GanttStreifen-Guard überspringt das Fenster (clampedEnd<clampedStart).
      Ernte von Feldsalat und Grünkohl ist damit in WochenCard UND Gantt ganzjährig unsichtbar.
      Betrifft 2 von ~90 Pflanzen. Fix ist in 10-REVIEW.md WR-08 dokumentiert: addWindow als
      rekursive Splitting-Funktion statt Pinning für echte Wrap-Fenster.
    artifacts:
      - path: "packages/shared/src/lib/kalenderEngine.ts"
        issue: "addWindow-Closure Z.96-99: Pinning-Bedingungen decken nur doyToIsoKw-Grenzartefakte ab, nicht echte Daten-Wrap-Fenster (s=280 > e=90 — beide Bedingungen s<=7 und e>=359 schlagen fehl)"
      - path: "packages/shared/src/data/plants.json"
        issue: "feldsalat Z.546-547: harvestDoyStart=280, harvestDoyEnd=90; gruenkohl Z.604-605: harvestDoyStart=280, harvestDoyEnd=60 — echte jahresüberspannende Ernte-Fenster"
    missing:
      - "addWindow in kalenderEngine.ts: echte Wrap-Fenster (raw start > end VOR dem Clamping) in zwei Segmente splitten statt zu pinnen"
      - "Zusatztest: getFensterFuerPflanze({ harvestDoyStart:280, harvestDoyEnd:90, ... }, 4) muss zwei Ernte-Fenster liefern"
      - "Key-Kollision in KalenderWochenCard.tsx:53 beheben: ${plant.slug}-${fenster.typ} bei zwei gleichtyp-Segmenten → startKw in Key aufnehmen"
human_verification:
  - test: "App starten (Account-Modus, Garten mit Beet + Pflanze) — Zum-Kalender-Button vom Home-Screen"
    expected: "Wochen-View öffnet mit Header 'Aussaatkalender' und 'KW {n} · 2026'"
    why_human: "Router-Navigation und visuelles Rendering nur auf echtem Gerät / Web verifizierbar"
  - test: "CAL-03 farbige Aktions-Badges in 'Diese Woche'-Karte prüfen"
    expected: "Vorkultur violett (#A78BFA), Direktsaat grün (#34D399), Auspflanzen blau (#60A5FA), Ernte orange (#FB923C) — korrekte deutsche Labels"
    why_human: "Farbkorrektur und Badge-Rendering visuell zu prüfen"
  - test: "CAL-04 Filter-Chip 'Nur meine Pflanzen' ein/ausschalten"
    expected: "Aktiv = grüner Hintergrund (#4A7C59); inaktiv = Outline; Jahresübersicht filtert. WochenCard filtert jetzt EBENFALLS korrekt via Hook-Option (WR-05 gefixt)"
    why_human: "Interaktions-Kontrakt und Konsistenz WochenCard + Jahresübersicht nur auf Gerät prüfbar"
  - test: "CAL-01 + CAL-02 Pflanzen-Detail: 12-Monats-Gantt mit Monatsbeschriftungen Jan-Dez + 4-Farben-Legende"
    expected: "Volle Breite, korrekte Phasen-Balken, Monatsbezeichnungen, Legende sichtbar. HINWEIS: Feldsalat und Grünkohl zeigen keinen Ernte-Balken (WR-08)"
    why_human: "Gantt-Rendering und proportionale Balkenbreiten nur visuell prüfbar"
  - test: "CAL-02 Klimazonen-Verschiebung: PLZ auf Zone 1 und Zone 7 wechseln, Tomate-Detail vergleichen"
    expected: "Sichtbare Verschiebung der Phasen-Balken um 1-4 Kalenderwochen"
    why_human: "Visueller Vergleich zweier Klimazonen-Einstellungen"
  - test: "CAL-05 'Zu Plan hinzufügen': CTA erscheint wenn Beet vorhanden; Tippen → Erfolgs-Banner; Plan-Editor prüfen"
    expected: "Banner '{name} wurde dem Plan hinzugefügt'; Pflanze landet IN einem Beet (WR-06 gefixt). 'Auf welchem Beet?' zeigt den Beet-Namen nach Hinzufügen"
    why_human: "Add-Round-Trip und Persistenz nur mit echten SQLite-Daten prüfbar"
  - test: "CAL-06 Fruchtfolge-Warnung: Zwei Solanaceae-Pflanzen im GLEICHEN Beet; drittes Solanaceae-Detail"
    expected: "fruchtfolge-warnung Banner erscheint (Beet-scoped, WR-02 gefixt). Gleiche Familie in ANDEREM Beet löst KEINE Warnung aus"
    why_human: "Interaktion mit echten Pflanzendaten und Beet-Scope nur auf Gerät prüfbar"
  - test: "UTF-8-Umlaute: ä/ö/ü/ß korrekt in allen Kalender-Screens"
    expected: "Keine Fragezeichen, Kästchen oder ae/oe/ue-Ersetzungen"
    why_human: "Font-Rendering und Encoding nur auf echtem Gerät/Browser sichtbar"
---

# Phase 10: Aussaatkalender v1 — Verification Report (Re-Verifikation)

**Phase Goal:** "Was sollte ich diese Woche im Garten tun?" — eine Wochen-Übersicht + Gantt-Detail pro Pflanze, gefiltert nach Klimazone und den Pflanzen in deinem Plan.
**Verified:** 2026-06-11T18:00:00Z
**Status:** human_needed
**Re-verification:** Ja — nach Gap-Closure-Plänen 10-05..10-09

---

## Re-Verifikation: Vorherige Findings

Die erste Verifikation (2026-06-11T13:00:00Z) fand 3 Blocker (CR-01, WR-01, WR-02) und Score 4/6.
Die Gap-Pläne 10-05 bis 10-09 wurden vollständig ausgeführt. Das 10-REVIEW.md (2026-06-11T16:30:00Z) verifiziert CR-01, WR-01/02/03/04/05/06/07 als RESOLVED. Verbleibende aktive Findings: 0 Critical, 3 Warnings (WR-08/09/10), 9 Info.

| Vorheriger Gap | Status |
|---|---|
| CR-01 Rules-of-Hooks in [slug].tsx | RESOLVED — Guard steht nach allen Hooks (Z.129) |
| WR-01 beetToPolygon top-left statt center | RESOLVED — halfW/halfH-Fallback implementiert |
| WR-02 Fruchtfolge plan-global statt beet-scoped | RESOLVED — findPflanzenInBeet in Loop |

---

## Goal Achievement

### Observable Truths (aus ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Wochen-View zeigt aktuelle KW-Aktionen (aussäen/pflanzen/ernten) pro Pflanze + Methode | VERIFIED | KalenderWochenCard implementiert mit FARBEN-Map; wochenAktionen via filterAktiveAktionen(fenster, aktuelleKw); 684/684 Tests grün. HINWEIS: Ernte für Feldsalat+Grünkohl unsichtbar (WR-08). |
| 2 | Jahres-Gantt pro Pflanze (12 Monate, 4 farbige Phasen) | VERIFIED mit Einschränkung | GanttStreifen.tsx: FARBEN-Hex korrekt (#A78BFA/#34D399/#60A5FA/#FB923C); WR-04-Guard für negative Balken aktiv. WR-08: Ernte-Balken für Feldsalat/Grünkohl fehlt (DOY 280→90 erzeugt startKw=41 > endKw=14 — Pinning greift nicht). |
| 3 | Klimazonen-Anpassung (Zone 1 vs 7 unterschiedliche Wochen) | VERIFIED | LAST_FROST_DOY-Tabelle Zone 1-7; zoneOffset() Security Guard; Test "Zone 1 Fenster beginnen ≥4 KW früher als Zone 7" grün. |
| 4 | Filter "Nur meine Pflanzen" | VERIFIED | WR-05 gefixt: useKalenderData({ nurMeinePflanzen }) in index.tsx:45; userToggled-Ref verhindert Override; screen-seitige Doppelfilterung entfernt; KalenderScreen.test.tsx 4 Tests grün. |
| 5 | Frost-Daten statisch pro Klimazone | VERIFIED | LAST_FROST_DOY: {1:66, 2:76, 3:86, 4:96, 5:106, 6:116, 7:126} in kalenderEngine.ts:22-24. |
| 6 | Klick auf Pflanze → Detail-View mit Gantt + Phase-8-Infos + "Auf welchem Beet?" | VERIFIED | CR-01 gefixt: Guard nach allen Hooks in [slug].tsx:129. WR-01+WR-02 gefixt: center-Konvention + beet-scoped Fruchtfolge. WR-06 gefixt: Pflanze landet IN Beet (targetBeet.xM/yM + parentBedId). Not-found-Test + Anderes-Beet-Test grün. |

**Score:** 6/6 Truths verified (5 vollständig VERIFIED; Truth 2 VERIFIED mit WR-08-Einschränkung auf 2/90 Pflanzen)

### Deferred Items

Keine. WR-08 ist ein aktiver Defekt (nicht deferred), aber scope-begrenzt auf 2 von ~90 Pflanzen.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/lib/kalenderEngine.ts` | Pure DOY-KW engine, 5 Exports | VERIFIED | 159 Zeilen; alle 5 Funktionen exportiert; WR-03/04-Fix implementiert; WR-08-Lücke dokumentiert |
| `packages/shared/src/i18n/de.json` | kalender.* Schlüsselbaum inkl. nichtGefunden, hinzufuegenFehler | VERIFIED | kalender.nichtGefunden + kalender.hinzufuegenFehler vorhanden (Plan 10-07); UTF-8 Umlaute literal |
| `packages/shared/src/index.ts` | `export * from './lib/kalenderEngine'` | VERIFIED | Zeile 8 bestätigt |
| `app/src/hooks/useKalenderData.ts` | Hook mit cancelled-Flag, In-Bed-Placement, explizitem mode-Guard | VERIFIED | WR-07: cancelled-Flag Z.89 + Reset Z.93-97; WR-06: targetBeet.xM/yM + parentBedId Z.189-209; IN-04: mode!=='account'-Guard Z.180 |
| `app/src/lib/kalenderBeete.ts` | beetToPolygon center±half + findPflanzenInBeet export | VERIFIED | WR-01: halfW/halfH Z.37-44; findPflanzenInBeet exportiert Z.110-122; getPlantSlug + findBeeteForPlant unverändert korrekt |
| `app/src/components/kalender/GanttStreifen.tsx` | 12-month Gantt mit WR-04-Guard | VERIFIED | clampedEnd < clampedStart → return null Z.52; FARBEN exportiert; TOTAL_KW=52 |
| `app/src/components/kalender/GanttLegende.tsx` | Farb-Legende 4 Typen | VERIFIED | kalender.legende.* i18n-Keys, Farbpunkte + Labels |
| `app/src/components/kalender/KalenderWochenCard.tsx` | Diese-Woche-Card mit Badges | VERIFIED | Badge per Aktionstyp mit FARBEN[fenster.typ] + kalender.legende-Key |
| `app/src/components/kalender/PflanzenKalenderZeile.tsx` | Jahresübersicht-Zeile | VERIFIED | min-h-[44px], Miniatur-GanttStreifen height=8 |
| `app/app/(app)/kalender/index.tsx` | Wochen-View Route mit Chip-Durchreichung | VERIFIED | useKalenderData({ nurMeinePflanzen }) Z.45; userToggled-Ref Z.35; filteredAktionen-Doppelfilterung entfernt |
| `app/app/(app)/kalender/[slug].tsx` | Pflanzen-Detail Route, crash-frei, beet-scoped | VERIFIED | CR-01: Guard Z.129 nach allen Hooks; WR-02: findPflanzenInBeet Z.81; WR-06: addPlantToPlan via Hook |
| `app/src/components/kalender/FruchtfolgeWarnung.tsx` | Thin InlineBanner wrapper | VERIFIED | variant=warning, testID=fruchtfolge-warnung |
| `app/src/components/kalender/__tests__/KalenderScreen.test.tsx` | Chip-OFF-Test + kein-Override-Test | VERIFIED | Neu erstellt durch Plan 10-09; 4 Tests grün |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/shared/src/index.ts` | `kalenderEngine.ts` | `export * from './lib/kalenderEngine'` | WIRED | Z.8 bestätigt |
| `app/src/hooks/useKalenderData.ts` | `@spatenstich/shared` | `getFensterFuerPflanze, filterAktiveAktionen, getAktuelleKw` | WIRED | Z.24-27 |
| `app/src/hooks/useKalenderData.ts` | `gardenPlanRepo` | `loadAcceptedElements + writePlanElement` | WIRED | Z.19-21 |
| `app/src/lib/kalenderBeete.ts` | `geometry/bedLayout` | `pointInPolygon` (center±half Konvention) | WIRED | Z.8; beetToPolygon korrekt |
| `app/app/(app)/kalender/index.tsx` | `useKalenderData` | `useKalenderData({ nurMeinePflanzen })` | WIRED | Z.45 — WR-05 gefixt |
| `app/src/components/kalender/GanttStreifen.tsx` | `@spatenstich/shared` | `getFensterFuerPflanze` | WIRED | Z.8 |
| `app/app/(app)/kalender/[slug].tsx` | `useKalenderData` | `addPlantToPlan + elements + loading` | WIRED | Hook-Reihenfolge stabil (CR-01 gefixt) |
| `app/app/(app)/kalender/[slug].tsx` | `kalenderBeete` | `findBeeteForPlant + findPflanzenInBeet + getPlantSlug` | WIRED | Z.15; beet-scoped Fruchtfolge (WR-02 gefixt) |
| `app/app/(app)/kalender/[slug].tsx` | `@spatenstich/shared` | `pruefeEinfacheFruchtfolge` | WIRED | Z.16; kein toter Import mehr (IN-01 gefixt) |
| `app/app/(app)/index.tsx` | `/(app)/kalender` | `router.push` + `testID=home-kalender-button` | WIRED | Beide Branches bestätigt |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `kalender/index.tsx` | `wochenAktionen` | `useKalenderData({ nurMeinePflanzen })` → `getFensterFuerPflanze` → `filterAktiveAktionen(fenster, aktuelleKw)` | Ja — loadAcceptedElements liest gardenPlanRepo | FLOWING (WR-08: Ernte Feldsalat/Grünkohl fehlt) |
| `kalender/index.tsx` | `filteredPlants` | `usePlants()` → JSON-Bundle → TanStack Query | Ja — Bundle initialData + Supabase Refetch | FLOWING |
| `kalender/[slug].tsx` | `meineBeete` | `findBeeteForPlant(elements, slug)` — center±half Konvention | Ja für Bbox-Beete; WR-10: konkave Freihand-Polygone ggf. fehlerhaft | FLOWING (mit WR-10-Einschränkung) |
| `kalender/[slug].tsx` | `fruchtfolgeGrund` | `findPflanzenInBeet(elements, beet)` → `pruefeEinfacheFruchtfolge` | Ja — beet-scoped seit WR-02-Fix | FLOWING |
| `GanttStreifen.tsx` | `fenster` | `getFensterFuerPflanze(plant, klimazone)` | Ja für 88/90 Pflanzen; WR-08: Ernte Feldsalat/Grünkohl fehlt | FLOWING mit Einschränkung |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| kalenderEngine Tests (WR-03/04 Regression) | `pnpm --filter @spatenstich/shared exec jest kalenderEngine` | 19/19 passed | PASS |
| i18n Tests (nichtGefunden, hinzufuegenFehler) | `pnpm --filter @spatenstich/shared exec jest i18n.kalender` | 7/7 passed | PASS |
| kalenderBeete Tests (center-Konvention, findPflanzenInBeet) | `pnpm --filter app exec jest --testPathPattern="kalenderBeete"` | alle passed | PASS |
| PflanzenDetail Tests (CR-01 Not-found, WR-02 Anderes-Beet) | `pnpm --filter app exec jest --testPathPattern="PflanzenDetail"` | alle passed | PASS |
| KalenderScreen Tests (WR-05 Chip-OFF, kein-Override) | `pnpm --filter app exec jest --testPathPattern="KalenderScreen"` | 4/4 passed | PASS |
| useKalenderData Tests (WR-06 In-Bed, WR-07 Reset) | `pnpm --filter app exec jest --testPathPattern="useKalenderData"` | alle passed | PASS |
| Gesamt-Suite | `pnpm --filter app exec jest` | 684/684 passed | PASS |
| TypeScript (app) | `pnpm --filter app exec tsc --noEmit` | exit 0 | PASS |
| WR-08 Replication | `node -e "doyToIsoKw(280)=41, doyToIsoKw(90)=14 → invertiert; Pinning s<=7: false, e>=359: false"` | startKw=41 > endKw=14, keine Korrektur | CONFIRMED DEFECT |

---

## Probe Execution

Step 7c: SKIPPED — keine probe-*.sh Dateien für Phase 10 deklariert.

---

## Requirements Coverage

| Requirement | Source Plan | Beschreibung | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| CAL-01 | 10-01, 10-03, 10-09 | Zeitachse (12 Monate, scrollbar) mit Aufgaben-Karten pro Sorte | SATISFIED | GanttStreifen + KalenderWochenCard + PflanzenKalenderZeile implementiert und getestet. WR-08-Einschränkung auf 2/90 Pflanzen. |
| CAL-02 | 10-01, 10-05 | Klimazonenspezifische Aufgaben-Daten | SATISFIED | LAST_FROST_DOY-Tabelle Zone 1-7; WR-03-Fix (getAktuelleKw UTC-Arithmetik); Zone-1-vs-7-Test grün |
| CAL-03 | 10-01, 10-03 | Unterscheidung: Vorkultur, Direktsaat, Auspflanzen, Ernte | SATISFIED | FARBEN-Map mit 4 Hex-Werten; Badge-Label via kalender.legende.*; Tests grün |
| CAL-04 | 10-02, 10-06, 10-08 | Platzierungsvorschlag auf Plan (freie Fläche + Standort) | SATISFIED | WR-01-Fix: beetToPolygon center±half; WR-06-Fix: addPlantToPlan In-Bed (targetBeet.xM/yM + parentBedId); findBeeteForPlant korrekt für Bbox-Beete. WR-10: konkave Freihand-Polygone ggf. fehlerhaft (Info-Finding). |
| CAL-05 | 10-02, 10-04, 10-08 | Bestätigung → Pflanze im Plan + Kalender-Aufgabe aktiv | SATISFIED | addPlantToPlan mit In-Bed-Placement (WR-06); mode!=='account'-Guard (IN-04); Erfolgs-Banner via t(); In-Bed-Test grün |
| CAL-06 | 10-01, 10-04, 10-06, 10-07 | Einfache Fruchtfolge-Warnung | SATISFIED | WR-02-Fix: findPflanzenInBeet in fruchtfolgeGrund-Loop; "Anderes-Beet keine Warnung"-Test grün. WR-09: bei unplatzierter Pflanze werden alle Beete geprüft (Info-level). |

Alle 6 Phase-10-Requirements (CAL-01..CAL-06) sind in REQUIREMENTS.md als `[x] Complete` markiert und durch codebasierte Evidence abgedeckt.

---

## Anti-Patterns Found

| File | Zeile | Pattern | Severity | Impact |
|------|-------|---------|----------|--------|
| `packages/shared/src/lib/kalenderEngine.ts` | 96-99 | WR-04-Pinning deckt echte Daten-Wrap-Fenster nicht ab | WARNING | Ernte Feldsalat+Grünkohl ganzjährig unsichtbar in WochenCard + Gantt (2/90 Pflanzen) |
| `app/app/(app)/kalender/[slug].tsx` | 74-76 | WR-09: targetBeete = alle Beete bei unplatzierter Pflanze; CTA platziert ins erste | WARNING | Mögliche falsch-positive Fruchtfolge-Warnung bei mehreren Beeten |
| `app/src/lib/kalenderBeete.ts` | 61-97 | WR-10: findBeeteForPlant ignoriert parentBedId-Hint; konkave Freihand-Polygone → PiP fehlschlägt | WARNING | "Noch nicht im Plan" trotz erfolgreicher Platzierung bei L-Form-Beeten |
| `app/src/components/kalender/KalenderWochenCard.tsx` | 74-76 | IN-02 (Rest): hartkodierter Hinweis-String statt de.json-Key | INFO | i18n-Konvention (NFR-06) verletzt; kein funktionaler Defekt |
| `app/jest.config.ts` | 15, 42, 59 | IN-03: uneinheitlich escapete Transform-Regex `'^.+\.tsx?$'` | INFO | Copy-Paste-Drift-Risiko; Tests funktional korrekt |
| `app/app/(app)/kalender/index.tsx` | 27 | IN-05: usePlants().isLoading nicht konsumiert; Loading-Guard nur an useKalenderData.loading | INFO | Leere Jahresübersicht während Pflanzen-Cold-Start |
| `app/src/components/kalender/GanttStreifen.tsx` | 47-52 | IN-06: clampedStart nicht auf KW 53 geclampt; reines KW-53-Fenster wird unsichtbar | INFO | Seltener Rand-Fall (Spät-Dezember 53-KW-Jahr) |
| `app/src/hooks/useKalenderData.ts` | 110-114 | IN-07: Fehlerpfad bei Gartenwechsel lässt Cross-Garden-Daten stehen | INFO | Stale Daten nach Ladefehler beim Wechsel |
| `app/src/hooks/__tests__/useKalenderData.test.ts` | 64-69 | IN-08: Toter Mock nextFreeBedSlot nach WR-06-Fix | INFO | Suggeriert nicht-existierende Abhängigkeit |
| `packages/shared/src/i18n/de.json` | 402 | IN-09: Ungenutzter Key kalender.ohneKalenderDaten | INFO | Kein aktiver Konsument |
| `app/app/(app)/index.tsx` | 38-57 | IN-10: Plan-Load-Effekt ohne cancelled-Flag (inkonsistent) | INFO | Potenzielle stale-State-Race |
| `app/app/(app)/kalender/[slug].tsx` | 120-122 | IN-11: bare catch verwirft Fehlercode; local-Mode → immer "Versuche es erneut" | INFO | Irreführende Fehlermeldung im lokalen Modus |

---

## Human Verification Required

Alle 8 UAT-Schritte aus 10-HUMAN-VERIFY.md sind weiterhin PENDING (Checkpoint wurde im --auto-Chain auto-genehmigt; keine echte Geräteverifikation durchgeführt). Die Schritte sind unverändert gültig, aber die ACHTUNG-Hinweise aus der ersten Verifikation müssen aktualisiert werden: WR-05 (Filter-Chip) ist GEFIXT; WR-06 (außerhalb Beet) ist GEFIXT; WR-02 (Fruchtfolge plan-global) ist GEFIXT.

### 1. App-Start + Home-Kalender-Button

**Test:** App starten (Account-Modus, Garten mit Beet + Pflanze), "Zum Kalender" tippen (testID: home-kalender-button)
**Expected:** Wochen-View öffnet mit Header "Aussaatkalender" und "KW {n} · 2026"
**Why human:** Router-Navigation und visuelles Rendering nicht per Grep prüfbar

### 2. CAL-03 farbige Aktions-Badges (Diese Woche)

**Test:** "Diese Woche"-Karte im Wochen-View prüfen
**Expected:** Vorkultur violett, Direktsaat grün, Auspflanzen blau, Ernte orange; korrekte deutsche Labels
**Why human:** Farbkorrektur und Badge-Rendering visuell zu prüfen

### 3. CAL-04 Filter-Chip "Nur meine Pflanzen"

**Test:** Filter-Chip ein/ausschalten; WochenCard und Jahresübersicht prüfen
**Expected:** Aktiv = grüner Hintergrund (#4A7C59); inaktiv = Outline; BEIDE (WochenCard + Jahresübersicht) filtern konsistent — WR-05 ist gefixt
**Why human:** Visuelle Darstellung und Interaktions-Kontrakt nur auf Gerät prüfbar

### 4. CAL-01 + CAL-02 Pflanzen-Detail Gantt + Legende

**Test:** Pflanzzeile tippen → Detail-Screen; 12-Monats-Gantt + Monatsbeschriftungen + Legende prüfen
**Expected:** Volle Breite, phasenfarbige Balken, Jan…Dez, 4-Farben-Legende. HINWEIS WR-08: Feldsalat und Grünkohl zeigen keinen Ernte-Balken
**Why human:** Gantt-Proportionen und visuelles Layout nur auf Gerät prüfbar

### 5. CAL-02 Klimazonen-Verschiebung

**Test:** PLZ auf Zone 1 und Zone 7 wechseln; Tomate-Detail-Gantt vergleichen
**Expected:** Phasen-Balken verschieben sich sichtbar um 1-4 Kalenderwochen
**Why human:** Visueller Vergleich zweier Klimazonen

### 6. CAL-05 "Auf welchem Beet?" + "Zu Plan hinzufügen" CTA

**Test:** Im Pflanzen-Detail den Abschnitt "Auf welchem Beet?" prüfen und "Zu Plan hinzufügen" tippen
**Expected:** Platzierte Pflanzen zeigen Beet-Namen; CTA → Erfolgs-Banner; Pflanze im Plan-Editor sichtbar. WR-06 ist gefixt — Pflanze landet IN einem Beet
**Why human:** Add-Round-Trip mit echten SQLite-Daten nicht per Test abdeckbar

### 7. CAL-06 Fruchtfolge-Warnung

**Test:** Zwei Solanaceae-Pflanzen im GLEICHEN Beet; dritte Solanaceae-Detail öffnen
**Expected:** fruchtfolge-warnung Banner erscheint. Gleiche Familie in ANDEREM Beet löst KEINE Warnung — WR-02 ist gefixt
**Why human:** Interaktion mit echten Pflanzendaten; Beet-Scope nur mit realen Daten verifizierbar

### 8. UTF-8-Umlaute

**Test:** Alle Kalender-Screens durchgehen
**Expected:** ä/ö/ü/ß korrekt; keine ae/oe/ue oder Fragezeichen
**Why human:** Font-Rendering und Encoding nur auf Gerät/Browser sichtbar

---

## Gaps Summary

### Technische Lage

**Alle 3 ursprünglichen Blocker sind geschlossen.** Build ist grün (684/684 Tests, tsc clean). Die Phase hat ihre Kern-Infrastruktur (Engine, i18n, Tests) und alle UI-Komponenten korrekt implementiert.

**WR-08 (aktive Warning):** Das WR-04-Fix (Plan 10-05) repariert ISO-Wochen-Wrap-Artefakte aus `doyToIsoKw` an Jahresgrenzen, aber übersieht Pflanzen mit **echten** jahresüberspannenden Erntefenstern per Daten. Feldsalat (`harvestDoy 280→90`) und Grünkohl (`280→60`) erzeugen nach Clamping `s=280, e=90` — keine der beiden Pinning-Bedingungen (`s<=7`, `e>=359`) feuert. Das Fenster wird mit `startKw≈40 > endKw≈14` gepusht und ist damit in WochenCard (filterAktiveAktionen) und Gantt (GanttStreifen-Guard) ganzjährig unsichtbar. Das betrifft 2 von ~90 Pflanzen, aber exakt in den Monaten (Okt–März), für die diese Kulturen relevant sind. Fixkosten sind gering (rekursives Splitting statt Pinning in `addWindow`).

**WR-09 (aktive Warning):** Der unplatzierte-Pflanze-Pfad prüft alle Beete auf Fruchtfolge, aber `addPlantToPlan` platziert deterministisch ins erste Beet. Mögliche falsch-positive Warnung in Multi-Beet-Szenarien.

**WR-10 (aktive Warning):** `findBeeteForPlant` konsumiert `parentBedId` nicht. Bei konkaven Freihand-Polygonen liegt der Beet-Center außerhalb des Polygons → "Noch nicht im Plan" trotz Platzierung.

**Alle 8 manuellen UAT-Schritte sind PENDING.** Die vorherigen ACHTUNG-Hinweise für WR-05/06/02 sind nicht mehr aktuell — diese Defekte sind gefixt.

---

_Verified: 2026-06-11T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification after gap closure: Plans 10-05..10-09_
