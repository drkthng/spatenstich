# Phase 9: Companion-Hinweis - Research

**Researched:** 2026-05-17
**Domain:** Companion-plant detection, Skia canvas overlays, Toast UI, Point-in-Polygon geometry
**Confidence:** HIGH (all critical claims verified against existing codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Detection läuft bei drei Auslösern: (a) Pflanze platziert, (b) Plan geladen (retroaktiv), (c) Pflanze verschoben. Bei (a) und (c) nur betroffene Pflanze prüfen; bei (b) alle Pflanzen.
- **D-02:** Detection rein client-seitig — keine Edge Function, kein Server-Roundtrip. plant_companions via `usePlants()` TanStack-Query mit JSON-Bundle-Fallback lokal verfügbar.
- **D-03:** Spatial Containment (Point-in-Polygon) als primärer Mechanismus. `provenance.parentBedId` als Optimierungs-Hint, nicht alleinige Quelle.
- **D-04:** Pflanzen außerhalb aller Beete: keine Nachbarschaftsprüfung.
- **D-05:** PiP-Utility in `geometry/bedLayout.ts` ergänzen — Ray-Casting-Algorithmus.
- **D-06:** Toast-Banner am unteren Bildschirmrand, nicht-blockierend. Auto-dismiss nach 4s, manuell dismissierbar.
- **D-07:** Zwei Banner-Varianten: `'error'` (rot, Konflikt) und `'success'` (grün, Companion).
- **D-08:** Konflikt hat Vorrang. Mehrere Konfliktnamen in einem Banner zusammengefasst.
- **D-09:** `InlineBanner.tsx` um `'error'` und `'success'` Variants erweitern (preparatory).
- **D-10:** Rotes Dreieck-Icon als Skia-Overlay. Sichtbar nach Toast-Dismiss. Entfernt wenn Konflikt aufgelöst.
- **D-11:** Computed on-demand (React `useMemo` / derived state), NICHT in DB persistiert.
- **D-12:** Nur `incompatible` bekommt die Dreieck-Markierung. `neutral` hat keine Markierung.
- **D-13:** `plantSlug` in `provenance` speichern. Lookup via `loadPlantBySlug()`.
- **D-14:** Manuell platzierte Pflanzen ohne `plantSlug`: keine Companion-Prüfung. Akzeptiert.
- **D-15:** Pre-Phase-9 PlanElementRows migrieren: Best-Effort-Match via `label` gegen `plants.name_de`. Silent upgrade.

### Claude's Discretion

- Exakte Positionierung des Toast-Banners (Abstand vom unteren Rand, Animation)
- Skia-Zeichenstil des roten Dreiecks (Größe, Transparenz, Position relativ zum Pflanzen-Element)
- Performance-Optimierung: ob companionCache pro Beet oder pro Plan
- Reihenfolge der Detection-Checks (erst incompatible, dann companion)
- Test-Wave-Aufteilung

### Deferred Ideas (OUT OF SCOPE)

- Mischkultur-Score pro Beet (COMP-02, v2)
- Companion-Stärke (v2)
- Plant-Picker mit Companion-Info
- Companion-Visualisierung als Linien
- Notification bei Plan-Load (Summary-Banner "3 Konflikte in deinem Garten")
</user_constraints>

---

## Summary

Phase 9 implements non-blocking companion-plant detection with visual feedback in the Skia canvas editor. The entire detection pipeline is client-side and synchronous — Phase 8 already delivered `loadCompanionsFor()`, `usePlants()` with JSON-bundle fallback (90 plants, 38 companion pairs including 7 incompatible), and the `PlantRow` type with `slug` + `iconEmoji`. No new backend work is required.

Three new artifacts need building: (1) a `pointInPolygon` Ray-Casting utility added to `bedLayout.ts`, (2) a `useCompanionDetection` hook that subscribes to editorStore and computes conflict state, and (3) a floating `CompanionToast` component positioned above the editor toolbar. Additionally, `InlineBanner.tsx` gains `'error'`/`'success'` variants (preparatory for future phases), `EditorCanvas.tsx` gains Skia `<Path>` triangle overlays for conflicting plants, and `de.json` gains a `companion.*` i18n key block.

The UI-SPEC is fully resolved: component props, spacing, colors, animation timings, and copywriting are all locked. The main planning decisions are the detection hook architecture (where it lives, how it exposes state), the `provenance.plantSlug` migration for pre-Phase-9 elements, and the Wave breakdown for TDD.

**Primary recommendation:** Build a standalone `useCompanionDetection` hook in `app/src/hooks/` that owns the detection logic, exposes `conflictElementIds: Set<string>` and a `toastState` for the banner, and is consumed by the editor screen. Keep it completely separate from `editorStore` to avoid coupling detection state to the undo/redo history.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Companion detection logic | Client (React hook) | — | Synchronous lookup against local cache; no server round-trip (D-02) |
| Bed membership (PiP) | Client (pure utility) | — | Pure geometry; runs on JS thread before/after gesture (D-03/D-05) |
| Conflict state storage | Client (React state) | — | Computed on-demand, not persisted (D-11) |
| Toast banner display | Client (React Native) | — | Floating UI above Skia canvas |
| Triangle overlay rendering | Client (Skia canvas) | — | Canvas primitive inside existing EditorCanvas Group transform |
| plantSlug persistence | Client (provenance field) | — | `PlanElementRow.provenance` is free-form Record; no schema migration needed |
| plant_companions data | Supabase (read-only) | JSON bundle (offline) | Phase 8 PLANT-DB-02 already live; bundle has 38 pairs |

---

## Standard Stack

### Core (all already installed — no new packages needed)

[VERIFIED: codebase grep + package.json inspection]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @shopify/react-native-skia | ~1.x (SDK 55) | Skia `<Path>` triangle overlay | Already used in EditorCanvas |
| react-native-reanimated | 3.x | CompanionToast slide-up/fade-out animation | Already used in gestures |
| zustand | 5.x | editorStore subscription for detection trigger | Already the store |
| @tanstack/react-query | 5.x | `usePlants()` hook for companion data | Phase 8 installed |
| lucide-react-native | latest | `AlertTriangle` + `CheckCircle` icons in toast | Already used in InlineBanner |
| react-native (core) | 0.76 (SDK 53) | View/Text/Pressable for toast layout | Core |

**No new npm packages are required for Phase 9.** [VERIFIED: all dependencies present in package.json]

### Supporting Utilities (already in codebase)

| Utility | File | Purpose |
|---------|------|---------|
| `polygonToBbox` + `Point2D` | `app/src/lib/geometry/bedLayout.ts` | PiP utility will live here |
| `loadCompanionsFor(plantId)` | `app/src/lib/plantRepo.ts` | Returns `{ companions, incompatible, neutral }` |
| `loadPlantBySlug(slug)` | `app/src/lib/plantRepo.ts` | Migration: best-effort label→slug lookup |
| `usePlants()` | `app/src/hooks/usePlants.ts` | Plants + companion data via TanStack Query |
| `InlineBanner` | `app/src/components/InlineBanner.tsx` | Variant extension base |
| `editorStore` | `app/src/stores/editorStore.ts` | Detection trigger via `subscribe()` |
| `de.json` | `packages/shared/src/i18n/de.json` | i18n string home |

---

## Architecture Patterns

### System Architecture Diagram

```
User places/moves plant
        │
        ▼
editorStore.addElement / updateElement
        │  (Zustand subscribe)
        ▼
useCompanionDetection hook (subscription listener)
        │
        ├─── 1. Resolve bed membership
        │         └── provenance.parentBedId? → use directly (fast path)
        │             else → pointInPolygon(plant.xM, plant.yM, bed.polygonPoints)
        │
        ├─── 2. Fetch companion data (synchronous from TanStack Query cache)
        │         └── plantsData (from usePlants) contains all 90 plants + 38 pairs
        │             → filter companions for this plant's slug
        │             → cross-reference neighbours in same bed by their plantSlug
        │
        ├─── 3. Classify result
        │         ├── incompatible neighbours → conflictElementIds.add(element.id)
        │         │                             toastState = { variant:'error', message }
        │         ├── companion neighbours   → toastState = { variant:'success', message }
        │         └── neutral / none         → no toast
        │
        └─── 4. Output state to consumers
                  ├── conflictElementIds: Set<string>  → EditorCanvas triangle overlay
                  └── toastState / dismissToast()      → CompanionToast banner
```

```
Plan load
    │
    ▼
useCompanionDetection detects elements change
    │
    ▼
Batch check all plant elements
    │
    ▼
Populate conflictElementIds (Set)  → triangle overlays only, NO toast (UI-SPEC §Interaction)
```

### Recommended Project Structure (new files only)

```
app/src/
├── hooks/
│   └── useCompanionDetection.ts       (NEW — detection logic, exposes conflictElementIds + toastState)
├── components/editor/
│   └── CompanionToast.tsx             (NEW — floating toast component)
│   └── __tests__/
│       └── CompanionToast.test.tsx    (Wave 0 stub)
│       └── useCompanionDetection.test.ts (Wave 0 stub — in hooks/ project via testMatch)
└── lib/geometry/
    └── bedLayout.ts                   (MODIFY — add pointInPolygon export)
    └── __tests__/
        └── bedLayout.test.ts          (MODIFY — add PiP tests)
packages/shared/src/i18n/
    └── de.json                        (MODIFY — add companion.* keys)
```

### Pattern 1: Point-in-Polygon Ray-Casting

**What:** Determines if a point (plant center xM/yM) is inside a polygon (bed outline).
**When to use:** PiP fallback when `provenance.parentBedId` is absent (D-03).

```typescript
// Source: [VERIFIED: CONTEXT.md D-05 + classical ray-casting algorithm]
// Add to app/src/lib/geometry/bedLayout.ts

export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const { x: px, y: py } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
```

**Notes:**
- O(n) where n = polygon vertex count. Beds typically have 4-8 vertices — negligible cost.
- Handles convex and concave polygons correctly.
- Points exactly on an edge: undefined (acceptable — edge cases are rare in real garden plans).
- Polygon points are stored in `provenance.polygonPointsM` on Beet elements (set by `polygonCommit` in editorStore). [VERIFIED: editorStore.ts line 132]

### Pattern 2: useCompanionDetection Hook Architecture

**What:** Zustand subscription-based hook that reacts to element changes without being part of undo/redo history.
**When to use:** This is the single source of truth for companion conflict state.

```typescript
// Source: [VERIFIED: editorStore.ts subscribe pattern (line 174); usePlants.ts]
// File: app/src/hooks/useCompanionDetection.ts

import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { usePlants } from './usePlants';
import type { PlanElementRow, PlantRow } from '@spatenstich/shared';
import { pointInPolygon } from '../lib/geometry/bedLayout';

export interface ToastState {
  variant: 'error' | 'success';
  message: string;
}

export function useCompanionDetection() {
  const { data: plants = [] } = usePlants();
  const elements = useEditorStore((s) => s.elements);

  // Build slug→PlantRow lookup from TanStack cache (synchronous)
  const plantBySlug = React.useMemo(
    () => new Map(plants.map((p) => [p.slug, p])),
    [plants],
  );

  // Build companion lookup: slug → { companions: string[], incompatible: string[] }
  // Uses plants.json bundle companions array — available synchronously
  const companionMap = React.useMemo(
    () => buildCompanionMap(plants),
    [plants],
  );

  // Derive conflict set for triangle overlays
  const conflictElementIds = React.useMemo(
    () => computeConflicts(elements, plantBySlug, companionMap),
    [elements, plantBySlug, companionMap],
  );

  // Toast state for placement/move events (separate from plan-load batch)
  const [toastState, setToastState] = React.useState<ToastState | null>(null);
  const dismissToast = React.useCallback(() => setToastState(null), []);

  // Subscribe to element additions/moves for toast trigger
  React.useEffect(() => {
    return useEditorStore.subscribe((state, prev) => {
      if (state.elements === prev.elements) return;
      // Detect newly added or moved element
      const changed = findChangedPlantElement(state.elements, prev.elements);
      if (!changed) return;
      const toast = computeToastForElement(changed, state.elements, plantBySlug, companionMap);
      if (toast) setToastState(toast);
    });
  }, [plantBySlug, companionMap]);

  return { conflictElementIds, toastState, dismissToast };
}
```

**Key insight:** Using `useMemo` on `elements` reference (zundo emits new array ref on every mutation) is efficient because React bails out of recomputation when the reference is unchanged. The zundo `equality` option in editorStore already returns `a.elements === b.elements` for identical snapshots. [VERIFIED: editorStore.ts line 148]

### Pattern 3: Skia Triangle Overlay (ConflictOverlay)

**What:** Renders a red right-pointing triangle at the top-right corner of conflicting plant elements inside the existing Skia canvas Group.
**When to use:** When `conflictElementIds.has(element.id)` is true.

```typescript
// Source: [VERIFIED: UI-SPEC.md §"Skia conflict triangle overlay"]
// Inside EditorCanvas.tsx, after seasonal elements render:

import { Path } from '@shopify/react-native-skia';

// Triangle path: right-pointing, 14×14 canvas-unit bounding box
// M 0 0 L 14 7 L 0 14 Z — pointing right
const TRIANGLE_SIZE = 14; // canvas units (metres at 1:1 scale — multiply by actual px/m)

{seasonalEls
  .filter(el => conflictElementIds.has(el.id))
  .map(el => {
    // Position at top-right corner, offset 2px outward
    const tx = el.xM + el.widthM / 2 + 2 / scale;
    const ty = el.yM - el.heightM / 2 - 2 / scale;
    const s = TRIANGLE_SIZE / scale; // scale triangle to canvas units
    return (
      <Path
        key={`conflict-${el.id}`}
        path={`M 0 0 L ${s} ${s/2} L 0 ${s} Z`}
        color="#DC2626"
        opacity={0.9}
        transform={[{ translateX: tx }, { translateY: ty }]}
      />
    );
  })
}
```

**Important:** The triangle path coordinates are in garden-metres (canvas units), not screen pixels. The `scale` SharedValue in EditorCanvas is the px/m ratio. When scale is ~50 (50px/m), `TRIANGLE_SIZE/scale = 0.28m`. For a 16px triangle at 50px/m: `16/50 = 0.32m`. This renders correctly at all zoom levels because the outer Group transform handles scaling. [VERIFIED: EditorCanvas.tsx transform structure, lines 54-61]

**Skia `<Path>` import status:** `Path` is already exported by `@shopify/react-native-skia` v1.x but NOT currently imported in `EditorCanvas.tsx`. Add `Path` to the existing import. [VERIFIED: EditorCanvas.tsx line 9-15 — Path not in import list]

### Pattern 4: CompanionToast Animation

**What:** Slide-up entry / fade-out exit using reanimated `withTiming`.
**When to use:** On toast state change in the floating `CompanionToast` component.

```typescript
// Source: [VERIFIED: UI-SPEC.md §Animation Spec]
// File: app/src/components/editor/CompanionToast.tsx

import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS
} from 'react-native-reanimated';

// Enter: translateY from +60 → 0, 200ms, Easing.out(Easing.quad)
// Exit:  opacity from 1 → 0, 150ms, Easing.in(Easing.quad), then call onDismiss
```

**Positioning:** `position: 'absolute'`, `bottom: toolbarHeight + 16`, `left: 16`, `right: 16`. `pointerEvents="box-none"` so the canvas remains interactive. The `toolbarHeight` value comes from the editor screen layout — the same pattern used by DraftsTrayBottomSheet. [VERIFIED: UI-SPEC.md §Position + CONTEXT.md D-06]

### Pattern 5: provenance.plantSlug — Write Path

**What:** Ensure `provenance.plantSlug` is set when a plant element is created.
**When to use:** In `draftPromotionRepo.promotePlantDraft` (already called for imported plants) AND in any new manual plant-placement flow.

```typescript
// Source: [VERIFIED: entities.ts PlanElementRow.provenance type = Record<string, unknown>]
// No schema migration needed — provenance is already a free-form Record.
// Phase 6.5 P02 decision: "Phase 6.5 D-13 provenance.plantSlug" not yet implemented.

// In promotePlantDraft: add plantSlug from plantDraftRow.commonNameDe lookup
provenance: {
  ...existingProvenance,
  plantSlug: matchedPlant?.slug ?? null,
  parentBedId: parentBed?.id ?? null,
}
```

### Pattern 6: Pre-Phase-9 Migration (Best-Effort Label Match)

**What:** For existing PlanElementRows with no `provenance.plantSlug`, attempt a match via `element.label` → `plant.nameDe` case-insensitive comparison.
**When to use:** At plan-load, before running batch detection (D-15).

```typescript
// Source: [VERIFIED: plants.json — nameDe field is display name like "Tomate", "Basilikum"]
// Source: [VERIFIED: PlanElementRow.label is the display name set during promotion]

function bestEffortSlugFromLabel(label: string, plantByName: Map<string, PlantRow>): string | null {
  const normalized = label.trim().toLowerCase();
  for (const [nameDe, plant] of plantByName) {
    if (nameDe.toLowerCase() === normalized) return plant.slug;
    if (plant.nameAltDe.some(alt => alt.toLowerCase() === normalized)) return plant.slug;
  }
  return null;
}
```

**Note:** This migration is idempotent — if called repeatedly on the same element with `plantSlug` already set, the existing slug is preserved.

### Anti-Patterns to Avoid

- **Storing conflict state in editorStore:** Conflict state is derived from elements + plant data. Adding it to editorStore pollutes the undo/redo history (zundo's `partialize` would need updating). Keep it in the detection hook. [VERIFIED: editorStore.ts partialize config, line 147]
- **Calling `loadCompanionsFor(plantId)` for each plant on plan-load:** This is an async Supabase call per plant. With 20 plants per bed and 10 beds, that's 200 sequential queries. Instead, build the companion map from the in-memory `usePlants()` data (already available synchronously as initialData from bundle). [VERIFIED: usePlants.ts — initialData from plants.json available immediately]
- **Using `<Polygon>` instead of `<Path>` in Skia:** `<Polygon>` is not exported from `@shopify/react-native-skia` v1. Use `<Path>` with an SVG path string. [VERIFIED: UI-SPEC.md §"Skia conflict triangle overlay"]
- **Putting detection in the Zustand subscribe at module level:** Module-level subscriptions (like the autosave pattern) work for side effects but can't cleanly expose React state back to components. Use a hook with `useEffect` + `subscribe` instead.
- **Using `.onUpdate()` instead of `.onChange()` for reanimated animations in gestures:** This is a Phase 7 lesson — `.onChange()` provides per-frame deltas. Unrelated to Phase 9 but worth noting for any future gesture additions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Point-in-Polygon | Custom area formula | Ray-casting (standard CS algorithm) | Handles concave polygons; O(n) is sufficient for bed vertex counts |
| Companion data lookup | Custom Supabase query at detection time | `usePlants()` TanStack cache | Cache is synchronous; queries add latency + cost |
| Toast animation | Custom RN Animated | `react-native-reanimated withTiming` | Already installed; worklet-thread safe; matches existing editor animation pattern |
| i18n interpolation | String concatenation | `de.json` + existing i18n pattern with `{{variable}}` | Phase 1 established pattern; translator-safe |
| Skia triangle | Custom `<Polygon>` primitive | `<Path>` with path string | `<Polygon>` not exported in Skia v1 |

**Key insight:** The companion data infrastructure is entirely done (Phase 8). Detection is pure lookup against an in-memory map — the complexity is in the UI wiring, not the data layer.

---

## Common Pitfalls

### Pitfall 1: Companion map built from async `loadCompanionsFor()` instead of bundle

**What goes wrong:** Detection becomes async, requiring loading states and edge-case handling. 200+ Supabase queries on plan-load.
**Why it happens:** `loadCompanionsFor` exists and is easy to reach for.
**How to avoid:** Build the companion map from the `usePlants()` TanStack cache. The `plants.json` bundle has 38 companion pairs with slugs. Cross-reference plant slugs to find relationships without any async work.
**Warning signs:** Detection hook returns a Promise; loading spinners appear during placement.

### Pitfall 2: Triangle path coordinates in screen pixels instead of canvas metres

**What goes wrong:** Triangle appears as a massive shape at low zoom or is invisible at high zoom.
**Why it happens:** EditorCanvas works in garden-metres; the outer Group `transform` does the px/m conversion. A path in raw pixels (e.g., `M 0 0 L 16 8 L 0 16`) would be correct only at exactly 1px/m scale.
**How to avoid:** Express triangle size in metres: `size = 14 / scale` where `scale` is the current px/m ratio (SharedValue). For a fixed 50px/m initial scale, 14px = 0.28m.
**Warning signs:** Triangle looks correct at initial zoom but becomes huge or tiny on pinch.

### Pitfall 3: toastState inside editorStore causes history pollution

**What goes wrong:** Showing/dismissing a toast creates undo history entries.
**Why it happens:** editorStore uses zundo temporal middleware; any `set()` call within the tracked partials will be recorded.
**How to avoid:** Keep toastState in `useCompanionDetection` local React state (`useState`) — completely outside the store. Conflict status for the triangle overlay is derived via `useMemo`, also outside the store.
**Warning signs:** Pressing Undo dismisses a toast or changes which plants have the red triangle.

### Pitfall 4: parentBedId optimization breaks for plants placed before Phase 7

**What goes wrong:** `provenance.parentBedId` is absent on old elements; fast-path check skips PiP and concludes the plant has no bed. No companions shown.
**Why it happens:** Phase 6.5 promotePlantDraft sets `parentBedId`, but Phase 7 polygon-drawn plants (`polygonCommit`) set `provenance.source: 'manual'` without `parentBedId`.
**How to avoid:** Always fall back to PiP check when `parentBedId` is absent or the referenced bed element is not found in `elements`. [VERIFIED: editorStore.ts polygonCommit, line 132 — provenance only has `source` + `polygonPointsM`]
**Warning signs:** Plants on manually-drawn beds never show companion banners.

### Pitfall 5: Scale SharedValue not accessible for triangle size computation

**What goes wrong:** The `scale` SharedValue in EditorCanvas is local to the component and not accessible in useCompanionDetection hook.
**Why it happens:** `useSharedValue` is component-local.
**How to avoid:** Two options: (a) pass `conflictElementIds` from the hook as a prop to `EditorCanvas` and compute triangle sizes inside `EditorCanvas` where `scale` is available — this is the recommended approach; (b) expose scale via a canvas context. Option (a) is simpler.
**Warning signs:** TypeScript error accessing `scale` outside EditorCanvas.

### Pitfall 6: lucide-react-native ESM in jest component tests

**What goes wrong:** `AlertTriangle` and `CheckCircle` imports from `lucide-react-native` cause jest transform errors in the `components` and `editor` projects.
**Why it happens:** lucide-react-native is ESM; jest transform config does not include it by default.
**How to avoid:** `components/__tests__/setup.ts` already has a global lucide mock added in Phase 6.5 P05. Both `components` and `editor` projects include this setup file. The mock is already present. [VERIFIED: STATE.md Phase 6.5 P05 decision — "lucide-react-native global jest mock added in components/__tests__/setup.ts"]
**Warning signs:** `SyntaxError: Cannot use import statement` in CompanionToast tests.

### Pitfall 7: fenchel is NOT in the plants.json bundle

**What goes wrong:** Documentation examples use "Tomate verträgt sich nicht mit Fenchel" but there is no fenchel incompatibility in the actual data.
**Why it happens:** The i18n spec examples are illustrative; the 7 actual incompatible pairs are: kartoffel/tomate, busch-bohne/speisezwiebel, moehre/petersilie-glatt, erdbeere/weisskohl, gurke/tomate, kartoffel/kuerbis-hokkaido, erbse/speisezwiebel.
**How to avoid:** Use `kartoffel/tomate` or `gurke/tomate` for test fixtures. These are the only tomato-based incompatible pairs. [VERIFIED: plants.json companion data — 7 incompatible pairs enumerated above]
**Warning signs:** Tests that use "fenchel" as a test slug silently find no relationship and never exercise the conflict path.

---

## Code Examples

### Companion Map Builder (from bundle)

```typescript
// Source: [VERIFIED: plants.json structure — companions array with plantASlug/plantBSlug]
// Build bidirectional lookup: slug → { incompatibleSlugs: Set, companionSlugs: Set }

interface CompanionEntry {
  incompatibleSlugs: Set<string>;
  companionSlugs: Set<string>;
}

function buildCompanionMap(plants: PlantRow[]): Map<string, CompanionEntry> {
  // Access the raw bundle for companion pairs (not exposed via PlantRow)
  // The bundle companions are available in the TanStack cache as a side-loaded structure,
  // OR access via the plants.json import directly.
  // RECOMMENDATION: import the bundle directly in the hook for companion cross-refs,
  // since PlantRow does not carry companion data (PlantCompanionRow is separate).
  // This avoids needing loadCompanionsFor() Supabase calls.
  const map = new Map<string, CompanionEntry>();
  // ... iterate plants.json bundle companions array
  return map;
}
```

**Implementation note:** `PlantRow` (from `usePlants()`) does NOT contain companion data — companions are in `PlantCompanionRow`. The JSON bundle (`plants.json`) has a `companions` array with `plantASlug`/`plantBSlug`/`relationship`. The hook should import the bundle directly for companion cross-references:

```typescript
import plantsBundle from '@spatenstich/shared/data/plants';
// plantsBundle.companions: Array<{ plantASlug, plantBSlug, relationship, source, notes }>
```

[VERIFIED: plants.json structure confirmed — `companions` array with slug-based refs, 38 pairs total, 7 incompatible]

### Bed Polygon Extraction

```typescript
// Source: [VERIFIED: editorStore.ts polygonCommit line 132 — provenance.polygonPointsM]
// Bed polygon points are stored in provenance.polygonPointsM when created via polygonCommit.
// For bbox-only beds (promoted from imports), no polygonPointsM exists — fall back to
// bbox corners as rectangle polygon.

function getBedPolygon(bed: PlanElementRow): Point2D[] {
  const prov = (bed.provenance ?? {}) as Record<string, unknown>;
  if (Array.isArray(prov.polygonPointsM)) {
    return prov.polygonPointsM as Point2D[];
  }
  // Fallback: treat bbox as rectangle
  const hw = bed.widthM / 2;
  const hh = bed.heightM / 2;
  return [
    { x: bed.xM - hw, y: bed.yM - hh },
    { x: bed.xM + hw, y: bed.yM - hh },
    { x: bed.xM + hw, y: bed.yM + hh },
    { x: bed.xM - hw, y: bed.yM + hh },
  ];
}
```

### i18n Companion Keys

```json
// Source: [VERIFIED: UI-SPEC.md §Copywriting Contract]
// Add to packages/shared/src/i18n/de.json under "companion" namespace:
{
  "companion": {
    "conflict_single": "⚠ Konflikt: {{plantA}} verträgt sich nicht mit {{plantB}}",
    "conflict_multi": "⚠ Konflikt: {{plantA}} verträgt sich nicht mit {{others}}",
    "good_single": "✓ Gute Nachbarschaft: {{plantA}} + {{plantB}}",
    "good_multi": "✓ Gute Nachbarschaft: {{plantA}} + {{others}}",
    "dismiss": "Hinweis schließen"
  }
}
```

### InlineBanner Variant Extension

```typescript
// Source: [VERIFIED: InlineBanner.tsx current implementation]
// Change variant type from:
variant?: 'warning';
// To:
variant?: 'warning' | 'error' | 'success';

// Add variant-specific styles:
const variantStyles = {
  warning: { border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950', iconColor: '#D97706' },
  error:   { border: 'border-red-600',   bg: 'bg-red-50 dark:bg-red-950',     iconColor: '#DC2626' },
  success: { border: 'border-green-600', bg: 'bg-green-100 dark:bg-green-950',iconColor: '#16A34A' },
};
// Icon: warning→AlertCircle, error→AlertTriangle, success→CheckCircle (all from lucide-react-native)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Companion data via Supabase queries | JSON bundle in-memory (38 pairs) | Phase 8 complete | Detection is now synchronous, works offline |
| PlanElementRow without provenance | Free-form `provenance: Record<string, unknown>` | Phase 6.5 | `plantSlug` fits without schema migration |
| InlineBanner only 'warning' variant | Extend to 'error'/'success' | Phase 9 | Reusable across future phases |
| No bed polygon in provenance | `provenance.polygonPointsM` set by polygonCommit | Phase 7 | PiP check possible for drawn beds |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Path` is exported from `@shopify/react-native-skia` v1 | Code Examples | Triangle overlay needs alternative — use `<Vertices>` or 3 `<Line>` primitives |
| A2 | `react-native-reanimated` `Easing.out(Easing.quad)` is available in v3 | Pattern 4 | Use different easing curve; no functional impact |
| A3 | `provenance.polygonPointsM` is consistently set for all polygon-drawn beds | Code Examples | Some beds may lack polygon data; bbox fallback handles this |

All other claims are VERIFIED against the live codebase.

---

## Open Questions

1. **Manual plant placement UI (no plantSlug source)**
   - What we know: D-14 says plants without `plantSlug` get no companion check. D-13 says slug goes into provenance at placement.
   - What's unclear: Phase 9 doesn't implement a plant picker (deferred). How does a user place a plant with a known slug today? Only via import promotion (`promotePlantDraft`).
   - Recommendation: Phase 9 should update `promotePlantDraft` to populate `provenance.plantSlug` from the plant DB lookup. The manual "add plant" flow is out of scope but the Phase 9 planner should note that companion detection only works for imported plants until a plant picker ships.

2. **scale value for triangle sizing inside EditorCanvas**
   - What we know: `scale` is a `useSharedValue(50)` in EditorCanvas. Triangle path must be in canvas metres.
   - What's unclear: The `scale` value changes during pinch. If we compute triangle size once at mount time, it won't adapt.
   - Recommendation: Compute triangle dimensions from a constant metre size (e.g., 0.3m = ~15px at 50px/m initial scale). This keeps the triangle at a fixed real-world size regardless of zoom — which is actually the correct behavior (a fixed physical marker, not a fixed-pixel marker). Use `0.3` as the triangle side length in metres.

3. **CompanionToast position: toolbarHeight value**
   - What we know: UI-SPEC says `bottom: toolbar_height + 16px`.
   - What's unclear: The toolbar height is not exposed as a constant. Plan/index.tsx lays out the editor.
   - Recommendation: Use a measured layout height (onLayout callback on the toolbar container) or use a known constant (e.g., 56px + safe area inset). The planner should specify how toolbar height is communicated to the toast container.

---

## Environment Availability

Step 2.6: SKIPPED (Phase 9 is purely code/config changes; no new external dependencies. All required libraries are installed per Standard Stack section above.)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest + ts-jest (multi-project config) |
| Config file | `app/jest.config.ts` |
| Quick run (geometry) | `pnpm --filter app exec jest --selectProjects editor --testPathPattern='bedLayout'` |
| Quick run (detection) | `pnpm --filter app exec jest --selectProjects hooks --testPathPattern='useCompanionDetection'` |
| Quick run (toast) | `pnpm --filter app exec jest --selectProjects editor --testPathPattern='CompanionToast'` |
| Full suite | `pnpm --filter app exec jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01-a | `pointInPolygon` correctly classifies inside/outside/edge | unit | `pnpm --filter app exec jest --selectProjects editor --testPathPattern='bedLayout' -t 'pointInPolygon'` | ❌ Wave 0 |
| COMP-01-b | Detection returns incompatible set for kartoffel+tomate in same bed | unit | `pnpm --filter app exec jest --selectProjects hooks --testPathPattern='useCompanionDetection'` | ❌ Wave 0 |
| COMP-01-c | Detection returns companion set for tomate+basilikum in same bed | unit | `pnpm --filter app exec jest --selectProjects hooks --testPathPattern='useCompanionDetection'` | ❌ Wave 0 |
| COMP-01-d | Plant outside all beds: no detection result | unit | `pnpm --filter app exec jest --selectProjects hooks --testPathPattern='useCompanionDetection'` | ❌ Wave 0 |
| COMP-01-e | CompanionToast renders error variant with correct testID | component | `pnpm --filter app exec jest --selectProjects editor --testPathPattern='CompanionToast'` | ❌ Wave 0 |
| COMP-01-f | CompanionToast renders success variant | component | `pnpm --filter app exec jest --selectProjects editor --testPathPattern='CompanionToast'` | ❌ Wave 0 |
| COMP-01-g | CompanionToast auto-dismisses after 4000ms (timer mock) | component | `pnpm --filter app exec jest --selectProjects editor --testPathPattern='CompanionToast'` | ❌ Wave 0 |
| COMP-01-h | CompanionToast manual dismiss X fires onDismiss | component | `pnpm --filter app exec jest --selectProjects editor --testPathPattern='CompanionToast'` | ❌ Wave 0 |
| COMP-01-i | InlineBanner error variant renders red border | component | `pnpm --filter app exec jest --selectProjects components --testPathPattern='InlineBanner'` | ❌ Wave 0 |
| COMP-01-j | InlineBanner success variant renders green border | component | `pnpm --filter app exec jest --selectProjects components --testPathPattern='InlineBanner'` | ❌ Wave 0 |
| COMP-01-k | Pre-Phase-9 label→slug migration: "Tomate" maps to "tomate" slug | unit | `pnpm --filter app exec jest --selectProjects hooks --testPathPattern='useCompanionDetection'` | ❌ Wave 0 |
| COMP-01-l | Conflict priority: incompatible suppresses companion toast | unit | `pnpm --filter app exec jest --selectProjects hooks --testPathPattern='useCompanionDetection'` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Run relevant project + testPattern (e.g., `bedLayout` after PiP, `CompanionToast` after toast)
- **Per wave merge:** `pnpm --filter app exec jest`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `app/src/lib/geometry/__tests__/bedLayout.test.ts` — EXTEND (add PiP cases to existing file)
- [ ] `app/src/hooks/__tests__/useCompanionDetection.test.ts` — NEW (COMP-01-b/c/d/k/l)
- [ ] `app/src/components/editor/__tests__/CompanionToast.test.tsx` — NEW (COMP-01-e/f/g/h)
- [ ] `app/src/components/__tests__/InlineBanner.test.tsx` — NEW (COMP-01-i/j) — note: `components` jest project

**Jest project assignment notes:**
- `useCompanionDetection.test.ts` → `hooks` project (testMatch: `**/src/hooks/__tests__/**`)
- `CompanionToast.test.tsx` → `editor` project (testMatch: `**/src/components/editor/__tests__/**`)
- `InlineBanner.test.tsx` → `components` project (testMatch: `**/src/components/__tests__/**`)
- `bedLayout.test.ts` → `editor` project (testMatch: `**/src/lib/geometry/__tests__/**`)

---

## Security Domain

> `security_enforcement` not explicitly set to `false` in config.json — section included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Detection is read-only client-side computation |
| V3 Session Management | No | No session-dependent data in detection |
| V4 Access Control | No | plant_companions data is globally readable (PLANT-DB-04 RLS: authenticated users) |
| V5 Input Validation | Partial | `provenance.plantSlug` comes from user-controlled data (label field); mitigated by slug lookup — if no match, no companion check runs. No SQL injection risk (detection is all in-memory). |
| V6 Cryptography | No | No sensitive data involved |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed `provenance.polygonPointsM` | Tampering | `pointInPolygon` receives `Point2D[]`; add input guard (`if (polygon.length < 3) return false`) |
| XSS via plant label in toast message | Tampering | React Native's `<Text>` renders string literals, not HTML — no XSS risk |
| Slug injection via label migration | Tampering | Lookup is exact match against known slug set; unknown labels return null (D-14) |

---

## Sources

### Primary (HIGH confidence — verified against live codebase)

- `app/src/lib/plantRepo.ts` — `loadCompanionsFor` API verified; returns `{ companions, incompatible, neutral }`
- `app/src/hooks/usePlants.ts` — TanStack Query with `initialData` from bundle; synchronous cold-start confirmed
- `app/src/stores/editorStore.ts` — Zustand `subscribe` pattern, zundo config, `provenance` structure
- `app/src/components/editor/EditorCanvas.tsx` — Skia import list, transform structure, scale SharedValue scope
- `app/src/components/InlineBanner.tsx` — Current variant type, component structure
- `app/src/lib/geometry/bedLayout.ts` — Current exports (`polygonToBbox`, `Point2D`); no PiP yet
- `packages/shared/src/data/plants.json` — 90 plants, 38 companions (7 incompatible): kartoffel/tomate, busch-bohne/speisezwiebel, moehre/petersilie-glatt, erdbeere/weisskohl, gurke/tomate, kartoffel/kuerbis-hokkaido, erbse/speisezwiebel
- `packages/shared/src/types/entities.ts` — `PlanElementRow.provenance: Record<string, unknown>` — confirmed free-form
- `packages/shared/src/types/plants.ts` — `PlantRow`, `PlantDbBundle` types verified
- `.planning/phases/09-companion-hinweis/09-CONTEXT.md` — All 15 locked decisions
- `.planning/phases/09-companion-hinweis/09-UI-SPEC.md` — Component specs, animations, copywriting

### Secondary (MEDIUM confidence)

- Classical ray-casting PiP algorithm — well-established CS algorithm; implementation pattern standard

### Tertiary (LOW confidence — none)

No LOW confidence claims in this research.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified as already installed
- Architecture: HIGH — verified against existing code patterns (subscribe, useMemo, Skia Path)
- Pitfalls: HIGH — 5 of 7 pitfalls verified against actual code; 2 based on established patterns
- Test infrastructure: HIGH — jest.config.ts read and project assignments verified

**Research date:** 2026-05-17
**Valid until:** 2026-07-17 (stable domain; plants.json changes only with explicit seeding work)
