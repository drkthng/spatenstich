// Home Screen — zeigt Gartenplan wenn Elemente vorhanden, sonst Placeholder.
// Phase 5 Plan 05-02: Capture-Buttons entfernt (M07 Pivot — kein In-App AI).
// Phase 6 Plan 06-03: "Aus Claude.ai importieren" Button in Empty State + Plan View.
// Quick 260611-jrl: Profil-Icon in beiden Render-Branches ergänzt.
// Quick 260616-iuu: Zahnrad-Icon (Settings) in beiden Render-Branches ergänzt.
import * as React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, User } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/lib/supabase';
import { loadAcceptedElements, loadDimensions } from '@/src/lib/gardenPlanRepo';
import { GardenPlanView } from '@/src/components/GardenPlanView';
import { Button } from '@/src/components/ui/button';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

function ProfileButton(): React.JSX.Element {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/(app)/profile' as any)}
      accessibilityRole="button"
      accessibilityLabel={t('home.profileButtonLabel')}
      testID="home-profile-button"
      className="min-w-[44px] min-h-[44px] items-center justify-center"
    >
      <User size={24} color="#78716C" />
    </Pressable>
  );
}

function SettingsButton(): React.JSX.Element {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/(app)/settings' as any)}
      accessibilityRole="button"
      accessibilityLabel={t('home.settingsButtonLabel')}
      testID="home-settings-button"
      className="min-w-[44px] min-h-[44px] items-center justify-center"
    >
      <Settings size={24} color="#78716C" />
    </Pressable>
  );
}

export default function HomeScreen(): React.JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const router = useRouter();

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
          <View className="self-stretch flex-row items-center justify-between mb-2">
            {statusLabel ? (
              <Text className="text-xs text-stone-400" testID="home-auth-status">{statusLabel}</Text>
            ) : (
              <View />
            )}
            <View className="flex-row items-center gap-3">
              <SettingsButton />
              <ProfileButton />
            </View>
          </View>
          <GardenPlanView
            dimensions={dimensions}
            elements={elements}
            showGrid={true}
            testID="home-garden-plan"
          />
          <Button
            variant="outline"
            onPress={() => router.push('/(app)/import' as any)}
            className="mt-4 w-full"
            testID="home-import-button-plan"
          >
            <Text className="font-semibold text-stone-700 dark:text-stone-200">
              {t('import.home.importButton')}
            </Text>
          </Button>
          <Button
            variant="default"
            onPress={() => router.push('/(app)/plan' as any)}
            className="mt-2 w-full"
            testID="home-open-plan-button"
          >
            <Text className="text-white font-semibold">
              {t('editor.home.openPlan')}
            </Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => router.push('/(app)/kalender' as any)}
            className="mt-2 w-full"
            testID="home-kalender-button"
          >
            <Text className="font-semibold text-stone-700 dark:text-stone-200">
              {t('kalender.title')}
            </Text>
          </Button>
        </ScrollView>
      </View>
    );
  }

  // Empty state: no plan yet
  return (
    <View className="flex-1 items-center justify-center bg-[#F9F7F4] dark:bg-[#1C1917] px-6">
      <View className="absolute top-4 right-4 flex-row items-center gap-3">
        {statusLabel ? (
          <Text className="text-xs text-stone-400" testID="home-auth-status">{statusLabel}</Text>
        ) : null}
        <SettingsButton />
        <ProfileButton />
      </View>
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-lg font-semibold text-stone-700 dark:text-stone-200 mb-2">
          {t('import.home.emptyHeading')}
        </Text>
        <Text className="text-sm text-stone-500 dark:text-stone-400 text-center mb-2">
          {t('import.home.emptyBody')}
        </Text>
        <Button
          variant="default"
          onPress={() => router.push('/(app)/import' as any)}
          className="mt-4 w-full"
          testID="home-import-button-empty"
        >
          <Text className="text-white font-semibold">
            {t('import.home.importButton')}
          </Text>
        </Button>
        {mode === 'account' && (
          <Button
            variant="default"
            onPress={() => router.push('/(app)/plan/new' as any)}
            className="mt-2 w-full"
            testID="home-create-garden-button-empty"
          >
            <Text className="text-white font-semibold">
              {t('plan.new.title')}
            </Text>
          </Button>
        )}
        <Button
          variant="outline"
          onPress={() => router.push('/(app)/plan' as any)}
          className="mt-2 w-full"
          testID="home-open-plan-button-empty"
        >
          <Text className="font-semibold text-stone-700 dark:text-stone-200">
            {t('editor.home.openPlan')}
          </Text>
        </Button>
        <Button
          variant="outline"
          onPress={() => router.push('/(app)/kalender' as any)}
          className="mt-2 w-full"
          testID="home-kalender-button"
        >
          <Text className="font-semibold text-stone-700 dark:text-stone-200">
            {t('kalender.title')}
          </Text>
        </Button>
      </View>
    </View>
  );
}
