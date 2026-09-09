# Phase 7: Plan-Editor + Drafts-Integration (M2 + M07.5) - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 38 (5 modified + 18 new + 15 new tests)
**Analogs found:** 33 / 38 (Skia / gesture-handler / zundo files are first-of-kind — framework wired but no existing analog in code; mitigations documented)

## File Classification

### Schema + Mappers + Types (Wave 1 candidates)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20260513000018_plan_elements_layer.sql` | migration | schema-change (ALTER + CHECK + backfill UPDATE) | `supabase/migrations/20260512000017_plan_elements_provenance.sql` | exact (same target table, same DO-block style, additive ALTER) |
| `packages/shared/src/types/entities.ts` (MOD) | type def | static (add `layer` field to `PlanElementRow`) | self (lines 66-80, `PlanElementRow.importedFrom/provenance` added by 6.5) | exact (same extension pattern) |
| `app/src/lib/mappers/rowMappers.ts` (MOD) | mapper | transform (camel↔snake + lazy-default for pre-018 rows) | self (lines 370-433: `planElementToLocal`/`planElementToDb` + `DbPlanElementRowLoose`) | exact |

### Repo Layer (Wave 1-2)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/src/lib/gardenPlanRepo.ts` (MOD: add `writePlanElement`) | repo | CRUD + atomic write | self (`saveDimensions` lines 27-75) + sibling `draftPromotionRepo.promoteBedDraft` lines 121-131 | exact |
| `app/src/lib/draftPromotionRepo.ts` (MOD: `promoteBedDraft` accepts `finalCoords?`) | repo | CRUD + atomic write | self (lines 74-154) | exact (additive optional param) |
| `app/src/lib/importRepo.ts` (MOD: add `loadPendingDraftsWithImportedAt`) | repo | read-only join | self (`loadPendingDrafts` block) + RESEARCH §Code Examples §9 | role-match (read-only, no write) |

### Pure Geometry + Save Helper (Wave 1, easiest to TDD)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/src/lib/geometry/viewMatrix.ts` (NEW) | utility | pure function | `app/src/lib/utils.ts` (cn helper, plain pure module) | role-match (first geometry module) |
| `app/src/lib/geometry/plantSpacing.ts` (NEW) | utility | pure function | (same) `app/src/lib/utils.ts` | role-match |
| `app/src/lib/geometry/bedLayout.ts` (NEW) | utility | pure function | `app/src/lib/draftPromotionRepo.ts` §`nextFreeBedSlot` (lines 42-64, exported pure helper in a repo file) | role-match (closest pure-geometry helper in codebase) |
| `app/src/lib/editor/saveDebounce.ts` (NEW) | utility | timer-based (Map<id, Timeout>) | `app/src/lib/sync/SyncTriggers.ts` (`scheduleWriteDebounced`, 500 ms global timer) | role-match (debounce idea, different cardinality — per-id Map vs single global) |

### Zustand Store (Wave 2)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/src/stores/editorStore.ts` (NEW) | store | event-driven (actions mutate elements + history) | `app/src/stores/importStore.ts` (transient pattern) + `app/src/stores/reviewSettingsStore.ts` (selector pattern) | role-match (transient Zustand exists; zundo temporal middleware is first-of-kind) |

### Skia Canvas + Gesture Components (Wave 3 — first-of-kind)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/src/components/editor/EditorCanvas.tsx` (NEW) | component | render (Skia, gesture-driven) | `app/src/components/GardenPlanView.tsx` (SVG renderer — `PLAN_COLORS` + sizing math reused) | role-match (visual + color contract reusable; Skia rendering itself first-of-kind) |
| `app/src/components/editor/EditorToolbar.tsx` (NEW) | component | event-driven (button callbacks → store) | `app/src/components/InlineBanner.tsx` (icon + Pressable + NativeWind row layout) | role-match |
| `app/src/components/editor/ElementPalette.tsx` (NEW) | component | event-driven (long-press → drag) | `app/src/components/ImportEntityCard.tsx` (Card layout) + RESEARCH §Code Examples §3 | role-match (palette layout from primitives; gesture composition first-of-kind) |
| `app/src/components/editor/PaletteCard.tsx` (NEW) | component | event-driven (LongPress) | `app/src/components/ImportEntityCard.tsx` (Card + testID pattern) | role-match |
| `app/src/components/editor/PolygonInProgress.tsx` (NEW) | component | render (Skia Path) | `app/src/components/GardenPlanView.tsx` lines 96-130 (SVG `<G opacity={0.4}>` + grid lines — same idea, Skia equivalent) | role-match (visualization style) |
| `app/src/components/editor/GhostRing.tsx` (NEW) | component | render (Skia Circle) | `app/src/components/GardenPlanView.tsx` lines 140-166 (Baum → Circle) | role-match (Circle component shape) |
| `app/src/components/editor/SaveStateIndicator.tsx` (NEW) | component | render (state machine: idle/saving/saved/error) | `app/src/components/SyncStatusBadge.tsx` (4-state badge with icon swap) | role-match |

### Drafts Tray + Modal (Wave 4)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/src/components/editor/DraftsTrayBottomSheet.tsx` (NEW) | component | event-driven (load + filter + drag-out) | `app/app/(app)/import/review.tsx` (sectioned ScrollView + DraftReviewCard list + load effect) | exact (reuses DraftReviewCard from 6.5 verbatim) |
| `app/src/components/editor/BedPickerModal.tsx` (NEW) | component | request-response (modal tap → callback) | `app/src/components/ImportEntityCard.tsx` (Card + testID per-item) | role-match |

### Screen + Routing (Wave 3 entrypoint)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/app/(app)/plan/index.tsx` (NEW) | screen (Expo Router) | request-response | `app/app/(app)/import/review.tsx` (Stack.Screen header + sticky/floating overlays + load effect) | exact (same router idioms, same auth+gardenId selector pattern) |
| `app/app/(app)/_layout.tsx` (MOD: register plan route) | layout config | static | self (lines 23-31, screenOptions block) | exact |
| `app/app/_layout.tsx` (MOD: add `GestureHandlerRootView`) | layout root | static | self (lines 111-119, `RootLayout` wrapper) + RESEARCH §Code Examples §10 | exact |
| `app/app/(app)/index.tsx` (MOD: add "Plan öffnen" button) | screen edit | — | self (lines 92-101, existing Button → import; new Button → `/(app)/plan`) | exact |

### i18n + Config

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/shared/src/i18n/de.json` (MOD: `editor.*` block) | i18n data | static | self (lines 209-226, `import.review.*` block added by 6.5) | exact |
| `app/jest.config.ts` (MOD: add `editor` project) | config | static | self (lines 81-105, `components` project block) | exact |

### Tests (Wave 0 — 15 files)

| New Test File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `app/src/lib/geometry/__tests__/viewMatrix.test.ts` | test (pure unit) | functional | `app/src/lib/__tests__/draftPromotionRepo.layout.test.ts` (pure-helper unit test pattern) | role-match |
| `app/src/lib/geometry/__tests__/plantSpacing.test.ts` | test (pure unit) | functional | (same) | role-match |
| `app/src/lib/geometry/__tests__/bedLayout.test.ts` | test (pure unit) | functional | (same) | role-match |
| `app/src/lib/editor/__tests__/editorSaveDebounce.test.ts` | test (timer unit) | mock-based + fake timers | `app/src/lib/sync/__tests__/backoff.test.ts` (timer + Jest fake clock pattern) | role-match |
| `app/src/stores/__tests__/editorStore.transform.test.ts` | test (store unit) | mock-based | `app/src/stores/__tests__/settingsStore.test.ts` (Zustand store test) | role-match (zundo first-of-kind) |
| `app/src/stores/__tests__/editorStore.dragdrop.test.ts` | test (store unit) | mock-based | (same) | role-match |
| `app/src/stores/__tests__/editorStore.polygon.test.ts` | test (store unit) | mock-based | (same) | role-match |
| `app/src/stores/__tests__/editorStore.undoredo.test.ts` | test (store unit + zundo) | mock-based | (same) — zundo temporal is first-of-kind | role-match |
| `app/src/components/__tests__/PlanEditor.smoke.test.tsx` | test (component) | render+interact | `app/src/components/__tests__/ImportReview.test.tsx` (jsdom + Skia/gesture mocks needed in editor setup) | exact (same framework) |
| `app/src/components/__tests__/ElementPalette.test.tsx` | test (component) | render+interact | (same) | exact |
| `app/src/components/__tests__/EditorToolbar.test.tsx` | test (component) | render+interact | (same) | exact |
| `app/src/components/__tests__/DraftsTray.test.tsx` | test (component) | render+interact + mocked repo | `app/src/components/__tests__/ImportReview.test.tsx` (mocks `draftPromotionRepo`, `importRepo`, `gardenPlanRepo`) | exact |
| `app/src/components/__tests__/stale-badge.test.tsx` | test (component) | render-only with Date.now mock | `app/src/components/__tests__/ImportReview.test.tsx` (component shape) | role-match (Date.now stub is new) |
| `app/src/lib/__tests__/rowMappers.layer.test.ts` | test (mapper unit) | pure | `app/src/lib/__tests__/rowMappers.test.ts` (existing mapper round-trip pattern) | exact |
| `app/src/components/editor/__tests__/setup.ts` | test setup | mock providers | `app/src/components/__tests__/setup.ts` (NativeWind + lucide global mocks) | exact (same shape; adds Skia + gesture-handler mocks) |

---

## Pattern Assignments

### `supabase/migrations/20260513000018_plan_elements_layer.sql` (migration, schema-change)

**Analog:** `supabase/migrations/20260512000017_plan_elements_provenance.sql`
**Why this analog:** Same target table (`plan_elements`), same DO-block invariant style, same section-header convention, same atomicity rule (no BEGIN/COMMIT). The migration immediately before this one in the project's history.

**Header pattern** (017:1-5):
```sql
-- Phase 6.5 Plan 02 Task 01: plan_elements.imported_from + provenance
-- Provides: Provenance link from plan_elements back to import_items (DRAFT-02)
-- Follows: Migration 014 pattern (sections, DO-block invariants, partial index on deletedAt IS NULL)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.
```
**For Migration 018:** `-- Phase 7 Plan 01: plan_elements.layer for two-layer editor (infrastructure | seasonal)` / `-- Follows: Migration 017 pattern (DO-block invariants, ALTER ADD COLUMN IF NOT EXISTS)`.

**Section divider pattern** (017:7-9):
```sql
-- ──────────────────────────────────────────────────────────────
-- Section 1 — Add provenance columns to plan_elements
-- ──────────────────────────────────────────────────────────────
```
**For 018:** three sections — (1) ALTER + CHECK, (2) backfill UPDATE for plants, (3) invariants.

**ALTER pattern** (017:11-13):
```sql
ALTER TABLE public.plan_elements
  ADD COLUMN IF NOT EXISTS imported_from uuid REFERENCES public.import_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provenance    jsonb;
```
**For 018 (RESEARCH §Code Examples §1):**
```sql
ALTER TABLE public.plan_elements
  ADD COLUMN IF NOT EXISTS layer text NOT NULL DEFAULT 'infrastructure';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'plan_elements_layer_check'
  ) THEN
    ALTER TABLE public.plan_elements
      ADD CONSTRAINT plan_elements_layer_check
      CHECK (layer IN ('infrastructure','seasonal'));
  END IF;
END $$;
```

**Invariant DO-block pattern** (017:30-46) — replicate verbatim shape:
```sql
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_elements' AND column_name = 'layer';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_018_invariant: layer column missing on plan_elements';
  END IF;

  SELECT count(*) INTO cnt FROM information_schema.check_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'plan_elements_layer_check';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_018_invariant: layer CHECK constraint missing';
  END IF;

  RAISE NOTICE 'migration_018 ok: plan_elements.layer added with CHECK + plant backfill';
END $$;
```

**RLS note:** No new policy needed — existing `plan_elements_member_all` covers the new column via column-level inheritance (same conclusion as 6.5 P02).

**Push gate:** Same `list-linked → dry-run → push` order as 6.5 P05 (D-16 in CONTEXT).

---

### `packages/shared/src/types/entities.ts` (MOD — extend `PlanElementRow`)

**Analog:** self (lines 66-80) — exact pattern used in 6.5 to add `importedFrom` + `provenance`.

**Current state** (entities.ts:66-80):
```typescript
export interface PlanElementRow extends RowBase {
  gardenId: string;
  elementType: string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  confidence: 'high' | 'medium' | 'low' | null;
  isAccepted: boolean;
  /** Phase 6.5: UUID of source import_items row (null for manually-created elements) */
  importedFrom: string | null;
  /** Phase 6.5: free-form provenance metadata (chatReference, sunExposure, etc.) */
  provenance: Record<string, unknown> | null;
}
```

**Target — add one non-optional field at the end:**
```typescript
  /** Phase 7: visual + behavioral grouping. 'infrastructure' = permanent, 'seasonal' = plants. */
  layer: 'infrastructure' | 'seasonal';   // NEW (Migration 018)
```

**Constructor sites must populate:** `gardenPlanRepo`-created rows default to `'infrastructure'`; `draftPromotionRepo.promotePlantDraft` rows default to `'seasonal'`; `draftPromotionRepo.promoteBedDraft` rows default to `'infrastructure'`. Mapper layer (next file) handles pre-migration DB rows.

---

### `app/src/lib/mappers/rowMappers.ts` (MOD — extend `planElement*` mappers + `DbPlanElementRowLoose`)

**Analog:** self (lines 370-433) — the 6.5 extension of `imported_from` + `provenance` is the exact precedent.

**Current `DbPlanElementRowLoose`** (rowMappers.ts:370-389):
```typescript
type DbPlanElementRowLoose = {
  id: string;
  garden_id: string;
  element_type: string;
  label: string;
  x_m: number;
  y_m: number;
  width_m: number;
  height_m: number;
  confidence: string | null;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
  updated_by_user_id?: string | null;
  deleted_at?: string | null;
  imported_from?: string | null;
  provenance?: Record<string, unknown> | null;
};
```

**Target — add `layer?: string | null`:**
```typescript
  // Phase 7: layer column (Migration 018). Optional on type for pre-018 rows.
  layer?: string | null;
```

**Current `planElementToLocal`** (rowMappers.ts:392-411) — add Pitfall-8 lazy default:
```typescript
export function planElementToLocal(db: DbPlanElementRowLoose): PlanElementRow {
  // Phase 7 Pitfall-8 lazy default: if layer absent (pre-018 sync), derive from element_type.
  const layerValue: 'infrastructure' | 'seasonal' =
    db.layer === 'seasonal' ? 'seasonal'
    : db.layer === 'infrastructure' ? 'infrastructure'
    : db.element_type === 'Pflanze' ? 'seasonal' : 'infrastructure';

  return {
    // ... existing fields verbatim ...
    layer: layerValue,
  };
}
```

**Current `planElementToDb`** (rowMappers.ts:414-433) — add 1 line:
```typescript
export function planElementToDb(local: PlanElementRow): Record<string, unknown> {
  return {
    // ... existing fields ...
    layer: local.layer,                   // NEW
  };
}
```

**`importEntityToDb` `camelToSnakeMap`** (line 454-480): if `layer` ever travels through a generic mapper (it doesn't here — `plan_elements` uses the dedicated mapper), no change needed.

---

### `app/src/lib/gardenPlanRepo.ts` (MOD — add `writePlanElement`)

**Analog:** self (`saveDimensions` lines 27-75) + sibling `app/src/lib/draftPromotionRepo.ts` lines 121-131.
**Why this analog:** Same auth-mode guard, same writeWithOutbox + scheduleWriteDebounced shape. The `writePlanElement` is a thin combination of those two patterns for single-row writes.

**Imports pattern** (gardenPlanRepo.ts:1-12) — already in file, no change:
```typescript
import { storage } from '../storage';
import { useAuthStore, type AuthMode } from '../stores/authStore';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import { OutboxEnqueueError } from './errors';
import { scheduleWriteDebounced } from './sync/SyncTriggers';
```

**Auth + userId guard pattern** (lines 14-16, 37-39):
```typescript
function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}
// In each write function:
assertAccount(mode);
const userId = useAuthStore.getState().userId;
if (!userId) throw new Error('not_authenticated');
```

**Insert-vs-update detection pattern** (lines 42-46, 66):
```typescript
const existing = await storage.getRowsByGarden<PlanElementRow>('plan_elements', el.gardenId);
const op: 'insert' | 'update' = existing.some(r => r.id === el.id) ? 'update' : 'insert';
```

**Atomic write + outbox + sync pattern** (lines 62-69):
```typescript
try {
  await storage.writeWithOutbox('plan_elements', el, {
    entity: 'plan_elements',
    rowId: el.id,
    operation: op,
    payload: el as unknown as Record<string, unknown>,
  });
  scheduleWriteDebounced();
} catch (cause) {
  throw new OutboxEnqueueError('plan_elements', el.id, cause);
}
```

**Full reference implementation:** RESEARCH §Code Examples §6 (lines 858-885) — ready to copy verbatim.

---

### `app/src/lib/draftPromotionRepo.ts` (MOD — `promoteBedDraft` accepts `finalCoords?`)

**Analog:** self (lines 74-154).
**Why this analog:** Function signature already exists; addition is one optional parameter and one `if (finalCoords) { override }` branch — minimal surgery preserves Phase 6.5 idempotency guarantees.

**Current signature** (draftPromotionRepo.ts:74-80):
```typescript
export async function promoteBedDraft(
  mode: AuthMode,
  draft: BedDraftRow,
  dims: GardenDimensionsRow,
  existingElements: PlanElementRow[],
  importItemId: string,
): Promise<PlanElementRow>
```

**Target signature (additive, optional):**
```typescript
export async function promoteBedDraft(
  mode: AuthMode,
  draft: BedDraftRow,
  dims: GardenDimensionsRow,
  existingElements: PlanElementRow[],
  importItemId: string,
  finalCoords?: { xM: number; yM: number },   // NEW — optional drop position
): Promise<PlanElementRow>
```

**Insertion site** (between current line 94 `const { xM, yM } = nextFreeBedSlot(...)` and line 98 `const element: PlanElementRow = {`):
```typescript
const slot = nextFreeBedSlot(existingElements, dims, { widthM, heightM });
const xM = finalCoords?.xM ?? slot.xM;
const yM = finalCoords?.yM ?? slot.yM;
```

**Other promotion functions** (`promotePlantDraft` lines 166-203, `promoteObservationDraft`, `dismissDraft`): NO CHANGE. Phase 7 only needs bed-coords override.

**Existing call sites that must remain compatible:** `app/app/(app)/import/review.tsx` line 84 + line 158 call `promoteBedDraft(mode, draft, dimensions, elements, draft.importItemId)` without `finalCoords` — these continue to work because `finalCoords` is optional.

---

### `app/src/lib/importRepo.ts` (MOD — add `loadPendingDraftsWithImportedAt`)

**Analog:** self (existing `loadPendingDrafts` block) + RESEARCH §Code Examples §9 (lines 956-991).
**Why this analog:** Read-only function over the same draft tables, just joins `imports.imported_at` via `import_items.import_id`. No write path, no auth-mode guard required (read is unauthenticated).

**Pattern: storage.getRowsByGarden parallelization** (consistent with `app/app/(app)/import/review.tsx` lines 60-64):
```typescript
const [bedRows, plantRows, obsRows, importItems, imports] = await Promise.all([
  storage.getRowsByGarden<BedDraftRow>('bed_drafts', gardenId),
  storage.getRowsByGarden<PlantDraftRow>('plant_drafts', gardenId),
  storage.getRowsByGarden<ObservationDraftRow>('observation_drafts', gardenId),
  storage.getRowsByGarden<ImportItemRow>('import_items', gardenId),
  storage.getRowsByGarden<ImportRow>('imports', gardenId),
]);
```

**Filter pattern** (matches `loadAcceptedElements` lines 92-100): `r.status === 'pending' && r.deletedAt === null`.

**Full reference implementation:** RESEARCH §Code Examples §9 — ready to copy. Returns `{beds, plants, observations}` each as `{row, importedAt}[]`.

---

### `app/src/lib/geometry/viewMatrix.ts` (NEW — pure pxToM/mToPx)

**Analog:** No existing geometry module; closest pure-helper precedent is `app/src/lib/utils.ts` (`cn` Tailwind merger) and `draftPromotionRepo.nextFreeBedSlot` (lines 42-64, pure function in repo file).

**Module shape (RESEARCH §Pitfall 4):**
```typescript
// Phase 7 Plan 01: pixel ↔ meter coordinate conversion for the Skia editor view matrix.
// Pure, symmetric, no rounding — single source of truth for viewport transforms.
// Pitfall-4: rounding is forbidden at storage layer; consumers round only when displaying.

export interface ViewMatrix { tx: number; ty: number; scale: number }

export function mToPx(m: number, scale: number): number {
  return m * scale;
}
export function pxToM(px: number, scale: number): number {
  return px / scale;
}
export function screenToGarden(xPx: number, yPx: number, vm: ViewMatrix): { xM: number; yM: number } {
  return { xM: (xPx - vm.tx) / vm.scale, yM: (yPx - vm.ty) / vm.scale };
}
export function gardenToScreen(xM: number, yM: number, vm: ViewMatrix): { xPx: number; yPx: number } {
  return { xPx: xM * vm.scale + vm.tx, yPx: yM * vm.scale + vm.ty };
}
```

**Round-trip invariant** (must be unit-tested): `screenToGarden(gardenToScreen(x, y, vm), vm) === {x, y}` within `1e-9` (EDIT-06 test target).

---

### `app/src/lib/geometry/plantSpacing.ts` (NEW — overlap detection)

**Analog:** `app/src/lib/draftPromotionRepo.ts` lines 42-64 (`nextFreeBedSlot` — pure geometry over `PlanElementRow[]`).

**Module shape (RESEARCH §Code Examples §5, Pattern 5):**
```typescript
// Phase 7 Plan 01: Pflanzenabstand-Hinweis (EDIT-07).
// Pure-JS Euclidean overlap test. Non-blocking (caller decides what to do with `true`).

import type { PlanElementRow } from '@spatenstich/shared';

/** Returns true if `placed` plant is closer than `spacingM` to any other seasonal-layer plant. */
export function hasOverlap(
  placed: { xM: number; yM: number; id: string },
  spacingM: number,
  others: PlanElementRow[],
): boolean {
  const seasonalNeighbours = others.filter(
    (e) => e.layer === 'seasonal' && e.deletedAt === null && e.id !== placed.id,
  );
  return seasonalNeighbours.some((o) => {
    const dx = o.xM - placed.xM;
    const dy = o.yM - placed.yM;
    return Math.sqrt(dx * dx + dy * dy) < spacingM;
  });
}
```

**Test pattern (EDIT-07 — pure test):** mock `others[]` with known coords; assert true at distance < spacing, false at distance ≥ spacing, false when only `infrastructure`-layer neighbours present.

---

### `app/src/lib/geometry/bedLayout.ts` (NEW — polygon → bbox + centroid)

**Analog:** `app/src/lib/draftPromotionRepo.ts` §`nextFreeBedSlot` (lines 42-64) — pure geometry over arrays, same module style. Also RESEARCH §Code Examples §4 (polygon centroid math).

**Module shape:**
```typescript
// Phase 7 Plan 01: Beet-Polygon → axis-aligned bounding box + centroid (EDIT-05).
// Pure. Consumed by editorStore.polygonCommit.

export interface Point2D { x: number; y: number }
export interface Bbox { xM: number; yM: number; widthM: number; heightM: number }

export function polygonToBbox(points: Point2D[]): Bbox {
  if (points.length < 3) throw new Error('polygon needs at least 3 points');
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return {
    xM: (minX + maxX) / 2,    // centroid x (PlanElementRow.xM convention = center)
    yM: (minY + maxY) / 2,    // centroid y
    widthM: maxX - minX,
    heightM: maxY - minY,
  };
}
```

**Test invariants:** ≥3-point assertion throws; triangle bbox correct; square + irregular pentagon centroid is geometric center of bbox (not polygon centroid — MVP approximation).

---

### `app/src/lib/editor/saveDebounce.ts` (NEW — 5 s per-element scheduler)

**Analog:** `app/src/lib/sync/SyncTriggers.ts` (`scheduleWriteDebounced` — single-global timer pattern). Phase 7 differs by holding a `Map<elementId, Timeout>` instead of a single timer.

**Module shape (RESEARCH §Code Examples §5):**
```typescript
// Phase 7 Plan 01: Editor-level 5s debounce per element. EDIT-09.
// Pattern: SyncTriggers.scheduleWriteDebounced (existing 500 ms global debounce)
//   but per-element (Map<id, Timeout>) so concurrent edits to multiple elements don't lose timers.
// Manual save flushes all pending writes immediately.

import type { PlanElementRow } from '@spatenstich/shared';
import type { AuthMode } from '../../stores/authStore';
import { writePlanElement } from '../gardenPlanRepo';

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const EDITOR_SAVE_DELAY_MS = 5_000;

export function scheduleSaveElement(mode: AuthMode, el: PlanElementRow): void {
  const existing = timers.get(el.id);
  if (existing) clearTimeout(existing);
  timers.set(el.id, setTimeout(() => {
    timers.delete(el.id);
    writePlanElement(mode, el).catch((e) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[editorSave] autosave failed', el.id, e);
    });
  }, EDITOR_SAVE_DELAY_MS));
}

export async function flushAllPendingSaves(
  mode: AuthMode,
  byId: (id: string) => PlanElementRow | undefined,
): Promise<void> {
  const ids = Array.from(timers.keys());
  for (const id of ids) {
    const t = timers.get(id)!;
    clearTimeout(t);
    timers.delete(id);
  }
  await Promise.all(ids.map(async (id) => {
    const el = byId(id);
    if (el) await writePlanElement(mode, el);
  }));
}

// Test-only reset
export function _resetEditorSaveTimers(): void {
  for (const [, t] of timers) clearTimeout(t);
  timers.clear();
}
```

**Test pattern (EDIT-09):** `jest.useFakeTimers()`, schedule 2 rapid edits on same id → only one `writePlanElement` after 5 s advance. Schedule on id-A then id-B → `flushAllPendingSaves` writes both immediately.

---

### `app/src/stores/editorStore.ts` (NEW — Zustand + zundo temporal)

**Analog:** `app/src/stores/importStore.ts` (transient Zustand pattern) + `app/src/stores/reviewSettingsStore.ts` (selector pattern). zundo `temporal()` middleware is **first-of-kind** — RESEARCH §Pattern 8 documents the API.

**Imports pattern** (importStore.ts:1-5 + new zundo):
```typescript
// Phase 7 Plan 02: Editor state with 20-step undo/redo (zundo temporal middleware).
// Pattern: importStore.ts (transient Zustand) + zundo (RESEARCH §Pattern 8).
// Pitfall-3: partialize { elements } only — selection/viewport/tool excluded from history.
// Pitfall-5: drag-in-flight bypasses store; only onEnd commits.

import { create } from 'zustand';
import { temporal } from 'zundo';
import type { PlanElementRow } from '@spatenstich/shared';
```

**State shape (RESEARCH §Pattern 8, lines 446-494):**
```typescript
export interface EditorState {
  // History-tracked (in zundo partialize):
  elements: PlanElementRow[];

  // NOT in history (Pitfall-3 partialize excludes):
  selection: string | null;
  viewport: { tx: number; ty: number; scale: number };
  tool: 'select' | 'polygon' | 'placing';
  activeLayers: { infrastructure: boolean; seasonal: boolean };
  showGrid: boolean;
  polygonInProgress: { gardenId: string; pointsM: { x: number; y: number }[] } | null;

  // Actions (RESEARCH §Code Examples §4):
  addElement: (el: PlanElementRow) => void;
  updateElement: (id: string, patch: Partial<PlanElementRow>) => void;
  deleteElement: (id: string) => void;
  setSelection: (id: string | null) => void;
  setTool: (tool: EditorState['tool']) => void;
  toggleLayer: (layer: 'infrastructure' | 'seasonal') => void;
  toggleGrid: () => void;
  polygonAddPoint: (xM: number, yM: number) => void;
  polygonCommit: (label: string) => void;
  polygonCancel: () => void;
}
```

**Temporal wrapper pattern (RESEARCH §Pattern 8):**
```typescript
export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      elements: [],
      selection: null,
      viewport: { tx: 0, ty: 0, scale: 1 },
      // ... action implementations from RESEARCH §Code Examples §4 ...
    }),
    {
      limit: 20,                                                  // EDIT-11
      partialize: (state) => ({ elements: state.elements }),      // Pitfall-3
      equality: (a, b) => a.elements === b.elements,              // shallow dedup
    },
  ),
);

// Toolbar API:
// useEditorStore.temporal.getState().undo()
// useEditorStore.temporal.getState().redo()
// useEditorStore.temporal((s) => s.pastStates.length)
```

**Auto-save subscription pattern (NEW, RESEARCH §Pattern 7):**
```typescript
useEditorStore.subscribe((state, prev) => {
  // Detect element mutations (not selection/tool/viewport changes — those are partialized-out anyway, but the subscribe still fires).
  if (state.elements !== prev.elements) {
    for (const el of state.elements) {
      const prevEl = prev.elements.find((p) => p.id === el.id);
      if (!prevEl || prevEl !== el) {
        scheduleSaveElement(useAuthStore.getState().mode, el);
      }
    }
  }
});
```

---

### `app/src/components/editor/EditorCanvas.tsx` (NEW — Skia host)

**Analog:** `app/src/components/GardenPlanView.tsx` (lines 49-258) — read-only SVG renderer with the **same color contract and same sizing math**. Skia API itself is first-of-kind; visual contract is locked.

**Reused from GardenPlanView (must not duplicate):**
- `PLAN_COLORS` constant (lines 10-24) — extract to `app/src/lib/colors.ts` per UI-SPEC §Canvas Palette so both views share one source.
- `darkenColor()` helper (lines 27-35) — same move, extract to shared util.
- `truncateLabel()` (lines 37-40) — same.
- Label font-size formula (line 62): `Math.max(10, Math.min(14, 14 / (dimensions.widthM / 10)))`.

**Imports pattern (RESEARCH §Pattern 1, Code Examples §1-2):**
```typescript
import { Canvas, Group, Rect, Path, Circle, Line, Skia } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import { PLAN_COLORS, darkenColor } from '@/src/lib/colors';
import { useEditorStore } from '@/src/stores/editorStore';
```

**Canvas + Group transform pattern (RESEARCH §Pattern 1):**
```tsx
const tx = useSharedValue(0), ty = useSharedValue(0), scale = useSharedValue(1);
const composed = Gesture.Race(pinch, pan, Gesture.Exclusive(longPress, tap));

return (
  <GestureDetector gesture={composed}>
    <Canvas style={{ flex: 1 }}>
      <Group transform={[{ translateX: tx }, { translateY: ty }, { scale }]}>
        <GridLayer dims={dims} visible={showGrid} />
        <Group opacity={activeLayers.infrastructure ? 1 : 0}>
          {infrastructureEls.map((el) => <ElementShape key={el.id} el={el} />)}
        </Group>
        <Group opacity={activeLayers.seasonal ? 1 : 0}>
          {seasonalEls.map((el) => <ElementShape key={el.id} el={el} />)}
        </Group>
        {polygonInProgress && <PolygonInProgress points={polygonInProgress.pointsM} />}
      </Group>
    </Canvas>
  </GestureDetector>
);
```

**Element-shape rendering (mirrors GardenPlanView lines 132-231):** map elementType → Skia Rect (default) / Circle (Baum) / Path (Beet polygon when `provenance.polygonPointsM` present). Same fill = `PLAN_COLORS[elementType] ?? PLAN_COLORS.Sonstiges`, same stroke = `darkenColor(fill)`.

**Selection outline overlay (NEW for editor — UI-SPEC §Canvas Overlay Colors):**
```tsx
{selection && (
  <Rect
    x={selectedEl.xM - selectedEl.widthM / 2}
    y={selectedEl.yM - selectedEl.heightM / 2}
    width={selectedEl.widthM}
    height={selectedEl.heightM}
    style="stroke"
    strokeWidth={0.05}
    color="#0EA5E9"
  />
)}
```

---

### `app/src/components/editor/EditorToolbar.tsx` (NEW — 9 buttons)

**Analog:** `app/src/components/InlineBanner.tsx` (icon + Pressable + NativeWind row layout) + `app/src/components/SyncStatusBadge.tsx` (4-state icon-swap).

**Toolbar layout (UI-SPEC §Toolbar layout, 56 px tall):**
| # | Icon (lucide) | Action | Source |
|---|---------------|--------|--------|
| 1 | `ChevronLeft` | router.back() | `app/app/(app)/import/review.tsx` line 340 (`router.replace`) |
| 2 | `Undo2` | `useEditorStore.temporal.getState().undo()` | RESEARCH §Pattern 8 |
| 3 | `Redo2` | `useEditorStore.temporal.getState().redo()` | (same) |
| 4 | `Grid3x3` | `toggleGrid` | UI-SPEC §Layer-toggle |
| 5 | `Eye`/`EyeOff` | cycle 3 layer states | UI-SPEC §Layer-toggle states |
| 6 | `Pencil` | `setTool('polygon')` | UI-SPEC |
| 7 | `Trash2` | confirm modal → `deleteElement(selection)` | UI-SPEC §Destructive |
| 8 | `Check` (conditional) | `polygonCommit(label)` | UI-SPEC |
| 9 | `Save`/`Loader2`/`Check`/`AlertCircle` | manual save → `flushAllPendingSaves` | UI-SPEC §SaveStateIndicator |

**Button pattern** (from `app/app/(app)/import/preview.tsx` lines 209-220 and `app/src/components/ui/button.tsx`):
```tsx
<Button onPress={onSave} variant="default" testID="editor-save-button">
  <Save size={20} color="#fff" />
  <Text className="text-white font-semibold ml-2">{t('editor.save')}</Text>
</Button>
```

**Icon pattern** (lucide-react-native from `InlineBanner.tsx:6` and `SyncStatusBadge.tsx`):
```tsx
import { ChevronLeft, Undo2, Redo2, Grid3x3, Eye, EyeOff, Pencil, Trash2, Check, Save, Loader2, AlertCircle, Maximize2 } from 'lucide-react-native';
```

**Disabled-button opacity pattern** (UI-SPEC §Disabled = 0.4): `<Pressable disabled={!canUndo} style={{ opacity: canUndo ? 1 : 0.4 }}>`.

**i18n helper** (from `app/app/(app)/import/review.tsx` lines 23-33):
```typescript
import de from '@spatenstich/shared/i18n/de';
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
// Use: t('editor.save'), t('editor.undo'), …
```

---

### `app/src/components/editor/ElementPalette.tsx` + `PaletteCard.tsx` (NEW — bottom 3-tab)

**Analog:** `app/src/components/ImportEntityCard.tsx` (Card + testID per-item) + RESEARCH §Code Examples §3 (long-press gesture composition).

**Tab layout (UI-SPEC §Component Inventory):**
- 3 tabs: Beete / Pflanzen / Infrastruktur (matches `editor.palette.tabBeete/tabPflanzen/tabInfrastruktur` i18n keys).
- Active tab underline 2 px accent green (`#4A7C59`).
- Each tab: horizontal `ScrollView` of `PaletteCard` (64×80 card).

**Card pattern** (from `ImportEntityCard.tsx:52-79`):
```tsx
<Card className="mr-2" testID={`palette-${item.kind}`}>
  <CardHeader>
    {/* 64x64 colored swatch */}
    <View style={{ width: 64, height: 64, backgroundColor: PLAN_COLORS[item.kind] }} />
  </CardHeader>
  <CardContent>
    <Text className="text-xs text-stone-700 dark:text-stone-300">{t(`editor.palette.items.${item.kind}`)}</Text>
  </CardContent>
</Card>
```

**Long-press → drag pattern (RESEARCH §Code Examples §3, lines 720-779):** the LongPress on each card flips a shared `dragging` value; a screen-root Pan in `app/(app)/plan/index.tsx` reads it and converts onEnd screen-px to garden-m via `screenToGarden` from `viewMatrix.ts`.

**Tab-active state** (UI-SPEC §Filter-chips analog):
```tsx
<Pressable className={active ? 'border-b-2 border-[#4A7C59]' : ''}>
```

---

### `app/src/components/editor/DraftsTrayBottomSheet.tsx` (NEW — reuses DraftReviewCard)

**Analog:** `app/app/(app)/import/review.tsx` (sectioned ScrollView + DraftReviewCard list + load effect lines 57-78).
**Why this analog:** Same `loadPendingDrafts`-equivalent fetch (extended `loadPendingDraftsWithImportedAt`), same DraftReviewCard verbatim, same `dismissDraft` action wiring.

**Reused verbatim:**
- `DraftReviewCard` from `app/src/components/DraftReviewCard.tsx` (lines 32-87) — pass `details={<TrafficLightBadge state='amber' label='Stale' />}` for stale items.
- `TrafficLightBadge` (`app/src/components/TrafficLightBadge.tsx` lines 8-23) for the stale-badge — `state='amber'` because Stale is a warning context (UI-SPEC §Color §Warning).
- `dismissDraft` from `draftPromotionRepo.ts` for soft-delete.

**Load effect pattern** (mirror of `review.tsx:57-78`):
```tsx
React.useEffect(() => {
  if (!activeGardenId) return;
  (async () => {
    const drafts = await loadPendingDraftsWithImportedAt(activeGardenId);
    setDrafts(drafts);
  })();
}, [activeGardenId]);
```

**Stale check (RESEARCH §Code Examples §7):**
```typescript
const STALE_MS = 30 * 24 * 60 * 60 * 1000;
function isStale(importedAt: string): boolean {
  return Date.now() - new Date(importedAt).getTime() > STALE_MS;
}
```

**Filter-chips pattern (UI-SPEC §Filter-chips):** three pills with 8 px gap, single-select; active chip background `#4A7C59` (Alle/Aktuell) or `#D97706` (Stale).

**Bottom-sheet snap-points (UI-SPEC §Bottom-sheet):**
- Hidden = 0 (drafts.length === 0)
- Collapsed = 36 px chip "Letzte Importe ({count})"
- Half-expanded = 50% viewport
- Full-expanded = 90% viewport

**Reanimated height-animation approach (RESEARCH §Don't Hand-Roll line 521):** plain `View` + `useSharedValue<number>` for height, animated via reanimated `useDerivedValue` — **NO** `react-native-bottom-sheet` library install (RESEARCH explicit no-dep).

**Bed-draft drag-out pattern (RESEARCH §Code Examples §8):**
```typescript
// LongPress sets dragging.value = { kind: 'bed-draft', draftId, importItemId }
// Screen-root Pan onEnd → handleBedDraftDrop(draftId, xM, yM):
async function handleBedDraftDrop(draftId, importItemId, xM, yM) {
  const draft = bedDrafts.find(d => d.row.id === draftId)!.row;
  await promoteBedDraft(mode, draft, dims, elements, importItemId, { xM, yM });  // EXTENDED signature
}
```

**Plant-draft tap pattern:** `onPress` → opens `BedPickerModal` → user selects bed → calls `promotePlantDraft(mode, draft, parentBedElement, draft.importItemId)`.

---

### `app/src/components/editor/PolygonInProgress.tsx` (NEW — Skia Path live)

**Analog:** `GardenPlanView.tsx` lines 96-130 (SVG `<G opacity={0.4}>` + grid lines — same idea, different renderer). Skia API first-of-kind.

**Module shape (RESEARCH §Pattern 4 + Code Examples §4):**
```tsx
import { Path, Skia, Circle } from '@shopify/react-native-skia';
import { PLAN_COLORS } from '@/src/lib/colors';

interface Props { points: { x: number; y: number }[] }

export function PolygonInProgress({ points }: Props): React.JSX.Element | null {
  const path = React.useMemo(() => {
    if (points.length < 2) return null;
    const p = Skia.Path.Make();
    p.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) p.lineTo(points[i].x, points[i].y);
    // intentionally NOT closed until commit
    return p;
  }, [points]);

  if (!path) return null;
  return (
    <>
      <Path
        path={path}
        style="stroke"
        strokeWidth={0.05}
        color={PLAN_COLORS.border}     // #8B7355 — UI-SPEC §Canvas Overlay Colors
      />
      {points.map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={0.06} color="#0EA5E9" />  // sky-500 corner markers
      ))}
    </>
  );
}
```

---

### `app/src/components/editor/GhostRing.tsx` (NEW — Skia Circle overlay)

**Analog:** `GardenPlanView.tsx` lines 140-166 (Baum → SVG Circle). Skia `<Circle>` API is first-of-kind but visual contract is the same.

**Module shape (RESEARCH §Pattern 5, UI-SPEC §Canvas Overlay Colors):**
```tsx
import { Circle } from '@shopify/react-native-skia';

interface Props { xM: number; yM: number; spacingM: number; overlapping: boolean }

export function GhostRing({ xM, yM, spacingM, overlapping }: Props): React.JSX.Element {
  // UI-SPEC Canvas Overlay Colors:
  //   OK     → #15803D green-700, opacity 50%
  //   overlap→ #DC2626 red-600,   opacity 60%
  const color = overlapping ? '#DC2626' : '#15803D';
  const opacity = overlapping ? 0.6 : 0.5;
  return (
    <Circle
      cx={xM}
      cy={yM}
      r={spacingM / 2}
      style="stroke"
      strokeWidth={0.04}
      color={color}
      opacity={opacity}
    />
  );
}
```

---

### `app/src/components/editor/SaveStateIndicator.tsx` (NEW — tri-state save UI)

**Analog:** `app/src/components/SyncStatusBadge.tsx` (4-state icon-swap pattern).

**State machine (UI-SPEC §SaveStateIndicator):**
| State | Icon | Color | Label |
|-------|------|-------|-------|
| idle | `Save` | stone-700 | "Speichern" |
| saving | `Loader2` (spinning) | accent green | "Wird gespeichert …" |
| saved (2 s) | `Check` | accent green | "Gespeichert" |
| error | `AlertCircle` | destructive | InlineBanner takes over |

**Pattern:**
```tsx
import { Save, Loader2, Check, AlertCircle } from 'lucide-react-native';
const ICON = { idle: Save, saving: Loader2, saved: Check, error: AlertCircle }[state];
return <ICON size={20} color={state === 'saved' || state === 'saving' ? '#4A7C59' : '#78716C'} />;
```

---

### `app/src/components/editor/BedPickerModal.tsx` (NEW — bed selector)

**Analog:** `app/src/components/ImportEntityCard.tsx` (Card + testID per-item, lines 52-79) — modal listing is a vertical map of cards.

**Modal shape:**
```tsx
// Modal sheet listing all Beet elements as selectable cards.
// Tap row → setSelected → Confirm CTA calls onPick(bedElement).
import { Card, CardHeader, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';

export function BedPickerModal({ beds, onPick, onCancel }: Props) {
  const [selected, setSelected] = React.useState<string | null>(null);
  return (
    <View className="bg-stone-100 dark:bg-stone-800 p-4">
      <Text className="text-lg font-semibold">{t('editor.tray.applyPlantModalTitle')}</Text>
      {beds.length === 0 ? (
        <Text>{t('editor.tray.applyPlantModalEmpty')}</Text>
      ) : (
        beds.map((b) => (
          <Card key={b.id} onPress={() => setSelected(b.id)} testID={`bed-picker-${b.id}`}>
            <CardHeader><Text>{b.label}</Text></CardHeader>
          </Card>
        ))
      )}
      <Button onPress={() => selected && onPick(beds.find(b => b.id === selected)!)} disabled={!selected}>
        <Text>{t('editor.tray.applyPlantConfirm')}</Text>
      </Button>
    </View>
  );
}
```

---

### `app/app/(app)/plan/index.tsx` (NEW — Expo Router screen)

**Analog:** `app/app/(app)/import/review.tsx` (lines 1-350) — same Expo Router idioms, same `Stack.Screen` + sticky footer + load effect, same auth+gardenId selector pattern.

**File header pattern** (review.tsx:1-30):
```typescript
// Phase 7 Plan 03: Plan-Editor screen — Skia canvas + Toolbar + Palette + Drafts-Tray.
// Pattern: app/(app)/import/review.tsx (Stack.Screen + sectioned ScrollView + i18n t() helper)
//          + RESEARCH §Pattern 1 (Skia canvas with view-matrix transform).
// Loads dimensions + elements + drafts on mount, hydrates editorStore, renders editor surface.

import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { useEditorStore } from '@/src/stores/editorStore';
import { loadDimensions, loadAcceptedElements } from '@/src/lib/gardenPlanRepo';
import { EditorCanvas } from '@/src/components/editor/EditorCanvas';
import { EditorToolbar } from '@/src/components/editor/EditorToolbar';
import { ElementPalette } from '@/src/components/editor/ElementPalette';
import { DraftsTrayBottomSheet } from '@/src/components/editor/DraftsTrayBottomSheet';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
```

**Auth + gardenId selector** (review.tsx:43-44):
```typescript
const mode = useAuthStore((s) => s.mode);
const activeGardenId = useAuthStore((s) => s.activeGardenId);
```

**Load effect + Stack.Screen** (review.tsx:73-78, 200-202):
```tsx
React.useEffect(() => {
  if (!activeGardenId) return;
  (async () => {
    const [dims, elems] = await Promise.all([
      loadDimensions(activeGardenId),
      loadAcceptedElements(activeGardenId),
    ]);
    useEditorStore.setState({ elements: elems });
    setDimensions(dims);
    setLoading(false);
  })();
}, [activeGardenId]);

return (
  <View className="flex-1 bg-stone-50 dark:bg-stone-900">
    <Stack.Screen options={{ headerTitle: t('editor.title') }} />
    <EditorToolbar />
    <EditorCanvas dimensions={dimensions!} />
    <ElementPalette />
    <DraftsTrayBottomSheet gardenId={activeGardenId} />
  </View>
);
```

---

### `app/app/(app)/_layout.tsx` (MOD — register plan route)

**Analog:** self (lines 23-31) — Stack with `screenOptions`. The route is registered implicitly by the file-based router (any file in `app/app/(app)/plan/` becomes a routable screen automatically). No code change typically required; if a custom header is wanted per route, add a `<Stack.Screen name="plan/index" options={...} />` declaration in the same way that `import/review.tsx` does inline via its own `<Stack.Screen>` (review.tsx:201).

---

### `app/app/_layout.tsx` (MOD — add `GestureHandlerRootView`)

**Analog:** self (lines 111-119, `RootLayout` wrapper).
**Why this change:** Pitfall-7 (RESEARCH lines 589-594) — `GestureHandlerRootView` must wrap the outermost content so gestures inside modals/sheets also work.

**Current** (lines 111-119):
```typescript
function RootLayout(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

**Target (RESEARCH §Code Examples §10):**
```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

---

### `app/app/(app)/index.tsx` (MOD — add "Plan öffnen" button)

**Analog:** self (lines 92-101, existing `home-import-button-plan` Button → `/(app)/import`).

**Add a sibling Button** that routes to `/(app)/plan`:
```tsx
<Button
  variant="default"
  onPress={() => router.push('/(app)/plan' as any)}
  className="mt-2 w-full"
  testID="home-open-plan-button"
>
  <Text className="text-white font-semibold">{t('editor.title')}</Text>
</Button>
```

Place in both the empty-state branch (line 122-131) and the has-plan branch (line 92-101). Empty state CTA uses `editor.emptyPlan.cta` ("Erstes Beet zeichnen") per UI-SPEC.

---

### `packages/shared/src/i18n/de.json` (MOD — add `editor.*` block)

**Analog:** self (lines 209-226, `import.review.*` block added by 6.5) — same JSON-extension pattern.

**Insert location:** As a new top-level key after `import` block closes at line 227, before next top-level `home` block (line 228).

**Content (UI-SPEC §Copywriting Contract lines 146-222) — 30+ keys:** Copy verbatim from UI-SPEC. Must use UTF-8 Umlaute (`ä`, `ö`, `ü`, `ß`) — never ASCII `ae/oe/ue/ss` (Memory: `feedback_german_umlauts.md`).

**Critical strings:**
- `editor.title`, `editor.save`, `editor.saving`, `editor.saved`, `editor.saveError`
- `editor.undo`, `editor.redo`, `editor.toggleGrid`, `editor.toggleLayer*`
- `editor.polygonStart/Finish/Cancel/Hint`, `editor.delete*`, `editor.rotate`, `editor.scale`
- `editor.palette.{tabBeete,tabPflanzen,tabInfrastruktur,longPressHint,emptyPlants,items.*}`
- `editor.spacing.{warning,warningBody,okHint}`
- `editor.trayChip`, `editor.tray.{title,empty,filterAll,filterFresh,filterStale,staleBadge,staleHint,bedDragHint,plantApplyCta,applyPlantModalTitle,applyPlantModalEmpty,applyPlantConfirm,applyPlantCancel}`
- `editor.emptyPlan.{heading,body,cta}`, `editor.viewport.{resetLabel,zoomInLabel,zoomOutLabel}`

---

### `app/jest.config.ts` (MOD — add `editor` jest project)

**Analog:** self (lines 81-105, `components` project block) — same shape, different `testMatch` + extra mocks for Skia/gesture-handler.

**New project block (insert after `components` block, before `]` of projects array at line 106):**
```typescript
{
  // Phase 7: Editor component + geometry + store tests.
  displayName: 'editor',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: [
    '**/src/components/editor/__tests__/**/*.test.ts?(x)',
    '**/src/lib/geometry/__tests__/**/*.test.ts?(x)',
    '**/src/lib/editor/__tests__/**/*.test.ts?(x)',
    '**/src/stores/__tests__/editorStore.*.test.ts?(x)',
  ],
  setupFiles: ['<rootDir>/src/components/editor/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@spatenstich/shared$': '<rootDir>/../packages/shared/src/index.ts',
    '^@spatenstich/shared/i18n/de$': '<rootDir>/../packages/shared/src/i18n/de.json',
    '^react-native-url-polyfill/auto$': '<rootDir>/src/__mocks__/react-native-url-polyfill.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^react-native-css-interop(.*)$': '<rootDir>/src/__mocks__/react-native-css-interop.ts',
    '^nativewind(.*)$': '<rootDir>/src/__mocks__/react-native-css-interop.ts',
    '^expo-secure-store$': '<rootDir>/src/__mocks__/expo-secure-store.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.ts',
    '^@/src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest-components.json' }],
  },
  transformIgnorePatterns: ['node_modules/(?!(@testing-library|@shopify/react-native-skia|react-native-gesture-handler|react-native-reanimated|zundo)/)'],
},
```

**Note:** `transformIgnorePatterns` whitelist includes the four new ESM-publishing packages so jest transforms them through ts-jest.

---

### `app/src/components/editor/__tests__/setup.ts` (NEW — Skia + gesture mocks)

**Analog:** `app/src/components/__tests__/setup.ts` (NativeWind + lucide global mocks, lines 1-33).
**Why this analog:** Same purpose (mock packages that misbehave in jsdom + ts-jest) — extend with Skia + gesture-handler.

**Required mocks (RESEARCH §Validation Architecture §Wave 0):**
```typescript
// Phase 7 Plan 01 Wave 0: jest setup for editor project.
// Mocks Skia/gesture-handler/reanimated for jsdom env (no native modules).

// 1. NativeWind (verbatim from components/__tests__/setup.ts:3-16)
jest.mock('react-native-css-interop', () => ({
  cssInterop: (component: any) => component,
  remapProps: () => {},
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: () => {}, toggleColorScheme: () => {} }),
  useUnstableNativeVariable: () => '',
  vars: () => ({}),
}));
jest.mock('react-native-css-interop/jsx-runtime', () => ({
  jsx: require('react').createElement,
  jsxs: require('react').createElement,
  Fragment: require('react').Fragment,
}));

// 2. lucide (verbatim from components/__tests__/setup.ts:23-32)
jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: () => (_p: unknown) => React.createElement('Icon', null) });
});

// 3. NEW: Skia — return primitive React components for Canvas/Group/Rect/Path/Circle/Line/Skia
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const stub = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Canvas: stub('Canvas'),
    Group: stub('Group'),
    Rect: stub('Rect'),
    Path: stub('Path'),
    Circle: stub('Circle'),
    Line: stub('Line'),
    Skia: { Path: { Make: () => ({ moveTo: jest.fn(), lineTo: jest.fn(), close: jest.fn() }) } },
  };
});

// 4. NEW: gesture-handler — passthrough Gesture.* + GestureDetector pass children
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const mkGesture = () => {
    const g: any = {
      onUpdate: () => g, onStart: () => g, onEnd: () => g, onTouchesMove: () => g,
      minDuration: () => g, manualActivation: () => g,
    };
    return g;
  };
  return {
    Gesture: {
      Pan: mkGesture, Pinch: mkGesture, Tap: mkGesture, LongPress: mkGesture, Rotation: mkGesture,
      Race: (..._args: any[]) => mkGesture(),
      Exclusive: (..._args: any[]) => mkGesture(),
      Simultaneous: (..._args: any[]) => mkGesture(),
    },
    GestureDetector: ({ children }: any) => children,
    GestureHandlerRootView: ({ children }: any) => children,
  };
});

// 5. NEW: reanimated — useSharedValue returns plain ref-like; runOnJS calls inline
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (v: any) => ({ value: v }),
  useDerivedValue: (fn: any) => ({ value: fn() }),
  runOnJS: (fn: any) => fn,
  useFrameCallback: () => {},
}));
```

---

### `app/src/lib/__tests__/rowMappers.layer.test.ts` (NEW — layer round-trip)

**Analog:** `app/src/lib/__tests__/rowMappers.test.ts` (existing mapper round-trip pattern — same structure, single new field).

**Test shape:**
```typescript
import { planElementToDb, planElementToLocal } from '../mappers/rowMappers';
import type { PlanElementRow } from '@spatenstich/shared';

describe('rowMappers layer field (Phase 7)', () => {
  it('round-trips layer=infrastructure through toDb/toLocal', () => {
    const local: PlanElementRow = { /* ...full row..., layer: 'infrastructure' */ };
    const db = planElementToDb(local);
    expect(db.layer).toBe('infrastructure');
    const back = planElementToLocal(db as any);
    expect(back.layer).toBe('infrastructure');
  });

  it('round-trips layer=seasonal', () => { /* same shape, layer: 'seasonal' */ });

  it('defaults pre-018 plant rows (layer absent) to seasonal (Pitfall-8)', () => {
    const dbRow = { /* ... */ element_type: 'Pflanze', layer: undefined };
    expect(planElementToLocal(dbRow as any).layer).toBe('seasonal');
  });

  it('defaults pre-018 non-plant rows to infrastructure (Pitfall-8)', () => {
    const dbRow = { /* ... */ element_type: 'Beet', layer: null };
    expect(planElementToLocal(dbRow as any).layer).toBe('infrastructure');
  });
});
```

---

### `app/src/components/__tests__/DraftsTray.test.tsx` (NEW — tray + stale + drop)

**Analog:** `app/src/components/__tests__/ImportReview.test.tsx` (lines 1-176) — mocks `importRepo` + `draftPromotionRepo` + `gardenPlanRepo` + `authStore`; renders screen; asserts via `findByText`/`findByTestId`.

**Mock skeleton (verbatim from ImportReview.test.tsx:64-107):**
```typescript
const mockPromoteBed = jest.fn().mockResolvedValue({});
const mockDismiss = jest.fn().mockResolvedValue(undefined);

jest.mock('@/src/lib/importRepo', () => ({
  loadPendingDraftsWithImportedAt: jest.fn().mockResolvedValue({
    beds: [{ row: fixtureBed, importedAt: '2026-05-12T00:00:00.000Z' }],
    plants: [],
    observations: [],
  }),
}));
jest.mock('@/src/lib/draftPromotionRepo', () => ({
  promoteBedDraft: (...a: unknown[]) => mockPromoteBed(...a),
  dismissDraft: (...a: unknown[]) => mockDismiss(...a),
}));
jest.mock('@/src/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ mode: 'account', activeGardenId: 'g-1' }),
}));
```

**Date.now stub pattern (for stale-badge — NEW):**
```typescript
const NOW = new Date('2026-06-12T00:00:00.000Z').getTime(); // 31 days after fixture importedAt
jest.spyOn(Date, 'now').mockReturnValue(NOW);
```

**Test cases (DRAFT-01..03):**
- "renders bed-draft cards with counter" → mirror `ImportReview.test.tsx:116-121`
- "calls promoteBedDraft with finalCoords on drop" → simulate drop callback; assert 6th arg `{xM, yM}` passed
- "shows Stale badge when importedAt > 30 days" → render with mocked Date.now
- "filter chip 'Stale' shows only stale drafts" → press chip; assert fresh row absent

---

## Shared Patterns

### Pattern A: Mode-Guard + UserId-Check (applied to every repo write)

**Source:** `app/src/lib/gardenPlanRepo.ts:14-16, 37-39`
**Apply to:** `writePlanElement` (new) and the patched `promoteBedDraft` finalCoords branch.

```typescript
function assertAccount(mode: AuthMode): void {
  if (mode !== 'account') throw new Error('gardens are account-only');
}
// In each write function:
assertAccount(mode);
const userId = useAuthStore.getState().userId;
if (!userId) throw new Error('not_authenticated');
```

### Pattern B: writeWithOutbox + scheduleWriteDebounced (atomic per row)

**Source:** `app/src/lib/gardenPlanRepo.ts:62-69` and `app/src/lib/draftPromotionRepo.ts:121-152`
**Apply to:** `writePlanElement`, every editor-driven element write.

```typescript
try {
  await storage.writeWithOutbox('plan_elements', el, {
    entity: 'plan_elements',
    rowId: el.id,
    operation: op,
    payload: el as unknown as Record<string, unknown>,
  });
  scheduleWriteDebounced();
} catch (cause) {
  throw new OutboxEnqueueError('plan_elements', el.id, cause);
}
```

**Critical:** `scheduleWriteDebounced()` once at the end (existing 500 ms global push debounce; do NOT call inside the editor's 5 s autosave timer — RESEARCH §Pattern 7 two-stage debounce).

### Pattern C: i18n helper `t()` in screens

**Source:** `app/app/(app)/import/review.tsx:23-33` and `app/app/(app)/index.tsx:15-16`
**Apply to:** `plan/index.tsx`, all editor components.

```typescript
import de from '@spatenstich/shared/i18n/de';
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
```

### Pattern D: testID convention

**Source:** Used throughout `review.tsx`, `ImportEntityCard.tsx`, `DraftReviewCard.tsx`
**Apply to:** Every new component button / card / banner.

- Toolbar buttons: `testID="editor-<action>-button"` (e.g., `editor-save-button`, `editor-undo-button`)
- Palette cards: `testID="palette-${kind}"` (e.g., `palette-Beet`)
- Draft-tray items: reused `DraftReviewCard` already emits `testID={`draft-card-${draft.id}`}` (line 56)
- Filter chips: `testID="tray-filter-${value}"` (`tray-filter-stale`)
- Bottom-sheet handle: `testID="tray-handle"`
- BedPicker rows: `testID="bed-picker-${b.id}"`

### Pattern E: Confidence + Stale helpers

**Source:**
- `app/src/components/DraftReviewCard.tsx:14-30` (`confidenceToState`, `confidenceLabel`) — reused verbatim through DraftReviewCard props.
- `TrafficLightBadge` (`app/src/components/TrafficLightBadge.tsx:8-23`) — `state='amber'` for Stale per UI-SPEC.

**Apply to:** Stale-badge rendering inside `DraftsTrayBottomSheet` via `details={<TrafficLightBadge state='amber' label={t('editor.tray.staleBadge')} />}`.

### Pattern F: Outbox-error wrapping

**Source:** `app/src/lib/errors.ts` + every existing repo `catch (cause) { throw new OutboxEnqueueError(...) }`.
**Apply to:** `writePlanElement` and the patched `promoteBedDraft`.

```typescript
import { OutboxEnqueueError } from './errors';
// In catch:
throw new OutboxEnqueueError('plan_elements', el.id, cause);
```

### Pattern G: Sticky-footer / floating overlay button layout

**Source:** `app/app/(app)/import/review.tsx:330-347` (absolute-positioned footer over ScrollView).
**Apply to:** Editor screen's bottom-floating tray-chip + palette stack:

```tsx
<View className="absolute bottom-0 left-0 right-0 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700">
  <DraftsTrayBottomSheet />
  <ElementPalette />
</View>
```

### Pattern H: Test mocks for repo unit tests

**Source:** `app/src/lib/__tests__/gardenPlanRepo.test.ts:8-31`, `app/src/lib/__tests__/draftPromotionRepo.test.ts:13-33`
**Apply to:** Any new repo test (e.g., editor wraps for `writePlanElement`).

Triple-mock skeleton: `storage` + `authStore` + `SyncTriggers`. `process.env` Supabase stubs at top:
```typescript
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';
```

### Pattern I: Component-test framework (extend with editor mocks)

**Source:** `app/jest.config.ts:81-105` (components project) + `app/src/components/__tests__/setup.ts`
**Apply to:** All new editor component tests.

- File name pattern: `*.test.tsx`
- Env: `jsdom`
- Setup file: NEW `app/src/components/editor/__tests__/setup.ts` (extends shape with Skia + gesture-handler + reanimated mocks — see file spec above).
- Module aliases already wired: `@spatenstich/shared`, `@/src/*`, `@/...`
- Library: `@testing-library/react-native`

### Pattern J: PLAN_COLORS + darkenColor centralization

**Source:** `app/src/components/GardenPlanView.tsx:10-35`
**Apply to:** EditorCanvas + PolygonInProgress + PaletteCard + GhostRing (the entire visual color contract).

**Recommendation per UI-SPEC §Element stroke rule:** extract `PLAN_COLORS` + `darkenColor` + `truncateLabel` from `GardenPlanView.tsx` into a shared module `app/src/lib/colors.ts` so the read-only SVG view and the Skia editor share one source. The SVG view re-imports from there; no behavior change for Home preview.

### Pattern K: Two-stage debounce (RESEARCH §Pattern 7)

**Source:** RESEARCH §Pattern 7 — combines existing `scheduleWriteDebounced` (500 ms server push, `app/src/lib/sync/SyncTriggers.ts`) with new per-element 5 s editor debounce.
**Apply to:** `editorSaveDebounce.ts` → `writePlanElement` → existing `scheduleWriteDebounced`.

```
User edits element ──► editorSaveDebounce (5 s per element) ──► writePlanElement
                                                                       │
                                                                       ▼
                                                                 writeWithOutbox (atomic)
                                                                       │
                                                                       ▼
                                                                 scheduleWriteDebounced (500 ms server-push)
```

Manual Save button must call `flushAllPendingSaves()` (cancels 5 s timers + writes immediately) — does NOT bypass `scheduleWriteDebounced`'s 500 ms; that stays in line with the rest of the app's outbox cadence.

### Pattern L: GestureHandlerRootView placement (Pitfall-7)

**Source:** RESEARCH §Pitfall 7 + Code Examples §10
**Apply to:** `app/app/_layout.tsx` only — once for the whole app.

The wrapper MUST be the outermost component in the tree (per `react-native-gesture-handler` docs), so any modal / bottom-sheet / palette inside any future screen inherits the gesture root.

---

## No Analog Found

Files with no close match in the codebase. Mitigation = patterns + scaffolds from RESEARCH §Code Examples.

| File | Role | Data Flow | Mitigation |
|------|------|-----------|------------|
| `app/src/components/editor/EditorCanvas.tsx` | Skia canvas component | render + gesture-driven | First Skia component. Visual contract (PLAN_COLORS, sizing math) reused verbatim from `GardenPlanView.tsx`. Skia API patterns: RESEARCH §Pattern 1, §Code Examples §1-2. Single outer `<Group transform={...}>` per Pitfall-6. |
| `app/src/components/editor/PolygonInProgress.tsx`, `GhostRing.tsx` | Skia overlay shapes | render | First Skia primitives. Recipes ready in RESEARCH §Pattern 4-5 + Code Examples §4-5. |
| `app/src/components/editor/ElementPalette.tsx` + `PaletteCard.tsx` | Long-press-then-drag UI | gesture composition | First gesture-handler composition. Pattern from RESEARCH §Pattern 3 + Code Examples §3 (LongPress → manualActivation Pan, sharedValue handoff). Pitfall-2 documents the ScrollView-nested-Pan trap to avoid. |
| `app/src/stores/editorStore.ts` (zundo middleware) | Zustand store with temporal | event-driven | Zustand pattern exists (`importStore`); zundo middleware is new. Pattern from RESEARCH §Pattern 8 + Code Examples (the entire snippet at lines 446-494). `partialize` + `limit: 20` + `equality` triple required per Pitfall-3. |
| `app/src/lib/editor/saveDebounce.ts` (per-id Map) | timer | timer-based | Existing `SyncTriggers.scheduleWriteDebounced` uses a single global timer; this needs `Map<id, Timeout>`. RESEARCH §Code Examples §5 provides the full module ready to copy. |

---

## Metadata

**Analog search scope:**
- `app/app/(app)/` (siblings: index.tsx, _layout.tsx, import/review.tsx, import/preview.tsx)
- `app/src/lib/` (gardenPlanRepo.ts, draftPromotionRepo.ts, importRepo.ts, mappers/rowMappers.ts, sync/SyncTriggers.ts, sync/SyncWorker.ts, utils.ts, errors.ts)
- `app/src/components/` (GardenPlanView.tsx, DraftReviewCard.tsx, ImportEntityCard.tsx, InlineBanner.tsx, TrafficLightBadge.tsx, SyncStatusBadge.tsx, ui/*)
- `app/src/components/__tests__/` (setup.ts, ImportReview.test.tsx, preview-navigation.test.tsx)
- `app/src/lib/__tests__/` (gardenPlanRepo.test.ts, draftPromotionRepo.*.test.ts, rowMappers.test.ts)
- `app/src/stores/` (importStore.ts, reviewSettingsStore.ts, authStore.ts, settingsStore.ts)
- `packages/shared/src/i18n/de.json` (import.* and import.review.* blocks)
- `packages/shared/src/types/entities.ts` (`PlanElementRow`)
- `supabase/migrations/` (017_plan_elements_provenance.sql, 016_import_drafts.sql, 014_garden_plan.sql)
- `app/jest.config.ts`, `app/app/_layout.tsx`

**Files scanned:** 32
**Strong analogs identified:** 14 (early-stop threshold reached)
**Pattern extraction date:** 2026-05-12

**Confidence:** HIGH for everything below the Skia/gesture-handler/zundo layer (~80% of file count — all schema, mapper, repo, store-shape, screen, i18n, test infrastructure already has direct sibling patterns in the codebase). MEDIUM for the Skia rendering + gesture composition + zundo temporal middleware (~20% of file count — first-of-kind in the codebase; RESEARCH provides ready-to-paste recipes from canonical sources, but no in-repo precedent). Per RESEARCH §"Don't Hand-Roll" line 525: "Editor work should be 80 % UI + state + glue, 20 % Skia/gesture novelty."

## PATTERN MAPPING COMPLETE
