// Kalender (Phase 38, DESIGN3-07): what is due this week, a search, and two lists with the
// year of each plant as a strip: "In eurem Plan" and "Alle Pflanzen" from A to Z. A line
// marks today on every strip.
//
// The former switch "Nur meine Pflanzen" is gone: the two lists say the same without a
// control, and "Diese Woche" is about the plan as soon as plants stand in it.
import * as React from 'react';
import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { usePlants } from '@/src/hooks/usePlants';
import { useKalenderData } from '@/src/hooks/useKalenderData';
import { KalenderWochenCard } from '@/src/components/kalender/KalenderWochenCard';
import { MonatsLeiste, PflanzenKalenderZeile } from '@/src/components/kalender/PflanzenKalenderZeile';
import { GanttLegende } from '@/src/components/kalender/GanttLegende';
import { InlineBanner } from '@/src/components/InlineBanner';
import { Button } from '@/src/components/ui/button';
import { calendarSections } from '@/src/lib/kalenderAnzeige';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

export default function KalenderScreen(): React.JSX.Element {
  const router = useRouter();
  const { data: allPlants = [] } = usePlants();
  const [query, setQuery] = React.useState('');

  // Without an option the hook takes the plants of the plan when there are any, else all.
  const { wochenAktionen, meinePflanzenslugs, aktuelleKw, klimazone, loading } = useKalenderData();

  const sections = React.useMemo(
    () => calendarSections(allPlants, meinePflanzenslugs, query),
    [allPlants, meinePflanzenslugs, query],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Stack.Screen options={{ headerTitle: t('kalender.title') }} />
        <Text className="font-body text-base text-ink-muted">{t('common.loading')}</Text>
      </View>
    );
  }

  const zone = klimazone ?? 4;
  const searching = query.trim() !== '';
  const open = (slug: string): void => router.push(('/(app)/kalender/' + slug) as any);

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerTitle: t('kalender.title') }} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center', gap: 16 }}>
          {klimazone == null ? (
            <InlineBanner
              variant="warning"
              message={t('kalender.plzFehlt')}
              actionLabel={t('kalender.plzJetztEingeben')}
              onAction={() => router.push('/(app)/profile/plz' as any)}
            />
          ) : null}

          {/* Search */}
          <View className="flex-row items-center border border-line bg-bg" style={{ minHeight: 48 }}>
            <View style={{ width: 48, alignItems: 'center' }}>
              <Search size={20} color={tokens.color.inkMuted} />
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('kalender.suche')}
              placeholderTextColor={tokens.color.inkMuted}
              accessibilityLabel={t('kalender.suche')}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              className="flex-1 font-body text-base text-ink"
              style={{ minHeight: 48, minWidth: 0 }}
              testID="kalender-suche"
            />
            {searching ? (
              <Pressable
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel={t('kalender.sucheLeeren')}
                className="items-center justify-center"
                style={{ width: 48, height: 48 }}
                testID="kalender-suche-leeren"
              >
                <X size={20} color={tokens.color.ink} />
              </Pressable>
            ) : null}
          </View>

          {/* This week; out of the way while searching */}
          {!searching ? (
            <KalenderWochenCard
              aktionen={wochenAktionen}
              aktuelleKw={aktuelleKw}
              ausPlan={meinePflanzenslugs.size > 0}
              onPlantPress={open}
            />
          ) : null}

          <GanttLegende />

          {/* In eurem Plan */}
          <View testID="kalender-im-plan">
            <Text className="font-display text-xl text-ink" accessibilityRole="header">
              {t('kalender.inEuremPlan')}
            </Text>
            {meinePflanzenslugs.size === 0 ? (
              <View className="gap-3 mt-1">
                <Text className="font-body text-base text-ink-muted">{t('kalender.keinePflanzenImPlanBody')}</Text>
                <Button variant="outline" onPress={() => router.push('/(app)/plan' as any)} className="self-start">
                  <Text className="font-body text-base text-ink">{t('kalender.planOeffnen')}</Text>
                </Button>
              </View>
            ) : sections.inPlan.length === 0 ? (
              <Text className="font-body text-base text-ink-muted mt-1" testID="kalender-im-plan-leer">
                {t('kalender.keineTrefferImPlan')}
              </Text>
            ) : (
              <View className="mt-2">
                <MonatsLeiste />
                {sections.inPlan.map((plant) => (
                  <PflanzenKalenderZeile
                    key={plant.slug}
                    plant={plant}
                    klimazone={zone}
                    onPress={open}
                    testID={`kalender-plan-${plant.slug}`}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Alle Pflanzen */}
          <View testID="kalender-alle">
            <Text className="font-display text-xl text-ink" accessibilityRole="header">
              {t('kalender.allePflanzen')}
            </Text>
            {sections.allCount === 0 ? (
              <Text className="font-body text-base text-ink-muted mt-1" testID="kalender-alle-leer">
                {t('kalender.keineTreffer')}
              </Text>
            ) : (
              <View className="mt-2">
                <MonatsLeiste />
                {sections.all.map((group) => (
                  <View key={group.letter}>
                    <Text
                      className="font-display text-base text-ink-muted mt-3"
                      accessibilityRole="header"
                      testID={`kalender-buchstabe-${group.letter}`}
                    >
                      {group.letter}
                    </Text>
                    {group.plants.map((plant) => (
                      <PflanzenKalenderZeile
                        key={plant.slug}
                        plant={plant}
                        klimazone={zone}
                        imPlan={meinePflanzenslugs.has(plant.slug)}
                        onPress={open}
                        testID={`kalender-alle-${plant.slug}`}
                      />
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
