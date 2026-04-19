// Profil-Übersicht — mode-agnostic summary with InlineBanners for missing data.
// Pattern: 02-UI-SPEC.md §"Profil-Übersicht". BKleingG status is D-10 placeholder (neutral state).
import * as React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { ARCHETYPES, type Archetype } from '@spatenstich/shared';
import { InlineBanner } from '@/src/components/InlineBanner';
import { TrafficLightBadge } from '@/src/components/TrafficLightBadge';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { useProfile } from '@/src/hooks/useProfile';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

const ARCHETYPE_LABELS: Record<Archetype, string> = {
  [ARCHETYPES.SELBSTVERSORGER]: 'Selbstversorger',
  [ARCHETYPES.FAMILIE]: 'Familien-Naschgarten',
  [ARCHETYPES.MIX]: 'Mix ausgewogen',
  [ARCHETYPES.ZIER]: 'Zier- & Erholungsgarten',
  [ARCHETYPES.BIODIVERSITAET]: 'Biodiversitäts- / Naturgarten',
  [ARCHETYPES.KRAEUTER]: 'Kräuter- / Apothekergarten',
};

export default function ProfileOverviewScreen(): React.JSX.Element {
  const router = useRouter();
  const { plz, klimazone, archetype, vereinsregeln } = useProfile();

  return (
    <ScrollView
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="p-4 gap-6"
    >
      {/* Section 1 — Standort */}
      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase text-stone-500">Standort</Text>
        {plz === null ? (
          <InlineBanner
            message={t('profile.banner.plz_missing')}
            actionLabel={t('profile.banner.plz_action')}
            onAction={() => router.push('/(app)/profile/plz')}
            testID="profile-banner-plz"
          />
        ) : (
          <Card>
            <CardContent className="p-4 pt-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Text className="text-base text-stone-900 dark:text-stone-100">
                  PLZ {plz}
                </Text>
                {klimazone !== null ? (
                  <Badge variant="secondary">Klimazone {klimazone}</Badge>
                ) : null}
              </View>
              <Text
                accessibilityRole="link"
                onPress={() => router.push('/(app)/profile/plz')}
                className="text-sm text-[#4A7C59] dark:text-[#6BAA7E] min-h-[44px] py-3"
              >
                Ändern
              </Text>
            </CardContent>
          </Card>
        )}
      </View>

      <Separator />

      {/* Section 2 — Garten-Archetyp */}
      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase text-stone-500">Garten-Archetyp</Text>
        {archetype === null ? (
          <InlineBanner
            message={t('profile.banner.archetype_missing')}
            actionLabel="Jetzt auswählen"
            onAction={() => router.push('/(app)/profile/archetype')}
            testID="profile-banner-archetype"
          />
        ) : (
          <Card>
            <CardContent className="p-4 pt-4 flex-row items-center justify-between">
              <Text className="text-base text-stone-900 dark:text-stone-100">
                {ARCHETYPE_LABELS[archetype]}
              </Text>
              <Text
                accessibilityRole="link"
                onPress={() => router.push('/(app)/profile/archetype')}
                className="text-sm text-[#4A7C59] dark:text-[#6BAA7E] min-h-[44px] py-3"
              >
                Ändern
              </Text>
            </CardContent>
          </Card>
        )}
      </View>

      <Separator />

      {/* Section 3 — Vereinsregeln (Route gehört zu Plan 02-04) */}
      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase text-stone-500">Vereinsregeln</Text>
        {vereinsregeln.length === 0 ? (
          <InlineBanner
            message={t('profile.banner.rules_missing')}
            actionLabel="Regeln einrichten"
            onAction={() => router.push('/(app)/profile/vereinsregeln' as any)}
            testID="profile-banner-rules"
          />
        ) : (
          <Card>
            <CardContent className="p-4 pt-4 flex-row items-center justify-between">
              <Text className="text-base text-stone-900 dark:text-stone-100">
                {vereinsregeln.length} Regel{vereinsregeln.length === 1 ? '' : 'n'} hinterlegt
              </Text>
              <Text
                accessibilityRole="link"
                onPress={() => router.push('/(app)/profile/vereinsregeln' as any)}
                className="text-sm text-[#4A7C59] dark:text-[#6BAA7E] min-h-[44px] py-3"
              >
                Bearbeiten
              </Text>
            </CardContent>
          </Card>
        )}
      </View>

      <Separator />

      {/* Section 4 — BKleingG-Status (D-10, Phase-2 placeholder — always neutral) */}
      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase text-stone-500">BKleingG-Status</Text>
        <TrafficLightBadge
          state="neutral"
          label={t('profile.bkleingg.no_plan')}
          onPress={() => Alert.alert('', t('profile.bkleingg.tooltip'))}
          testID="profile-bkleingg-badge"
        />
      </View>
    </ScrollView>
  );
}
