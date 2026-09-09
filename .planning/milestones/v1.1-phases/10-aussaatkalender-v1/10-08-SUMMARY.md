---
phase: 10-aussaatkalender-v1
plan: "08"
subsystem: kalender-hook
tags: [bug-fix, tdd, wR-06, wR-07, IN-04, CAL-04, CAL-05, race-condition, in-bed-placement]
dependency_graph:
  requires: [10-06]
  provides: [addPlantToPlan-in-bed, cancelled-flag-load-effect, mode-guard]
  affects: []
tech_stack:
  added: []
  patterns: [cancelled-flag-pattern, in-bed-placement, tdd-red-green, explicit-guard]
key_files:
  created: []
  modified:
    - app/src/hooks/useKalenderData.ts
    - app/src/hooks/__tests__/useKalenderData.test.ts
decisions:
  - "WR-06 In-Bed-Placement: addPlantToPlan platziert Pflanze am Beet-Center (xM/yM des ersten nicht-gelöschten Beetes) statt via nextFreeBedSlot neben den Beeten"
  - "parentBedId in provenance aktiviert D-03 Fast-Path in findBedForPlant/findBeeteForPlant (Phase 9)"
  - "WR-07 cancelled-Flag: Lade-Effekt nach index.tsx-Muster — let cancelled = false; Cleanup: () => { cancelled = true; }"
  - "WR-07 Reset: Bei !activeGardenId setElements([]) + setDimensions(null) statt nur setLoading(false)"
  - "IN-04: if (mode !== 'account') throw new Error('account_erforderlich') VOR writePlanElement — explizite Vorbedingung statt mode!-Assertion"
  - "refresh() als eigenständige useCallback-Funktion ohne cancelled-Flag (manueller Reload, kein Race-Risiko)"
metrics:
  duration: "9 min"
  completed: "2026-06-11"
  tasks_completed: 2
  files_changed: 2
---

# Phase 10 Plan 08: useKalenderData Gap-Closure — WR-06/WR-07/IN-04 Summary

**One-liner:** WR-06 In-Bed-Placement (Beet-Center + parentBedId), WR-07 cancelled-Flag + stale-Reset, IN-04 expliziter mode-Guard — alle drei Lücken im Daten-Layer-Hook geschlossen.

## Tasks Completed

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 RED | In-Bed-Placement + IN-04 Tests (fehlschlagend) | d2e45d3 | grün |
| 1 GREEN | addPlantToPlan: Beet-Center + parentBedId + mode-Guard | 18fc173 | grün |
| 2 RED | WR-07 Reset-Test bei activeGardenId=null (fehlschlagend) | c6e04ec | grün |
| 2 GREEN | cancelled-Flag + setElements([]) Reset im Lade-Effekt | 0679135 | grün |

## What Was Built

### WR-06: In-Bed-Placement in addPlantToPlan

`app/src/hooks/useKalenderData.ts` — `addPlantToPlan`:

**Vorher (defekt):** `nextFreeBedSlot(elements, dimensions, { widthM: 0.3, heightM: 0.3 })` — platziert Pflanze NEBEN Beeten mit 50 cm Gap-Layout; `findBeeteForPlant` findet die Pflanze nicht → "Auf welchem Beet?" zeigt "Noch nicht im Plan".

**Nachher (korrekt):**
```ts
const targetBeet = elements.find(
  (e) => e.elementType === 'Beet' && e.deletedAt === null,
);
// Pflanze an Beet-Center (CENTER-Konvention Plan 10-06/08)
xM: targetBeet.xM,
yM: targetBeet.yM,
provenance: { plantSlug: plant.slug, parentBedId: targetBeet.id },
```

Beet-Center (xM/yM) ist per CENTER-Konvention garantiert innerhalb des Beet-Polygons. `parentBedId` aktiviert den D-03 Fast-Path in `findBedForPlant`/`findBeeteForPlant` (Phase 9).

`nextFreeBedSlot`-Import wurde vollständig entfernt.

### IN-04: Expliziter mode-Guard

**Vorher:** `await writePlanElement(mode!, element)` — Assertion unterdrückt Typfehler; generischer Fehler bei lokalem Modus.

**Nachher:**
```ts
if (mode !== 'account') throw new Error('account_erforderlich');
// ... weitere Guards ...
await writePlanElement(mode, element);  // kein ! mehr
```

Defense-in-depth: `assertAccount` in `writePlanElement` bleibt zweite Verteidigungslinie.

### WR-07: cancelled-Flag + Reset im Lade-Effekt

**Vorher:** `loadData` useCallback + `useEffect(() => { setLoading(true); void loadData(); }, [loadData])` — kein cancelled-Flag; bei `activeGardenId=null` nur `setLoading(false)` ohne Reset.

**Nachher** (nach index.tsx-Muster):
```ts
React.useEffect(() => {
  let cancelled = false;
  setLoading(true);
  if (!activeGardenId) {
    setElements([]);        // WR-07 Reset
    setDimensions(null);    // kein stale State
    setLoading(false);
    return;
  }
  (async () => {
    try {
      const [dims, elems] = await Promise.all([...]);
      if (!cancelled) { setDimensions(dims); setElements(elems); }
    } catch (err) { console.error(...) }
    finally { if (!cancelled) setLoading(false); }
  })();
  return () => { cancelled = true; };
}, [activeGardenId]);
```

`refresh()` bleibt als eigenständige `useCallback`-Funktion ohne cancelled-Flag (manueller Reload nach `addPlantToPlan`, kein Race-Risiko).

## Verification

- `pnpm --filter app exec jest --testPathPattern="useKalenderData"` — 11/11 Tests grün
- `pnpm --filter app exec tsc --noEmit` — exit 0
- Acceptance Criteria:
  - `grep -c "parentBedId" useKalenderData.ts` = 3 (>= 1) ✓
  - `grep -c "nextFreeBedSlot" useKalenderData.ts` = 0 ✓
  - `grep -c "mode !== 'account'" useKalenderData.ts` = 2 (>= 1) ✓
  - `grep -c "cancelled" useKalenderData.ts` = 6 (>= 2) ✓
  - `grep -c "setElements(\[\])" useKalenderData.ts` = 1 (>= 1) ✓
  - In-Bed-Test: xM/yM=Beet-Center, parentBedId gesetzt — grün ✓
  - IN-04-Test: mode='local' → reject, kein writePlanElement — grün ✓
  - WR-07-Reset-Test: null → elements leer + meinePflanzenslugs leer — grün ✓

## Deviations from Plan

### Auto-fix: Bestehender "CAL-05"-Test an neue In-Bed-Platzierung angepasst (Rule 1)

**Found during:** Task 1 GREEN
**Issue:** Der bestehende Test "calls writePlanElement with xM=2, yM=3" testete implizit das `nextFreeBedSlot`-Verhalten (`mockNextFreeBedSlot.mockReturnValue({ xM: 2, yM: 3 })`). Nach dem WR-06-Fix platziert `addPlantToPlan` am Beet-Center statt am Mock-Slot-Return.
**Fix:** Test angepasst — Beet mit Center (5, 4) als Fixture; erwartetes xM/yM auf (5, 4) gesetzt. Semantik bleibt: "Pflanze wird an korrekter Beet-Position geschrieben". Kein Verhalten geändert.
**Files modified:** `app/src/hooks/__tests__/useKalenderData.test.ts`

## Known Stubs

Keine. Alle drei Lücken (WR-06/WR-07/IN-04) vollständig implementiert und getestet.

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt. T-10-03 (Elevation of Privilege via addPlantToPlan) durch IN-04-Fix mitigiert: expliziter mode-Guard + assertAccount in writePlanElement = Defense-in-depth. T-10-08-RACE mitigiert: cancelled-Flag + Reset.

## Self-Check: PASSED

- [x] `app/src/hooks/useKalenderData.ts` — `addPlantToPlan` enthält parentBedId + mode-Guard; Lade-Effekt enthält cancelled-Flag + Reset
- [x] `app/src/hooks/__tests__/useKalenderData.test.ts` — 11 Tests (3 neue: In-Bed, IN-04, WR-07)
- [x] Commit d2e45d3 (RED Task 1) — verifiziert
- [x] Commit 18fc173 (GREEN Task 1) — verifiziert
- [x] Commit c6e04ec (RED Task 2) — verifiziert
- [x] Commit 0679135 (GREEN Task 2) — verifiziert
