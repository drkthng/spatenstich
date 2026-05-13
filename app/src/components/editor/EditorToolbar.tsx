// Phase 7 Plan 04: 9-button editor toolbar (UI-SPEC §Toolbar layout, 56 px tall).
// Reads editorStore + temporal API. Pattern: InlineBanner.tsx icon+Pressable+NativeWind row.
// Revision W5: handleLayerCycle calls useEditorStore.getState().setActiveLayers(target) —
//              does NOT call setState({ activeLayers }) directly.

import * as React from 'react';
import { View, Pressable } from 'react-native';
import {
  ChevronLeft,
  Undo2,
  Redo2,
  Grid3x3,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react-native';
import { useEditorStore } from '@/src/stores/editorStore';
import { useAuthStore } from '@/src/stores/authStore';
import { flushAllPendingSaves } from '@/src/lib/editor/saveDebounce';
import { SaveStateIndicator, type SaveState } from './SaveStateIndicator';

interface Props {
  onBack?: () => void;
  onSaveError?: (err: Error) => void;
}

export function EditorToolbar({ onBack, onSaveError }: Props): React.JSX.Element {
  const showGrid = useEditorStore((s) => s.showGrid);
  const activeLayers = useEditorStore((s) => s.activeLayers);
  const selection = useEditorStore((s) => s.selection);
  const tool = useEditorStore((s) => s.tool);
  const polygonInProgress = useEditorStore((s) => s.polygonInProgress);
  const elementsCount = useEditorStore((s) => s.elements.length);

  // Track temporal state via subscribe (zundo temporal has its own store)
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  React.useEffect(() => {
    const update = (): void => {
      const tState = useEditorStore.temporal.getState();
      setCanUndo(tState.pastStates.length > 0);
      setCanRedo(tState.futureStates.length > 0);
    };
    update();
    const unsub = useEditorStore.temporal.subscribe(update);
    return unsub;
  }, []);

  const [saveState, setSaveState] = React.useState<SaveState>('idle');

  // Layer cycle: 0=both, 1=infra-only, 2=seasonal-only
  const layerCycle =
    activeLayers.infrastructure && activeLayers.seasonal
      ? 0
      : activeLayers.infrastructure
        ? 1
        : 2;

  const handleLayerCycle = (): void => {
    const next = (layerCycle + 1) % 3;
    // Revision W5: call the store's setActiveLayers action (added in Plan 03)
    // instead of bypassing it with a direct setState — preserves the temporal/middleware
    // pipeline and keeps the action surface authoritative.
    const target =
      next === 0
        ? { infrastructure: true, seasonal: true }
        : next === 1
          ? { infrastructure: true, seasonal: false }
          : { infrastructure: false, seasonal: true };
    useEditorStore.getState().setActiveLayers(target);
  };

  const handleManualSave = async (): Promise<void> => {
    setSaveState('saving');
    try {
      const mode = useAuthStore.getState().mode;
      const byId = (id: string): ReturnType<
        typeof useEditorStore.getState
      >['elements'][number] | undefined =>
        useEditorStore.getState().elements.find((e) => e.id === id);
      await flushAllPendingSaves(mode, byId);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e) {
      setSaveState('error');
      if (onSaveError) onSaveError(e as Error);
      setTimeout(() => setSaveState('idle'), 2500);
    }
  };

  const polygonCanFinish =
    polygonInProgress != null && polygonInProgress.pointsM.length >= 3;

  return (
    <View
      className="flex-row items-center px-4 h-14 bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700"
      testID="editor-toolbar"
    >
      <Pressable
        testID="editor-back-button"
        onPress={() => onBack && onBack()}
        className="p-2.5"
      >
        <ChevronLeft size={20} color="#44403C" />
      </Pressable>

      <Pressable
        testID="editor-undo-button"
        disabled={!canUndo}
        onPress={() => useEditorStore.temporal.getState().undo()}
        style={{ opacity: canUndo ? 1 : 0.4 }}
        className="p-2.5"
      >
        <Undo2 size={20} color="#44403C" />
      </Pressable>

      <Pressable
        testID="editor-redo-button"
        disabled={!canRedo}
        onPress={() => useEditorStore.temporal.getState().redo()}
        style={{ opacity: canRedo ? 1 : 0.4 }}
        className="p-2.5"
      >
        <Redo2 size={20} color="#44403C" />
      </Pressable>

      <Pressable
        testID="editor-grid-toggle-button"
        onPress={() => useEditorStore.getState().toggleGrid()}
        className={`p-2.5 ${showGrid ? 'bg-stone-200 dark:bg-stone-700 rounded-md' : ''}`}
      >
        <Grid3x3 size={20} color="#44403C" />
      </Pressable>

      <Pressable
        testID="editor-layer-toggle-button"
        onPress={handleLayerCycle}
        className="p-2.5"
      >
        {layerCycle === 0 ? (
          <Eye size={20} color="#44403C" />
        ) : (
          <EyeOff size={20} color="#44403C" />
        )}
      </Pressable>

      <Pressable
        testID="editor-polygon-start-button"
        onPress={() =>
          useEditorStore
            .getState()
            .setTool(tool === 'polygon' ? 'select' : 'polygon')
        }
        className={`p-2.5 ${tool === 'polygon' ? 'bg-[#4A7C59] rounded-md' : ''}`}
      >
        <Pencil size={20} color={tool === 'polygon' ? '#fff' : '#44403C'} />
      </Pressable>

      {selection !== null && (
        <Pressable
          testID="editor-delete-button"
          onPress={() => useEditorStore.getState().deleteElement(selection)}
          className="p-2.5"
        >
          <Trash2 size={20} color="#DC2626" />
        </Pressable>
      )}

      {tool === 'polygon' && (
        <Pressable
          testID="editor-polygon-finish-button"
          disabled={!polygonCanFinish}
          onPress={() => {
            const userId = useAuthStore.getState().userId ?? 'u-anon';
            const gardenId =
              useEditorStore.getState().polygonInProgress!.gardenId;
            useEditorStore
              .getState()
              .polygonCommit(`Beet ${elementsCount + 1}`, gardenId, userId);
          }}
          style={{ opacity: polygonCanFinish ? 1 : 0.4 }}
          className="p-2.5 bg-[#4A7C59] rounded-md"
        >
          <Check size={20} color="#fff" />
        </Pressable>
      )}

      <View className="flex-1" />

      <Pressable
        testID="editor-save-button"
        onPress={handleManualSave}
        className="p-2.5"
      >
        <SaveStateIndicator state={saveState} />
      </Pressable>
    </View>
  );
}
