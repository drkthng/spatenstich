// The calendar page of one plant: /(app)/kalender/[slug]
// Shows each kind of action (pre-sowing, sowing, planting out, harvest) with its time in words
// and as a strip of the year with a line for today, the plant's needs, the beds it stands in,
// and a button to put it into the plan.
//
// Phase 38 (DESIGN3-07): one labelled strip per kind of action instead of one strip where the
// colours had to be told apart; texts come from de.json; sun, water and family read in German.
// Threat: T-10-08 (slug from URL resolved via plants.find — unknown slug → "nicht gefunden")
// Threat: T-10-09 (addPlantToPlan delegates to the hook → assertAccount + RLS)
// Threat: T-10-10 (family lookup via getPlantSlug type-guard — malformed data skipped)
import * as React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useGardenPlants, usePlants } from '@/src/hooks/usePlants';
import { useKalenderData } from '@/src/hooks/useKalenderData';
import { findBeeteForPlant, findPflanzenInBeet, getPlantSlug } from '@/src/lib/kalenderBeete';
import { getFensterFuerPflanze, pruefeEinfacheFruchtfolge } from '@spatenstich/shared';
import { Button } from '@/src/components/ui/button';
import { InlineBanner } from '@/src/components/InlineBanner';
import { FARBEN, GanttStreifen } from '@/src/components/kalender/GanttStreifen';
import { MonatsLeiste } from '@/src/components/kalender/PflanzenKalenderZeile';
import { FruchtfolgeWarnung } from '@/src/components/kalender/FruchtfolgeWarnung';
import { windowsInWords } from '@/src/lib/kalenderAnzeige';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';
import de from '@spatenstich/shared/i18n/de';

/** A text for a value of the catalog ("halb_schattig"), or the value itself when there is none. */
function labelOf(group: 'sonne' | 'wasser' | 'familie', value: string | null | undefined): string {
  if (!value) return t('kalender.detail.unbekannt');
  const key = `kalender.${group}.${value}`;
  const text = t(key);
  return text === key ? value : text;
}

export default function PflanzenDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: plants = [] } = usePlants();
  // Phase 35: entries the garden added itself can be edited.
  const ownPlants = useGardenPlants();
  const { elements, klimazone, hasBeetImPlan, addPlantToPlan, loading } = useKalenderData();

  const plant = plants.find((p) => p.slug === slug);
  const ownPlant = ownPlants.find((p) => p.slug === slug && p.id === plant?.id);

  const [addLoading, setAddLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Without a postcode the calendar reckons with the middle zone and says so.
  const klimazoneNum = klimazone ?? 4;

  const windows = React.useMemo(() => {
    if (!plant) return [];
    const parts: [string, string, string] = [t('kalender.teil.anfang'), t('kalender.teil.mitte'), t('kalender.teil.ende')];
    return windowsInWords(getFensterFuerPflanze(plant, klimazoneNum), de.photo.months, parts);
  }, [plant, klimazoneNum]);

  // ── CAL-06: a plant of the same family already in the bed ─────────────────
  const fruchtfolgeGrund: string | null = React.useMemo(() => {
    if (!plant || !elements.length) return null;

    const bySlug = new Map(plants.map((p) => [p.slug, p]));

    // The beds the plant stands in, or all beds while it stands in none.
    const myBeete = findBeeteForPlant(elements, plant.slug);
    const targetBeete =
      myBeete.length > 0 ? myBeete : elements.filter((e) => e.elementType === 'Beet' && e.deletedAt === null);

    for (const beet of targetBeete) {
      const beetPflanzen = findPflanzenInBeet(elements, beet)
        .filter((e) => getPlantSlug(e) !== plant.slug)
        .map((e) => {
          const ps = getPlantSlug(e);
          const other = ps ? bySlug.get(ps) : undefined;
          return other ? { family: other.family, slug: other.slug } : null; // skip unresolvable (T-10-10)
        })
        .filter((x): x is { family: string; slug: string } => x !== null);

      const result = pruefeEinfacheFruchtfolge({ family: plant.family, slug: plant.slug }, beetPflanzen);
      if (result.warnung) {
        const other = result.konfliktSlug ? bySlug.get(result.konfliktSlug) : undefined;
        return t('kalender.fruchtfolge', {
          other: other?.nameDe ?? t('kalender.fruchtfolgeAndere'),
          bed: beet.label || t('kalender.beetOhneName'),
        });
      }
    }
    return null;
  }, [plant, plants, elements]);

  const meineBeete = React.useMemo(() => {
    if (!plant || !elements.length) return [];
    return findBeeteForPlant(elements, plant.slug);
  }, [plant, elements]);

  const handleAddToPlan = React.useCallback(async () => {
    if (!plant) return;
    setAddLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await addPlantToPlan(plant);
      setSuccessMessage(t('kalender.hinzugefuegtBanner', { name: plant.nameDe }));
    } catch {
      setErrorMessage(t('kalender.hinzufuegenFehler'));
    } finally {
      setAddLoading(false);
    }
  }, [plant, addPlantToPlan]);

  // Unknown plant (T-10-08) — after all hooks, so their number is the same on every render.
  if (!loading && !plant) {
    return (
      <View className="flex-1 bg-bg">
        <Stack.Screen options={{ headerTitle: t('kalender.title') }} />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
          <InlineBanner variant="warning" message={t('kalender.nichtGefunden')} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerTitle: plant?.nameDe ?? t('kalender.title') }} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center', gap: 20 }}>
          {klimazone == null ? (
            <InlineBanner
              variant="warning"
              message={t('kalender.plzFehlt')}
              actionLabel={t('kalender.plzJetztEingeben')}
              onAction={() => router.push('/(app)/profile/plz' as any)}
            />
          ) : null}

          {/* The year of the plant */}
          {plant ? (
            <View testID="pflanze-jahr">
              {plant.nameBotanical ? (
                <Text className="font-body text-base italic text-ink-muted mb-2">{plant.nameBotanical}</Text>
              ) : null}
              {windows.length === 0 ? (
                <Text className="font-body text-base text-ink-muted">{t('kalender.keineZeiten')}</Text>
              ) : (
                <>
                  <MonatsLeiste nameColumn={false} />
                  {windows.map((w) => (
                    <View key={w.typ} className="mt-3" testID={`pflanze-fenster-${w.typ}`}>
                      <View className="flex-row flex-wrap items-center gap-x-2 mb-1">
                        <View
                          style={{
                            width: 14,
                            height: 10,
                            backgroundColor: FARBEN[w.typ],
                            borderWidth: 1,
                            borderColor: tokens.color.ink,
                          }}
                        />
                        <Text className="font-body text-base text-ink">
                          {t(`kalender.legende.${w.typ.toLowerCase()}`)}
                        </Text>
                        <Text className="font-body text-base text-ink-muted">
                          {t('kalender.fensterBis', { from: w.from, to: w.to })}
                        </Text>
                        {w.active ? (
                          <Text className="font-body text-sm text-ink px-2 bg-ok-soft border border-line">
                            {t('kalender.jetzt')}
                          </Text>
                        ) : null}
                      </View>
                      <GanttStreifen plant={plant} klimazone={klimazoneNum} height={14} fenster={w.parts} />
                    </View>
                  ))}
                  <Text className="font-body text-sm text-ink-muted mt-3">{t('kalender.heuteHinweis')}</Text>
                </>
              )}
            </View>
          ) : null}

          {/* What the plant needs */}
          {plant ? (
            <View style={{ gap: 4 }} testID="pflanze-angaben">
              <Text className="font-body text-base text-ink">
                {t('kalender.detail.mindestabstand', {
                  cm: plant.minSpacingCm != null ? `${plant.minSpacingCm} cm` : t('kalender.detail.unbekannt'),
                })}
              </Text>
              <Text className="font-body text-base text-ink">
                {t('kalender.detail.sonnenbedarf', { value: labelOf('sonne', plant.sunRequirement) })}
              </Text>
              <Text className="font-body text-base text-ink">
                {t('kalender.detail.wasserbedarf', { value: labelOf('wasser', plant.waterNeeds) })}
              </Text>
              <Text className="font-body text-base text-ink">
                {t('kalender.detail.familie', { family: labelOf('familie', plant.family) })}
              </Text>
              {ownPlant ? (
                <View className="flex-row flex-wrap items-center gap-3 mt-1" testID="pflanze-own-entry">
                  <Text className="font-body text-sm text-ink px-2 py-[2px] bg-ok-soft border border-line">
                    {t('photo.plant.ownBadge')}
                  </Text>
                  <Pressable
                    onPress={() => router.push(('/(app)/foto/pflanze?id=' + ownPlant.id) as any)}
                    accessibilityRole="button"
                    className="justify-center"
                    style={{ minHeight: 48 }}
                    testID="pflanze-own-edit"
                  >
                    <Text className="font-body text-base text-ink underline">{t('photo.plant.editLink')}</Text>
                  </Pressable>
                </View>
              ) : null}
              {fruchtfolgeGrund ? <FruchtfolgeWarnung grund={fruchtfolgeGrund} /> : null}
            </View>
          ) : null}

          {/* Where it stands, and putting it into the plan */}
          {plant ? (
            <View style={{ gap: 8 }}>
              <Text className="font-display text-xl text-ink" accessibilityRole="header">
                {t('kalender.aufWelchemBeet')}
              </Text>

              {meineBeete.length > 0 ? (
                meineBeete.map((beet) => (
                  <Text key={beet.id} className="font-body text-base text-ink" testID={`pflanze-beet-${beet.id}`}>
                    {beet.label || t('kalender.beetOhneName')}
                  </Text>
                ))
              ) : (
                <Text className="font-body text-base text-ink-muted">{t('kalender.nochNichtImPlan')}</Text>
              )}

              {successMessage ? (
                <InlineBanner variant="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
              ) : null}

              {errorMessage ? <InlineBanner variant="error" message={errorMessage} /> : null}

              {/* CAL-04/05: only when the plan has a bed to put it in */}
              {hasBeetImPlan ? (
                <Button
                  variant="default"
                  className="bg-primary mt-2"
                  disabled={addLoading}
                  onPress={handleAddToPlan}
                  accessibilityLabel={t('kalender.zuPlanHinzufuegenLabel', { name: plant.nameDe })}
                  testID="detail-add-to-plan-button"
                >
                  <Text className="font-body text-base text-on-primary">{t('kalender.zuPlanHinzufuegen')}</Text>
                </Button>
              ) : (
                <InlineBanner variant="warning" message={t('kalender.keinBeetImPlan')} />
              )}

              <Button variant="outline" className="mt-2" onPress={() => router.push('/(app)/plan' as any)}>
                <Text className="font-body text-base text-ink">{t('kalender.planOeffnen')}</Text>
              </Button>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
