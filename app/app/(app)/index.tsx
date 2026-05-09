// Home Screen — zeigt Gartenplan wenn Elemente vorhanden, sonst Placeholder.
// Phase 5 Plan 05-02: Capture-Buttons entfernt (M07 Pivot — kein In-App AI).
import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import de from '@spatenstich/shared/i18n/de';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/lib/supabase';
import { loadAcceptedElements, loadDimensions } from '@/src/lib/gardenPlanRepo';
import { GardenPlanView } from '@/src/components/GardenPlanView';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function HomeScreen(): React.JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);

  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [elements, setElements] = React.useState<PlanElementRow[]>([]);
  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (mode !== 'account') return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setUserEmail(data.session?.user?.email ?? null);
    })();
    return () => { cancelled = true; };
  }, [mode]);

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

  const statusLabel = mode === 'account'
    ? (userEmail ?? 'Eingeloggt')
    : mode === 'local'
      ? 'Lokaler Modus'
      : null;

  // Has plan: show inline plan view
  if (elements.length > 0 && dimensions) {
    return (
      <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, alignItems: 'center' }}
        >
          {statusLabel ? (
            <View className="self-end mb-2">
              <Text className="text-xs text-stone-400" testID="home-auth-status">{statusLabel}</Text>
            </View>
          ) : null}
          <GardenPlanView
            dimensions={dimensions}
            elements={elements}
            showGrid={true}
            testID="home-garden-plan"
          />
        </ScrollView>
      </View>
    );
  }

  // Empty state: no plan yet
  return (
    <View className="flex-1 items-center justify-center bg-[#F9F7F4] dark:bg-[#1C1917] px-6">
      {statusLabel ? (
        <View className="absolute top-4 right-4">
          <Text className="text-xs text-stone-400" testID="home-auth-status">{statusLabel}</Text>
        </View>
      ) : null}
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-lg font-semibold text-stone-700 dark:text-stone-200 mb-2">
          {t('home.emptyTitle') !== 'home.emptyTitle' ? t('home.emptyTitle') : 'Noch kein Gartenplan'}
        </Text>
        <Text className="text-sm text-stone-500 dark:text-stone-400 text-center">
          {t('home.emptySubtitle') !== 'home.emptySubtitle' ? t('home.emptySubtitle') : 'Import-Funktion kommt bald.'}
        </Text>
      </View>
    </View>
  );
}
