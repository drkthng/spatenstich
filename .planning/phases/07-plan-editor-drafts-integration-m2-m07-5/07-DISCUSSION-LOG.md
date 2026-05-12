# Phase 7: Plan-Editor + Drafts-Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 07-plan-editor-drafts-integration-m2-m07-5
**Mode:** `--auto` (Claude selected recommended defaults; no interactive Q&A)
**Areas discussed:** Rendering & Performance, State+Save+Undo, Editor UX, Drafts Integration, Data Model

---

## Rendering & Performance

| Option | Description | Selected |
|--------|-------------|----------|
| `@shopify/react-native-skia` | GPU-accelerated, worklet hit-tests, hits EDIT-12 60fps@200 elements | ✓ |
| `react-native-svg` (current) | Already installed for static `GardenPlanView`; declarative, simpler — but cannot hit EDIT-12 |  |
| Hybrid (SVG read-only + Skia editor) | Keep static SVG for Home preview, Skia only inside editor route | partial — chosen as fallback |

**Auto-pick:** `@shopify/react-native-skia` upfront. EDIT-01 names it explicitly; CLAUDE.md tech-stack rates it HIGH; React-Native-SVG explicitly rejected for editor by tech-stack doc. Hybrid implicitly accepted because `GardenPlanView.tsx` remains for Home preview.

| Option | Description | Selected |
|--------|-------------|----------|
| `react-native-gesture-handler` + `reanimated` worklets | Multi-touch, pinch, hit-test on UI thread; reanimated v3.17.4 already installed | ✓ |
| `PanResponder` (RN built-in) | No new dep, but JS-bridge per gesture event — drops frames at 200 elements |  |

**Auto-pick:** gesture-handler + reanimated worklets — only path that satisfies EDIT-12.

| Option | Description | Selected |
|--------|-------------|----------|
| Meters in DB, pixels at render | Existing `plan_elements.x/y/widthM/heightM` are already meters (Phase 4) — viewport transform handles px | ✓ |
| Pixels in DB | Would require migration + breaks import schema |  |

**Auto-pick:** meters. No-op data-model decision; just locks the principle.

---

## State, Save, Undo/Redo

| Option | Description | Selected |
|--------|-------------|----------|
| Zustand + `zundo` temporal middleware | Drop-in 20-snapshot history, matches existing Zustand pattern (`importStore`, `reviewSettingsStore`) | ✓ |
| Hand-rolled command pattern | More work, more bugs, more memory tuning |  |
| Snapshot-only stack (no middleware) | Same as zundo but reimplemented — pointless |  |

**Auto-pick:** Zustand + zundo. Matches established store pattern; library is tiny and treeshakeable.

| Option | Description | Selected |
|--------|-------------|----------|
| 5s debounce + manual save | EDIT-09 spec; reuses `scheduleWriteDebounced` from `gardenPlanRepo.ts` | ✓ |
| Throttled writes (every 1-2s) | More writes to outbox; no win over debounce for typing-pause use case |  |
| Idle-only autosave | Risk of data loss if user navigates away |  |

**Auto-pick:** 5s debounce + manual save button. Literal EDIT-09 wording.

---

## Editor UX

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom tab-bar palette (Beete / Pflanzen / Infrastruktur) | Thumb-reachable on mobile; familiar mobile pattern | ✓ |
| Side drawer | Wastes horizontal canvas space on phone |  |
| Floating action button + radial menu | Slick but unfamiliar; harder for Dirk's wife on Desktop browser |  |

**Auto-pick:** Bottom tab-bar palette.

| Option | Description | Selected |
|--------|-------------|----------|
| Tap-corners + explicit "Beet abschließen" button | Predictable; matches Phase 6.5 "explicit > implicit" convention | ✓ |
| Double-tap to close polygon | Accidental closes; collides with zoom-double-tap |  |
| Auto-close when last-tap near first corner | Magical — easy to mis-trigger |  |

**Auto-pick:** explicit close button.

| Option | Description | Selected |
|--------|-------------|----------|
| Ghost-ring spacing visual + non-blocking toast on overlap | Aesthetic; Dirk decides | ✓ |
| Hard-block placement on overlap | Spec says "Hinweis", not block |  |
| Numeric tooltip only | Less informative than visual |  |

**Auto-pick:** Ghost-ring + non-blocking toast.

| Option | Description | Selected |
|--------|-------------|----------|
| Two layers with eye-toggle (`infrastructure` / `seasonal`) | EDIT-08 spec; new column `layer` on `plan_elements` | ✓ |
| Tag-based layers (filter by `kind`) | Less explicit; harder for user to reason about |  |

**Auto-pick:** explicit two-layer column.

---

## Drafts Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom-sheet tray (chip → expand) | Counter chip visible at all times; expanded sheet shows full list | ✓ |
| Persistent side panel | Eats canvas real estate |  |
| Modal screen overlay | Disrupts editor flow |  |

**Auto-pick:** Bottom-sheet tray. Bed-drafts drag to canvas → `promoteBedDraft`. Plant-drafts tap → "Auf Beet anwenden" → modal Beet-Auswahl → `promotePlantDraft`.

| Option | Description | Selected |
|--------|-------------|----------|
| Stale-badge on draft card (computed on-render, 30d threshold) | Zero migration cost; visible filter "Alle / Aktuell / Stale" | ✓ |
| Separate "Stale Imports" screen | Adds navigation; DRAFT-03 doesn't require it |  |
| Auto-delete after 30d | Spec explicitly says "nie auto-gelöscht" |  |

**Auto-pick:** Stale-badge + filter; no auto-delete.

---

## Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Migration 018: add `layer text not null default 'infrastructure'` with CHECK | Backfills existing rows safely; plant writes set `seasonal` via mapper | ✓ |
| Compute `layer` in app from `kind` | Couples display to type; breaks if a plant element is moved to infra |  |
| Two separate tables | Massive refactor; breaks existing repo/mapper |  |

**Auto-pick:** Migration 018 + mapper update.

---

## Claude's Discretion

- Skia canvas layer composition + reanimated shared-values layout
- Toolbar icon set (lucide-react-native already mocked globally via Phase 6.5 P05)
- Rotation gesture: Two-finger rotate vs. dedicated rotate-handle
- Exact zoom/pan limits and initial viewport calculation
- Test scaffold strategy per plan (Wave-0 pattern from 6.5 P01 available if helpful)
- i18n strings for editor UI (toolbar, toasts, confirm dialogs)
- Plan partitioning (waves) — decided in plan-phase

## Deferred Ideas

- Multi-select + bulk operations (v1.1 candidate)
- Snap-to-grid toggle (available without migration; defer until requested)
- Element locking / grouping (no requirement)
- Skia on Web editor mode (Canvaskit-WASM + COOP/COEP) — needs own mini-phase if Desktop editor demand emerges
- Smart-layout suggestions on draft drop (potential Phase 9 surface)
- EDIT-10 Vereinsregel-Warnung (already deferred to Phase 10)
