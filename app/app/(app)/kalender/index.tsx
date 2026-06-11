// Phase 10 Plan 03: Wochen-View Screen — /(app)/kalender
// CAL-01: Jahresübersicht Pflanzenliste mit Miniatur-GanttStreifen
// CAL-03: KalenderWochenCard mit farbigen Aktions-Badges (diese Woche)
// UI-SPEC §Screen 1 Anatomie + §Filter-Chip-Kontrakt + §Navigation-Kontrakt
import * as React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { usePlants } from '@/src/hooks/usePlants';
import { useKalenderData } from '@/src/hooks/useKalenderData';
import { KalenderWochenCard } from '@/src/components/kalender/KalenderWochenCard';
import { PflanzenKalenderZeile } from '@/src/components/kalender/PflanzenKalenderZeile';
import { InlineBanner } from '@/src/components/InlineBanner';
import { Button } from '@/src/components/ui/button';

// ── i18n helper ───────────────────────────────────────────────────────────────
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function KalenderScreen(): React.JSX.Element {
  const router = useRouter();
  const { data: allPlants = [] } = usePlants();

  const {
    wochenAktionen,
    meinePflanzenslugs,
    aktuelleKw,
    klimazone,
    loading,
  } = useKalenderData();

  // Filter-Chip state: default ON when there are plants in the plan (UI-SPEC §Filter-Chip-Kontrakt)
  const [nurMeinePflanzen, setNurMeinePflanzen] = React.useState(
    () => meinePflanzenslugs.size > 0,
  );

  // Sync chip default once meinePflanzenslugs is loaded (hook loads asynchronously)
  React.useEffect(() => {
    if (meinePflanzenslugs.size > 0) {
      setNurMeinePflanzen(true);
    }
  }, [meinePflanzenslugs.size]);

  // Loading guard (usePlants cold-start)
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F9F7F4] dark:bg-[#1C1917]">
        <Stack.Screen options={{ headerTitle: t('kalender.title') }} />
        <Text className="text-stone-500">...</Text>
      </View>
    );
  }

  // Determine the plant list for the Jahresübersicht based on filter state
  const filteredPlants =
    nurMeinePflanzen && meinePflanzenslugs.size > 0
      ? allPlants.filter((p) => meinePflanzenslugs.has(p.slug))
      : allPlants;

  // Filter wochenAktionen for the chip state
  const filteredAktionen =
    nurMeinePflanzen && meinePflanzenslugs.size > 0
      ? wochenAktionen.filter(({ plant }) => meinePflanzenslugs.has(plant.slug))
      : wochenAktionen;

  // Empty state: filter active but no plants in plan
  const showEmptyPlanState = nurMeinePflanzen && meinePflanzenslugs.size === 0;

  return (
    <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
      <Stack.Screen options={{ headerTitle: t('kalender.title') }} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* PLZ/Klimazone-Warnung (T-10-07: null klimazone guard) */}
        {klimazone == null && (
          <InlineBanner
            variant="warning"
            message={t('kalender.plzFehlt')}
            actionLabel={t('kalender.plzJetztEingeben')}
            onAction={() => router.push('/(app)/profile/plz' as any)}
          />
        )}

        {/* Filter-Chip "Nur meine Pflanzen" (UI-SPEC §Filter-Chip-Kontrakt) */}
        <View className="flex-row">
          <Pressable
            onPress={() => setNurMeinePflanzen((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: nurMeinePflanzen }}
            className={
              nurMeinePflanzen
                ? 'bg-[#4A7C59] rounded-full px-3 py-1'
                : 'border border-stone-300 dark:border-stone-700 rounded-full px-3 py-1'
            }
          >
            <Text
              className={
                nurMeinePflanzen
                  ? 'text-xs text-white font-semibold'
                  : 'text-xs text-stone-700 dark:text-stone-300'
              }
            >
              {t('kalender.filterMeinePflanzen')}
            </Text>
          </Pressable>
        </View>

        {/* KalenderWochenCard: "Diese Woche" */}
        <KalenderWochenCard
          aktionen={filteredAktionen}
          aktuelleKw={aktuelleKw}
          onPlantPress={(slug) => router.push(('/(app)/kalender/' + slug) as any)}
        />

        {/* Jahresübersicht Abschnitts-Titel */}
        <Text className="text-sm font-semibold text-stone-600 dark:text-stone-400">
          {t('kalender.jahresuebersicht')}
        </Text>

        {/* Empty state: filter active, 0 slugs in plan */}
        {showEmptyPlanState ? (
          <View className="gap-3">
            <Text className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              {t('kalender.keinePflanzenImPlan')}
            </Text>
            <Text className="text-sm text-stone-500 dark:text-stone-400">
              {t('kalender.keinePflanzenImPlanBody')}
            </Text>
            <Button
              variant="outline"
              onPress={() => router.push('/(app)/plan' as any)}
              className="self-start"
            >
              <Text className="font-semibold text-stone-700 dark:text-stone-200">
                {t('kalender.planOeffnen')}
              </Text>
            </Button>
          </View>
        ) : (
          /* Pflanzenliste */
          filteredPlants.map((plant) => (
            <PflanzenKalenderZeile
              key={plant.slug}
              plant={plant}
              klimazone={klimazone ?? 4}
              onPress={(slug) => router.push(('/(app)/kalender/' + slug) as any)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
