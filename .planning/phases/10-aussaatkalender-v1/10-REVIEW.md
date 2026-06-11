---
phase: 10-aussaatkalender-v1
reviewed: 2026-06-11T12:00:00Z
depth: standard
files_reviewed: 20
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
  - app/src/components/kalender/__tests__/GanttStreifen.test.tsx
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
  critical: 1
  warning: 7
  info: 5
  total: 13
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-06-11T12:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed the Aussaatkalender v1 implementation: the pure calendar engine in `packages/shared`, the `useKalenderData` hook + `kalenderBeete` geometry helper, two screens (Wochen-View, Pflanzen-Detail), four UI components, and their tests. The engine core (DOY-shift, clamping, Fruchtfolge check) is clean and well-tested, and de.json uses correct UTF-8 umlauts throughout.

However, the review found one crash-level defect and several correctness problems that the test suite does not catch because the relevant collaborators are mocked:

1. The Pflanzen-Detail screen violates the Rules of Hooks — the "Pflanze nicht gefunden" guard returns before three hooks, which crashes the screen for unknown slugs (CR-01).
2. `kalenderBeete.ts` uses a top-left rectangle fallback while the rest of the codebase (Phase 7/9) documents and implements `xM/yM` as bbox **center** — bed membership and Fruchtfolge are wrong for every Claude.ai-imported bed (WR-01).
3. The CAL-06 Fruchtfolge check on the detail screen never scopes plants to the bed it is iterating over (WR-02).
4. `getAktuelleKw` has an off-by-one (`Math.ceil`) that reports next week's KW on Sundays (WR-03).

## Critical Issues

### CR-01: Rules-of-Hooks violation — Detail-Screen crasht bei unbekanntem Slug statt Banner zu zeigen

**File:** `app/app/(app)/kalender/[slug].tsx:59-68` (early return) vs. `:75`, `:121`, `:127` (hooks after the return)
**Issue:** The "Plant not found guard (T-10-08)" returns early **before** `React.useMemo` (line 75 `fruchtfolgeGrund`, line 121 `meineBeete`) and `React.useCallback` (line 127 `handleAddToPlan`). On the first render `loading` is `true` (initial state in `useKalenderData`), so the guard does not fire and all 10+ hooks run. When loading flips to `false` and the slug does not match any plant, the same component instance re-renders through the early return with **fewer hooks**, and React throws `Rendered fewer hooks than expected`. The guard that was supposed to handle unknown slugs gracefully instead crashes the screen. The existing test (`PflanzenDetail.test.tsx`) never renders the not-found path, so this is uncovered.
**Fix:** Move the guard below all hook calls. The memos already null-guard `plant`:
```tsx
const fruchtfolgeGrund = React.useMemo(/* ... */);
const meineBeete = React.useMemo(/* ... */);
const handleAddToPlan = React.useCallback(/* ... */);

// Guard AFTER all hooks — hook count is now stable across renders
if (!loading && !plant) {
  return (
    <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
      {/* ... nicht-gefunden banner ... */}
    </View>
  );
}
```

## Warnings

### WR-01: Koordinaten-Konvention falsch — `beetToPolygon` baut Top-Left-Rechteck, Repo-Konvention ist bbox-CENTER

**File:** `app/src/lib/kalenderBeete.ts:26-42` (and plant-center math at `:75-78`)
**Issue:** The codebase convention is documented and implemented as `xM/yM = bbox center`:
- `app/src/lib/geometry/bedLayout.ts:3` — "MVP approximation: xM/yM = bbox center"
- `app/src/stores/editorStore.ts:121-128` — `polygonCommit` stores `bbox.xM/yM` (center, verified by `editorStore.polygon.test.ts:79` "xM/yM = bbox centroid")
- `app/src/hooks/useCompanionDetection.ts:63-71` (Phase 9, shipped) — bbox fallback builds the rectangle from `xM ± widthM/2`, and `findBedForPlant` uses `{x: plant.xM, y: plant.yM}` directly as the plant center.

`beetToPolygon` instead builds `(xM,yM) → (xM+widthM, yM+heightM)` (top-left), and `findBeeteForPlant` computes the plant center as `xM + widthM/2`. Both contradict Phase 9. The function's own doc comment even says the opposite of what the code does: line 23-24 claims "The 4-corner rectangle is therefore built from center ± half-dimensions" — the code below does not.

Reachability: editor-created beds always carry `provenance.polygonPointsM`, so they take the primary path — but **every imported bed** (`promoteBedDraft`, `draftPromotionRepo.ts:135-139`) has no `polygonPointsM` and hits the wrong fallback. For those beds, the polygon is shifted by `(+w/2, +h/2)`, so "Auf welchem Beet?" and the CAL-06 Fruchtfolge bed-scoping return wrong results, and `kalenderBeete` and `useCompanionDetection` give contradictory answers for the same data.
**Fix:** Mirror the Phase 9 fallback exactly (or import/reuse `getBedPolygon` from `useCompanionDetection.ts` into a shared module):
```ts
const halfW = beet.widthM / 2;
const halfH = beet.heightM / 2;
return [
  { x: beet.xM - halfW, y: beet.yM - halfH },
  { x: beet.xM + halfW, y: beet.yM - halfH },
  { x: beet.xM + halfW, y: beet.yM + halfH },
  { x: beet.xM - halfW, y: beet.yM + halfH },
];
```
and use `{ x: pflanze.xM, y: pflanze.yM }` as the plant center, consistent with `findBedForPlant`. Update `kalenderBeete.test.ts` fixtures accordingly (they currently encode the top-left assumption).

### WR-02: CAL-06 Fruchtfolge-Check ist nicht Beet-scoped — warnt bei gleicher Familie irgendwo im Plan

**File:** `app/app/(app)/kalender/[slug].tsx:89-116`
**Issue:** Inside the `for (const beet of targetBeete)` loop, `otherPflanzenInBeet` (lines 91-97) filters **all** Pflanze elements in the entire plan — the loop variable `beet` is never used in the filter, and no point-in-polygon check against the bed is performed. The comment "Get all other Pflanze elements in this bed" is false. Consequences: (a) the loop body computes the identical result on every iteration (dead loop variable — a clear signal of the logic gap), (b) the warning fires whenever any same-family plant exists anywhere in the plan, even in a completely different bed, violating the CAL-06 spec ("same-family plant already occupies the **target bed**"). The test for this path mocks `pruefeEinfacheFruchtfolge` and so cannot catch it.
**Fix:** Scope plants to the bed using the same PiP geometry as `findBeeteForPlant`, e.g. export a `findPflanzenInBeet(elements, beet)` helper from `kalenderBeete.ts`:
```ts
const otherPflanzenInBeet = findPflanzenInBeet(elements, beet)
  .filter((e) => getPlantSlug(e) !== plant.slug);
```

### WR-03: `getAktuelleKw` Off-by-one durch `Math.ceil` — KW eine Woche zu hoch an Sonntagen

**File:** `packages/shared/src/lib/kalenderEngine.ts:105-111`
**Issue:** `Math.ceil((now - new Date(year,0,0)) / 86400000)` overestimates the DOY by 1 for any time after local midnight: for Jun 11, 12:00 the diff is 162.5 days → `ceil` = 163 (correct DOY is 162). The standard idiom uses `Math.floor`. Feeding `doy+1` into `doyToIsoKw` returns tomorrow's ISO week — wrong whenever "tomorrow" is a Monday, i.e. **every Sunday** the KalenderWochenCard shows next week's actions instead of this week's. DST transitions (CET/CEST) add a further ±1h that `ceil` also absorbs into the off-by-one. The existing test only asserts `1 <= kw <= 53` and cannot catch this.
**Fix:**
```ts
export function getAktuelleKw(): number {
  const now = new Date();
  const doy = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return Math.min(53, doyToIsoKw(doy));
}
```
(Or better: compute the ISO week directly from `now` with the same UTC arithmetic as `doyToIsoKw`, avoiding the DOY round-trip and DST drift entirely.)

### WR-04: Keine Behandlung von `startKw > endKw` — Fenster verschwinden bzw. Gantt-Balken mit negativer Breite

**File:** `packages/shared/src/lib/kalenderEngine.ts:46-53`, `:86-91`; `app/src/components/kalender/GanttStreifen.tsx:46-50`
**Issue:** `doyToIsoKw` returns the true ISO week, which wraps at year boundaries: in years where Jan 1 belongs to the previous ISO year (e.g. 2027 → KW 52/53) an early-January DOY yields `startKw = 52/53`; in years where Dec 29-31 belong to next year's KW 1, a late-December DOY yields `endKw = 1`. Either case produces a window with `startKw > endKw`. Early-January DOYs are reachable via the climate-zone shift (Zone 1 offset = −30 days). Downstream:
- `filterAktiveAktionen` (`kw >= startKw && kw <= endKw`) never matches → the action silently disappears from "Diese Woche".
- `GanttStreifen.tsx:50` computes `width = (clampedEnd - clampedStart + 1) / 52 * 100` → **negative** width percentage → broken bar rendering.

The `Math.min(53, ...)` clamp ("Fallstrick 4") does not address this, because the wrapped values are within 1..53.
**Fix:** In `addWindow`, normalize inverted windows after KW conversion, e.g. clamp boundary wraps to the year edges:
```ts
let startKw = Math.min(53, doyToIsoKw(s));
let endKw = Math.min(53, doyToIsoKw(e));
if (startKw > endKw) {
  // year-boundary wrap from ISO week numbering: pin to calendar edges
  if (s <= 7) startKw = 1;
  if (e >= 359) endKw = 53;
}
```
and add a defensive `if (clampedEnd < clampedStart) return null;` guard in `GanttStreifen`.

### WR-05: Filter-Chip "Nur meine Pflanzen" wirkt nicht auf die WochenCard — Hook filtert immer, Chip-OFF ist wirkungslos

**File:** `app/app/(app)/kalender/index.tsx:26-32`, `:40-44`, `:63-66`; `app/src/hooks/useKalenderData.ts:136-144`
**Issue:** The screen calls `useKalenderData()` **without** the `nurMeinePflanzen` option. Inside the hook, the default is "filter on when the plan has slugs" (`useFilter = meinePflanzenslugs.size > 0`). So when the user toggles the chip OFF, the screen-level `filteredAktionen` falls back to `wochenAktionen` — which the hook has **already filtered** to "meine Pflanzen". The KalenderWochenCard therefore never shows all-plant actions; the chip only affects the Jahresübersicht list. This contradicts the UI-SPEC Filter-Chip-Kontrakt the file header cites. Additionally, the `useEffect` at lines 40-44 force-re-enables the chip whenever `meinePflanzenslugs.size` changes (e.g. after adding a plant), silently overriding an explicit user opt-out.
**Fix:** Pass the chip state into the hook and drop the duplicate screen-side action filtering:
```tsx
const { wochenAktionen, ... } = useKalenderData({ nurMeinePflanzen });
```
For the default-sync, only initialize once (e.g. track a `userToggled` ref and skip the effect after the first manual toggle).

### WR-06: `addPlantToPlan` platziert die Pflanze via `nextFreeBedSlot` außerhalb jedes Beets — CTA-Versprechen wird nicht eingelöst

**File:** `app/src/hooks/useKalenderData.ts:159`; `app/src/lib/draftPromotionRepo.ts:58-80`
**Issue:** `nextFreeBedSlot` is a bed-stacking layout helper: it returns the next free slot **next to** existing beds (row layout with 50 cm gap), explicitly avoiding overlap with beds. Using it for a 0.3×0.3 plant means the new Pflanze lands in free garden space, never inside a bed. Consequences after pressing "Zu Plan hinzufügen": `findBeeteForPlant` does not find it → "Auf welchem Beet?" still shows "Noch nicht im Plan" despite the success banner; the plant is also invisible to bed-scoped Fruchtfolge/companion logic. The `hasBeetImPlan` guard (Fallstrick 5) gates the CTA on a bed existing, which strongly implies in-bed placement intent — that guard is currently cosmetic.
**Fix:** Place the plant inside an existing bed, e.g. pick the first non-deleted Beet, compute a free position within its polygon/bbox (reusing PiP), and set `provenance.parentBedId` (the D-03 fast path `findBedForPlant` already consumes). At minimum, document the off-bed placement and adjust the success banner ("im Plan abgelegt — bitte im Editor positionieren").

### WR-07: `useKalenderData.loadData` ohne Cancellation — Race bei Gartenwechsel + stale Elements bei `activeGardenId = null`

**File:** `app/src/hooks/useKalenderData.ts:84-106`
**Issue:** Two related defects: (a) When `activeGardenId` changes, the previous in-flight `loadData` is not cancelled; if responses resolve out of order, `setElements`/`setDimensions` from the **old** garden overwrite the new garden's data. The codebase already uses the `cancelled` flag pattern for exactly this (`app/app/(app)/index.tsx:28-36`). (b) When `activeGardenId` becomes `null` (logout/garden switch), the early return keeps the previous garden's `elements`/`dimensions` in state — `meinePflanzenslugs`, `hasBeetImPlan` and the WochenCard keep presenting stale data.
**Fix:**
```ts
React.useEffect(() => {
  let cancelled = false;
  setLoading(true);
  if (!activeGardenId) {
    setElements([]);
    setDimensions(null);
    setLoading(false);
    return;
  }
  (async () => {
    try {
      const [dims, elems] = await Promise.all([...]);
      if (!cancelled) { setDimensions(dims); setElements(elems); }
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();
  return () => { cancelled = true; };
}, [activeGardenId]);
```

## Info

### IN-01: Unbenutzter Import `getFensterFuerPflanze` im Detail-Screen

**File:** `app/app/(app)/kalender/[slug].tsx:16`
**Issue:** `getFensterFuerPflanze` is imported from `@spatenstich/shared` but never referenced in the file (the Gantt rendering happens inside `GanttStreifen`, which imports it itself).
**Fix:** Remove it from the import statement.

### IN-02: Hartkodierte deutsche UI-Strings umgehen de.json

**File:** `app/app/(app)/kalender/[slug].tsx:64` (`Pflanze "${slug}" nicht gefunden.`), `:136` (`Hinzufügen fehlgeschlagen. Versuche es erneut.`); `app/src/components/kalender/KalenderWochenCard.tsx:74-76` (`→ Tippe auf eine Pflanze für Details und Gantt-Ansicht`)
**Issue:** All other Phase-10 UI strings live under `kalender.*` in de.json (project convention; de.json is the single i18n source). These three user-facing strings are inlined in components.
**Fix:** Add keys (e.g. `kalender.nichtGefunden`, `kalender.hinzufuegenFehler`, `kalender.wochenCardHinweis`) to de.json and route them through `t()`.

### IN-03: jest.config.ts — uneinheitlich escapete Transform-Regex `'^.+\.tsx?$'`

**File:** `app/jest.config.ts:15`, `:42`, `:59` vs. `:79`, `:104`, `:134`
**Issue:** In the first three projects the transform key is written `'^.+\.tsx?$'` — in a normal string literal `\.` collapses to `.`, so the effective regex is `^.+.tsx?$` (any character before `tsx?`). The last three projects correctly use `'^.+\\.tsx?$'`. Practically the looser pattern still matches all `.ts/.tsx` files, but the inconsistency invites copy-paste drift.
**Fix:** Use `'^.+\\.tsx?$'` in all six projects.

### IN-04: `mode!` Non-Null-Assertion in `addPlantToPlan`

**File:** `app/src/hooks/useKalenderData.ts:184`
**Issue:** `await writePlanElement(mode!, element)` — `mode` can be `null` per the authStore type. The code relies on `assertAccount` inside `writePlanElement` to reject, but the `!` silences the type system instead of expressing the precondition. In local mode the user gets the generic "Hinzufügen fehlgeschlagen" with no hint why.
**Fix:** Guard explicitly: `if (mode !== 'account') throw new Error('account_erforderlich');` before the write, then pass `mode` without assertion.

### IN-05: Loading-Guard deckt `usePlants`-Cold-Start nicht ab (Kommentar irreführend)

**File:** `app/app/(app)/kalender/index.tsx:46-54`
**Issue:** The comment says "Loading guard (usePlants cold-start)", but `loading` comes from `useKalenderData` and only tracks the plan-element/dimension load. `usePlants().isLoading` is not consumed, so while the plant bundle loads, the screen renders with an empty Jahresübersicht instead of the spinner.
**Fix:** `const { data: allPlants = [], isLoading: plantsLoading } = usePlants();` and gate on `loading || plantsLoading`.

---

_Reviewed: 2026-06-11T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
