---
phase: 10-aussaatkalender-v1
reviewed: 2026-06-11T16:30:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - app/app/(app)/index.tsx
  - app/app/(app)/kalender/[slug].tsx
  - app/app/(app)/kalender/index.tsx
  - app/jest.config.ts
  - app/src/components/kalender/FruchtfolgeWarnung.tsx
  - app/src/components/kalender/GanttLegende.tsx
  - app/src/components/kalender/GanttStreifen.tsx
  - app/src/components/kalender/KalenderWochenCard.tsx
  - app/src/components/kalender/PflanzenKalenderZeile.tsx
  - app/src/components/kalender/__tests__/GanttStreifen.guard.test.tsx
  - app/src/components/kalender/__tests__/GanttStreifen.test.tsx
  - app/src/components/kalender/__tests__/KalenderScreen.test.tsx
  - app/src/components/kalender/__tests__/PflanzenDetail.test.tsx
  - app/src/hooks/__tests__/useKalenderData.test.ts
  - app/src/hooks/useKalenderData.ts
  - app/src/lib/__tests__/kalenderBeete.test.ts
  - app/src/lib/kalenderBeete.ts
  - packages/shared/src/__tests__/i18n.kalender.test.ts
  - packages/shared/src/i18n/de.json
  - packages/shared/src/index.ts
  - packages/shared/src/lib/__tests__/kalenderEngine.test.ts
  - packages/shared/src/lib/kalenderEngine.ts
findings:
  critical: 0
  warning: 3
  info: 9
  total: 12
status: issues_found
---

# Phase 10: Code Review Report (Re-Review nach Gap-Closure 10-05..10-09)

**Reviewed:** 2026-06-11T16:30:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Re-Review nach den Gap-Plänen 10-05 bis 10-09. Jedes Finding des vorherigen Reviews (1 Critical, 7 Warnings, 5 Info) wurde gegen den aktuellen Code verifiziert. Ergebnis: Der Crash (CR-01) und die Kern-Warnings WR-01/02/03/05/06/07 sind nachweislich gefixt und durch neue Tests abgedeckt (Hook-Reihenfolge im Detail-Screen, Center-Konvention in `kalenderBeete.ts`, Beet-Scoping via `findPflanzenInBeet`, injizierbares `now` in `getAktuelleKw`, Chip-Durchreichung mit `userToggled`-Ref, In-Bed-Placement mit `parentBedId`, cancelled-Flag + Null-Reset im Lade-Effekt). IN-01 und IN-04 sind ebenfalls gefixt.

**Aber:** Der WR-04-Fix (ISO-Wochen-Wrap) repariert nur die Jahresgrenzen-Inversion durch die KW-Konvertierung — er übersieht, dass `plants.json` zwei Pflanzen mit **echten** Wrap-around-Erntefenstern enthält (Feldsalat `harvestDoy 280→90`, Grünkohl `280→60`). Deren Erntefenster werden weiterhin invertiert erzeugt und verschwinden vollständig aus WochenCard UND Gantt — ganzjährig (WR-08). Zusätzlich bleiben zwei Inkonsistenzen aus den neuen Fixes: Der CAL-06-Check prüft bei unplatzierten Pflanzen ALLE Beete, obwohl der CTA deterministisch ins erste Beet platziert (WR-09), und `findBeeteForPlant` konsumiert den von WR-06 neu geschriebenen `parentBedId` nicht (WR-10). IN-02 (teilweise), IN-03 und IN-05 sind unverändert offen.

## Re-Review: Verifikation der vorherigen Findings

| ID | Status | Verifikation gegen aktuellen Code |
|---|---|---|
| CR-01 (Rules-of-Hooks-Crash) | **RESOLVED** | `[slug].tsx:127-138` — Guard steht jetzt NACH allen Hooks (useRouter, useLocalSearchParams, usePlants, useKalenderData, 3× useState, 2× useMemo, useCallback). Hook-Anzahl über Renders stabil. Test (f) in `PflanzenDetail.test.tsx:263-283` deckt den Not-found-Pfad ab. |
| WR-01 (Top-Left statt Center) | **RESOLVED** | `kalenderBeete.ts:37-44` baut das Fallback-Rechteck aus `xM/yM ± halbe Dimension`; Pflanzen-Center ist `{x: xM, y: yM}` (`:81-84`, `:119`). Konsistent mit `useCompanionDetection.getBedPolygon`/`findBedForPlant`. Test-Fixtures auf Center-Konvention umgestellt (`kalenderBeete.test.ts:64-68`). |
| WR-02 (CAL-06 nicht Beet-scoped) | **RESOLVED** | `[slug].tsx:81-82` nutzt `findPflanzenInBeet(elements, beet)` — die Loop-Variable wird jetzt verwendet, PiP-Scoping in `kalenderBeete.ts:110-122`. Tests (d)+(e) decken In-Bed vs. Anderes-Beet ab. Verwandte Rest-Inkonsistenz → WR-09 (neu). |
| WR-03 (getAktuelleKw Off-by-one) | **RESOLVED** | `kalenderEngine.ts:118-125` — direkte UTC-ISO-Arithmetik ohne DOY-Umweg, injizierbarer `now`-Parameter. Sonntags-/Montags-Tests (`kalenderEngine.test.ts:157-166`) vorhanden und korrekt (14.06.2026 = So → KW 24). |
| WR-04 (startKw > endKw) | **PARTIALLY RESOLVED** | Kantenpinning in `kalenderEngine.ts:96-99` + defensiver Guard in `GanttStreifen.tsx:52` sind drin und getestet. Echte Wrap-around-Pflanzendaten bleiben aber kaputt → **WR-08 (neu, aktiv)**. |
| WR-05 (Filter-Chip wirkungslos) | **RESOLVED** | `kalender/index.tsx:45` reicht `{ nurMeinePflanzen }` an den Hook durch; Screen-seitige Doppelfilterung entfernt; `userToggled`-Ref (`:35`, `:99`) verhindert Effekt-Override nach Opt-out. Tests (a)-(d) in `KalenderScreen.test.tsx`. |
| WR-06 (Platzierung außerhalb Beet) | **RESOLVED** | `useKalenderData.ts:189-215` platziert am Center des ersten nicht-gelöschten Beets und setzt `provenance.parentBedId`. `nextFreeBedSlot`-Import entfernt. Test verifiziert In-Polygon-Platzierung + parentBedId. Rest-Lücke bei konkaven Freihand-Polygonen → **WR-10 (neu)**. |
| WR-07 (Race + stale Elements) | **RESOLVED** | `useKalenderData.ts:88-118` — cancelled-Flag, Null-Reset von elements/dimensions bei `activeGardenId = null`. Test vorhanden. Rest: Fehlerpfad lässt Cross-Garden-Daten stehen → IN-07 (neu, Info). |
| IN-01 (unbenutzter Import) | **RESOLVED** | `getFensterFuerPflanze` ist aus den Imports von `[slug].tsx` entfernt. |
| IN-02 (hartkodierte Strings) | **PARTIALLY RESOLVED** | `kalender.nichtGefunden` + `kalender.hinzufuegenFehler` in de.json und via `t()` genutzt. Der Hinweistext in `KalenderWochenCard.tsx:75` ist weiterhin hartkodiert → bleibt offen (siehe IN-02 unten). |
| IN-03 (jest.config Regex) | **OPEN** | Unverändert: `jest.config.ts:15`, `:42`, `:59` nutzen `'^.+\.tsx?$'` (einfacher Backslash), `:79`, `:104`, `:134` korrekt `'\\.'`. |
| IN-04 (mode! Assertion) | **RESOLVED** | `useKalenderData.ts:180` — expliziter `if (mode !== 'account') throw new Error('account_erforderlich')` vor dem Write, kein `!` mehr. Test verifiziert local-Mode-Reject ohne Write-Aufruf. Rest: Screen unterscheidet die Fehlerursache nicht → IN-11 (neu, Info). |
| IN-05 (usePlants-Loading) | **OPEN** | Unverändert: `kalender/index.tsx:27` konsumiert `isLoading` von `usePlants` nicht; Loading-Guard (`:57`) hängt nur an `useKalenderData.loading`. |

## Warnings

### WR-08: Echte Wrap-around-Erntefenster (Feldsalat, Grünkohl) bleiben invertiert — Ernte verschwindet ganzjährig aus WochenCard UND Gantt

**File:** `packages/shared/src/lib/kalenderEngine.ts:96-99` (Pinning-Logik); Daten: `packages/shared/src/data/plants.json:546-547` (feldsalat, `harvestDoyStart: 280, harvestDoyEnd: 90`), `:604-605` (gruenkohl, `280 → 60`)
**Issue:** Der WR-04-Fix behandelt nur Inversionen, die `doyToIsoKw` an den Jahresgrenzen erzeugt (`s <= 7` bzw. `e >= 359`). Bei Pflanzen, deren Fenster den Jahreswechsel **per Daten** überspannt (überwinternde Kulturen), ist nach Clamping `s = 280, e = 90` — keine der beiden Pinning-Bedingungen greift, und das Fenster wird mit `startKw ≈ 40 > endKw ≈ 13` gepusht. Downstream: `filterAktiveAktionen` (`kw >= 40 && kw <= 13`) matcht nie → die Ernte erscheint zu KEINER Kalenderwoche in der WochenCard; der defensive Guard in `GanttStreifen.tsx:52` überspringt das Fenster → kein Ernte-Balken im Gantt. Für Feldsalat und Grünkohl ist der Aktionstyp Ernte damit in der gesamten App unsichtbar — genau in den Monaten Okt–März, für die diese Pflanzen im Kleingarten relevant sind. Klimazonen-Offsets ändern daran nichts (Zone 1: `250→60`, Zone 7: `310→120` — immer invertiert). Der Engine-Test `WR-04: jahresende-naher endDoy` (`kalenderEngine.test.ts:210-215`) testet nur `340→365` (nicht-invertierte Eingabe) und kann das nicht fangen.
**Fix:** In `addWindow` echte Wrap-Fenster (Roh-`start > end` vor dem Clamping) in zwei Segmente splitten statt zu pinnen:
```ts
const addWindow = (typ: AktionsTyp, start: number | null, end: number | null): void => {
  if (start == null || end == null) return;
  if (start > end) {
    // Echtes Jahreswechsel-Fenster (z.B. Ernte Okt–März): in zwei Segmente splitten
    addWindow(typ, start, 365);
    addWindow(typ, 1, end);
    return;
  }
  // ... bestehende Clamp- + Pinning-Logik
};
```
Zusatztest mit Feldsalat-Daten: `getFensterFuerPflanze({ harvestDoyStart: 280, harvestDoyEnd: 90, ... }, 4)` muss zwei Ernte-Fenster liefern, und `filterAktiveAktionen(fenster, 2)` sowie `(fenster, 45)` müssen je eines matchen. Hinweis: `KalenderWochenCard` nutzt `${plant.slug}-${fenster.typ}` als Key (`KalenderWochenCard.tsx:53`) — bei zwei gleichtypigen Segmenten kollidieren die Keys; `startKw` in den Key aufnehmen.

### WR-09: CAL-06-Warnung bei unplatzierter Pflanze prüft ALLE Beete, der CTA platziert aber deterministisch ins ERSTE Beet — falsch-positive Warnung möglich

**File:** `app/app/(app)/kalender/[slug].tsx:74-76` (Fallback `targetBeete` = alle Beete) vs. `app/src/hooks/useKalenderData.ts:189-191` (`elements.find(...)` = erstes Beet)
**Issue:** Für eine noch nicht platzierte Pflanze iteriert der Fruchtfolge-Check über alle nicht-gelöschten Beete und zeigt die Warnung, sobald irgendein Beet eine gleichfamiliäre Pflanze enthält. Der WR-06-Fix hat aber gleichzeitig festgelegt, dass `addPlantToPlan` immer in das **erste** nicht-gelöschte Beet platziert. Szenario: Beet A (erstes, leer), Beet B (Paprika). Detail-Screen für Tomate zeigt "Fruchtfolge: Solanaceae bereits im Beet (paprika)" — der CTA platziert die Tomate jedoch in Beet A, wo kein Konflikt existiert. Die Warnung benennt ein Beet, das gar nicht das Platzierungsziel ist, und widerspricht der CAL-06-Spezifikation ("same-family plant already occupies the **target bed**"). Der Test (e) deckt nur den Fall "Pflanze bereits platziert" ab; der Unplatziert-Pfad mit mehreren Beeten ist ungetestet.
**Fix:** Den Fallback auf das tatsächliche Platzierungsziel verengen — dasselbe Beet, das `addPlantToPlan` wählt:
```tsx
const targetBeete = myBeete.length > 0
  ? myBeete
  : elements.filter((e) => e.elementType === 'Beet' && e.deletedAt === null).slice(0, 1);
```
Alternativ die Zielwahl (erstes Beet) als gemeinsamen Helper extrahieren, damit Warnung und Platzierung nie divergieren.

### WR-10: `findBeeteForPlant` konsumiert `provenance.parentBedId` nicht — der von WR-06 geschriebene Fast-Path-Hint ist toter Ballast, und bei konkaven Freihand-Beeten schlägt die Zuordnung trotz korrekter Platzierung fehl

**File:** `app/src/lib/kalenderBeete.ts:61-97`; Schreiber: `app/src/hooks/useKalenderData.ts:209`; Phase-9-Vorbild: `app/src/hooks/useCompanionDetection.ts:84-89`
**Issue:** Der WR-06-Fix schreibt `provenance.parentBedId` explizit "für den D-03 Fast-Path" (Kommentar `useKalenderData.ts:188`). Der einzige Konsument im Kalender-Kontext — `findBeeteForPlant` — macht aber ausschließlich PiP-Geometrie und ignoriert `parentBedId`, anders als das Phase-9-Vorbild `findBedForPlant` (Fast-Path + PiP-Fallback). Folge: (a) Der geschriebene Hint ist im Kalender wirkungslos. (b) Der Kommentar in `useKalenderData.ts:186-187` ("garantiert innerhalb des Rechteck-Polygons") gilt nur für Bbox-Fallback-Beete — bei Freihand-Beeten mit **konkavem** `polygonPointsM` (z.B. L-Form aus dem Editor) kann das Bbox-Center `xM/yM` außerhalb des Polygons liegen. Dann platziert `addPlantToPlan` die Pflanze außerhalb der Beet-Geometrie, der PiP-Test schlägt fehl, und "Auf welchem Beet?" zeigt nach dem Erfolgsbanner weiterhin "Noch nicht im Plan" — exakt das Symptom, das WR-06 beheben sollte, nur jetzt auf konkave Beete beschränkt. Auch `findPflanzenInBeet` (CAL-06) übersieht solche Pflanzen.
**Fix:** Fast-Path in `findBeeteForPlant` ergänzen (Mirror von `findBedForPlant`):
```ts
for (const pflanze of matchingPflanzen) {
  const prov = pflanze.provenance as Record<string, unknown> | null;
  if (prov && typeof prov.parentBedId === 'string') {
    const beet = beete.find((b) => b.id === prov.parentBedId);
    if (beet && !seenIds.has(beet.id)) { result.push(beet); seenIds.add(beet.id); continue; }
  }
  // ... bestehender PiP-Fallback
}
```
Analog in `findPflanzenInBeet` Pflanzen mit `parentBedId === beet.id` direkt aufnehmen.

## Info

### IN-02 (Rest aus Vorreview): Hartkodierter deutscher UI-String in KalenderWochenCard

**File:** `app/src/components/kalender/KalenderWochenCard.tsx:74-76`
**Issue:** `→ Tippe auf eine Pflanze für Details und Gantt-Ansicht` ist weiterhin inline statt in de.json (`kalender.nichtGefunden`/`hinzufuegenFehler` wurden gefixt, dieser String nicht).
**Fix:** Key `kalender.wochenCardHinweis` in de.json anlegen und via `t()` rendern.

### IN-03 (unverändert offen): jest.config.ts — uneinheitlich escapete Transform-Regex

**File:** `app/jest.config.ts:15`, `:42`, `:59` vs. `:79`, `:104`, `:134`
**Issue:** Drei Projekte nutzen `'^.+\.tsx?$'` (kollabiert zu `^.+.tsx?$`), drei nutzen korrekt `'^.+\\.tsx?$'`. Praktisch funktional, aber Copy-Paste-Drift-Risiko.
**Fix:** Alle sechs auf `'^.+\\.tsx?$'` vereinheitlichen.

### IN-05 (unverändert offen): Loading-Guard deckt usePlants-Cold-Start nicht ab

**File:** `app/app/(app)/kalender/index.tsx:27`, `:57`
**Issue:** `usePlants().isLoading` wird nicht konsumiert; während das Pflanzen-Bundle lädt, rendert der Screen eine leere Jahresübersicht statt des Spinners.
**Fix:** `const { data: allPlants = [], isLoading: plantsLoading } = usePlants();` und Guard auf `loading || plantsLoading`.

### IN-06: GanttStreifen clampt nur das Fenster-Ende auf KW 52 — ein reines KW-53-Fenster wird unsichtbar

**File:** `app/src/components/kalender/GanttStreifen.tsx:47-52`
**Issue:** `clampedStart = Math.max(1, f.startKw)` clampt nicht nach oben. Ein Fenster mit `startKw = endKw = 53` (Spät-Dezember in einem 53-KW-Jahr) ergibt `clampedStart = 53 > clampedEnd = 52` → der WR-04-Guard überspringt es, statt es auf KW 52 zu zeichnen. Der Kommentar an `TOTAL_KW` ("KW 53 wird auf KW 52 geclampt") verspricht symmetrisches Clamping.
**Fix:** `const clampedStart = Math.min(TOTAL_KW, Math.max(1, f.startKw));`

### IN-07 (WR-07-Rest): Fehlerpfad beim Gartenwechsel lässt stale Cross-Garden-Daten stehen

**File:** `app/src/hooks/useKalenderData.ts:110-114`
**Issue:** Wenn nach einem Wechsel von Garten A zu Garten B der Load für B fehlschlägt, bleiben `elements`/`dimensions` von Garten A im State (catch loggt nur). Der Null-Reset greift nur bei `activeGardenId = null`.
**Fix:** Im catch-Zweig (wenn `!cancelled`) `setElements([])` und `setDimensions(null)` setzen.

### IN-08: Toter Mock `nextFreeBedSlot` im Hook-Test nach WR-06-Fix

**File:** `app/src/hooks/__tests__/useKalenderData.test.ts:64-69`, `:210`
**Issue:** `useKalenderData` importiert `draftPromotionRepo` seit dem WR-06-Fix nicht mehr; der Modul-Mock samt `mockNextFreeBedSlot`-Reset ist toter Code und suggeriert eine nicht mehr existierende Abhängigkeit.
**Fix:** Mock-Block und beforeEach-Reset entfernen.

### IN-09: Ungenutzter i18n-Key `kalender.ohneKalenderDaten`

**File:** `packages/shared/src/i18n/de.json:402`
**Issue:** Der Key wird in keiner Komponente konsumiert (Grep über das Repo: nur Planning-Dokumente referenzieren ihn). Der laut Plan 10-01 vorgesehene Hinweis für Pflanzen ohne Kalender-Verknüpfung ist nirgends verdrahtet.
**Fix:** Entweder den Hinweis in der Jahresübersicht rendern (Pflanzen ohne DOY-Daten) oder den Key entfernen.

### IN-10: Home-Screen Plan-Load-Effekt ohne cancelled-Flag (inkonsistent zur eigenen Datei)

**File:** `app/app/(app)/index.tsx:38-57`
**Issue:** Der Session-Effekt (`:28-36`) nutzt das cancelled-Flag-Pattern, der Plan-Load-Effekt direkt darunter nicht — setState nach Unmount/Gartenwechsel mit Out-of-Order-Responses ist möglich. Gleiche Defektklasse wie WR-07, die im Kalender-Hook gefixt wurde.
**Fix:** Dasselbe cancelled-Flag-Pattern wie in `useKalenderData.ts:88-118` anwenden.

### IN-11 (IN-04-Rest): Detail-Screen verwirft den Fehlercode — local-Mode-User bekommt irreführendes "Versuche es erneut"

**File:** `app/app/(app)/kalender/[slug].tsx:120-122`
**Issue:** Der IN-04-Fix liefert jetzt unterscheidbare Fehlercodes (`account_erforderlich`, `kein_beet_im_plan`, ...), aber der bare `catch {` im CTA-Handler verwirft sie und zeigt immer `kalender.hinzufuegenFehler` ("Versuche es erneut") — im lokalen Modus hilft Erneut-Versuchen nicht.
**Fix:** `catch (err)` und für `account_erforderlich` eine eigene Meldung (z.B. `kalender.accountErforderlich` in de.json) anzeigen.

---

_Reviewed: 2026-06-11T16:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
