---
phase: 09-companion-hinweis
reviewed: 2026-05-17T14:30:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/src/lib/geometry/bedLayout.ts
  - app/src/components/InlineBanner.tsx
  - packages/shared/src/i18n/de.json
  - app/src/hooks/useCompanionDetection.ts
  - app/src/lib/draftPromotionRepo.ts
  - app/src/components/editor/CompanionToast.tsx
  - app/src/components/editor/EditorCanvas.tsx
  - app/src/components/editor/web/WebPlanEditor.tsx
  - app/app/(app)/plan/index.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-05-17T14:30:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 09 adds companion-plant detection to the garden editor. The core logic in `useCompanionDetection.ts` is well-structured: pure functions are exported separately for testability, the ray-casting PiP algorithm is correct, and the bidirectional companion map construction is clean. The toast and canvas overlay integrations are straightforward.

Key concerns: (1) the `enrichPlantSlug` function mutates store state from inside a Zustand `subscribe` callback, which can trigger an infinite re-entry loop; (2) the `useCompanionDetection` hook is called conditionally in `plan/index.tsx`, violating React's rules of hooks; (3) the i18n keys use `{{interpolation}}` syntax but the codebase has no i18n framework wired -- the hardcoded `computeToastForElement` messages bypass these keys entirely.

## Warnings

### WR-01: Infinite loop risk -- enrichPlantSlug triggers store update inside subscribe callback

**File:** `app/src/hooks/useCompanionDetection.ts:274`
**Issue:** `enrichPlantSlug` calls `useEditorStore.getState().updateElement(...)` which mutates the store. This runs inside `useEditorStore.subscribe(...)` (line 314-328). The subscribe listener fires on every state change, and `updateElement` triggers a new state change, which re-fires the subscriber. On the next iteration, `getPlantSlug(element)` returns non-null (the slug was just set), so the early return at line 270 prevents a true infinite loop -- but only because the element reference in the closure is stale. If the subscribe callback received the freshly-updated element (which it does, since `state.elements` is the new array), `findChangedPlantElement` would detect the element as "moved" (provenance changed -> element reference changed) and re-trigger `enrichPlantSlug` again. This depends on whether `updateElement` produces a new object with the same `xM/yM` -- if it does, `findChangedPlantElement` won't flag it as changed. The code is fragile: any future change to `findChangedPlantElement`'s detection logic or to `updateElement`'s mutation shape could cause an infinite loop.
**Fix:** Guard the subscribe callback against re-entry, or move enrichment out of the subscription:
```typescript
// Option A: re-entry guard
React.useEffect(() => {
  let enriching = false;
  return useEditorStore.subscribe((state, prev) => {
    if (enriching) return;
    if (state.elements === prev.elements) return;
    const changed = findChangedPlantElement(state.elements, prev.elements);
    if (!changed) return;
    enriching = true;
    enrichPlantSlug(changed, plantByNameDe);
    enriching = false;
    // compute toast from the CURRENT state (post-enrich)
    const toast = computeToastForElement(
      changed, useEditorStore.getState().elements, plantBySlug, companionMap,
    );
    if (toast) setToastState(toast);
  });
}, [plantBySlug, plantByNameDe, companionMap]);
```

### WR-02: Hook called conditionally -- violates Rules of Hooks

**File:** `app/app/(app)/plan/index.tsx:197`
**Issue:** `useCompanionDetection()` is called after two early returns (line 147 for `loading` and line 186 for `!dimensions` on native). React hooks must be called unconditionally in the same order on every render. When `loading` transitions from `true` to `false`, React sees a different number of hooks and will throw an error or produce undefined behavior. The `WebEditorShell` component correctly calls the hook unconditionally because it is a separate component, but the native path in `PlanScreen` calls it after conditional returns.
**Fix:** Move the hook call above the early returns:
```typescript
export default function PlanScreen(): React.JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const router = useRouter();
  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<PaletteTab>('beete');

  // Must be called unconditionally (Rules of Hooks)
  const { conflictElementIds, toastState, dismissToast } = useCompanionDetection();

  // ... shared values, effects ...

  if (loading) { /* early return */ }
  // ...
```

### WR-03: i18n keys defined but never used -- hardcoded German strings in computeToastForElement

**File:** `app/src/hooks/useCompanionDetection.ts:219-239`
**Issue:** `computeToastForElement` builds toast messages with hardcoded German strings (e.g., `"\u26A0 Konflikt: ..."`, `"\u2713 Gute Nachbarschaft: ..."`). Meanwhile, `packages/shared/src/i18n/de.json` defines `companion.conflict_single`, `companion.conflict_multi`, `companion.good_single`, `companion.good_multi` with `{{interpolation}}` placeholders. The i18n keys are dead code -- never referenced anywhere. This means: (a) if someone later wires up an i18n framework, the hardcoded strings won't be affected; (b) the `conflict_single` vs `conflict_multi` distinction is not reflected in the code (both single and multi use the same template).
**Fix:** Either use the i18n keys (preferred for future localization) or remove the dead keys from `de.json`. If keeping the hardcoded approach for MVP, add a comment noting the keys are reserved for future i18n integration.

### WR-04: `computeToastForElement` calls `findBedForPlant` for every neighbour -- O(n*b) per toast

**File:** `app/src/hooks/useCompanionDetection.ts:196-201`
**Issue:** The `neighbours` filter (line 196-201) calls `findBedForPlant(e, beds)` for every plant element in the plan to check if it shares the same bed as the changed element. `findBedForPlant` itself iterates all beds with `pointInPolygon` (O(b * v) where v = vertices per bed). For a plan with p plants and b beds, this is O(p * b * v) per toast computation. While this is a performance concern (normally out of scope), the real issue is correctness: this runs inside the Zustand subscribe callback on the main thread. For plans with many plants (e.g., 50+ Pflanze elements across 10+ beds), this synchronous computation blocks the JS thread during every plant placement, causing dropped frames and unresponsive UI. This crosses from "performance optimization" into "correctness: UI freezes."
**Fix:** Pre-compute bed membership for all plants once (reuse the grouping from `computeConflicts`) rather than re-running PiP per neighbour. Or memoize `findBedForPlant` results within the subscribe callback.

## Info

### IN-01: Variable shadowing -- `tx`/`ty` shadow outer Group transform values

**File:** `app/src/components/editor/EditorCanvas.tsx:275-276`
**Issue:** Local variables `tx` and `ty` (line 275-276) in the conflict triangle overlay shadow the `useSharedValue` variables `tx` and `ty` declared at line 49-50. While the current code is correct (the local `tx`/`ty` are pixel offsets for the triangle path, not the pan transform), the naming overlap is confusing and error-prone for future maintainers.
**Fix:** Rename the local variables to `markerX`/`markerY` or `triX`/`triY`.

### IN-02: Duplicate `randomId` implementation

**File:** `app/src/components/editor/web/WebPlanEditor.tsx:50-52`
**Issue:** `WebPlanEditor.tsx` has its own `randomId()` that generates `el-` prefixed IDs using `Math.random()`, while `draftPromotionRepo.ts:39-44` has a different `randomId()` that prefers `crypto.randomUUID()`. The web editor's version produces weaker IDs (no crypto, shorter, prefixed). Having two divergent ID generators risks collisions and makes the ID format inconsistent.
**Fix:** Extract a shared `randomId` utility into `app/src/lib/utils.ts` (or `packages/shared`) and import it in both files.

### IN-03: `console.error` in production path

**File:** `app/app/(app)/plan/index.tsx:79`
**Issue:** `console.error('plan: load failed', err)` is present in the data-loading effect. While not a bug, it will appear in production logs. The error is caught but not surfaced to the user -- the screen just stays in its default state with no feedback.
**Fix:** Consider setting an error state and displaying an inline error banner (the `InlineBanner` component with `variant="error"` is available for exactly this purpose).

---

_Reviewed: 2026-05-17T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
