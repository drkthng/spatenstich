// Phase 30: the full-screen plan editor, for finger and mouse alike (EDIT3-01 … EDIT3-08).
// Top bar with "Fertig", the interim "+" list (D-09) and the fit button; the plate in the
// middle; the properties field as a strip under the plan on a phone and as a panel on the
// right on desktop (D-07). Saving still runs through the editor store's existing autosave.

import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, Maximize, Plus } from 'lucide-react-native';
import { withNorthDeg, type GardenDimensionsRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { useEditorStore } from '@/src/stores/editorStore';
import { loadDimensions, loadAcceptedElements, saveDimensions } from '@/src/lib/gardenPlanRepo';
import { flushOnLeave, hasPendingSaves } from '@/src/lib/editor/saveDebounce';
import { notifyPlanChanged } from '@/src/lib/editor/planRefresh';
import { ADDABLE_KINDS, createElement } from '@/src/lib/editor/elementFactory';
import { bringToFront } from '@/src/lib/editor/zOrder';
import { PlanEditor, type PlanEditorHandle } from '@/src/components/plan/PlanEditor';
import { PropertiesPanel } from '@/src/components/plan/PropertiesPanel';
import { ElementEditorModal } from '@/src/components/editor/ElementEditorModal';
import { t } from '@/src/lib/i18n';
import { tokens, elementFill } from '@/src/theme/tokens';

/** From this window width the properties field is a panel on the right. */
const WIDE_LAYOUT_MIN_PX = 900;
const NORTH_SAVE_DELAY_MS = 600;

function formatLength(m: number): string {
  return String(Math.round(m * 100) / 100).replace('.', ',');
}

async function flushEditorSaves(): Promise<void> {
  const mode = useAuthStore.getState().mode;
  const byId = (id: string) => useEditorStore.getState().elements.find((e) => e.id === id);
  await flushOnLeave(mode, byId);
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
  const [addOpen, setAddOpen] = React.useState(false);

  const elements = useEditorStore((s) => s.elements);
  const selection = useEditorStore((s) => s.selection);
  const editingElementId = useEditorStore((s) => s.editingElementId);
  const selected = selection
    ? elements.find((e) => e.id === selection && e.deletedAt === null)
    : undefined;
  const editing = editingElementId ? elements.find((e) => e.id === editingElementId) : undefined;

  // Load the plan into the editor store.
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
        useEditorStore.setState({ elements: elems, selection: null, selectedIds: [] });
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

  // Leaving by any route: write what is still waiting, then let the plan view reload.
  React.useEffect(() => {
    return () => {
      useEditorStore.getState().setSelection(null);
      void flushEditorSaves().finally(notifyPlanChanged);
    };
  }, []);

  // Closing or reloading the tab: write what is still waiting.
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => {
      if (hasPendingSaves()) void flushEditorSaves();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
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

  const handleAdd = React.useCallback(
    (kind: string) => {
      setAddOpen(false);
      if (!activeGardenId || !dimensions) return;
      const center = editorRef.current?.visibleCenterM() ?? {
        xM: dimensions.widthM / 2,
        yM: dimensions.heightM / 2,
      };
      const el = createElement(kind, center, activeGardenId, userId, t(`editor.palette.items.${kind}`));
      const store = useEditorStore.getState();
      // A new element goes on top of everything that is already there.
      el.provenance = { ...(el.provenance ?? {}), zOrder: bringToFront(store.elements, el.id) };
      store.addElement(el);
      store.setSelection(el.id);
    },
    [activeGardenId, dimensions, userId],
  );

  // North direction (D-11): shown at once, written to the garden shortly after the last change.
  const northTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNorthChange = React.useCallback(
    (deg: number) => {
      if (!dimensions || !activeGardenId) return;
      const next: GardenDimensionsRow = {
        ...dimensions,
        extraDims: withNorthDeg(dimensions.extraDims, deg),
      };
      setDimensions(next);
      if (northTimer.current) clearTimeout(northTimer.current);
      northTimer.current = setTimeout(() => {
        northTimer.current = null;
        saveDimensions(mode, activeGardenId, {
          shape: next.shape,
          widthM: next.widthM,
          heightM: next.heightM,
          extraDims: next.extraDims,
        })
          .then(notifyPlanChanged)
          .catch((err) => console.error('plan editor: saving north failed', err));
      }, NORTH_SAVE_DELAY_MS);
    },
    [dimensions, activeGardenId, mode],
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

  return (
    <View className="flex-1 bg-bg" testID="plan-edit-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center border-b border-line px-2 min-h-[56px]">
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
        <View className="flex-1 items-center">
          <Text className="text-lg font-display font-medium text-ink" accessibilityRole="header">
            {t('plan.view.title')}
          </Text>
          <Text className="text-xs text-ink-muted">
            {t('plan.view.parcelSize', {
              width: formatLength(dimensions.widthM),
              depth: formatLength(dimensions.heightM),
            })}
          </Text>
        </View>
        <Pressable
          onPress={() => setAddOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={t('editor.add')}
          testID="editor-add"
          className="h-12 min-w-[48px] flex-row items-center justify-center px-2"
        >
          <Plus size={22} color={tokens.color.ink} strokeWidth={1.5} />
          {wide ? <Text className="ml-1 text-base text-ink">{t('editor.add')}</Text> : null}
        </Pressable>
        <Pressable
          onPress={() => editorRef.current?.fit()}
          accessibilityRole="button"
          accessibilityLabel={t('editor.fit')}
          testID="editor-fit"
          className="h-12 w-12 items-center justify-center"
        >
          <Maximize size={20} color={tokens.color.ink} strokeWidth={1.5} />
        </Pressable>
      </View>

      <View className="flex-1 flex-row">
        <View className="flex-1">
          <PlanEditor
            ref={editorRef}
            mode="edit"
            dimensions={dimensions}
            elements={elements}
            selection={selection}
            onSelect={store.setSelection}
            onUpdateElement={store.updateElement}
            onGestureActive={store.setGestureActive}
            onNorthChange={handleNorthChange}
            testID="plan-editor"
          />
        </View>
        {wide ? (
          <View className="w-[300px] border-l border-line bg-bg" testID="props-side">
            {selected ? (
              <PropertiesPanel
                key={selected.id}
                element={selected}
                layout="side"
                onUpdate={store.updateElement}
                onMore={() => store.setEditingElementId(selected.id)}
              />
            ) : (
              <Text className="p-4 text-sm italic text-ink-muted">{t('editor.props.hint')}</Text>
            )}
          </View>
        ) : null}
      </View>

      {!wide && selected ? (
        <PropertiesPanel
          key={selected.id}
          element={selected}
          layout="strip"
          onUpdate={store.updateElement}
          onMore={() => store.setEditingElementId(selected.id)}
        />
      ) : null}

      {addOpen ? (
        <View className="absolute inset-0" testID="editor-add-list">
          <Pressable
            className="absolute inset-0 bg-ink/20"
            onPress={() => setAddOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('editor.addClose')}
          />
          <View className="absolute right-2 top-[60px] w-[240px] max-h-[75%] border border-line bg-bg">
            <Text className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-widest text-ink-muted">
              {t('editor.addTitle')}
            </Text>
            <ScrollView>
              {ADDABLE_KINDS.map((kind) => (
                <Pressable
                  key={kind}
                  onPress={() => handleAdd(kind)}
                  accessibilityRole="button"
                  testID={`editor-add-${kind}`}
                  className="flex-row items-center min-h-[48px] px-4 border-t border-line-soft"
                >
                  <View
                    className="h-4 w-6 border border-line"
                    style={{ backgroundColor: elementFill(kind), opacity: 0.75 }}
                  />
                  <Text className="ml-3 text-base text-ink">{t(`editor.palette.items.${kind}`)}</Text>
                </Pressable>
              ))}
            </ScrollView>
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
            store.deleteElement(editing.id);
            store.setSelection(null);
            store.setEditingElementId(null);
          }}
        />
      ) : null}
    </View>
  );
}
