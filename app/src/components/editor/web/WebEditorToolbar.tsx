// Phase 7.5 — Top toolbar for the Web editor.
// Save, Undo/Redo (via zundo temporal API), Delete selected, Grid toggle, Layer toggle.

import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useEditorStore } from '@/src/stores/editorStore';
import { flushAllPendingSaves } from '@/src/lib/editor/saveDebounce';
import { useAuthStore } from '@/src/stores/authStore';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export interface WebEditorToolbarProps {
  onBack: () => void;
}

export function WebEditorToolbar({ onBack }: WebEditorToolbarProps): React.JSX.Element {
  const selection = useEditorStore((s) => s.selection);
  const showGrid = useEditorStore((s) => s.showGrid);
  const activeLayers = useEditorStore((s) => s.activeLayers);
  const mode = useAuthStore((s) => s.mode);

  const [pastStates, setPastStates] = React.useState<number>(0);
  const [futureStates, setFutureStates] = React.useState<number>(0);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Subscribe to temporal store to update undo/redo button enabled state.
  React.useEffect(() => {
    const unsub = useEditorStore.temporal.subscribe((s) => {
      setPastStates(s.pastStates.length);
      setFutureStates(s.futureStates.length);
    });
    // Init
    const tState = useEditorStore.temporal.getState();
    setPastStates(tState.pastStates.length);
    setFutureStates(tState.futureStates.length);
    return unsub;
  }, []);

  const handleUndo = React.useCallback(() => {
    useEditorStore.temporal.getState().undo();
  }, []);

  const handleRedo = React.useCallback(() => {
    useEditorStore.temporal.getState().redo();
  }, []);

  const handleSave = React.useCallback(async () => {
    if (mode !== 'account') return;
    setSaveStatus('saving');
    try {
      await flushAllPendingSaves(mode, (id) =>
        useEditorStore.getState().elements.find((el) => el.id === id),
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [mode]);

  const handleDelete = React.useCallback(() => {
    if (!selection) return;
    useEditorStore.getState().deleteElement(selection);
    useEditorStore.getState().setSelection(null);
  }, [selection]);

  const handleToggleGrid = React.useCallback(() => {
    useEditorStore.getState().toggleGrid();
  }, []);

  const handleToggleLayer = React.useCallback(() => {
    // 3-state cycle: both → infra-only → seasonal-only → both
    const cur = useEditorStore.getState().activeLayers;
    if (cur.infrastructure && cur.seasonal) {
      useEditorStore.getState().setActiveLayers({ infrastructure: true, seasonal: false });
    } else if (cur.infrastructure && !cur.seasonal) {
      useEditorStore.getState().setActiveLayers({ infrastructure: false, seasonal: true });
    } else {
      useEditorStore.getState().setActiveLayers({ infrastructure: true, seasonal: true });
    }
  }, []);

  const layerLabel =
    activeLayers.infrastructure && activeLayers.seasonal
      ? 'Beide Layer'
      : activeLayers.infrastructure
      ? 'Nur Infrastruktur'
      : 'Nur Jahresplan';

  const saveLabel =
    saveStatus === 'saving'
      ? t('editor.saving')
      : saveStatus === 'saved'
      ? t('editor.saved')
      : saveStatus === 'error'
      ? t('editor.saveError')
      : t('editor.save');

  return (
    <View
      className="flex-row items-center justify-between px-4 py-2 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
      testID="web-editor-toolbar"
    >
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onBack}
          className="px-2 py-1 rounded-md"
          testID="web-toolbar-back"
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <Text className="text-base text-stone-700 dark:text-stone-300">←</Text>
        </Pressable>
        <Text className="text-base font-semibold text-stone-900 dark:text-stone-100 ml-2">
          {t('editor.title')}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <ToolbarButton
          label={t('editor.undo')}
          icon="↶"
          onPress={handleUndo}
          disabled={pastStates === 0}
          testID="web-toolbar-undo"
        />
        <ToolbarButton
          label={t('editor.redo')}
          icon="↷"
          onPress={handleRedo}
          disabled={futureStates === 0}
          testID="web-toolbar-redo"
        />
        <ToolbarButton
          label={layerLabel}
          icon="◐"
          onPress={handleToggleLayer}
          testID="web-toolbar-layer"
        />
        <ToolbarButton
          label={t('editor.toggleGrid')}
          icon={showGrid ? '▦' : '▢'}
          onPress={handleToggleGrid}
          testID="web-toolbar-grid"
        />
        <ToolbarButton
          label={t('editor.delete')}
          icon="🗑"
          onPress={handleDelete}
          disabled={!selection}
          testID="web-toolbar-delete"
          danger
        />
        <Pressable
          onPress={handleSave}
          disabled={mode !== 'account' || saveStatus === 'saving'}
          className={`px-3 py-1.5 rounded-md ${
            saveStatus === 'error'
              ? 'bg-red-600'
              : saveStatus === 'saved'
              ? 'bg-green-600'
              : 'bg-stone-900 dark:bg-stone-100'
          } ${mode !== 'account' || saveStatus === 'saving' ? 'opacity-50' : ''}`}
          testID="web-toolbar-save"
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
        >
          <Text
            className={`text-sm font-medium ${
              saveStatus === 'error' || saveStatus === 'saved'
                ? 'text-white'
                : 'text-stone-50 dark:text-stone-900'
            }`}
          >
            {saveLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

interface ToolbarButtonProps {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  danger?: boolean;
}

function ToolbarButton({
  label,
  icon,
  onPress,
  disabled,
  testID,
  danger,
}: ToolbarButtonProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`px-2 py-1.5 rounded-md ${
        disabled ? 'opacity-30' : 'hover:bg-stone-200 dark:hover:bg-stone-800'
      }`}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className={`text-base ${danger ? 'text-red-600' : 'text-stone-700 dark:text-stone-300'}`}>
        {icon}
      </Text>
    </Pressable>
  );
}
