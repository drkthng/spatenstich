---
phase: 10-aussaatkalender-v1
verified: 2026-06-11T13:00:00Z
status: gaps_found
score: 4/6 must-haves verified
overrides_applied: 0
gaps:
  - truth: "The detail route /(app)/kalender/[slug] shows the full-width GanttStreifen + month labels + GanttLegende for the resolved plant (CR-01 crash)"
    status: failed
    reason: "Rules-of-Hooks violation: three hooks (fruchtfolgeGrund useMemo line 75, meineBeete useMemo line 121, handleAddToPlan useCallback line 127) are declared AFTER an early return at lines 59-68. When loading flips false and slug is not found, React renders fewer hooks than expected and crashes the screen. The useState calls (lines 54-56) run before the guard but the other three hooks do not. PflanzenDetail.test.tsx never tests the not-found path so this is undetected by the test suite."
    artifacts:
      - path: "app/app/(app)/kalender/[slug].tsx"
        issue: "useMemo/useCallback hooks at lines 75, 121, 127 placed after early return guard at lines 59-68. Fix: move the guard below all hook declarations."
    missing:
      - "Move the 'if (!loading && !plant) return ...' guard to after all useMemo/useCallback/useCallback calls"
      - "Add a not-found test case to PflanzenDetail.test.tsx that renders with an unknown slug after loading=false"
  - truth: "The 'Auf welchem Beet?' section lists beds returned by findBeeteForPlant, or a 'Noch nicht im Plan' hint (WR-01: coordinate convention wrong)"
    status: failed
    reason: "kalenderBeete.ts beetToPolygon fallback uses xM/yM as top-left corner (lines 35-41) but the codebase convention is xM/yM = bbox CENTER (documented in bedLayout.ts:3, implemented in useCompanionDetection.ts:63-71 as xM ± widthM/2). For every Claude.ai-imported bed (which has no polygonPointsM and hits this fallback), the reconstructed polygon is shifted by (+w/2, +h/2), so PiP tests return wrong results. 'Auf welchem Beet?' and CAL-06 Fruchtfolge bed-scoping both silently return incorrect data for imported beds."
    artifacts:
      - path: "app/src/lib/kalenderBeete.ts"
        issue: "beetToPolygon (lines 26-42) builds rectangle from top-left (xM, yM) instead of center (xM ± widthM/2). Comment on line 24 says 'built from center ± half-dimensions' but code contradicts it."
    missing:
      - "Fix beetToPolygon to use: { x: beet.xM - halfW, y: beet.yM - halfH }, ... (mirror useCompanionDetection.ts getBedPolygon)"
      - "Update kalenderBeete.test.ts fixtures to use center-based coordinates"
  - truth: "A Fruchtfolge warning (CAL-06) appears when a same-family plant already sits in the target/any bed (pruefeEinfacheFruchtfolge) (WR-02: not bed-scoped)"
    status: failed
    reason: "In [slug].tsx lines 89-97, the inner filter 'otherPflanzenInBeet' iterates all Pflanze elements across the entire plan — the loop variable 'beet' is never referenced inside the filter. The comment says 'Get all other Pflanze elements in this bed' but no PiP test is performed per bed. Result: CAL-06 fires when any same-family plant exists anywhere in the plan, not specifically in the target bed. This contradicts the spec ('same-family plant already occupies the target bed'). PflanzenDetail.test.tsx mocks pruefeEinfacheFruchtfolge and cannot catch this."
    artifacts:
      - path: "app/app/(app)/kalender/[slug].tsx"
        issue: "otherPflanzenInBeet filter (lines 91-97) ignores the 'beet' loop variable — all-plan filter instead of per-bed filter"
    missing:
      - "Scope plants to each bed using findPflanzenInBeet helper (export from kalenderBeete.ts) that applies PiP per bed"
      - "Add a test to PflanzenDetail.test.tsx asserting that same-family plant in a DIFFERENT bed does NOT trigger the warning"
human_verification:
  - test: "Home-Screen Kalender-Einstieg: 'Zum Kalender'-Button (home-kalender-button) öffnet Wochen-View mit Header 'Aussaatkalender' und KW-Label"
    expected: "Wochen-View öffnet mit korrektem Header und aktueller Kalenderwoche"
    why_human: "Router-Navigation und visuelles Rendering nur auf echtem Gerät / Web verifizierbar"
  - test: "CAL-03 farbige Aktions-Badges in 'Diese Woche'-Karte: Vorkultur violett, Direktsaat grün, Auspflanzen blau, Ernte orange"
    expected: "Korrekte Farben und deutsche Labels für alle 4 Aktionstypen"
    why_human: "Farbkorrektur und Badge-Rendering visuell zu prüfen"
  - test: "CAL-04 Filter-Chip 'Nur meine Pflanzen': aktiv = grüner Hintergrund (#4A7C59), inaktiv = Outline; Jahresübersicht filtert korrekt"
    expected: "Filter wirkt auf Jahresübersicht-Liste. ACHTUNG WR-05: KalenderWochenCard wird vom Chip NICHT beeinflusst (bekannter Defekt)"
    why_human: "Interaktions-Kontrakt und Filter-Verhalten nur auf Gerät prüfbar"
  - test: "CAL-01 + CAL-02 Pflanzen-Detail: 12-Monats-Gantt mit Monatsbeschriftungen Jan-Dez + 4-Farben-Legende"
    expected: "Volle Breite, korrekte Phasen-Balken, Monatsbezeichnungen, Legende sichtbar"
    why_human: "Gantt-Rendering und proportionale Balkenbreiten nur visuell prüfbar"
  - test: "CAL-02 Klimazonen-Verschiebung: Wechsel von Zone 1 auf Zone 7 verschiebt Gantt-Balken um 4+ KW"
    expected: "Sichtbare Verschiebung der Phasen-Balken bei Klimazonen-Wechsel"
    why_human: "Visueller Vergleich zweier Klimazonen-Einstellungen; WR-03 (Math.ceil off-by-one) kann Sonntags ein Fehler pro KW verursachen"
  - test: "CAL-05 'Zu Plan hinzufügen': CTA erscheint wenn Beet vorhanden; Tipp → Erfolgs-Banner '{name} wurde dem Plan hinzugefügt'"
    expected: "Pflanze wird hinzugefügt; ACHTUNG WR-06: Pflanze landet AUSSERHALB jedes Beets (nextFreeBedSlot-Bug) — 'Auf welchem Beet?' zeigt danach 'Noch nicht im Plan'"
    why_human: "Add-Round-Trip und Erfolgs-Banner nur auf Gerät mit echten Daten prüfbar"
  - test: "CAL-06 Fruchtfolge-Warnung: Zwei Solanaceae-Pflanzen im Plan → dritte Solanaceae-Detail zeigt fruchtfolge-warnung Banner"
    expected: "Banner erscheint; ACHTUNG WR-02: Warnung feuert bei gleicher Familie IRGENDWO im Plan, nicht nur im Zielbeet"
    why_human: "Interaktion mit echten Pflanzendaten und Beet-Layout prüfbar"
  - test: "UTF-8-Umlaute: ä/ö/ü/ß korrekt in allen Kalender-Screens (Jahresübersicht, hinzugefügt, öffnen, Auf welchem Beet?)"
    expected: "Keine Fragezeichen, Kästchen oder ae/oe/ue-Ersetzungen"
    why_human: "Font-Rendering und Encoding nur auf echtem Gerät/Browser sichtbar"
---

# Phase 10: Aussaatkalender v1 — Verification Report

**Phase Goal:** "Was sollte ich diese Woche im Garten tun?" — eine Wochen-Ubersicht + Gantt-Detail pro Pflanze, gefiltert nach Klimazone und den Pflanzen in deinem Plan.
**Verified:** 2026-06-11T13:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (aus ROADMAP Success Criteria + PLAN must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Wochen-View zeigt aktuelle KW-Aktionen (aussaen/pflanzen/ernten) mit Pflanze + Methode | UNCERTAIN | Screen existiert, KalenderWochenCard implementiert; WR-03 (Math.ceil off-by-one) kann Sonntags falsche KW liefern; WR-05 (Filter-Chip ohne Wirkung auf WochenCard) schrankt Nutzbarkeit ein. Kern-Anzeige vorhanden aber defekt-gefahrdet. |
| 2 | Jahres-Gantt pro Pflanze (12 Monate, 4 farbige Phasen) | VERIFIED | GanttStreifen.tsx implementiert, FARBEN-Hex korrekt (#A78BFA/#34D399/#60A5FA/#FB923C), 4 Tests grün (GanttStreifen.test.tsx). |
| 3 | Klimazonen-Anpassung (Zone 1 vs 7 unterschiedliche Wochen) | VERIFIED | kalenderEngine.ts: LAST_FROST_DOY-Tabelle Zone 1-7, zoneOffset() Security Guard implementiert. Test "Zone 1 Fenster beginnen mindestens 4 KW fruher als Zone 7" grun. |
| 4 | Filter "Nur meine Pflanzen" | UNCERTAIN | Filter-Chip in kalender/index.tsx mit accessibilityRole=checkbox und bg-[#4A7C59] implementiert. WR-05: Chip-State wird nicht an useKalenderData() ubergeben — KalenderWochenCard zeigt immer gefilterte Aktionen. Jahresubersicht filtert korrekt via screen-side filteredPlants. |
| 5 | Frost-Daten statisch pro Klimazone | VERIFIED | LAST_FROST_DOY: Record<number,number> = {1:66, 2:76, 3:86, 4:96, 5:106, 6:116, 7:126} in kalenderEngine.ts. Keine dynamische API. Korrekt implementiert. |
| 6 | Klick auf Pflanze -> Detail-View mit Gantt + Phase-8-Infos + "Auf welchem Beet?" | FAILED | CR-01: Rules-of-Hooks-Verletzung in [slug].tsx — 3 Hooks (useMemo/useCallback Zeilen 75, 121, 127) stehen NACH dem Early-Return-Guard (Zeilen 59-68). Crash wenn loading=false und slug nicht gefunden. |

**Score:** 4/6 Truths verified (Truths 2, 3, 5 VERIFIED; Truths 1, 4 UNCERTAIN; Truth 6 FAILED)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/lib/kalenderEngine.ts` | Pure DOY-KW engine, 5 Exports | VERIFIED | 145 Zeilen, alle 5 Funktionen exportiert, kein React/RN-Import, zoneOffset Guard vorhanden |
| `packages/shared/src/i18n/de.json` | kalender.* Schlusselbaum | VERIFIED | kalender-Objekt mit legende.* und detail.* vorhanden, UTF-8 Umlaute korrekt |
| `packages/shared/src/index.ts` | `export * from './lib/kalenderEngine'` | VERIFIED | Zeile 8: `export * from './lib/kalenderEngine';` |
| `app/src/hooks/useKalenderData.ts` | Hook: wochenAktionen, meinePflanzenslugs, aktuelleKw, addPlantToPlan, refresh | VERIFIED | Alle Felder exportiert, loadAcceptedElements-Pfad (nicht editorStore) |
| `app/src/lib/kalenderBeete.ts` | findBeeteForPlant, getPlantSlug | STUB | Exists + exported, aber beetToPolygon-Fallback verwendet falsche Koordinaten-Konvention (top-left statt center) — WR-01 |
| `app/src/components/kalender/GanttStreifen.tsx` | 12-month View-bar Gantt | VERIFIED | FARBEN exported, getFensterFuerPflanze aus @spatenstich/shared, testID=gantt-bar |
| `app/src/components/kalender/GanttLegende.tsx` | Farb-Legende 4 Typen | VERIFIED | kalender.legende.* i18n-Keys, Farbpunkte + Labels |
| `app/src/components/kalender/KalenderWochenCard.tsx` | Diese-Woche-Card mit Badges | VERIFIED | Badge per Aktionstyp mit FARBEN[fenster.typ] + kalender.legende-Key (CAL-03) |
| `app/src/components/kalender/PflanzenKalenderZeile.tsx` | Jahresubersicht-Zeile | VERIFIED | min-h-[44px], Miniatur-GanttStreifen height=8 |
| `app/app/(app)/kalender/index.tsx` | Wochen-View Route | VERIFIED | Default-Export, useKalenderData, Filter-Chip, KalenderWochenCard, PflanzenKalenderZeile |
| `app/app/(app)/kalender/[slug].tsx` | Pflanzen-Detail Route | FAILED | CR-01: Rules-of-Hooks; WR-02: Fruchtfolge nicht Beet-scoped |
| `app/src/components/kalender/FruchtfolgeWarnung.tsx` | Thin InlineBanner wrapper | VERIFIED | variant=warning, testID=fruchtfolge-warnung exportiert |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/shared/src/index.ts` | `kalenderEngine.ts` | `export * from './lib/kalenderEngine'` | WIRED | Zeile 8 bestätigt |
| `app/src/hooks/useKalenderData.ts` | `@spatenstich/shared` | `getFensterFuerPflanze, filterAktiveAktionen, getAktuelleKw` | WIRED | Zeile 22-26 |
| `app/src/hooks/useKalenderData.ts` | `gardenPlanRepo` | `loadAcceptedElements + writePlanElement` | WIRED | Zeilen 17-19 |
| `app/src/lib/kalenderBeete.ts` | `geometry/bedLayout` | `pointInPolygon` | WIRED (mit WR-01) | Import vorhanden, aber Koordinatenberechnung fehlerhaft |
| `app/app/(app)/kalender/index.tsx` | `useKalenderData` | `useKalenderData()` | PARTIAL (WR-05) | Aufruf ohne nurMeinePflanzen-Option — Chip-State nicht an Hook weitergegeben |
| `app/src/components/kalender/GanttStreifen.tsx` | `@spatenstich/shared` | `getFensterFuerPflanze` | WIRED | Zeile 8 |
| `app/app/(app)/kalender/[slug].tsx` | `useKalenderData` | `addPlantToPlan + elements` | WIRED (mit CR-01) | Import korrekt, aber Hook-Reihenfolge verletzt |
| `app/app/(app)/kalender/[slug].tsx` | `kalenderBeete` | `findBeeteForPlant` | WIRED (mit WR-01+WR-02) | Import korrekt, Logik fehlerhaft |
| `app/app/(app)/kalender/[slug].tsx` | `@spatenstich/shared` | `pruefeEinfacheFruchtfolge` | WIRED (mit WR-02) | Import vorhanden, Beet-Scoping fehlt |
| `app/app/(app)/index.tsx` | `/(app)/kalender` | `router.push` + `testID=home-kalender-button` | WIRED | 2 Treffer (beide Branches) bestatigt |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `kalender/index.tsx` | `wochenAktionen` | `useKalenderData` → `loadAcceptedElements` → `getFensterFuerPflanze` → `filterAktiveAktionen` | Ja (loadAcceptedElements liest gardenPlanRepo) | FLOWING (mit WR-03/WR-05 Defekten) |
| `kalender/index.tsx` | `filteredPlants` | `usePlants()` → JSON-Bundle → TanStack Query | Ja (Bundle initialData, Supabase Refetch) | FLOWING |
| `kalender/[slug].tsx` | `meineBeete` | `findBeeteForPlant(elements, slug)` | Falsche Koordinaten fur importierte Beete (WR-01) | HOLLOW (wrong coordinate math for fallback path) |
| `GanttStreifen.tsx` | `fenster` | `getFensterFuerPflanze(plant, klimazone)` | Ja (reines DOY-Compute) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| kalenderEngine Tests | `pnpm --filter @spatenstich/shared exec jest kalenderEngine` | 15/15 passed | PASS |
| i18n Tests | `pnpm --filter @spatenstich/shared exec jest i18n.kalender` | 7/7 passed | PASS |
| Hook + Beete Tests | `pnpm --filter app exec jest --testPathPattern="useKalenderData|kalenderBeete"` | 19/19 passed | PASS |
| UI-Komponenten Tests | `pnpm --filter app exec jest --testPathPattern="GanttStreifen|PflanzenDetail"` | 8/8 passed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Beschreibung | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| CAL-01 | Plan 03 | Zeitachse (12 Monate, scrollbar) mit Aufgaben-Karten pro Sorte | UNCERTAIN | GanttStreifen implementiert + getestet; WR-03 (Math.ceil off-by-one) kann Sonntags falsche KW zeigen |
| CAL-02 | Plan 01 | Klimazonenspezifische Aufgaben-Daten | SATISFIED | LAST_FROST_DOY-Tabelle + zoneOffset-Guard; Test "Zone 1 ≥4 KW fruher als Zone 7" grun |
| CAL-03 | Plan 03 | Unterscheidung: Vorkultur, Direktsaat, Auspflanzen, Ernte | SATISFIED | FARBEN-Map mit 4 Hex-Werten, Badge-Label via kalender.legende.*, Test grun |
| CAL-04 | Plan 02, 03 | Platzierungsvorschlag auf Plan (freie Flache + Standort) | BLOCKED | WR-01: beetToPolygon-Fallback falsche Koordinaten → "Auf welchem Beet?" zeigt falsche Ergebnisse fur importierte Beete |
| CAL-05 | Plan 02, 04 | Bestatigung → Pflanze im Plan + Kalender-Aufgabe aktiv | BLOCKED | WR-06: addPlantToPlan platziert via nextFreeBedSlot AUSSERHALB jedes Beets; CR-01: Detail-Screen crasht potentiell |
| CAL-06 | Plan 01, 04 | Einfache Fruchtfolge-Warnung | BLOCKED | WR-02: Warnung ignoriert Beet-Scope, feuert bei gleicher Familie irgendwo im Plan |

### Anti-Patterns Found

| File | Zeile | Pattern | Severity | Impact |
|------|-------|---------|----------|--------|
| `app/app/(app)/kalender/[slug].tsx` | 59-68 vs 75, 121, 127 | Rules-of-Hooks: Hooks nach Early Return | BLOCKER | Crash bei unbekanntem Slug nach Ladeabschluss |
| `app/src/lib/kalenderBeete.ts` | 32-41 | Falsche Koordinaten-Konvention (top-left statt center) | WARNING | "Auf welchem Beet?" liefert Falschergebnisse fur importierte Beete |
| `app/app/(app)/kalender/[slug].tsx` | 89-97 | Beet-Loop ohne Beet-Scoping (toter Loop-Variable) | WARNING | CAL-06 Fruchtfolge-Check plan-global statt beet-spezifisch |
| `packages/shared/src/lib/kalenderEngine.ts` | 107 | `Math.ceil` statt `Math.floor` fur DOY | WARNING | Falsche KW an Sonntagen |
| `app/app/(app)/kalender/index.tsx` | 32, 63-66 | useKalenderData ohne nurMeinePflanzen + screen-side Duplizierung | WARNING | Filter-Chip beeinflusst WochenCard nicht |
| `app/src/hooks/useKalenderData.ts` | 84-101 | useEffect ohne cancelled-Flag | WARNING | Race-Condition bei Gartenwechsel; stale data bei activeGardenId=null |
| `app/src/hooks/useKalenderData.ts` | 184 | `mode!` Non-null-Assertion | INFO | TypeScript-Safety umgangen |
| `app/app/(app)/kalender/[slug].tsx` | 64, 136 | Hardkodierte deutsche UI-Strings (nicht in de.json) | INFO | Verletzt i18n-Konvention |

### Probe Execution

Step 7c: SKIPPED — keine probe-*.sh Dateien fur Phase 10 deklariert.

### Human Verification Required

Alle 8 Schritte aus 10-HUMAN-VERIFY.md sind PENDING (Checkpoint wurde im --auto-Chain auto-genehmigt; keine echte Gerateverifikation durchgefuhrt).

#### 1. Home-Screen Kalender-Einstieg

**Test:** App starten (Account-Modus, Garten mit Beet + Pflanze), "Zum Kalender" tippen (testID: home-kalender-button)
**Expected:** Wochen-View offnet mit Header "Aussaatkalender" und "KW {n} · 2026"
**Why human:** Router-Navigation und visuelles Rendering nicht per Grep prufbar

#### 2. CAL-03 Farbige Aktions-Badges (Diese Woche)

**Test:** "Diese Woche"-Karte prüfen — Vorkultur violett, Direktsaat grun, Auspflanzen blau, Ernte orange
**Expected:** Korrekte Farben und deutsche Labels für alle 4 Aktionstypen
**Why human:** Farbkorrektur und Badge-Rendering visuell zu prufen; WR-03 (Math.ceil) kann Sonntags naechste KW zeigen

#### 3. CAL-04 Filter-Chip "Nur meine Pflanzen"

**Test:** Filter-Chip ein/ausschalten; Jahresubersicht soll filtern
**Expected:** Aktiv = gruner Hintergrund (#4A7C59); inaktiv = Outline; Jahresubersichtliste filtert
**Why human:** WR-05 bedeutet: WochenCard zeigt IMMER gefilterte Aktionen, unabhaengig vom Chip

#### 4. CAL-01 + CAL-02 Pflanzen-Detail Gantt + Legende

**Test:** Pflanzzeile tippen → Detail-Screen; 12-Monats-Gantt + Monatsbeschriftungen + Legende prüfen
**Expected:** Volle Breite, phasenfarbige Balken, Jan…Dez, 4-Farben-Legende, Phase-8-Daten sichtbar
**Why human:** Gantt-Proportionen und visuelles Layout nur auf Gerät pruefbar

#### 5. CAL-02 Klimazonen-Verschiebung

**Test:** PLZ auf Zone 1 und Zone 7 wechseln; Tomate-Detail-Gantt vergleichen
**Expected:** Phasen-Balken verschieben sich sichtbar um 1-4 KW
**Why human:** Visueller Vergleich zweier Klimazonen; WR-03 kann Sonntags Fehler einfuhren

#### 6. CAL-05 "Zu Plan hinzufugen"

**Test:** Pflanzen-Detail öffnen; CTA tippen; Erfolgs-Banner prüfen; Plan-Editor prüfen
**Expected:** Banner "{name} wurde dem Plan hinzugefugt" erscheint; ACHTUNG WR-06: Pflanze landet AUSSERHALB jedes Beets
**Why human:** Add-Round-Trip mit echten Daten und SQLite-Persistenz nicht per Test abdeckbar

#### 7. CAL-06 Fruchtfolge-Warnung

**Test:** Zwei Solanaceae-Pflanzen im Plan; dritte Solanaceae-Detail offnen; fruchtfolge-warnung prufen
**Expected:** Warnung-Banner erscheint; ACHTUNG WR-02: Warnung feuert plan-global (nicht beet-spezifisch)
**Why human:** Interaktion mit echten Pflanzendaten; Beet-Scope-Defekt nur mit realen Daten erkennbar

#### 8. UTF-8-Umlaute

**Test:** Alle Kalender-Screens durchgehen; Jahresubersicht, hinzugefugt, offnen, Auf welchem Beet?
**Expected:** a/o/u/β korrekt; keine ae/oe/ue oder Fragezeichen
**Why human:** Font-Rendering und Encoding-Korrektheit nur auf Gerat/Browser sichtbar

---

## Gaps Summary

Phase 10 liefert die Kern-Infrastruktur (Engine, i18n, Tests) und die meisten UI-Komponenten korrekt. Drei BLOCKER verhindern aber das vollstandige Erreichen des Phasenziels:

**BLOCKER 1 (CR-01 — Rules-of-Hooks in [slug].tsx):** Das Herzstuck des Phasenziels — "Klick auf Pflanze → Detail-View" — crasht bei unbekanntem Slug nach dem Ladeabschluss. React wirft "Rendered fewer hooks than expected" weil 3 Hooks (fruchtfolgeGrund useMemo, meineBeete useMemo, handleAddToPlan useCallback) nach einem Early-Return stehen. Fix ist minimal (Early-Return nach alle Hooks verschieben).

**BLOCKER 2 (WR-01 — Koordinatenkonvention in kalenderBeete.ts):** "Auf welchem Beet?" (CAL-04) und die CAL-06 Fruchtfolge-Beet-Scoping sind korrumpiert fur alle Beete ohne polygonPointsM (also alle Claude.ai-importierten Beete). Der Fallback-Polygon ist um (+w/2, +h/2) verschoben. Fix: center ± half-dimensions wie in useCompanionDetection.ts.

**BLOCKER 3 (WR-02 — Fruchtfolge nicht beet-scoped in [slug].tsx):** CAL-06 pruft die Fruchtfolge plan-global statt pro Zielbeet. Der Loop-Variable 'beet' wird im Filter nie verwendet. Warnung feuert falsch-positiv bei gleicher Familie in anderem Beet.

Hinzukommt: Alle 8 manuellen UAT-Schritte sind PENDING (auto-approved checkpoint, nie auf Gerat durchgefuhrt).

**Gruppenanalyse:** BLOCKER 1+3 haben dieselbe Root-Ursache: [slug].tsx wurde ohne ausreichende Test-Coverage fur die tatsachliche Render-Logik (nicht gemockte Pfade) geschrieben. BLOCKER 2 ist ein Koordinaten-Konventionsfehler der in den Tests durch Top-Left-fixtures maskiert wurde.

---

_Verified: 2026-06-11T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
