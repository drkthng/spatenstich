# Phase 9: Companion-Hinweis - Pattern Map

**Mapped:** 2026-05-17
**Files analyzed:** 9 (3 new, 4 modified, 2 new test files + 2 extended test files)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/src/hooks/useCompanionDetection.ts` | hook | event-driven (Zustand subscribe + useMemo derived state) | `app/src/hooks/usePlants.ts` + `app/src/stores/editorStore.ts` (subscribe block) | role-match + data-flow-match |
| `app/src/components/editor/CompanionToast.tsx` | component | request-response (prop-driven, animated) | `app/src/components/InlineBanner.tsx` | role-match |
| `app/src/components/InlineBanner.tsx` | component | request-response | `app/src/components/InlineBanner.tsx` (self — extend) | exact |
| `app/src/lib/geometry/bedLayout.ts` | utility | transform (pure function) | `app/src/lib/geometry/bedLayout.ts` (self — extend) | exact |
| `packages/shared/src/i18n/de.json` | config | transform | `packages/shared/src/i18n/de.json` (self — extend) | exact |
| `app/src/lib/geometry/__tests__/bedLayout.test.ts` | test | transform | `app/src/lib/geometry/__tests__/bedLayout.test.ts` (self — extend) | exact |
| `app/src/hooks/__tests__/useCompanionDetection.test.ts` | test | event-driven | `app/src/hooks/__tests__/usePlants.test.ts` | role-match |
| `app/src/components/editor/__tests__/CompanionToast.test.tsx` | test | request-response | `app/src/components/editor/__tests__/EditorToolbar.test.tsx` | role-match |
| `app/src/components/__tests__/InlineBanner.test.tsx` | test | request-response | `app/src/components/__tests__/ImportReview.test.tsx` | role-match |

---

## Pattern Assignments

### `app/src/hooks/useCompanionDetection.ts` (hook, event-driven)

**Primary analog:** `app/src/hooks/usePlants.ts` (TanStack hook structure, import patterns)
**Secondary analog:** `app/src/stores/editorStore.ts` lines 174-185 (Zustand subscribe pattern)

**Imports pattern** (copy from `usePlants.ts` lines 1-9, `editorStore.ts` lines 11-16):
```typescript
import * as React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { usePlants } from './usePlants';
import plantsBundle from '@spatenstich/shared/data/plants';
import type { PlanElementRow, PlantRow } from '@spatenstich/shared';
import { pointInPolygon } from '../lib/geometry/bedLayout';
```

**Zustand subscribe pattern** (copy from `editorStore.ts` lines 174-185):
```typescript
// Auto-save subscription is the established Zustand subscribe pattern — copy this shape:
useEditorStore.subscribe((state, prev) => {
  if (state.gestureActive) return;          // bail-out guard first
  if (state.elements === prev.elements) return; // ref-equality dedup (Pitfall-3 equality config)
  const mode = useAuthStore.getState().mode;
  if (mode !== 'account') return;
  for (const el of state.elements) { /* ... */ }
});
// In useCompanionDetection, use useEffect + subscribe (NOT module-level) so state
// can flow back to React. Shape:
React.useEffect(() => {
  return useEditorStore.subscribe((state, prev) => {
    if (state.elements === prev.elements) return;
    // detect changed plant element, compute toast
  });
}, [plantBySlug, companionMap]);
```

**useMemo derived state pattern** (copy from `usePlants.ts` lines 17-51 for `React.useMemo` structure):
```typescript
// usePlants.ts shows the initialDataFromBundle pattern — companion map uses same bundle import:
import plantsBundle from '@spatenstich/shared/data/plants';
// (plantsBundle as any).companions — Array<{ plantASlug, plantBSlug, relationship, source }>

const plantBySlug = React.useMemo(
  () => new Map(plants.map((p) => [p.slug, p])),
  [plants],
);
// companionMap and conflictElementIds follow the same useMemo shape
```

**useQuery hook shape** (copy from `usePlants.ts` lines 53-64):
```typescript
// useCompanionDetection consumes usePlants() — destructure like this:
const { data: plants = [] } = usePlants();
// `= []` default prevents null/undefined issues before initialData resolves
```

**Key architectural rule:** Keep `toastState` in local `React.useState` — NOT in `editorStore`. The store uses `partialize: (state) => ({ elements: state.elements })` (editorStore.ts line 147) so only elements enter undo history. Toast state in the store would either pollute history or require `partialize` changes.

---

### `app/src/components/editor/CompanionToast.tsx` (component, request-response)

**Analog:** `app/src/components/InlineBanner.tsx` (full file, 78 lines)

**Imports pattern** (from `InlineBanner.tsx` lines 1-7, extended for reanimated):
```typescript
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { AlertTriangle, CheckCircle, X } from 'lucide-react-native';
import { cn } from '@/src/lib/utils';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS,
} from 'react-native-reanimated';
```

**Component prop interface** (extend InlineBanner interface, lines 9-16):
```typescript
// InlineBanner uses:
export interface InlineBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  variant?: 'warning';
  testID?: string;
}
// CompanionToast:
export interface CompanionToastProps {
  variant: 'error' | 'success';   // required, not optional
  message: string;
  onDismiss: () => void;           // required (auto-dismiss calls this too)
  testID?: string;
}
```

**Dismiss pattern** (copy from `InlineBanner.tsx` lines 25-30):
```typescript
// InlineBanner uses local dismissed state:
const [dismissed, setDismissed] = React.useState(false);
if (dismissed) return null;
const handleDismiss = () => {
  setDismissed(true);
  onDismiss?.();
};
// CompanionToast uses exit animation then onDismiss:
// Animate opacity to 0 (150ms), then call onDismiss via runOnJS
```

**NativeWind border-left variant pattern** (copy from `InlineBanner.tsx` lines 36-41):
```typescript
// InlineBanner amber variant:
className={cn(
  'border-l-4 border-amber-500 min-h-[52px] pl-3 pr-2 py-3',
  'flex-row items-center bg-amber-50 dark:bg-amber-950 rounded-r-md'
)}
// CompanionToast error/success variants (position: absolute, bottom offset):
// error:   border-red-600   bg-red-50 dark:bg-red-950
// success: border-green-600 bg-green-100 dark:bg-green-950
```

**X button pattern** (copy from `InlineBanner.tsx` lines 51-60):
```typescript
<Pressable
  onPress={handleDismiss}
  accessibilityRole="button"
  accessibilityLabel="Hinweis schließen"
  className="min-h-[44px] min-w-[44px] items-center justify-center"
  hitSlop={8}
>
  <X size={16} color="#78716C" />
</Pressable>
```

**Positioning:** `position: 'absolute'`, `bottom: toolbarHeight + 16`, `left: 16`, `right: 16`. Add `pointerEvents="box-none"` on the wrapper so the canvas below remains interactive.

**Auto-dismiss:** Use `React.useEffect` with `setTimeout(onDismiss, 4000)`. Clear on unmount.

---

### `app/src/components/InlineBanner.tsx` — MODIFY (add error/success variants)

**Analog:** Self (current implementation, 78 lines)

**Current variant type** (line 14):
```typescript
variant?: 'warning';
```

**Change to:**
```typescript
variant?: 'warning' | 'error' | 'success';
```

**Add variant styles map** (insert after imports, before component, following the PLAN_COLORS pattern from EditorCanvas.tsx line 19):
```typescript
const VARIANT_STYLES = {
  warning: {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950',
    iconColor: '#D97706',
    Icon: AlertCircle,
  },
  error: {
    border: 'border-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    iconColor: '#DC2626',
    Icon: AlertTriangle,
  },
  success: {
    border: 'border-green-600',
    bg: 'bg-green-100 dark:bg-green-950',
    iconColor: '#16A34A',
    Icon: CheckCircle,
  },
} as const;
```

**Icon imports to add** (line 6, currently only `AlertCircle, X`):
```typescript
import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react-native';
```

**Replace hardcoded amber styles** (lines 36-41) with `VARIANT_STYLES[variant ?? 'warning']` lookup. Replace `<AlertCircle>` with the dynamic `Icon` from the variant map.

---

### `app/src/lib/geometry/bedLayout.ts` — MODIFY (add pointInPolygon)

**Analog:** Self (current implementation, 35 lines)

**Current exports pattern** (lines 6-9, 18-34):
```typescript
// Pure utility, no imports — stays the same:
export interface Point2D { x: number; y: number; }
export interface Bbox { xM: number; yM: number; widthM: number; heightM: number; }
export function polygonToBbox(points: Point2D[]): Bbox { /* ... */ }
```

**Add after `polygonToBbox`** — same pure-function, no-import style:
```typescript
/**
 * Ray-casting point-in-polygon test (D-05, Phase 9).
 * Returns true if `point` is strictly inside `polygon`.
 * Points exactly on an edge: undefined (acceptable for garden use).
 * Handles convex and concave polygons. O(n) where n = vertex count.
 */
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

**Security guard:** The `if (polygon.length < 3) return false` guard (not throw) is intentional — bad provenance data should silently fail to match, not crash detection.

---

### `packages/shared/src/i18n/de.json` — MODIFY (add companion.* keys)

**Analog:** Self — existing structure (lines 1-120+), `{{variable}}` interpolation established.

**Existing interpolation examples** (lines 27-49) show the `{{variable}}` pattern in use across all string keys. Follow the same style.

**Add at end of JSON** (before closing `}`), following the flat-namespace pattern of `"errors"`, `"auth"`, `"rules"`:
```json
"companion": {
  "conflict_single": "⚠ Konflikt: {{plantA}} verträgt sich nicht mit {{plantB}}",
  "conflict_multi": "⚠ Konflikt: {{plantA}} verträgt sich nicht mit {{others}}",
  "good_single": "✓ Gute Nachbarschaft: {{plantA}} + {{plantB}}",
  "good_multi": "✓ Gute Nachbarschaft: {{plantA}} + {{others}}",
  "dismiss": "Hinweis schließen"
}
```

**Note on emojis:** CLAUDE.md memory entry `feedback_german_umlauts.md` mandates UTF-8. The ⚠ and ✓ characters are literal UTF-8 — do not use ASCII substitutes. Write them directly.

---

## Test Pattern Assignments

### `app/src/lib/geometry/__tests__/bedLayout.test.ts` — EXTEND

**Jest project:** `editor`
**Analog:** Self (current file, 74 lines) — append new `describe` block.

**Test structure pattern** (copy from existing `bedLayout.test.ts` lines 1-6):
```typescript
import { polygonToBbox, pointInPolygon, type Point2D } from '../bedLayout';
// Same import style — just add pointInPolygon to the import

describe('geometry.bedLayout > pointInPolygon', () => {
  it('returns false for polygon with fewer than 3 points', () => { /* ... */ });
  it('point inside unit square returns true', () => { /* ... */ });
  it('point outside unit square returns false', () => { /* ... */ });
  it('point on vertex: implementation-defined (test documents behavior)', () => { /* ... */ });
  it('concave polygon: point inside concavity returns false', () => { /* ... */ });
});
```

---

### `app/src/hooks/__tests__/useCompanionDetection.test.ts` — NEW

**Jest project:** `hooks` (testMatch: `**/src/hooks/__tests__/**/*.test.ts?(x)`)
**Analog:** `app/src/hooks/__tests__/usePlants.test.ts` (full file, 117 lines)

**Test file header pattern** (copy from `usePlants.test.ts` lines 1-10):
```typescript
// Phase 9 Plan XX: useCompanionDetection — companion detection logic (COMP-01-b/c/d/k/l).
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
```

**Mock pattern** (copy from `usePlants.test.ts` lines 12-22):
```typescript
// usePlants.test.ts mocks:
const mockLoadAllPlants = jest.fn();
jest.mock('../../lib/plantRepo', () => ({
  loadAllPlants: (...args: unknown[]) => mockLoadAllPlants(...args),
}));
jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
// useCompanionDetection also needs editorStore mock:
jest.mock('../../stores/editorStore', () => { /* mock useEditorStore with subscribe */ });
```

**QueryClient wrapper pattern** (copy from `usePlants.test.ts` lines 25-37):
```typescript
function wrap(qc: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}
function newQC(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}
```

**Test fixture slugs:** Use `'kartoffel'`/`'tomate'` for incompatible (verified pair in plants.json) and `'tomate'`/`'basilikum'` for companion. Do NOT use `'fenchel'` — it has no incompatible pair in the actual data (RESEARCH.md Pitfall 7).

---

### `app/src/components/editor/__tests__/CompanionToast.test.tsx` — NEW

**Jest project:** `editor` (testMatch: `**/src/components/editor/__tests__/**/*.test.ts?(x)`)
**Analog:** `app/src/components/editor/__tests__/EditorToolbar.test.tsx` (full file, 293 lines)

**Test file header and mock pattern** (copy from `EditorToolbar.test.tsx` lines 1-7, 34-51):
```typescript
// Phase 9 Plan XX: CompanionToast component tests (COMP-01-e/f/g/h).
import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Mock reanimated (editor project setup already handles this via setup.ts)
// lucide-react-native global mock already in components/editor/__tests__/setup.ts (Phase 6.5 P05)
import { CompanionToast } from '../CompanionToast';
```

**Timer mock for auto-dismiss** (COMP-01-g):
```typescript
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

it('auto-dismisses after 4000ms', () => {
  const onDismiss = jest.fn();
  render(<CompanionToast variant="error" message="test" onDismiss={onDismiss} />);
  act(() => { jest.advanceTimersByTime(4000); });
  expect(onDismiss).toHaveBeenCalled();
});
```

**testID assertions** (copy testID query pattern from `EditorToolbar.test.tsx` lines 85-93):
```typescript
it('renders error variant with testID companion-toast-error', () => {
  const { getByTestId } = render(
    <CompanionToast variant="error" message="Konflikt" onDismiss={jest.fn()} testID="companion-toast-error" />
  );
  expect(getByTestId('companion-toast-error')).toBeTruthy();
});
```

---

### `app/src/components/__tests__/InlineBanner.test.tsx` — NEW

**Jest project:** `components` (testMatch: `**/src/components/__tests__/**/*.test.ts?(x)`)
**Analog:** `app/src/components/__tests__/ImportReview.test.tsx` (header/mock pattern)

**Test file header** (copy from `ImportReview.test.tsx` lines 1-3):
```typescript
// Phase 9 Plan XX: InlineBanner error/success variants (COMP-01-i/j).
// Framework: jest components project (jsdom env). Setup: ./setup.ts (NativeWind mock).
import * as React from 'react';
import { render } from '@testing-library/react-native';
import { InlineBanner } from '../InlineBanner';
```

**Style assertion pattern** (copy from `EditorToolbar.test.tsx` lines 131-136 for style prop assertions):
```typescript
// For border color variants, assert className presence via accessible queries or
// snapshot the rendered output. Since NativeWind is mocked in the components project
// setup, assert on testID + text content rather than computed styles:
it('error variant renders with testID and message', () => {
  const { getByTestId } = render(
    <InlineBanner variant="error" message="Fehler" testID="banner-error" />
  );
  expect(getByTestId('banner-error')).toBeTruthy();
});
```

---

## Shared Patterns

### Zustand subscribe (used in useCompanionDetection)

**Source:** `app/src/stores/editorStore.ts` lines 173-185
**Apply to:** `useCompanionDetection.ts`

```typescript
// Established module-level subscribe pattern (autosave):
useEditorStore.subscribe((state, prev) => {
  if (state.gestureActive) return;
  if (state.elements === prev.elements) return;  // ref-equality short-circuit
  // ...
});
// useCompanionDetection uses this inside useEffect to allow React state output:
React.useEffect(() => {
  return useEditorStore.subscribe((state, prev) => {
    if (state.elements === prev.elements) return;
    // compute toast, call setToastState
  });
}, [deps]);
```

### NativeWind className + cn() utility

**Source:** `app/src/components/InlineBanner.tsx` lines 7, 36-41
**Apply to:** `CompanionToast.tsx`, modified `InlineBanner.tsx`

```typescript
import { cn } from '@/src/lib/utils';
// Usage: cn('base-classes', conditionalClass && 'extra-class')
// Color tokens: amber-500 (warning), red-600 (error), green-600 (success)
// Dark mode via dark: prefix — always pair light/dark: bg-red-50 dark:bg-red-950
```

### Lucide icon import

**Source:** `app/src/components/InlineBanner.tsx` line 6
**Apply to:** `CompanionToast.tsx`, modified `InlineBanner.tsx`

```typescript
import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react-native';
// AlertCircle → warning, AlertTriangle → error, CheckCircle → success
// jest mock for lucide-react-native already configured in components/__tests__/setup.ts
```

### Skia Path primitive

**Source:** `app/src/components/editor/EditorCanvas.tsx` lines 9-15 (imports block)
**Apply to:** `EditorCanvas.tsx` modification (triangle overlay)

```typescript
// Current import (line 9-15):
import {
  Canvas, Group, Rect, Circle, Line,
} from '@shopify/react-native-skia';
// Add Path to this import — Path is NOT currently imported (RESEARCH.md verified):
import {
  Canvas, Group, Rect, Circle, Line, Path,
} from '@shopify/react-native-skia';
```

**Triangle path coordinates are in garden-metres** (not pixels). The outer `Group transform={transform}` (EditorCanvas.tsx line 229) applies px/m scaling. Use a constant metre size (e.g., `0.3` metres ≈ 15px at 50px/m initial scale):

```typescript
const TRIANGLE_SIZE_M = 0.3; // metres — fixed physical size at all zoom levels
// SVG path: right-pointing triangle in garden-metre coords:
// M 0 0 L {size} {size/2} L 0 {size} Z
```

### provenance free-form Record pattern

**Source:** `app/src/stores/editorStore.ts` lines 97-110 (`commitRotation`) and lines 112-133 (`polygonCommit`)
**Apply to:** `draftPromotionRepo.ts` modification (add `plantSlug` to provenance)

```typescript
// Established pattern for provenance mutation:
const prevProv = (current.provenance ?? {}) as Record<string, unknown>;
const nextProvenance = {
  ...prevProv,
  rotateDeg: prevRot + (rotationRadians * 180) / Math.PI,  // example
};
useEditorStore.getState().updateElement(sel, { provenance: nextProvenance });
// For plantSlug write path:
provenance: {
  ...(existingProvenance ?? {}),
  plantSlug: matchedPlant?.slug ?? null,
  parentBedId: parentBed?.id ?? null,
}
```

### plants.json bundle import

**Source:** `app/src/hooks/usePlants.ts` lines 3-4, 17-19
**Apply to:** `useCompanionDetection.ts`

```typescript
import plantsBundle from '@spatenstich/shared/data/plants';
// Access: (plantsBundle as any).plants — PlantRow array (90 entries)
// Access: (plantsBundle as any).companions — companion pair array (38 entries)
//   Each entry: { plantASlug, plantBSlug, relationship, source, notes }
//   relationship values: 'companion' | 'incompatible' | 'neutral'
//   7 incompatible pairs: kartoffel/tomate, busch-bohne/speisezwiebel,
//     moehre/petersilie-glatt, erdbeere/weisskohl, gurke/tomate,
//     kartoffel/kuerbis-hokkaido, erbse/speisezwiebel
```

---

## No Analog Found

All Phase 9 files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `app/src/hooks/`, `app/src/components/`, `app/src/components/editor/`, `app/src/stores/`, `app/src/lib/geometry/`, `app/src/lib/`, `packages/shared/src/i18n/`
**Files read:** 12 source files + jest.config.ts
**Pattern extraction date:** 2026-05-17

**Jest project assignments confirmed:**
- `useCompanionDetection.test.ts` → `hooks` project (`**/src/hooks/__tests__/**`)
- `CompanionToast.test.tsx` → `editor` project (`**/src/components/editor/__tests__/**`)
- `InlineBanner.test.tsx` → `components` project (`**/src/components/__tests__/**`)
- `bedLayout.test.ts` (extend) → `editor` project (`**/src/lib/geometry/__tests__/**`)
