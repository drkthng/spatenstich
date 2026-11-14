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
import { getZOrder } from '../lib/editor/zOrder';
import { applyElementPatch } from '../lib/editor/bedBinding';

/** Undo steps kept (EDIT3-11). */
const HISTORY_LIMIT = 100;
/** Delay before a change made by typing is written; finished changes are written at once. */
const TYPING_SAVE_DELAY_MS = 300;

export interface EditorState {
  // History-tracked
  elements: PlanElementRow[];

  // NOT in history (partialize excludes — Pitfall-3)
  selection: string | null;
  /**
   * Multi-Select-IDs. Ergänzt `selection` additiv.
   * Pitfall-3: wie selection NICHT in zundo partialize — kein Undo-Eintrag für Selektion.
   * setSelection hält selectedIds synchron (Backward-Compat für alle Einzel-Selektion-Aufrufer).
   */
  selectedIds: string[];
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
  /**
   * Phase 31 (WP 21.3): put a loaded plan into the editor. Writes nothing, leaves no undo
   * step, clears the selection.
   */
  hydrate: (elements: PlanElementRow[]) => void;
  /**
   * Bracket several changes into one undo step (typing in a field, a burst of arrow keys).
   * Saving continues as usual. Gestures do this themselves through setGestureActive.
   */
  beginHistoryStep: () => void;
  endHistoryStep: () => void;
  /** Soft-deletes every selected element as one undo step; returns the deleted ids. */
  deleteSelected: () => string[];
  /** Brings soft-deleted elements back (the "Rückgängig" hint after a delete). */
  restoreElements: (ids: string[]) => void;
  /** Copies the selected elements, offset a little, on top; the copies become the selection. */
  duplicateSelected: (
    makeId: () => string,
    garden: { widthM: number; heightM: number },
    offsetM?: number,
  ) => void;
  /** Moves the selected elements above or below everything else. */
  reorderSelected: (to: 'front' | 'back') => void;
  addElement: (el: PlanElementRow) => void;
  updateElement: (id: string, patch: Partial<PlanElementRow>) => void;
  deleteElement: (id: string) => void;
  setSelection: (id: string | null) => void;
  /** Additives Toggle: id in selectedIds → entfernen, sonst hinzufügen. selection = letztes Element. */
  toggleSelection: (id: string) => void;
  /** Ersetzt selectedIds komplett; selection = letztes Element (oder null wenn leer). */
  setSelectedIds: (ids: string[]) => void;
  /** Leert selectedIds und selection. */
  clearSelection: () => void;
  /**
   * Verschiebt JEDES Element in selectedIds (deletedAt===null) um (dxM,dyM) via updateElement.
   * Kein Clamping im Store (dimensions unbekannt — Clamping liegt im Web-Editor).
   * Kein eigener setGestureActive-Aufruf — Aufrufer steuert die Gesture-Klammer.
   */
  moveSelectedBy: (dxM: number, dyM: number) => void;
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
      selectedIds: [],
      viewport: { tx: 0, ty: 0, scale: 1 },
      tool: 'select',
      activeLayers: { infrastructure: true, seasonal: true },
      showGrid: true,
      polygonInProgress: null,
      gestureActive: false,
      editingElementId: null,

      hydrate: (elements) => {
        hydrating = true;
        try {
          const temporalState = useEditorStore.temporal.getState();
          temporalState.pause();
          set({ elements, selection: null, selectedIds: [], editingElementId: null });
          temporalState.resume();
          temporalState.clear();
        } finally {
          hydrating = false;
        }
      },

      beginHistoryStep: () => beginStep(),
      endHistoryStep: () => endStep(),

      deleteSelected: () => {
        const { selectedIds, elements } = get();
        const ids = selectedIds.filter((id) =>
          elements.some((e) => e.id === id && e.deletedAt === null),
        );
        if (ids.length === 0) return [];
        const now = nowIso();
        set((s) => ({
          elements: s.elements.map((e) =>
            ids.includes(e.id) ? { ...e, deletedAt: now, updatedAt: now } : e,
          ),
          selection: null,
          selectedIds: [],
        }));
        return ids;
      },

      restoreElements: (ids) => {
        if (ids.length === 0) return;
        const now = nowIso();
        set((s) => ({
          elements: s.elements.map((e) =>
            ids.includes(e.id) && e.deletedAt !== null
              ? { ...e, deletedAt: null, updatedAt: now }
              : e,
          ),
        }));
      },

      duplicateSelected: (makeId, garden, offsetM = 0.5) => {
        const { selectedIds, elements } = get();
        const originals = elements.filter(
          (e) => selectedIds.includes(e.id) && e.deletedAt === null,
        );
        if (originals.length === 0) return;
        const now = nowIso();
        let top = Math.max(0, ...elements.filter((e) => e.deletedAt === null).map(getZOrder));
        const copies = originals.map((e) => {
          top += 1;
          return {
            ...e,
            id: makeId(),
            xM: Math.min(garden.widthM, e.xM + offsetM),
            yM: Math.min(garden.heightM, e.yM + offsetM),
            createdAt: now,
            updatedAt: now,
            importedFrom: null,
            provenance: { ...(e.provenance ?? {}), zOrder: top },
          };
        });
        const ids = copies.map((c) => c.id);
        set((s) => ({
          elements: [...s.elements, ...copies],
          selectedIds: ids,
          selection: ids[ids.length - 1] ?? null,
        }));
      },

      reorderSelected: (to) => {
        const { selectedIds, elements } = get();
        const live = elements.filter((e) => e.deletedAt === null);
        const chosen = live
          .filter((e) => selectedIds.includes(e.id))
          .sort((a, b) => getZOrder(a) - getZOrder(b));
        if (chosen.length === 0) return;
        const others = live.filter((e) => !selectedIds.includes(e.id)).map(getZOrder);
        const now = nowIso();
        const next = new Map<string, number>();
        if (to === 'front') {
          let z = others.length > 0 ? Math.max(...others) : 0;
          for (const e of chosen) next.set(e.id, (z += 1));
        } else {
          let z = (others.length > 0 ? Math.min(...others) : 0) - chosen.length - 1;
          for (const e of chosen) next.set(e.id, (z += 1));
        }
        set((s) => ({
          elements: s.elements.map((e) =>
            next.has(e.id)
              ? { ...e, updatedAt: now, provenance: { ...(e.provenance ?? {}), zOrder: next.get(e.id) } }
              : e,
          ),
        }));
      },

      addElement: (el) => set((s) => ({ elements: [...s.elements, el] })),

      // Phase 32 (EDIT3-12): a bed takes its plants along; a moved plant notes its bed.
      updateElement: (id, patch) =>
        set((s) => ({ elements: applyElementPatch(s.elements, id, patch, nowIso()) })),

      deleteElement: (id) =>
        set((s) => ({
          elements: s.elements.map((e) =>
            e.id === id
              ? { ...e, deletedAt: nowIso(), updatedAt: nowIso() }
              : e,
          ),
        })),

      // Backward-Compat: setzt selection UND selectedIds synchron (Ein-Element-Pfad).
      // Alle bestehenden setSelection-Aufrufer (handleElementMouseDown ohne Modifier,
      // Drag-to-create, Delete-Reset, native EditorCanvas, Escape) bleiben automatisch korrekt.
      setSelection: (id) => set({ selection: id, selectedIds: id ? [id] : [] }),

      toggleSelection: (id) => {
        const { selectedIds } = get();
        const next = selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id];
        set({ selectedIds: next, selection: next[next.length - 1] ?? null });
      },

      setSelectedIds: (ids) =>
        set({ selectedIds: ids, selection: ids[ids.length - 1] ?? null }),

      clearSelection: () => set({ selectedIds: [], selection: null }),

      moveSelectedBy: (dxM, dyM) => {
        const { selectedIds, elements } = get();
        if (selectedIds.length === 0) return;
        for (const id of selectedIds) {
          const el = elements.find((e) => e.id === id);
          if (!el || el.deletedAt !== null) continue;
          get().updateElement(id, { xM: el.xM + dxM, yM: el.yM + dyM });
        }
      },

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
      limit: HISTORY_LIMIT, // EDIT3-11
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
      // Open Q 4: selection + selectedIds leeren (stale-Pointer-Schutz)
      useEditorStore.setState({ selection: null, selectedIds: [] });
    },
    redo: (steps?: number) => {
      originalRedo(steps);
      // Open Q 4: selection + selectedIds leeren (stale-Pointer-Schutz)
      useEditorStore.setState({ selection: null, selectedIds: [] });
    },
  });
}

// ── history steps and saving (Phase 31: EDIT3-11, EDIT3-18, Masterplan WP 21.3) ────
//
// History: a step that spans several store updates (a drag, typing in a field, a burst of
// arrow keys) is recorded as ONE undo step that restores the state before it began. Tracking
// is paused while the step runs and the state from its start is pushed when it ends.
//
// Saving: every change is written through scheduleSaveElement -> writePlanElement -> outbox.
//   - during a gesture nothing is written; at its end every changed element is written at once
//   - other changes are written after a short delay, so typing does not write per keystroke
//   - an element that disappears from the list (undo of an add) is written as deleted, so it
//     does not come back after a reload
//   - hydrate() writes nothing

let hydrating = false;
let stepDepth = 0;
let stepStartElements: PlanElementRow[] | null = null;

function beginStep(): void {
  stepDepth += 1;
  if (stepDepth > 1) return;
  stepStartElements = useEditorStore.getState().elements;
  useEditorStore.temporal.getState().pause();
}

function endStep(): void {
  if (stepDepth === 0) return;
  stepDepth -= 1;
  if (stepDepth > 0) return;
  const start = stepStartElements;
  stepStartElements = null;
  const temporalStore = useEditorStore.temporal;
  temporalStore.getState().resume();
  if (start !== null && start !== useEditorStore.getState().elements) {
    const past = [...temporalStore.getState().pastStates, { elements: start }];
    temporalStore.setState({ pastStates: past.slice(-HISTORY_LIMIT), futureStates: [] });
  }
}

let gestureStartElements: PlanElementRow[] | null = null;

useEditorStore.subscribe((state, prev) => {
  if (state.gestureActive && !prev.gestureActive) {
    // Gesture start: remember the elements for the save at the end, open one history step.
    gestureStartElements = prev.elements;
    beginStep();
  } else if (!state.gestureActive && prev.gestureActive) {
    const snapshot = gestureStartElements;
    gestureStartElements = null;
    endStep();

    if (snapshot !== null) {
      const mode = useAuthStore.getState().mode;
      if (mode === 'account') {
        for (const el of state.elements) {
          const snapEl = snapshot.find((s) => s.id === el.id);
          // Write every element that is new or was changed during the gesture, at once.
          if (!snapEl || snapEl !== el) {
            scheduleSaveElement(mode, el, 0);
          }
        }
      }
    }
  }
});

// Autosave for everything outside gestures (account-only).
useEditorStore.subscribe((state, prev) => {
  if (hydrating) return;
  if (state.gestureActive) return;
  if (state.elements === prev.elements) return;
  const mode = useAuthStore.getState().mode;
  if (mode !== 'account') return; // drafts/elements are account-only
  const present = new Set<string>();
  for (const el of state.elements) {
    present.add(el.id);
    const prevEl = prev.elements.find((p) => p.id === el.id);
    if (!prevEl) {
      // New, or back again after a redo: write at once.
      scheduleSaveElement(mode, el, 0);
    } else if (prevEl !== el) {
      // Written at once, unless it is part of an open history step (typing in a field,
      // arrow keys), where a short delay avoids one write per keystroke.
      scheduleSaveElement(mode, el, stepDepth === 0 ? 0 : TYPING_SAVE_DELAY_MS);
    }
  }
  // Gone from the list (undo of an add): store it as deleted so a reload does not bring it back.
  const now = nowIso();
  for (const prevEl of prev.elements) {
    if (!present.has(prevEl.id) && prevEl.deletedAt === null) {
      scheduleSaveElement(mode, { ...prevEl, deletedAt: now, updatedAt: now }, 0);
    }
  }
});
