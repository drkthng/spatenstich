// Phase 10 Plan 03: Wochen-View Screen — /(app)/kalender
// CAL-01: Jahresübersicht Pflanzenliste mit Miniatur-GanttStreifen
// CAL-03: KalenderWochenCard mit farbigen Aktions-Badges (diese Woche)
// UI-SPEC §Screen 1 Anatomie + §Filter-Chip-Kontrakt + §Navigation-Kontrakt
// Plan 10-09 WR-05: Chip-State an useKalenderData({ nurMeinePflanzen }) durchgereicht;
//   screen-seitige Aktionen-Doppelfilterung entfernt (Hook filtert korrekt);
//   userToggled-Ref verhindert useEffect-Override nach Nutzer-Opt-out.
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

  // WR-05 (1): Chip-State muss beim Hook-Aufruf bekannt sein → State vor dem Hook-Call deklarieren.
  // Lazy initializer returns false; useEffect initializes once after first data load.
  const [nurMeinePflanzen, setNurMeinePflanzen] = React.useState(false);

  // WR-05 (2): userToggled-Ref — verhindert dass der Sync-Effekt einen expliziten Opt-out überschreibt.
  // Wird im onPress-Handler auf true gesetzt; danach ist der Sync-Effekt wirkungslos.
  const userToggled = React.useRef(false);

  // WR-05 (3): Chip-State an Hook durchreichen (statt useKalenderData() ohne Option).
  // Der Hook filtert wochenAktionen jetzt korrekt nach dem aktuellen Chip-State.
  const {
    wochenAktionen,
    meinePflanzenslugs,
    aktuelleKw,
    klimazone,
    loading,
  } = useKalenderData({ nurMeinePflanzen });

  // WR-05 (4): Chip-Default einmalig initialisieren sobald meinePflanzenslugs geladen ist.
  // Nur beim ersten Laden (userToggled.current === false) — kein Override nach Nutzer-Opt-out.
  // Pattern: "only initialize once" per 10-REVIEW.md WR-05.
  React.useEffect(() => {
    if (!userToggled.current && meinePflanzenslugs.size > 0) {
      setNurMeinePflanzen(true);
    }
  }, [meinePflanzenslugs.size]);

  // Loading guard
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

  // WR-05 (5): Screen-seitige Aktionen-Doppelfilterung ENTFERNT.
  // Die KalenderWochenCard erhält wochenAktionen direkt — der Hook filtert bereits korrekt.

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
            testID="filter-chip-meine-pflanzen"
            onPress={() => {
              // WR-05: Nutzer-Opt-out markieren → Sync-Effekt wird nach Toggle wirkungslos.
              userToggled.current = true;
              setNurMeinePflanzen((v) => !v);
            }}
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

        {/* KalenderWochenCard: "Diese Woche" — erhält wochenAktionen direkt (kein Screen-Filter) */}
        <KalenderWochenCard
          aktionen={wochenAktionen}
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
