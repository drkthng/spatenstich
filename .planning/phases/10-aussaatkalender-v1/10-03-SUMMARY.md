---
phase: "10"
plan: "03"
subsystem: app/src/components/kalender + app/app/(app)/kalender
tags: [kalender, gantt, ui, CAL-01, CAL-03, tdd]
dependency_graph:
  requires: [Phase 10 Plan 01 — kalenderEngine/AktionsTyp/KalenderFenster, Phase 10 Plan 02 — useKalenderData hook]
  provides: [GanttStreifen, GanttLegende, KalenderWochenCard, PflanzenKalenderZeile, /(app)/kalender route, home-kalender-button]
  affects: [Phase 10 Plan 04 — Pflanzen-Detail-Screen consumes GanttStreifen + GanttLegende]
tech_stack:
  added: []
  patterns:
    - "GanttStreifen: View-bars mit position:absolute + Prozent-Werten (kein SVG, kein Skia)"
    - "FARBEN exported from GanttStreifen.tsx — KalenderWochenCard importiert statt dupliziert"
    - "TDD RED/GREEN gate: Failing tests committed before implementation"
    - "Filter-Chip als Pressable mit accessibilityRole=checkbox + accessibilityState.checked"
    - "klimazone==null guard: PLZ-InlineBanner + leere wochenAktionen (Fallstrick 2 / T-10-07)"
    - "Home-screen entry: Button in beiden Branches (has-plan + empty-state) via testID=home-kalender-button"
key_files:
  created:
    - app/src/components/kalender/GanttStreifen.tsx
    - app/src/components/kalender/GanttLegende.tsx
    - app/src/components/kalender/KalenderWochenCard.tsx
    - app/src/components/kalender/PflanzenKalenderZeile.tsx
    - app/app/(app)/kalender/index.tsx
  modified:
    - app/src/components/kalender/__tests__/GanttStreifen.test.tsx
    - app/app/(app)/index.tsx
decisions:
  - "FARBEN exported from GanttStreifen.tsx (not duplicated in KalenderWochenCard) — single source of truth, import pattern per plan action"
  - "klimazone fallback 4 in PflanzenKalenderZeile (klimazone ?? 4) — prevents NaN propagation to GanttStreifen when klimazone null; PLZ-banner already shown at screen level"
  - "Filter-Chip useState initialized lazily via () => meinePflanzenslugs.size > 0 + useEffect sync — hook loads async, effect corrects after first data load"
  - "TOTAL_KW=52 const in GanttStreifen — KW53 geclampt per UI-SPEC Fallstrick 4"
metrics:
  duration: "12 minutes"
  completed: "2026-06-11"
  tasks: 2
  files: 7
---

# Phase 10 Plan 03: Kalender-UI-Primitives + Wochen-View Screen Summary

**One-liner:** GanttStreifen/GanttLegende View-bar Gantt-Komponenten + KalenderWochenCard mit farbigen CAL-03-Aktions-Badges + Wochen-View Screen + Home-Einstieg — CAL-01/CAL-03 vollständig.

## What Was Built

### Task 1: GanttStreifen + GanttLegende (TDD RED→GREEN)

**RED commit:** `7ed76df` — 4 failing tests (GanttStreifen.tsx fehlend).

**GREEN commit:** `471518b` — GanttStreifen.tsx + GanttLegende.tsx implementiert.

#### GanttStreifen.tsx

`app/src/components/kalender/GanttStreifen.tsx` — View-bar Gantt-Strip.

- `const TOTAL_KW = 52` + `export const FARBEN: Record<AktionsTyp, string>` mit exakten Hex-Werten:
  - Vorkultur `#A78BFA`, Direktsaat `#34D399`, Auspflanzen `#60A5FA`, Ernte `#FB923C`
- `getFensterFuerPflanze(plant, klimazone)` aus `'@spatenstich/shared'` (Root-Export, kein Subpath)
- Outer Track: `backgroundColor:'#E5E7EB'`, `borderRadius:4`, `accessibilityLabel="Gantt-Diagramm für {nameDe}"`
- Per Fenster: `testID="gantt-bar"`, `position:'absolute'`, `left/width` als `${pct}%`, `backgroundColor:FARBEN[f.typ]`
- `height` prop: 20px (Detail-Screen) / 8px (Miniatur in PflanzenKalenderZeile)

#### GanttLegende.tsx

`app/src/components/kalender/GanttLegende.tsx` — Farb-Legende.

- `LEGENDE_ITEMS` Array: 4 Einträge (Vorkultur→Direktsaat→Auspflanzen→Ernte)
- Layout: `flex-row flex-wrap gap-x-3 gap-y-1`
- Pro Eintrag: `10×10px` Farbpunkt (borderRadius:5) + `text-xs text-stone-600 dark:text-stone-300`
- i18n Keys: `kalender.legende.vorkultur` / `.direktsaat` / `.auspflanzen` / `.ernte`

**Test-Ergebnisse:** 4/4 grün — bar-count per Fenster, 0 bars für leere Pflanze, accessibilityLabel, FARBEN-Farben.

### Task 2: KalenderWochenCard + PflanzenKalenderZeile + Wochen-View + Home-Button

**Commit:** `d0a6d12`

#### KalenderWochenCard.tsx

`app/src/components/kalender/KalenderWochenCard.tsx` — "Diese Woche"-Card.

- Props: `aktionen`, `aktuelleKw`, `onPlantPress`
- CAL-03: Badge per Aktionstyp — `backgroundColor: FARBEN[fenster.typ]` + `t('kalender.legende.' + fenster.typ.toLowerCase())`
- `min-h-[44px]` auf jeder Pressable-Row (iOS HIG)
- Leer-Zustand: `t('kalender.keineAktionenDieseWoche')` wenn `aktionen.length === 0`

#### PflanzenKalenderZeile.tsx

`app/src/components/kalender/PflanzenKalenderZeile.tsx` — Jahresübersicht-Zeile.

- Pressable `min-h-[44px]`, `accessibilityLabel="{nameDe}, Kalenderdetails öffnen"`
- Pflanzename `flex-1 text-sm font-semibold` + Miniatur-GanttStreifen `height={8}` in `width:128` Container

#### /(app)/kalender/index.tsx

`app/app/(app)/kalender/index.tsx` — Wochen-View Screen.

- `Stack.Screen options={{ headerTitle: t('kalender.title') }}`
- Screen-Background `flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]`
- `useKalenderData()` als Datenquelle
- PLZ-InlineBanner: `klimazone == null` → warning Banner → `/(app)/profile/plz` (T-10-07)
- Filter-Chip: `accessibilityRole="checkbox"`, `accessibilityState={{ checked }}`, aktiv = `bg-[#4A7C59]`
- Default ON wenn `meinePflanzenslugs.size > 0` (per UI-SPEC Offene Frage 2)
- `KalenderWochenCard` → navigiert zu `/(app)/kalender/` + slug
- Jahresübersicht: `PflanzenKalenderZeile` pro gefilterter Pflanze
- Empty-State (Filter aktiv + 0 Slugs): `keinePflanzenImPlan` Heading + Body + outline "Plan öffnen" Button

#### Home Screen (index.tsx modifiziert)

`app/app/(app)/index.tsx` — "Zum Kalender" Button in beiden Branches:

- Has-Plan Branch: nach "Plan öffnen" Button
- Empty-State Branch: nach "Plan öffnen" (leer) Button
- `testID="home-kalender-button"`, `router.push('/(app)/kalender' as any)`

## Verification

- `pnpm --filter app exec jest --testPathPattern="kalender|GanttStreifen|home"` — 23/23 grün
- `pnpm --filter app exec tsc --noEmit` — exit 0 (kein Fehler)
- `grep "#A78BFA|#34D399|#60A5FA|#FB923C" GanttStreifen.tsx` — alle 4 Farben bestätigt
- `grep "home-kalender-button" app/app/(app)/index.tsx` — 2 Treffer (beide Branches)
- `grep "/(app)/kalender'" app/app/(app)/index.tsx` — 2 Treffer (beide push-Aufrufe)
- `grep "accessibilityRole=\"checkbox\"" kalender/index.tsx` — 1 Treffer
- `grep "bg-\[#4A7C59\]" kalender/index.tsx` — Filter-Chip aktiv-Klasse bestätigt
- `grep "kalender.legende" KalenderWochenCard.tsx` — CAL-03 i18n bestätigt
- `grep "min-h-\[44px\]" PflanzenKalenderZeile.tsx KalenderWochenCard.tsx` — Touch-Targets bestätigt
- Kein `@spatenstich/shared/lib/kalenderEngine` Subpath-Import in GanttStreifen.tsx

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] klimazone Fallback in PflanzenKalenderZeile**
- **Found during:** Task 2 implementation
- **Issue:** `PflanzenKalenderZeile` nimmt `klimazone: number` (non-nullable per Props-Interface), aber der Kalender-Screen hat `klimazone: Klimazone | null`. Ein direkter Pass würde TypeScript-Fehler erzeugen und GanttStreifen mit ungültigem NaN aufrufen.
- **Fix:** Screen ruft `PflanzenKalenderZeile` mit `klimazone={klimazone ?? 4}` auf. Zone-4-Baseline ist der sicherste Fallback (identisch mit `zoneOffset()` Security Guard in kalenderEngine.ts). PLZ-InlineBanner warnt den User bereits über den fehlenden Standort.
- **Files modified:** `app/app/(app)/kalender/index.tsx`
- **Commit:** d0a6d12

**2. [Rule 2 - Missing Functionality] Filter-Chip useEffect-Sync**
- **Found during:** Task 2 implementation
- **Issue:** `meinePflanzenslugs.size > 0` ist beim ersten Render immer 0 (Hook lädt async via useEffect). Lazy-Initializer `() => meinePflanzenslugs.size > 0` gibt daher immer `false` zurück, auch wenn nach dem Laden Pflanzen vorhanden sind.
- **Fix:** `useEffect(() => { if (meinePflanzenslugs.size > 0) setNurMeinePflanzen(true); }, [meinePflanzenslugs.size])` — korrigiert nach dem ersten erfolgreichen Data-Load. Matches UI-SPEC Filter-Chip-Kontrakt "Default AN wenn ≥1 Pflanze mit plantSlug".
- **Files modified:** `app/app/(app)/kalender/index.tsx`
- **Commit:** d0a6d12

## TDD Gate Compliance

- RED commit: `7ed76df` — `test(10-03): add failing GanttStreifen tests (CAL-01 RED gate)` — 4 Tests failed (GanttStreifen.tsx fehlend)
- GREEN commit: `471518b` — `feat(10-03): GanttStreifen + GanttLegende components (CAL-01 GREEN)` — 4/4 Tests grün
- REFACTOR: nicht erforderlich (Code war sauber nach GREEN)

## Known Stubs

None. Alle Plan-03-Komponenten vollständig implementiert und getestet. GanttStreifen Wave-0-Stub aus Plan 01 vollständig ersetzt.

Plan-04-Stub (`app/app/(app)/kalender/[slug].tsx`) existiert noch nicht — wird in Plan 04 (Pflanzen-Detail) erstellt.

## Threat Flags

No new threat surface beyond the plan's threat model.

- T-10-06 (slug injection): `router.push('/(app)/kalender/' + slug)` — slug kommt aus `PlantRow.slug` (bundled + validiert in Phase 8), nicht aus User-Freitext. Expo Router path-encoded.
- T-10-07 (klimazone null): PLZ-InlineBanner + leere wochenAktionen + klimazone??4 Fallback in PflanzenKalenderZeile implementiert.

## Self-Check: PASSED

- GanttStreifen.tsx: FOUND
- GanttLegende.tsx: FOUND
- KalenderWochenCard.tsx: FOUND
- PflanzenKalenderZeile.tsx: FOUND
- app/app/(app)/kalender/index.tsx: FOUND
- Commits 7ed76df (RED), 471518b (GREEN), d0a6d12 (Task 2): all FOUND in git log
