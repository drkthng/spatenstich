// Phase 30: the plan view. Opens read-only (zoom and pan work, nothing can be moved);
// "Bearbeiten" opens the full-screen editor (30-CONTEXT D-08). The same `PlanEditor` draws
// both, so the view and the editor always look alike.

import * as React from 'react';
import { View, ActivityIndicator, Text, Platform, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Maximize } from 'lucide-react-native';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { loadDimensions, loadAcceptedElements } from '@/src/lib/gardenPlanRepo';
import { usePlanVersion } from '@/src/lib/editor/planRefresh';
import { PlanEditor, type PlanEditorHandle } from '@/src/components/plan/PlanEditor';
import { Button } from '@/src/components/ui/button';
import { t } from '@/src/lib/i18n';
import { tokens } from '@/src/theme/tokens';

export default function PlanScreen(): React.JSX.Element {
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const router = useRouter();
  const planVersion = usePlanVersion();
  const editorRef = React.useRef<PlanEditorHandle>(null);

  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [elements, setElements] = React.useState<PlanElementRow[]>([]);
  const [loading, setLoading] = React.useState(true);

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
        setElements(elems);
      } catch (err) {
        console.error('plan: load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeGardenId, planVersion]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  if (!dimensions) {
    const web = Platform.OS === 'web';
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Stack.Screen options={{ headerTitle: t('plan.view.title') }} />
        <Text className="text-lg font-display font-semibold text-ink text-center mb-2">
          {t('editor.webFallback.emptyTitle')}
        </Text>
        <Text className="text-sm text-ink-muted text-center mb-6">
          {t('editor.webFallback.emptyBody')}
        </Text>
        {web ? (
          <Button
            variant="outline"
            onPress={() => router.push('/(app)/import/review')}
            testID="web-empty-review-cta"
          >
            {t('editor.webFallback.reviewCta')}
          </Button>
        ) : null}
        <Button
          className="mt-3"
          onPress={() => router.push('/(app)/plan/new')}
          testID={web ? 'web-create-garden-cta' : 'native-create-garden-cta'}
        >
          {t('plan.new.title')}
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg" testID="plan-view-screen">
      <Stack.Screen options={{ headerTitle: t('plan.view.title') }} />
      <View className="flex-1">
        <PlanEditor
          ref={editorRef}
          mode="readOnly"
          dimensions={dimensions}
          elements={elements}
          testID="plan-view"
        />
      </View>
      <View className="flex-row items-center gap-3 border-t border-line px-4 py-3">
        <Pressable
          onPress={() => editorRef.current?.fit()}
          accessibilityRole="button"
          accessibilityLabel={t('plan.view.fit')}
          testID="plan-view-fit"
          className="h-12 w-12 items-center justify-center border border-line"
        >
          <Maximize size={20} color={tokens.color.ink} strokeWidth={1.5} />
        </Pressable>
        <Button
          className="flex-1 min-h-[48px]"
          onPress={() => router.push('/(app)/plan/edit' as never)}
          testID="plan-edit-button"
        >
          {t('plan.view.edit')}
        </Button>
      </View>
    </View>
  );
}
