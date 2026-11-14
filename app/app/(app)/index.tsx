// Home Screen — zeigt Gartenplan wenn Elemente vorhanden, sonst Placeholder.
// Phase 5 Plan 05-02: Capture-Buttons entfernt (M07 Pivot — kein In-App AI).
// Phase 6 Plan 06-03: "Aus Claude.ai importieren" Button in Empty State + Plan View.
// Quick 260611-jrl: Profil-Icon in beiden Render-Branches ergänzt.
// Quick 260616-iuu: Zahnrad-Icon (Settings) in beiden Render-Branches ergänzt.
import { tokens } from '@/src/theme/tokens';
import * as React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, User } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/lib/supabase';
import { loadAcceptedElements, loadDimensions } from '@/src/lib/gardenPlanRepo';
import { PlanEditor } from '@/src/components/plan/PlanEditor';
import { usePlanVersion } from '@/src/lib/editor/planRefresh';
import { Button } from '@/src/components/ui/button';
import { InlineBanner } from '@/src/components/InlineBanner';

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
      <User size={24} color={tokens.color.inkMuted} />
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
      <Settings size={24} color={tokens.color.inkMuted} />
    </Pressable>
  );
}

export default function HomeScreen(): React.JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const router = useRouter();
  const planVersion = usePlanVersion();

  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [elements, setElements] = React.useState<PlanElementRow[]>([]);
  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  // Plan 20-02 Task 3 (D-04): Lokal-Modus hat nie einen activeGardenId (D-13),
  // daher werden diese drei Buttons nur im leeren Zustand erreicht. Statt zu
  // navigieren (und dort in eine Exception zu laufen) zeigen sie den Hinweis.
  const [showAccountRequiredHint, setShowAccountRequiredHint] = React.useState(false);

  const handleGatedNav = React.useCallback((route: string) => {
    if (mode === 'local') {
      setShowAccountRequiredHint(true);
      return;
    }
    router.push(route as any);
  }, [mode, router]);

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
  }, [activeGardenId, planVersion]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-ink-muted">...</Text>
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
      <View className="flex-1 bg-bg">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, alignItems: 'center' }}
        >
          <View className="self-stretch flex-row items-center justify-between mb-2">
            {statusLabel ? (
              <Text className="text-xs text-ink-muted" testID="home-auth-status">{statusLabel}</Text>
            ) : (
              <View />
            )}
            <View className="flex-row items-center gap-3">
              <SettingsButton />
              <ProfileButton />
            </View>
          </View>
          {/* Still picture of the plan in the same drawing style as the editor. */}
          <View className="self-stretch h-[300px] border border-line">
            <PlanEditor
              mode="readOnly"
              interactive={false}
              dimensions={dimensions}
              elements={elements}
              testID="home-garden-plan"
            />
          </View>
          <Button
            variant="outline"
            onPress={() => router.push('/(app)/import' as any)}
            className="mt-4 w-full"
            testID="home-import-button-plan"
          >
            <Text className="font-semibold text-ink">
              {t('import.home.importButton')}
            </Text>
          </Button>
          <Button
            variant="default"
            onPress={() => router.push('/(app)/plan' as any)}
            className="mt-2 w-full"
            testID="home-open-plan-button"
          >
            <Text className="text-on-primary font-semibold">
              {t('editor.home.openPlan')}
            </Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => router.push('/(app)/kalender' as any)}
            className="mt-2 w-full"
            testID="home-kalender-button"
          >
            <Text className="font-semibold text-ink">
              {t('kalender.title')}
            </Text>
          </Button>
        </ScrollView>
      </View>
    );
  }

  // Empty state: no plan yet
  return (
    <View className="flex-1 items-center justify-center bg-bg px-6">
      <View className="absolute top-4 right-4 flex-row items-center gap-3">
        {statusLabel ? (
          <Text className="text-xs text-ink-muted" testID="home-auth-status">{statusLabel}</Text>
        ) : null}
        <SettingsButton />
        <ProfileButton />
      </View>
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-lg font-display font-semibold text-ink mb-2">
          {t('import.home.emptyHeading')}
        </Text>
        <Text className="text-sm text-ink-muted text-center mb-2">
          {t('import.home.emptyBody')}
        </Text>
        <Button
          variant="default"
          onPress={() => handleGatedNav('/(app)/import')}
          className="mt-4 w-full"
          testID="home-import-button-empty"
        >
          <Text className="text-on-primary font-semibold">
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
            <Text className="text-on-primary font-semibold">
              {t('plan.new.title')}
            </Text>
          </Button>
        )}
        <Button
          variant="outline"
          onPress={() => handleGatedNav('/(app)/plan')}
          className="mt-2 w-full"
          testID="home-open-plan-button-empty"
        >
          <Text className="font-semibold text-ink">
            {t('editor.home.openPlan')}
          </Text>
        </Button>
        <Button
          variant="outline"
          onPress={() => handleGatedNav('/(app)/kalender')}
          className="mt-2 w-full"
          testID="home-kalender-button"
        >
          <Text className="font-semibold text-ink">
            {t('kalender.title')}
          </Text>
        </Button>
        {showAccountRequiredHint ? (
          <InlineBanner
            message={t('common.accountRequired')}
            variant="warning"
            onDismiss={() => setShowAccountRequiredHint(false)}
            testID="home-account-required-hint"
          />
        ) : null}
      </View>
    </View>
  );
}
