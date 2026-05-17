// Phase 7 Plan 05: Plan-Editor screen (Expo Router) — Skia canvas + Toolbar + Palette + Drafts-Tray.
// Pattern: app/(app)/import/review.tsx (Stack.Screen + load effect + sectioned layout).
// Hydrates editorStore on mount; provides screen-root drag handoff for palette + bed-drafts.
//
// Revision B4: screen-root Pan wraps EditorCanvas and converts screen-px → garden-m on
// gesture end, calling handleBedDropAt → promoteBedDraft with finalCoords. The .activateAfterLongPress(220)
// matches the tray LongPress activation window so the tray seeds bedDraftDragging first.

import * as React from 'react';
import { View, ActivityIndicator, Text, Platform, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { GardenDimensionsRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { useEditorStore } from '@/src/stores/editorStore';
import { loadDimensions, loadAcceptedElements } from '@/src/lib/gardenPlanRepo';
import { promoteBedDraft } from '@/src/lib/draftPromotionRepo';
import { loadPendingDraftsWithImportedAt } from '@/src/lib/importRepo';
import { screenToGarden } from '@/src/lib/geometry/viewMatrix';
import { EditorCanvas } from '@/src/components/editor/EditorCanvas';
import { EditorToolbar } from '@/src/components/editor/EditorToolbar';
import { ElementPalette, type PaletteTab } from '@/src/components/editor/ElementPalette';
import { DraftsTrayBottomSheet } from '@/src/components/editor/DraftsTrayBottomSheet';
import { GardenPlanView } from '@/src/components/GardenPlanView';
import { WebPlanEditor } from '@/src/components/editor/web/WebPlanEditor';
import { WebPaletteBar } from '@/src/components/editor/web/WebPaletteBar';
import { WebEditorToolbar } from '@/src/components/editor/web/WebEditorToolbar';
import { useCompanionDetection } from '@/src/hooks/useCompanionDetection';
import { CompanionToast } from '@/src/components/editor/CompanionToast';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function PlanScreen(): React.JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const router = useRouter();

  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<PaletteTab>('beete');

  // Shared values for drag handoffs (palette long-press + bed-draft drag-out)
  const draggingShared = useSharedValue<{ kind: string; ghostX: number; ghostY: number } | null>(
    null,
  );
  const bedDraftDragging = useSharedValue<{ draftId: string; importItemId: string } | null>(null);

  // Revision B4: live viewport shared value so the screen-root Pan can convert
  // screen-px to garden-m at gesture end. Initialized with the same identity-ish
  // matrix EditorCanvas uses; a follow-up polish pass can plumb the shared value
  // into the canvas internals.
  const viewport = useSharedValue({ tx: 0, ty: 0, scale: 50 });

  const reloadElements = React.useCallback(async () => {
    if (!activeGardenId) return;
    const elems = await loadAcceptedElements(activeGardenId);
    useEditorStore.setState({ elements: elems });
  }, [activeGardenId]);

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
        useEditorStore.setState({ elements: elems });
      } catch (err) {
        console.error('plan: load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeGardenId]);

  const handleBedDraftDragStart = React.useCallback(
    (payload: { draftId: string; importItemId: string }) => {
      // Seeds the bed-draft drag handoff. Tray LongPress fires first and sets this
      // shared value; the screen-root Pan below consumes it on onEnd.
      bedDraftDragging.value = payload;
    },
    [bedDraftDragging],
  );

  // Helper invoked by the screen-root Pan onEnd when a bed-draft is dragged to a
  // final position. Promotes via the 6-arg form (Plan 03 finalCoords param).
  const handleBedDropAt = React.useCallback(
    async (xM: number, yM: number) => {
      if (!dimensions || !activeGardenId) return;
      const dragging = bedDraftDragging.value;
      if (!dragging) return;
      const all = await loadPendingDraftsWithImportedAt(activeGardenId);
      const draftEntry = all.beds.find((d) => d.row.id === dragging.draftId);
      if (!draftEntry) {
        bedDraftDragging.value = null;
        return;
      }
      const currentElements = useEditorStore.getState().elements;
      await promoteBedDraft(
        mode,
        draftEntry.row,
        dimensions,
        currentElements,
        dragging.importItemId,
        { xM, yM },
      );
      bedDraftDragging.value = null;
      await reloadElements();
    },
    [activeGardenId, dimensions, mode, bedDraftDragging, reloadElements],
  );

  // Revision B4: screen-root Pan wired below in the render tree.
  // .activateAfterLongPress(220) matches the tray long-press activation window so
  // the tray LongPress fires first and seeds bedDraftDragging.value before this
  // Pan begins driving. On onEnd, if a bed-draft is in flight, convert screen-px
  // to garden-m and call handleBedDropAt via runOnJS; reset the shared value.
  const screenRootPan = React.useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(220)
        .onEnd((e) => {
          'worklet';
          const dragging = bedDraftDragging.value;
          if (dragging) {
            const { xM, yM } = screenToGarden(e.absoluteX, e.absoluteY, viewport.value);
            runOnJS(handleBedDropAt)(xM, yM);
            bedDraftDragging.value = null;
          }
        }),
    [bedDraftDragging, viewport, handleBedDropAt],
  );

  const { conflictElementIds, toastState, dismissToast } = useCompanionDetection();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-stone-900">
        <ActivityIndicator />
      </View>
    );
  }

  // Phase 7.5 — Web-native interactive editor (SVG + mouse events).
  // Replaces the read-only fallback after user decision (2026-05-16): Desktop is a
  // primary use case, not mobile-first. CONTEXT D-09 revised. Skia editor remains
  // for iOS/Android; web uses parallel SVG implementation. Shared editorStore + repos.
  if (Platform.OS === 'web') {
    if (!dimensions) {
      return (
        <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-stone-900 px-6">
          <Stack.Screen options={{ headerTitle: t('editor.title') }} />
          <Text className="text-base font-semibold text-stone-800 dark:text-stone-200 text-center mb-2">
            {t('editor.webFallback.emptyTitle')}
          </Text>
          <Text className="text-sm text-stone-500 dark:text-stone-400 text-center mb-6">
            {t('editor.webFallback.emptyBody')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(app)/import/review')}
            className="bg-stone-900 dark:bg-stone-100 py-3 px-6 rounded-lg"
            testID="web-empty-review-cta"
          >
            <Text className="text-base font-medium text-stone-50 dark:text-stone-900">
              {t('editor.webFallback.reviewCta')}
            </Text>
          </Pressable>
        </View>
      );
    }
    return <WebEditorShell dimensions={dimensions} router={router} />;
  }

  if (!dimensions) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-stone-900 px-6">
        <Stack.Screen options={{ headerTitle: t('editor.title') }} />
        <Text className="text-sm text-stone-500 dark:text-stone-400 text-center">
          {t('editor.emptyPlan.body')}
        </Text>
      </View>
    );
  }

  const elementsForPalette = useEditorStore.getState().elements;
  const hasAnyBed = elementsForPalette.some(
    (e) => e.elementType === 'Beet' && e.deletedAt === null,
  );

  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900" testID="editor-screen">
      <Stack.Screen options={{ headerTitle: t('editor.title') }} />
      <EditorToolbar onBack={() => router.back()} />
      {/* Revision B4: GestureDetector wraps the canvas mount; screen-root Pan
          consumes the bed-draft drag handoff seeded by the tray LongPress. */}
      <GestureDetector gesture={screenRootPan}>
        <View className="flex-1" testID="editor-canvas-wrapper">
          <EditorCanvas dimensions={dimensions} conflictElementIds={conflictElementIds} />
        </View>
      </GestureDetector>
      <ElementPalette
        activeTab={activeTab}
        onTabChange={setActiveTab}
        draggingShared={draggingShared}
        hasAnyBed={hasAnyBed}
      />
      <DraftsTrayBottomSheet
        gardenId={activeGardenId ?? ''}
        dims={dimensions}
        onBedDraftDragStart={handleBedDraftDragStart}
      />
      {toastState && (
        <CompanionToast
          variant={toastState.variant}
          message={toastState.message}
          onDismiss={dismissToast}
          testID={`companion-toast-${toastState.variant}`}
        />
      )}
    </View>
  );
}

// Phase 7.5 — Web editor shell wrapping the SVG editor + toolbar + palette.
// Local placingKind state primed by palette, consumed by editor on next canvas click.
function WebEditorShell({
  dimensions,
  router,
}: {
  dimensions: GardenDimensionsRow;
  router: ReturnType<typeof useRouter>;
}): React.JSX.Element {
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const userId = useAuthStore((s) => s.userId);
  const [placingKind, setPlacingKind] = React.useState<string | null>(null);
  const { conflictElementIds, toastState, dismissToast } = useCompanionDetection();
  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900" testID="web-editor-shell">
      <Stack.Screen options={{ headerTitle: t('editor.title'), headerShown: false }} />
      <WebEditorToolbar onBack={() => router.back()} />
      <View className="flex-1">
        <WebPlanEditor
          dimensions={dimensions}
          gardenId={activeGardenId ?? ''}
          userId={userId ?? ''}
          placingKind={placingKind}
          onPlaced={() => setPlacingKind(null)}
          conflictElementIds={conflictElementIds}
        />
      </View>
      <WebPaletteBar
        placingKind={placingKind}
        onSelectKind={setPlacingKind}
        onCancel={() => setPlacingKind(null)}
      />
      {toastState && (
        <CompanionToast
          variant={toastState.variant}
          message={toastState.message}
          onDismiss={dismissToast}
          testID={`companion-toast-${toastState.variant}`}
        />
      )}
    </View>
  );
}
