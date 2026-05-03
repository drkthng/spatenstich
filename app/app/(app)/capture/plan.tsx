// Plan Screen — displays the confirmed garden plan as SVG.
// Phase 4 Plan 04 — D-09 sketch-warm, grid toggle, re-capture flow.
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Grid3x3 } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { loadAcceptedElements, loadDimensions, deleteAllElements } from '@/src/lib/gardenPlanRepo';
import { GardenPlanView } from '@/src/components/GardenPlanView';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function PlanScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);

  const [elements, setElements] = React.useState<PlanElementRow[]>([]);
  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [showGrid, setShowGrid] = React.useState(true);
  const [showRecaptureConfirm, setShowRecaptureConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!activeGardenId) return;
    (async () => {
      try {
        const [dims, elems] = await Promise.all([
          loadDimensions(activeGardenId),
          loadAcceptedElements(activeGardenId),
        ]);
        setDimensions(dims);
        setElements(elems);
      } catch (err) {
        console.error('plan: load failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeGardenId]);

  const handleRecapture = async () => {
    if (!activeGardenId || !mode) return;
    await deleteAllElements(mode, activeGardenId);
    router.replace('/(app)/capture/step-overview' as any);
  };

  if (loading || !dimensions) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F9F7F4] dark:bg-[#1C1917]">
        <Text className="text-stone-500">...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
      {/* Header: title + grid toggle */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100">
          {t('capture.plan.title')}
        </Text>
        <Pressable
          onPress={() => setShowGrid((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Raster ein/aus"
          className="min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <Grid3x3 size={24} color={showGrid ? '#4A7C59' : '#78716C'} />
        </Pressable>
      </View>

      {/* Plan View */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, alignItems: 'center' }}
        horizontal={false}
      >
        <GardenPlanView
          dimensions={dimensions}
          elements={elements}
          showGrid={showGrid}
          testID="garden-plan-view"
        />

        {/* Empty plan info */}
        {elements.length === 0 ? (
          <Text className="text-sm text-stone-500 mt-4 text-center">
            Noch keine Elemente -- nutze den Editor zum Einzeichnen.
          </Text>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <View className="p-4 border-t border-stone-200 dark:border-stone-700 bg-[#F9F7F4] dark:bg-[#1C1917]">
        {/* Primary CTA — to editor (Phase 5 placeholder) */}
        <Pressable
          onPress={() => router.replace('/(app)/' as any)}
          accessibilityRole="button"
          className="w-full rounded-lg py-3 min-h-[44px] items-center justify-center bg-[#4A7C59] dark:bg-[#6BAA7E] active:opacity-80"
        >
          <Text className="text-white font-semibold">
            {t('capture.plan.to_editor')}
          </Text>
        </Pressable>

        {/* Re-capture link with inline confirmation */}
        <View className="mt-3 items-center">
          {!showRecaptureConfirm ? (
            <Pressable
              onPress={() => setShowRecaptureConfirm(true)}
              accessibilityRole="button"
            >
              <Text className="text-sm text-stone-500">
                {t('capture.plan.recapture')}
              </Text>
            </Pressable>
          ) : (
            <View className="items-center gap-2 mt-1">
              <Text className="text-sm text-stone-700 dark:text-stone-300 text-center">
                {t('capture.plan.recapture_confirm')}
              </Text>
              <View className="flex-row gap-4">
                <Pressable
                  onPress={handleRecapture}
                  accessibilityRole="button"
                  className="rounded-lg px-4 py-2 min-h-[44px] items-center justify-center bg-red-600 active:opacity-80"
                >
                  <Text className="text-white font-semibold text-sm">
                    {t('capture.plan.recapture_confirm_cta')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowRecaptureConfirm(false)}
                  accessibilityRole="button"
                  className="min-h-[44px] items-center justify-center px-4 py-2"
                >
                  <Text className="text-sm text-stone-500">
                    {t('capture.plan.recapture_confirm_dismiss')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
