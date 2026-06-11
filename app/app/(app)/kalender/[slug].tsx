// Phase 10 Plan 04: Pflanzen-Detail screen.
// Route: /(app)/kalender/[slug]
// Shows: full 12-month Gantt + month labels + GanttLegende + Phase-8 plant infos
//   + "Auf welchem Beet?" (findBeeteForPlant) + "Zu Plan hinzufügen" CTA (CAL-05)
//   + Fruchtfolge warning (CAL-06 via pruefeEinfacheFruchtfolge).
// Threat: T-10-08 (slug from URL resolved via plants.find — unknown slug → "nicht gefunden")
// Threat: T-10-09 (addPlantToPlan delegates to plan-02 hook → assertAccount + RLS)
// Threat: T-10-10 (family lookup via getPlantSlug type-guard — malformed data skipped)
import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { usePlants } from '@/src/hooks/usePlants';
import { useKalenderData } from '@/src/hooks/useKalenderData';
import { findBeeteForPlant, findPflanzenInBeet, getPlantSlug } from '@/src/lib/kalenderBeete';
import { pruefeEinfacheFruchtfolge } from '@spatenstich/shared';
import { Button } from '@/src/components/ui/button';
import { InlineBanner } from '@/src/components/InlineBanner';
import { GanttStreifen } from '@/src/components/kalender/GanttStreifen';
import { GanttLegende } from '@/src/components/kalender/GanttLegende';
import { FruchtfolgeWarnung } from '@/src/components/kalender/FruchtfolgeWarnung';

// ── i18n helper ───────────────────────────────────────────────────────────────
const t = (key: string, vars?: Record<string, string | number>): string => {
  let str: string =
    key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, String(v));
    });
  }
  return str;
};

// ── Module constants ──────────────────────────────────────────────────────────
const MONATE = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

// ── Screen ───────────────────────────────────────────────────────────────────
export default function PflanzenDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: plants = [] } = usePlants();
  const {
    elements,
    klimazone,
    hasBeetImPlan,
    addPlantToPlan,
    loading,
  } = useKalenderData();

  const plant = plants.find((p) => p.slug === slug);

  // State for CTA loading/success/error
  const [addLoading, setAddLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // PLZ/klimazone guard — render warning but still show everything else
  const klimazoneNum = klimazone ?? 4;

  // ── CAL-06: Fruchtfolge warning ───────────────────────────────────────────
  // Compute: check if a same-family plant already occupies any bed
  // WR-02 Fix: beet-scoped via findPflanzenInBeet (Plan 10-06/10-07).
  const fruchtfolgeGrund: string | null = React.useMemo(() => {
    if (!plant || !elements.length) return null;

    // Build a map of plantSlug → family from the plants list for lookup
    const familyBySlug = new Map<string, string>(
      plants.map((p) => [p.slug, p.family]),
    );

    // Find beds the plant is already in, or all beds if not placed
    const myBeete = findBeeteForPlant(elements, plant.slug);
    const targetBeete = myBeete.length > 0 ? myBeete : elements.filter(
      (e) => e.elementType === 'Beet' && e.deletedAt === null,
    );

    for (const beet of targetBeete) {
      // WR-02 Fix: Get Pflanze elements scoped to THIS bed via PiP (Plan 10-06 findPflanzenInBeet).
      // Exclude the plant being viewed (T-10-10).
      const otherPflanzenInBeet = findPflanzenInBeet(elements, beet)
        .filter((e) => getPlantSlug(e) !== plant.slug);

      const beetPflanzen = otherPflanzenInBeet
        .map((e) => {
          const ps = getPlantSlug(e);
          if (!ps) return null;
          const fam = familyBySlug.get(ps);
          if (!fam) return null; // skip unresolvable (T-10-10)
          return { family: fam, slug: ps };
        })
        .filter((x): x is { family: string; slug: string } => x !== null);

      const result = pruefeEinfacheFruchtfolge(
        { family: plant.family, slug: plant.slug },
        beetPflanzen,
      );
      if (result.warnung && result.grund) {
        return result.grund;
      }
    }
    return null;
  }, [plant, plants, elements]);

  // ── "Auf welchem Beet?" ───────────────────────────────────────────────────
  const meineBeete = React.useMemo(() => {
    if (!plant || !elements.length) return [];
    return findBeeteForPlant(elements, plant.slug);
  }, [plant, elements]);

  // ── CTA handler ───────────────────────────────────────────────────────────
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

  // Plant not found guard (T-10-08) — AFTER all hooks (CR-01 Fix: hook count stable across renders).
  // The useMemos above null-guard plant internally, so they run safely when plant === undefined.
  if (!loading && !plant) {
    return (
      <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
        <Stack.Screen options={{ headerTitle: slug ?? '' }} />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
          <InlineBanner variant="warning" message={t('kalender.nichtGefunden', { slug: slug ?? '' })} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
      <Stack.Screen options={{ headerTitle: plant?.nameDe ?? slug ?? '' }} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* PLZ/klimazone warning (non-blocking) */}
        {klimazone == null && (
          <InlineBanner
            variant="warning"
            message={t('kalender.plzFehlt')}
            actionLabel={t('kalender.plzJetztEingeben')}
            onAction={() => router.push('/(app)/profile/plz' as any)}
          />
        )}

        {/* SECTION 1: Gantt strip */}
        {plant ? (
          <View>
            <GanttStreifen plant={plant} klimazone={klimazoneNum} height={20} />
            {/* Month labels */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              {MONATE.map((m) => (
                <Text key={m} className="text-xs text-stone-400">{m}</Text>
              ))}
            </View>
            <View style={{ marginTop: 8 }}>
              <GanttLegende />
            </View>
          </View>
        ) : null}

        {/* SECTION 2: Phase-8 plant infos */}
        {plant ? (
          <View style={{ gap: 4 }}>
            <Text className="text-sm text-stone-700 dark:text-stone-200">
              {plant.minSpacingCm != null
                ? t('kalender.detail.mindestabstand', { cm: plant.minSpacingCm })
                : t('kalender.detail.mindestabstand', { cm: '–' })}
            </Text>
            <Text className="text-sm text-stone-700 dark:text-stone-200">
              {t('kalender.detail.sonnenbedarf', { value: plant.sunRequirement })}
            </Text>
            <Text className="text-sm text-stone-700 dark:text-stone-200">
              {t('kalender.detail.familie', { family: plant.family })}
            </Text>
            {/* CAL-06: Fruchtfolge warning */}
            {fruchtfolgeGrund ? (
              <FruchtfolgeWarnung grund={fruchtfolgeGrund} />
            ) : null}
          </View>
        ) : null}

        {/* SECTION 3: Auf welchem Beet? + CTA */}
        {plant ? (
          <View style={{ gap: 8 }}>
            <Text className="text-sm font-semibold text-stone-600 dark:text-stone-300">
              {t('kalender.aufWelchemBeet')}
            </Text>

            {/* Bed list */}
            {meineBeete.length > 0 ? (
              meineBeete.map((beet) => (
                <Text key={beet.id} className="text-sm text-stone-700 dark:text-stone-200">
                  • {beet.label ?? `Beet ${beet.id.slice(0, 6)}`}
                </Text>
              ))
            ) : (
              <Text className="text-sm text-stone-500 dark:text-stone-400">
                {t('kalender.nochNichtImPlan')}
              </Text>
            )}

            {/* Success banner */}
            {successMessage ? (
              <InlineBanner
                variant="success"
                message={successMessage}
                onDismiss={() => setSuccessMessage(null)}
              />
            ) : null}

            {/* Error banner */}
            {errorMessage ? (
              <InlineBanner variant="error" message={errorMessage} />
            ) : null}

            {/* CAL-04/05: CTA — only when a Beet exists in the plan */}
            {hasBeetImPlan ? (
              <Button
                variant="default"
                className="bg-[#4A7C59] mt-2"
                disabled={addLoading}
                onPress={handleAddToPlan}
                accessibilityLabel={`${plant.nameDe} zu Plan hinzufügen`}
                testID="detail-add-to-plan-button"
              >
                <Text className="text-white font-semibold">
                  {t('kalender.zuPlanHinzufuegen')}
                </Text>
              </Button>
            ) : (
              <InlineBanner
                variant="warning"
                message={t('kalender.keinBeetImPlan')}
              />
            )}

            {/* Secondary CTA: Plan öffnen */}
            <Button
              variant="outline"
              className="mt-2"
              onPress={() => router.push('/(app)/plan' as any)}
            >
              <Text className="font-semibold text-stone-700 dark:text-stone-200">
                {t('kalender.planOeffnen')}
              </Text>
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
