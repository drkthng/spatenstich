// Home Screen — shows garden plan if elements exist, otherwise empty-state CTA to capture.
// Phase 4 Plan 04 — replaces placeholder from Phase 2.
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { loadAcceptedElements, loadDimensions } from '@/src/lib/gardenPlanRepo';
import { GardenPlanView } from '@/src/components/GardenPlanView';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const activeGardenId = useAuthStore((s) => s.activeGardenId);

  const [elements, setElements] = React.useState<PlanElementRow[]>([]);
  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!activeGardenId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [dims, elems] = await Promise.all([
          loadDimensions(activeGardenId),
          loadAcceptedElements(activeGardenId),
        ]);
        setDimensions(dims);
        setElements(elems);
      } catch (err) {
        console.error('home: load plan failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeGardenId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F9F7F4] dark:bg-[#1C1917]">
        <Text className="text-stone-500">...</Text>
      </View>
    );
  }

  // Has plan: show inline plan view
  if (elements.length > 0 && dimensions) {
    return (
      <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, alignItems: 'center' }}
        >
          <GardenPlanView
            dimensions={dimensions}
            elements={elements}
            showGrid={true}
            testID="home-garden-plan"
          />
        </ScrollView>

        {/* Footer CTAs */}
        <View className="p-4 border-t border-stone-200 dark:border-stone-700">
          <Pressable
            onPress={() => router.push('/(app)/capture/plan' as any)}
            accessibilityRole="button"
            className="w-full rounded-lg py-3 min-h-[44px] items-center justify-center bg-[#4A7C59] dark:bg-[#6BAA7E] active:opacity-80"
          >
            <Text className="text-white font-semibold">Garten bearbeiten</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/capture/step-overview' as any)}
            accessibilityRole="button"
            className="mt-3 w-full rounded-lg py-3 min-h-[44px] items-center justify-center active:opacity-80"
          >
            <Text className="text-[#4A7C59] dark:text-[#6BAA7E] font-semibold text-sm">
              Erneut erfassen
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state: no plan yet
  return (
    <View className="flex-1 items-center justify-center bg-[#F9F7F4] dark:bg-[#1C1917] px-6">
      <View className="w-20 h-20 rounded-full bg-stone-200 dark:bg-stone-700 items-center justify-center mb-4">
        <Camera size={36} color="#78716C" />
      </View>
      <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100 text-center">
        Noch kein Gartenplan
      </Text>
      <Text className="text-sm text-stone-500 mt-2 text-center max-w-xs">
        Fotografiere deinen Garten und lass dir einen Plan erstellen.
      </Text>
      <Pressable
        onPress={() => router.push('/(app)/capture/step-overview' as any)}
        accessibilityRole="button"
        className="mt-6 bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-lg px-6 py-3 min-h-[44px] items-center justify-center active:opacity-80"
      >
        <Text className="text-white font-semibold">Garten erfassen</Text>
      </Pressable>
    </View>
  );
}
