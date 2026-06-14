// Phase 7 Plan 03: Editor state with 20-step undo/redo (zundo temporal middleware).
// Pattern: importStore.ts (transient Zustand) + zundo (RESEARCH §Pattern 8).
//
// Pitfall-3: partialize { elements } only — selection/viewport/tool/activeLayers/showGrid
//   /polygonInProgress/gestureActive/editingElementId excluded from history. Only element-set is undoable.
// Pitfall-5: drag-in-flight (gestureActive=true) bypasses the autosave subscription.
// Open Q 4: selection is cleared on every undo/redo to avoid stale pointers to deleted ids.
//
// Auto-save subscription wires elements -> scheduleSaveElement at module load.
// Phase 09.1: gestureActive subscription pauses/resumes zundo temporal for Live-Preview (D-22).

import { create } from 'zustand';
import { temporal } from 'zundo';
import type { PlanElementRow } from '@spatenstich/shared';
import { polygonToBbox, type Point2D } from '../lib/geometry/bedLayout';
import { useAuthStore } from './authStore';
import { scheduleSaveElement } from '../lib/editor/saveDebounce';

export interface EditorState {
  // History-tracked
  elements: PlanElementRow[];

  // NOT in history (partialize excludes — Pitfall-3)
  selection: string | null;
  viewport: { tx: number; ty: number; scale: number };
  tool: 'select' | 'polygon' | 'placing';
  activeLayers: { infrastructure: boolean; seasonal: boolean };
  showGrid: boolean;
  polygonInProgress: { gardenId: string; pointsM: Point2D[] } | null;
  /** Pitfall-5: true while a touch gesture is mid-update; autosave subscription bails out. */
  gestureActive: boolean;
  /** T-09.1-MODAL-ESC: UI-only ephemeral state — NOT in zundo partialize (opening modal must not be in undo history). */
  editingElementId: string | null;

  // Actions
  addElement: (el: PlanElementRow) => void;
  updateElement: (id: string, patch: Partial<PlanElementRow>) => void;
  deleteElement: (id: string) => void;
  setSelection: (id: string | null) => void;
  setTool: (tool: EditorState['tool']) => void;
  setGestureActive: (active: boolean) => void;
  setEditingElementId: (editingElementId: string | null) => void;
  toggleLayer: (layer: 'infrastructure' | 'seasonal') => void;
  /** Bulk-set both layer flags atomically — used by EditorToolbar 3-state layer cycle. */
  setActiveLayers: (activeLayers: { infrastructure: boolean; seasonal: boolean }) => void;
  toggleGrid: () => void;
  polygonAddPoint: (xM: number, yM: number, gardenId: string) => void;
  polygonCommit: (label: string, gardenId: string, userId: string) => void;
  polygonCancel: () => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Non-crypto fallback: timestamp + random suffix (not a true UUID, but unique enough for offline use).
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      elements: [],
      selection: null,
      viewport: { tx: 0, ty: 0, scale: 1 },
      tool: 'select',
      activeLayers: { infrastructure: true, seasonal: true },
      showGrid: true,
      polygonInProgress: null,
      gestureActive: false,
      editingElementId: null,

      addElement: (el) => set((s) => ({ elements: [...s.elements, el] })),

      updateElement: (id, patch) =>
        set((s) => ({
          elements: s.elements.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: nowIso() } : e,
          ),
        })),

      deleteElement: (id) =>
        set((s) => ({
          elements: s.elements.map((e) =>
            e.id === id
              ? { ...e, deletedAt: nowIso(), updatedAt: nowIso() }
              : e,
          ),
        })),

      setSelection: (id) => set({ selection: id }),
      setTool: (tool) => set({ tool }),
      setGestureActive: (gestureActive) => set({ gestureActive }),
      setEditingElementId: (editingElementId) => set({ editingElementId }),

      toggleLayer: (layer) =>
        set((s) => ({
          activeLayers: { ...s.activeLayers, [layer]: !s.activeLayers[layer] },
        })),

      // Phase 7 Plan 03 (revision W5): bulk-set both layer flags atomically so the
      // EditorToolbar 3-state layer-cycle handler does not bypass the store action
      // surface (no direct setState({ activeLayers }) from components).
      setActiveLayers: (activeLayers) => set({ activeLayers }),

      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

      polygonAddPoint: (xM, yM, gardenId) =>
        set((s) => ({
          polygonInProgress: s.polygonInProgress
            ? {
                ...s.polygonInProgress,
                pointsM: [...s.polygonInProgress.pointsM, { x: xM, y: yM }],
              }
            : { gardenId, pointsM: [{ x: xM, y: yM }] },
        })),

      polygonCommit: (label, gardenId, userId) => {
        const p = get().polygonInProgress;
        if (!p) throw new Error('no polygon in progress');
        const bbox = polygonToBbox(p.pointsM); // throws on <3 points
        const element: PlanElementRow = {
          id: randomId(),
          gardenId,
          elementType: 'Beet',
          label,
          xM: bbox.xM,
          yM: bbox.yM,
          widthM: bbox.widthM,
          heightM: bbox.heightM,
          confidence: null,
          isAccepted: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          updatedByUserId: userId,
          deletedAt: null,
          importedFrom: null,
          provenance: { source: 'manual', polygonPointsM: p.pointsM },
          layer: 'infrastructure',
        };
        set((s) => ({
          elements: [...s.elements, element],
          polygonInProgress: null,
          tool: 'select',
        }));
      },

      polygonCancel: () =>
        set({ polygonInProgress: null, tool: 'select' }),
    }),
    {
      limit: 20, // EDIT-11
      // editingElementId NOT in partialize: opening modal must not be in undo history (T-09.1-MODAL-ESC).
      partialize: (state) => ({ elements: state.elements }), // Pitfall-3
      equality: (a, b) => a.elements === b.elements, // shallow ref dedup
    },
  ),
);

// Open Q 4: clear selection on every undo/redo (avoid stale pointer to a deleted element).
// Wrap the temporal undo/redo so the side-effect happens automatically without callers
// needing to remember to clear selection themselves.
{
  const temporalApi = useEditorStore.temporal;
  const tState = temporalApi.getState();
  const originalUndo = tState.undo;
  const originalRedo = tState.redo;
  temporalApi.setState({
    undo: (steps?: number) => {
      originalUndo(steps);
      useEditorStore.setState({ selection: null });
    },
    redo: (steps?: number) => {
      originalRedo(steps);
      useEditorStore.setState({ selection: null });
    },
  });
}

// Phase 09.1: pause zundo during active gestures so handle drags don't spam
// the 20-step history. One final updateElement after gesture end captures one snapshot.
// T-09.1-RESUME-LEAK mitigation: resume is called synchronously on gestureActive=false.
//
// Quick-260611-l5y: Gesture-end flush.
// Problem: updateElement runs DURING gesture (gestureActive=true) → autosave bails (Pitfall-5).
//   On release only setGestureActive(false) is called — elements ref is unchanged in that set-call
//   → autosave bails again (elements===prev.elements). Move is never persisted.
// Fix: snapshot elements when gesture starts; on gesture end, diff against snapshot and call
//   scheduleSaveElement for every element whose reference changed (i.e. was updated during drag).
//   Uses ONLY the existing scheduleSaveElement → writePlanElement → writeWithOutbox path. No new
//   persistence mechanism.
let gestureStartElements: PlanElementRow[] | null = null;

useEditorStore.subscribe((state, prev) => {
  if (state.gestureActive && !prev.gestureActive) {
    // Gesture start: freeze snapshot for later diff
    gestureStartElements = prev.elements;
    useEditorStore.temporal.getState().pause();
  } else if (!state.gestureActive && prev.gestureActive) {
    // Gesture end: flush elements changed during the gesture
    const snapshot = gestureStartElements;
    gestureStartElements = null;
    useEditorStore.temporal.getState().resume();

    if (snapshot !== null) {
      const mode = useAuthStore.getState().mode;
      if (mode === 'account') {
        for (const el of state.elements) {
          const snapEl = snapshot.find((s) => s.id === el.id);
          // Flush if element is new or its reference changed (i.e. it was updated)
          if (!snapEl || snapEl !== el) {
            scheduleSaveElement(mode, el);
          }
        }
      }
    }
  }
});

// Auto-save subscription (Pitfall-5: skip during active gesture; account-only).
useEditorStore.subscribe((state, prev) => {
  if (state.gestureActive) return;
  if (state.elements === prev.elements) return;
  const mode = useAuthStore.getState().mode;
  if (mode !== 'account') return; // drafts/elements are account-only
  for (const el of state.elements) {
    const prevEl = prev.elements.find((p) => p.id === el.id);
    if (!prevEl || prevEl !== el) {
      scheduleSaveElement(mode, el);
    }
  }
});
