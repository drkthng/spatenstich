// The full-screen plan editor, for finger and mouse alike.
//
// Phase 30 (EDIT3-01 … EDIT3-08): the plate, select/move/resize/rotate/rename, zoom and pan,
//   the properties field as a strip under the plan on a phone and a panel on desktop.
// Phase 31:
//   EDIT3-09  palette with beds, plants (search) and facilities; placing with a preview
//   EDIT3-10  several elements: move together, duplicate, layer order, delete with a way back
//   EDIT3-11  undo and redo
//   EDIT3-16  size label on the selected element; spacing ring and neighbour hint for plants
//   EDIT3-17  keyboard: Entf, Esc, arrow keys (Shift for big steps), Strg+Z, Strg+Y, Strg+A
//   EDIT3-18  changes are saved without doing anything, the save state is visible, and what
//             is still waiting is written when the app is hidden or closed
// Phase 32:
//   EDIT3-12  plants follow their bed (in the store)
//   EDIT3-13  snapping with guide lines, with a switch in the bar
//   EDIT3-14  beds with a free outline: drawn corner by corner, corners edited afterwards
//   EDIT3-15  size and boundary of the parcel

import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Magnet,
  Maximize,
  Plus,
  Redo2,
  SquareDashedMousePointer,
  Undo2,
  X,
} from 'lucide-react-native';
import {
  getBoundary,
  withBoundary,
  withNorthDeg,
  type GardenDimensionsRow,
  type PlantDbBundle,
} from '@spatenstich/shared';
import type { PlanElementRow } from '@spatenstich/shared';
import plantsBundle from '@spatenstich/shared/data/plants';
import { useAuthStore } from '@/src/stores/authStore';
import { useEditorStore } from '@/src/stores/editorStore';
import { loadDimensions, loadAcceptedElements, saveDimensions } from '@/src/lib/gardenPlanRepo';
import {
  flushOnLeave,
  getSaveState,
  retryFailedSaves,
  subscribeSaveState,
} from '@/src/lib/editor/saveDebounce';
import { notifyPlanChanged } from '@/src/lib/editor/planRefresh';
import { syncEvents } from '@/src/lib/sync/events';
import { storage } from '@/src/storage';
import { hasPendingSave } from '@/src/lib/editor/saveDebounce';
import { memberName, showSyncToast } from '@/src/components/SyncToastHost';
import { createElement, newElementId } from '@/src/lib/editor/elementFactory';
import { clampGroupDelta, DRAG_STEP_M } from '@/src/lib/editor/elementGeometry';
import { bringToFront } from '@/src/lib/editor/zOrder';
import {
  elementPolygon,
  outlineFromCorners,
  outlinePatch,
  type WorldPoint,
} from '@/src/lib/editor/outline';
import { ParcelPanel } from '@/src/components/plan/ParcelPanel';
import {
  isTooClose,
  placementProvenance,
  previewElement,
  type PaletteItem,
} from '@/src/lib/editor/placing';
import {
  buildCompanionMap,
  computeToastForElement,
  useCompanionDetection,
} from '@/src/hooks/useCompanionDetection';
import { usePlants } from '@/src/hooks/usePlants';
import { PlanEditor, type PlanEditorHandle } from '@/src/components/plan/PlanEditor';
import { PlanPalette } from '@/src/components/plan/PlanPalette';
import {
  MultiSelectionPanel,
  PropertiesPanel,
  type SelectionActionHandlers,
} from '@/src/components/plan/PropertiesPanel';
import { ElementEditorModal } from '@/src/components/editor/ElementEditorModal';
import { CompanionToast } from '@/src/components/editor/CompanionToast';
import { t } from '@/src/lib/i18n';
import { tokens } from '@/src/theme/tokens';

/** From this window width the palette and the properties field are side panels. */
const WIDE_LAYOUT_MIN_PX = 900;
const NORTH_SAVE_DELAY_MS = 600;
/** How long the "gelöscht · Rückgängig" hint stays. */
const DELETE_HINT_MS = 6000;
/** Arrow keys: small step, and the big step with Shift (EDIT3-17). */
const NUDGE_STEP_M = DRAG_STEP_M;
const NUDGE_BIG_STEP_M = 0.5;
/** A burst of arrow keys is one undo step; it ends this long after the last key. */
const NUDGE_STEP_END_MS = 500;

function formatLength(m: number): string {
  return String(Math.round(m * 100) / 100).replace('.', ',');
}

async function flushEditorSaves(): Promise<void> {
  const mode = useAuthStore.getState().mode;
  const byId = (id: string) => useEditorStore.getState().elements.find((e) => e.id === id);
  await flushOnLeave(mode, byId);
}

function isTextField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true;
}

function useSaveState(): ReturnType<typeof getSaveState> {
  return React.useSyncExternalStore(subscribeSaveState, getSaveState, getSaveState);
}

function useHistoryDepth(): { canUndo: boolean; canRedo: boolean } {
  const subscribe = useEditorStore.temporal.subscribe;
  const past = React.useSyncExternalStore(
    subscribe,
    () => useEditorStore.temporal.getState().pastStates.length,
    () => 0,
  );
  const future = React.useSyncExternalStore(
    subscribe,
    () => useEditorStore.temporal.getState().futureStates.length,
    () => 0,
  );
  return { canUndo: past > 0, canRedo: future > 0 };
}

function IconButton({
  label,
  testID,
  onPress,
  disabled,
  active,
  children,
}: {
  label: string;
  testID: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true, selected: active === true }}
      testID={testID}
      className={
        active
          ? 'h-11 w-11 items-center justify-center bg-surface-2 border border-line'
          : 'h-11 w-11 items-center justify-center'
      }
      style={disabled ? { opacity: 0.35 } : undefined}
    >
      {children}
    </Pressable>
  );
}

export default function PlanEditScreen(): React.JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const userId = useAuthStore((s) => s.userId);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_LAYOUT_MIN_PX;

  const editorRef = React.useRef<PlanEditorHandle>(null);
  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [multi, setMulti] = React.useState(false);
  const [placing, setPlacing] = React.useState<PaletteItem | null>(null);
  const [ghost, setGhost] = React.useState<{ xM: number; yM: number } | null>(null);
  const [deleted, setDeleted] = React.useState<string[] | null>(null);
  const [snap, setSnap] = React.useState(true);
  /** Corners of the bed that is being drawn; null when not drawing. */
  const [drawPoints, setDrawPoints] = React.useState<WorldPoint[] | null>(null);
  /** Whose corners are being edited: an element id, the parcel, or nothing. */
  const [outlineTarget, setOutlineTarget] = React.useState<string | 'parcel' | null>(null);
  const [parcelOpen, setParcelOpen] = React.useState(false);

  const elements = useEditorStore((s) => s.elements);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const editingElementId = useEditorStore((s) => s.editingElementId);
  const selected =
    selectedIds.length === 1
      ? elements.find((e) => e.id === selectedIds[0] && e.deletedAt === null)
      : undefined;
  const editing = editingElementId ? elements.find((e) => e.id === editingElementId) : undefined;

  const saveState = useSaveState();
  const { canUndo, canRedo } = useHistoryDepth();
  const { conflictElementIds, toastState, dismissToast } = useCompanionDetection();
  const { data: plants = [] } = usePlants();
  const plantBySlug = React.useMemo(() => new Map(plants.map((p) => [p.slug, p])), [plants]);
  const companionMap = React.useMemo(
    () => buildCompanionMap(plantsBundle as unknown as PlantDbBundle),
    [],
  );

  // Load the plan into the editor store: no write, no undo step.
  React.useEffect(() => {
    if (!activeGardenId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [dims, elems] = await Promise.all([
          loadDimensions(activeGardenId),
          loadAcceptedElements(activeGardenId),
        ]);
        if (cancelled) return;
        setDimensions(dims);
        useEditorStore.getState().hydrate(elems);
      } catch (err) {
        console.error('plan editor: load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeGardenId]);

  // Phase 33 (SYNC3-04): what the partner changes arrives while the editor is open.
  // Rows with a change of this device still on its way are left alone.
  React.useEffect(() => {
    if (!activeGardenId) return;
    return syncEvents.on((evt) => {
      if (evt.type !== 'pull_success' || evt.changedIds.length === 0) return;
      if (evt.entity === 'garden_dimensions') {
        void loadDimensions(activeGardenId)
          .then((dims) => {
            if (dims) setDimensions(dims);
          })
          .catch(() => {});
        return;
      }
      if (evt.entity !== 'plan_elements') return;
      void (async () => {
        const stored = await Promise.all(
          evt.changedIds.map((id) =>
            storage.getRow<PlanElementRow>('plan_elements', id, { includeDeleted: true }),
          ),
        );
        const rows = stored.filter(
          (r): r is PlanElementRow => r !== null && r.gardenId === activeGardenId,
        );
        const taken = useEditorStore.getState().mergeRemote(rows, hasPendingSave);
        if (taken > 0 && evt.foreignUserIds.length > 0) {
          const name = await memberName(evt.foreignUserIds[0]);
          showSyncToast(t('sync.toast.partnerChanged', { name }));
        }
      })().catch(() => {});
    });
  }, [activeGardenId]);

  // Leaving by any route: write what is still waiting, then let the plan view reload.
  React.useEffect(() => {
    return () => {
      const store = useEditorStore.getState();
      store.endHistoryStep();
      store.clearSelection();
      void flushEditorSaves().finally(notifyPlanChanged);
    };
  }, []);

  // App hidden, tab closed or reloaded: write what is still waiting (EDIT3-18).
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const flush = () => {
      void flushEditorSaves();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const handleDone = React.useCallback(async () => {
    try {
      await flushEditorSaves();
    } catch (err) {
      console.error('plan editor: save on leave failed', err);
    }
    notifyPlanChanged();
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/plan' as never);
  }, [router]);

  // ── placing (EDIT3-09) ────────────────────────────────────────────────

  const leaveModes = React.useCallback(() => {
    setPlacing(null);
    setGhost(null);
    setDrawPoints(null);
    setOutlineTarget(null);
    setParcelOpen(false);
  }, []);

  const startPlacing = React.useCallback((item: PaletteItem) => {
    setPaletteOpen(false);
    setDrawPoints(null);
    setOutlineTarget(null);
    setParcelOpen(false);
    useEditorStore.getState().clearSelection();
    setPlacing(item);
    setGhost(editorRef.current?.visibleCenterM() ?? null);
  }, []);

  const stopPlacing = React.useCallback(() => {
    setPlacing(null);
    setGhost(null);
  }, []);

  const placeAt = React.useCallback(
    (pos: { xM: number; yM: number }) => {
      if (!placing || !activeGardenId) return;
      const store = useEditorStore.getState();
      const el = createElement(placing.kind, pos, activeGardenId, userId, placing.label);
      el.provenance = {
        ...placementProvenance(placing, pos, store.elements),
        // A new element goes on top of everything that is already there.
        zOrder: bringToFront(store.elements, el.id),
      };
      store.addElement(el);
      if (placing.plantSlug) return; // plants: keep placing more of the same
      setPlacing(null);
      setGhost(null);
      store.setSelection(el.id);
    },
    [placing, activeGardenId, userId],
  );

  const placingHint = React.useMemo(() => {
    if (!placing || !ghost || !placing.plantSlug) return null;
    return computeToastForElement(
      previewElement(placing, ghost, elements),
      elements,
      plantBySlug,
      companionMap,
    );
  }, [placing, ghost, elements, plantBySlug, companionMap]);
  const tooClose = placing && ghost ? isTooClose(placing, ghost, elements) : false;

  // ── selection actions (EDIT3-10) ──────────────────────────────────────

  const deleteTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showDeleted = React.useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setDeleted(ids);
    deleteTimer.current = setTimeout(() => setDeleted(null), DELETE_HINT_MS);
  }, []);
  React.useEffect(
    () => () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
    },
    [],
  );

  const deleteSelection = React.useCallback(() => {
    showDeleted(useEditorStore.getState().deleteSelected());
  }, [showDeleted]);

  const actions: SelectionActionHandlers = React.useMemo(
    () => ({
      onDuplicate: () => {
        if (!dimensions) return;
        useEditorStore.getState().duplicateSelected(newElementId, dimensions);
      },
      onFront: () => useEditorStore.getState().reorderSelected('front'),
      onBack: () => useEditorStore.getState().reorderSelected('back'),
      onDelete: deleteSelection,
    }),
    [dimensions, deleteSelection],
  );

  const undo = React.useCallback(() => useEditorStore.temporal.getState().undo(), []);
  const redo = React.useCallback(() => useEditorStore.temporal.getState().redo(), []);

  // ── keyboard (EDIT3-17) ───────────────────────────────────────────────

  const nudgeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !dimensions) return;
    const garden = { widthM: dimensions.widthM, heightM: dimensions.heightM };

    const nudge = (dxM: number, dyM: number) => {
      const store = useEditorStore.getState();
      const moving = store.elements.filter(
        (e) => e.deletedAt === null && store.selectedIds.includes(e.id),
      );
      if (moving.length === 0) return;
      const delta = clampGroupDelta(moving, dxM, dyM, garden);
      if (delta.dxM === 0 && delta.dyM === 0) return;
      // A burst of key presses is one undo step.
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      else store.beginHistoryStep();
      for (const e of moving) {
        store.updateElement(e.id, {
          xM: Math.round((e.xM + delta.dxM) * 10000) / 10000,
          yM: Math.round((e.yM + delta.dyM) * 10000) / 10000,
        });
      }
      nudgeTimer.current = setTimeout(() => {
        nudgeTimer.current = null;
        useEditorStore.getState().endHistoryStep();
      }, NUDGE_STEP_END_MS);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextField(e.target)) return;
      if (useEditorStore.getState().editingElementId) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (mod && key === 'a') {
        e.preventDefault();
        const store = useEditorStore.getState();
        store.setSelectedIds(store.elements.filter((el) => el.deletedAt === null).map((el) => el.id));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        if (placing || drawPoints || outlineTarget || parcelOpen) leaveModes();
        else useEditorStore.getState().clearSelection();
      } else if (e.key.startsWith('Arrow')) {
        const step = e.shiftKey ? NUDGE_BIG_STEP_M : NUDGE_STEP_M;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          nudge(dx, dy);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dimensions, placing, drawPoints, outlineTarget, parcelOpen, leaveModes, deleteSelection, undo, redo]);

  // ── north direction (D-11) ────────────────────────────────────────────

  // The garden itself (north, size, boundary): shown at once, written shortly after the
  // last change.
  const dimsTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeDimensions = React.useCallback(
    (next: GardenDimensionsRow) => {
      if (!activeGardenId) return;
      setDimensions(next);
      if (dimsTimer.current) clearTimeout(dimsTimer.current);
      dimsTimer.current = setTimeout(() => {
        dimsTimer.current = null;
        saveDimensions(mode, activeGardenId, {
          shape: next.shape,
          widthM: next.widthM,
          heightM: next.heightM,
          extraDims: next.extraDims,
        })
          .then(notifyPlanChanged)
          .catch((err) => console.error('plan editor: saving the garden failed', err));
      }, NORTH_SAVE_DELAY_MS);
    },
    [activeGardenId, mode],
  );
  const handleNorthChange = React.useCallback(
    (deg: number) => {
      if (!dimensions) return;
      changeDimensions({ ...dimensions, extraDims: withNorthDeg(dimensions.extraDims, deg) });
    },
    [dimensions, changeDimensions],
  );

  // ── free outlines (EDIT3-14) and the parcel (EDIT3-15) ────────────────

  const boundary = dimensions
    ? getBoundary(dimensions.extraDims, dimensions.widthM, dimensions.heightM)
    : null;
  const outlineElement =
    outlineTarget && outlineTarget !== 'parcel'
      ? elements.find((e) => e.id === outlineTarget && e.deletedAt === null)
      : undefined;
  const outlinePoints: WorldPoint[] | null = !dimensions
    ? null
    : outlineTarget === 'parcel'
      ? boundary ?? [
          { x: 0, y: 0 },
          { x: dimensions.widthM, y: 0 },
          { x: dimensions.widthM, y: dimensions.heightM },
          { x: 0, y: dimensions.heightM },
        ]
      : outlineElement
        ? elementPolygon(outlineElement)
        : null;

  const handleOutlineChange = React.useCallback(
    (points: WorldPoint[]) => {
      if (outlineTarget === 'parcel') {
        if (!dimensions) return;
        changeDimensions({
          ...dimensions,
          shape: 'freehand',
          extraDims: withBoundary(dimensions.extraDims, points),
        });
        return;
      }
      const state = useEditorStore.getState();
      const el = state.elements.find((e) => e.id === outlineTarget);
      if (el) state.updateElement(el.id, outlinePatch(el, points));
    },
    [outlineTarget, dimensions, changeDimensions],
  );

  const startDrawing = React.useCallback(() => {
    setPaletteOpen(false);
    leaveModes();
    useEditorStore.getState().clearSelection();
    setDrawPoints([]);
  }, [leaveModes]);

  const finishDrawing = React.useCallback(() => {
    if (!drawPoints || drawPoints.length < 3 || !activeGardenId) return;
    const { box, outline } = outlineFromCorners(drawPoints);
    const state = useEditorStore.getState();
    const el = createElement('Beet', box, activeGardenId, userId, t('editor.palette.items.Beet'));
    el.widthM = box.widthM;
    el.heightM = box.heightM;
    el.provenance = { source: 'manual', outline, zOrder: bringToFront(state.elements, el.id) };
    state.addElement(el);
    state.setSelection(el.id);
    setDrawPoints(null);
  }, [drawPoints, activeGardenId, userId]);

  const openParcel = React.useCallback(() => {
    setPaletteOpen(false);
    leaveModes();
    useEditorStore.getState().clearSelection();
    setParcelOpen(true);
  }, [leaveModes]);

  const handleParcelSize = React.useCallback(
    (size: { widthM: number; heightM: number }) => {
      if (!dimensions) return;
      const kept = getBoundary(dimensions.extraDims, size.widthM, size.heightM);
      changeDimensions({
        ...dimensions,
        ...size,
        extraDims: kept ? withBoundary(dimensions.extraDims, kept) : dimensions.extraDims,
      });
    },
    [dimensions, changeDimensions],
  );

  const handleParcelShape = React.useCallback(
    (shape: 'rect' | 'free') => {
      if (!dimensions) return;
      if (shape === 'free') {
        setOutlineTarget('parcel');
        return;
      }
      setOutlineTarget(null);
      changeDimensions({
        ...dimensions,
        shape: 'rectangle',
        extraDims: withBoundary(dimensions.extraDims, null),
      });
    },
    [dimensions, changeDimensions],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  if (!dimensions) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-sm text-ink-muted text-center mb-4">{t('editor.webFallback.emptyBody')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(app)/plan' as never)}
          className="min-h-[48px] items-center justify-center border border-line px-6"
        >
          <Text className="text-base text-ink">{t('editor.done')}</Text>
        </Pressable>
      </View>
    );
  }

  const store = useEditorStore.getState();
  const layout = wide ? 'side' : 'strip';
  const saveLabel =
    saveState === 'saving' ? t('editor.saving') : saveState === 'error' ? t('editor.notSaved') : t('editor.saved');

  const selectionPanel = selected ? (
    <PropertiesPanel
      key={selected.id}
      element={selected}
      layout={layout}
      onUpdate={store.updateElement}
      onMore={() => store.setEditingElementId(selected.id)}
      actions={actions}
      onEditStart={store.beginHistoryStep}
      onEditEnd={store.endHistoryStep}
      onOutline={selected.elementType === 'Beet' ? () => setOutlineTarget(selected.id) : undefined}
    />
  ) : selectedIds.length > 1 ? (
    <MultiSelectionPanel count={selectedIds.length} layout={layout} actions={actions} />
  ) : null;

  return (
    <View className="flex-1 bg-bg" testID="plan-edit-screen">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View className="flex-row items-center border-b border-line px-1 min-h-[56px]">
        <Pressable
          onPress={handleDone}
          accessibilityRole="button"
          accessibilityLabel={t('editor.done')}
          testID="editor-done"
          className="flex-row items-center min-h-[48px] px-2"
        >
          <ArrowLeft size={20} color={tokens.color.ink} strokeWidth={1.5} />
          <Text className="ml-1 text-base font-medium text-ink">{t('editor.done')}</Text>
        </Pressable>
        <View className="flex-1 min-w-0 items-center">
          <Text className="text-lg font-display font-medium text-ink" accessibilityRole="header" numberOfLines={1}>
            {t('plan.view.title')}
            {wide
              ? ` · ${t('plan.view.parcelSize', {
                  width: formatLength(dimensions.widthM),
                  depth: formatLength(dimensions.heightM),
                })}`
              : ''}
          </Text>
          <Pressable
            onPress={saveState === 'error' ? retryFailedSaves : undefined}
            disabled={saveState !== 'error'}
            accessibilityRole={saveState === 'error' ? 'button' : 'text'}
            testID="editor-save-state"
          >
            <Text
              className={saveState === 'error' ? 'text-xs text-danger' : 'text-xs text-ink-muted'}
              numberOfLines={1}
            >
              {saveLabel}
            </Text>
          </Pressable>
        </View>
        <IconButton label={t('editor.undo')} testID="editor-undo" onPress={undo} disabled={!canUndo}>
          <Undo2 size={20} color={tokens.color.ink} strokeWidth={1.5} />
        </IconButton>
        <IconButton label={t('editor.redo')} testID="editor-redo" onPress={redo} disabled={!canRedo}>
          <Redo2 size={20} color={tokens.color.ink} strokeWidth={1.5} />
        </IconButton>
        <IconButton
          label={t('editor.multi')}
          testID="editor-multi"
          onPress={() => setMulti((on) => !on)}
          active={multi}
        >
          <SquareDashedMousePointer size={20} color={tokens.color.ink} strokeWidth={1.5} />
        </IconButton>
        {wide ? null : (
          <IconButton
            label={t('editor.add')}
            testID="editor-add"
            onPress={() => setPaletteOpen((open) => !open)}
            active={paletteOpen}
          >
            <Plus size={22} color={tokens.color.ink} strokeWidth={1.5} />
          </IconButton>
        )}
        <IconButton
          label={t('editor.snap')}
          testID="editor-snap"
          onPress={() => setSnap((on) => !on)}
          active={snap}
        >
          <Magnet size={20} color={tokens.color.ink} strokeWidth={1.5} />
        </IconButton>
      </View>

      <View className="flex-1 flex-row">
        {wide ? (
          <View className="w-[250px] border-r border-line bg-bg" testID="palette-side">
            <Text className="px-4 pt-4 text-lg font-display font-medium text-ink">
              {t('editor.palette.title')}
            </Text>
            <PlanPalette
              onPick={startPlacing}
              activeKey={placing?.key ?? null}
              onDraw={startDrawing}
              onParcel={openParcel}
            />
          </View>
        ) : null}

        <View className="flex-1">
          <PlanEditor
            ref={editorRef}
            mode="edit"
            dimensions={dimensions}
            elements={elements}
            selectedIds={selectedIds}
            multiSelect={multi}
            placing={placing ? { ...placing, tooClose } : null}
            ghost={ghost}
            conflictIds={conflictElementIds}
            snap={snap}
            outlinePoints={outlinePoints}
            onOutlineChange={handleOutlineChange}
            drawPoints={drawPoints}
            onDrawPoint={(point) => setDrawPoints((points) => (points ? [...points, point] : points))}
            onSelect={store.setSelectedIds}
            onUpdateElement={store.updateElement}
            onGestureActive={store.setGestureActive}
            onGhostChange={setGhost}
            onPlace={placeAt}
            onNorthChange={handleNorthChange}
            testID="plan-editor"
          />
          <View className="absolute right-2 top-[58px]">
            <Pressable
              onPress={() => editorRef.current?.fit()}
              accessibilityRole="button"
              accessibilityLabel={t('editor.fit')}
              testID="editor-fit"
              className="h-11 w-11 items-center justify-center border border-line bg-bg"
            >
              <Maximize size={20} color={tokens.color.ink} strokeWidth={1.5} />
            </Pressable>
          </View>
          {toastState ? (
            <CompanionToast
              variant={toastState.variant}
              message={toastState.message}
              onDismiss={dismissToast}
              testID={`companion-toast-${toastState.variant}`}
            />
          ) : null}
          {deleted ? (
            <View
              className="absolute bottom-3 left-3 right-3 flex-row items-center justify-between border border-line bg-bg px-4 min-h-[48px]"
              testID="delete-hint"
            >
              <Text className="text-base text-ink">
                {deleted.length === 1
                  ? t('editor.deletedOne')
                  : t('editor.deletedMany', { count: deleted.length })}
              </Text>
              <Pressable
                onPress={() => {
                  useEditorStore.getState().restoreElements(deleted);
                  setDeleted(null);
                }}
                accessibilityRole="button"
                testID="delete-undo"
                className="min-h-[44px] justify-center pl-4"
              >
                <Text className="text-base font-semibold text-accent">{t('editor.undoDelete')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {wide ? (
          <View className="w-[300px] border-l border-line bg-bg" testID="props-side">
            {selectionPanel ?? (
              <Text className="p-4 text-sm italic text-ink-muted">{t('editor.props.hint')}</Text>
            )}
          </View>
        ) : null}
      </View>

      {/* Under the plan: what is being placed, or the selection (phone). */}
      {placing ? (
        <View className="border-t border-line bg-bg px-4 py-3 gap-2" testID="placing-bar">
          <View className="flex-row items-center gap-3">
            <View className="flex-1 min-w-0">
              <Text className="text-base font-display font-medium text-ink" numberOfLines={1}>
                {t('editor.placing.title', { name: placing.label })}
              </Text>
              <Text className="text-sm text-ink-muted" numberOfLines={2}>
                {wide ? t('editor.placing.hintMouse') : t('editor.placing.hintTouch')}
              </Text>
            </View>
            <Pressable
              onPress={() => ghost && placeAt(ghost)}
              disabled={!ghost}
              accessibilityRole="button"
              testID="placing-set"
              className="min-h-[44px] items-center justify-center bg-primary px-4"
              style={ghost ? undefined : { opacity: 0.4 }}
            >
              <Text className="text-base font-semibold text-on-primary">{t('editor.placing.set')}</Text>
            </Pressable>
            <Pressable
              onPress={stopPlacing}
              accessibilityRole="button"
              testID="placing-done"
              className="min-h-[44px] items-center justify-center border border-line px-4"
            >
              <Text className="text-base text-ink">
                {placing.plantSlug ? t('editor.placing.done') : t('editor.placing.cancel')}
              </Text>
            </Pressable>
          </View>
          {tooClose ? (
            <Text className="text-sm text-danger" testID="placing-too-close">
              {t('editor.placing.tooClose')}
            </Text>
          ) : null}
          {placingHint ? (
            <Text
              className={placingHint.variant === 'error' ? 'text-sm text-danger' : 'text-sm text-primary'}
              testID={`placing-hint-${placingHint.variant}`}
            >
              {placingHint.message}
            </Text>
          ) : null}
        </View>
      ) : drawPoints ? (
        <View className="border-t border-line bg-bg px-4 py-3 gap-2" testID="draw-bar">
          <Text className="text-base font-display font-medium text-ink">{t('editor.draw.title')}</Text>
          <Text className="text-sm text-ink-muted">{t('editor.draw.hint')}</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setDrawPoints((points) => (points ? points.slice(0, -1) : points))}
              disabled={drawPoints.length === 0}
              accessibilityRole="button"
              testID="draw-remove-last"
              className="flex-1 min-h-[44px] items-center justify-center border border-line px-2"
              style={drawPoints.length === 0 ? { opacity: 0.4 } : undefined}
            >
              <Text className="text-base text-ink">{t('editor.draw.removeLast')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setDrawPoints(null)}
              accessibilityRole="button"
              testID="draw-cancel"
              className="min-h-[44px] items-center justify-center border border-line px-3"
            >
              <Text className="text-base text-ink">{t('editor.draw.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={finishDrawing}
              disabled={drawPoints.length < 3}
              accessibilityRole="button"
              testID="draw-finish"
              className="min-h-[44px] items-center justify-center bg-primary px-3"
              style={drawPoints.length < 3 ? { opacity: 0.4 } : undefined}
            >
              <Text className="text-base font-semibold text-on-primary">{t('editor.draw.finish')}</Text>
            </Pressable>
          </View>
        </View>
      ) : parcelOpen ? (
        <ParcelPanel
          widthM={dimensions.widthM}
          heightM={dimensions.heightM}
          free={outlineTarget === 'parcel' || boundary !== null}
          onSize={handleParcelSize}
          onShape={handleParcelShape}
          onDone={leaveModes}
        />
      ) : outlineElement ? (
        <View className="border-t border-line bg-bg px-4 py-3 gap-2" testID="outline-bar">
          <View className="flex-row items-center gap-3">
            <Text className="flex-1 text-sm text-ink-muted">{t('editor.outline.hint')}</Text>
            <Pressable
              onPress={() => setOutlineTarget(null)}
              accessibilityRole="button"
              testID="outline-done"
              className="min-h-[44px] items-center justify-center bg-primary px-4"
            >
              <Text className="text-base font-semibold text-on-primary">{t('editor.outline.done')}</Text>
            </Pressable>
          </View>
        </View>
      ) : !wide ? (
        selectionPanel
      ) : null}

      {/* Palette as a sheet on the phone. */}
      {paletteOpen && !wide ? (
        <View className="absolute inset-0" testID="palette-sheet">
          <Pressable
            className="absolute inset-0 bg-ink/20"
            onPress={() => setPaletteOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('editor.palette.close')}
          />
          <View className="absolute bottom-0 left-0 right-0 h-[72%] border-t border-line bg-bg">
            <View className="flex-row items-center justify-between pl-4 pr-1 min-h-[52px] border-b border-line-soft">
              <Text className="text-lg font-display font-medium text-ink">{t('editor.palette.title')}</Text>
              <IconButton
                label={t('editor.palette.close')}
                testID="palette-close"
                onPress={() => setPaletteOpen(false)}
              >
                <X size={20} color={tokens.color.ink} strokeWidth={1.5} />
              </IconButton>
            </View>
            <PlanPalette
              onPick={startPlacing}
              activeKey={placing?.key ?? null}
              onDraw={startDrawing}
              onParcel={openParcel}
            />
          </View>
        </View>
      ) : null}

      {editing ? (
        <ElementEditorModal
          visible
          element={editing}
          onSave={(patch) => {
            store.updateElement(editing.id, patch);
            store.setEditingElementId(null);
          }}
          onCancel={() => store.setEditingElementId(null)}
          onDelete={() => {
            store.setSelectedIds([editing.id]);
            store.setEditingElementId(null);
            deleteSelection();
          }}
        />
      ) : null}
    </View>
  );
}
