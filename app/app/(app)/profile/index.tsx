// Profil-Übersicht — mode-agnostic summary with InlineBanners for missing data.
// Pattern: 02-UI-SPEC.md §"Profil-Übersicht". BKleingG status is D-10 placeholder (neutral state).
import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { FEATURES } from '@spatenstich/shared';
import { InlineBanner } from '@/src/components/InlineBanner';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { useProfile } from '@/src/hooks/useProfile';
import { t as tx } from '@/src/lib/i18n';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;


export default function ProfileOverviewScreen(): React.JSX.Element {
  const router = useRouter();
  const { plz, klimazone, archetype, vereinsregeln } = useProfile();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="p-4 gap-6"
    >
      {/* Section 1 — Standort */}
      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase text-ink-muted">{tx('profile.section.location')}</Text>
        {plz === null ? (
          <InlineBanner
            message={t('profile.banner.plz_missing')}
            actionLabel={t('profile.banner.plz_action')}
            onAction={() => router.push('/(app)/profile/plz')}
            testID="profile-banner-plz"
          />
        ) : (
          <Card>
            <CardContent className="p-4 pt-4 flex-row flex-wrap items-center justify-between gap-x-3">
              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="text-base text-ink">{tx('profile.plzValue', { plz })}</Text>
                {klimazone !== null ? (
                  <Badge variant="secondary">{tx('profile.klimazone', { zone: klimazone })}</Badge>
                ) : null}
              </View>
              <Text
                accessibilityRole="link"
                onPress={() => router.push('/(app)/profile/plz')}
                className="text-base text-primary underline min-h-[48px] min-w-[48px] py-3"
              >
                {tx('profile.change')}
              </Text>
            </CardContent>
          </Card>
        )}
      </View>

      <Separator />

      {/* Section 2 — Garten-Archetyp */}
      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase text-ink-muted">{tx('profile.section.type')}</Text>
        {archetype === null ? (
          <InlineBanner
            message={t('profile.banner.archetype_missing')}
            actionLabel={tx('profile.typeChoose')}
            onAction={() => router.push('/(app)/profile/archetype')}
            testID="profile-banner-archetype"
          />
        ) : (
          <Card>
            <CardContent className="p-4 pt-4 flex-row flex-wrap items-center justify-between gap-x-3">
              <Text className="text-base text-ink">
                {tx(`profile.archetypes.${archetype}.label`)}
              </Text>
              <Text
                accessibilityRole="link"
                onPress={() => router.push('/(app)/profile/archetype')}
                className="text-base text-primary underline min-h-[48px] min-w-[48px] py-3"
              >
                {tx('profile.change')}
              </Text>
            </CardContent>
          </Card>
        )}
      </View>

      {FEATURES.vereinsregeln ? (
        <>
          <Separator />

          {/* Section 3 — Vereinsregeln (hinter FEATURES.vereinsregeln, D-05) */}
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase text-ink-muted">{tx('profile.section.rules')}</Text>
            {vereinsregeln.length === 0 ? (
              <InlineBanner
                message={t('profile.banner.rules_missing')}
                actionLabel={tx('profile.rulesSetUp')}
                onAction={() => router.push('/(app)/profile/vereinsregeln' as any)}
                testID="profile-banner-rules"
              />
            ) : (
              <Card>
                <CardContent className="p-4 pt-4 flex-row flex-wrap items-center justify-between gap-x-3">
                  <Text className="text-base text-ink">
                    {vereinsregeln.length === 1
                      ? tx('profile.rulesCountOne')
                      : tx('profile.rulesCountMany', { n: vereinsregeln.length })}
                  </Text>
                  <Text
                    accessibilityRole="link"
                    onPress={() => router.push('/(app)/profile/vereinsregeln' as any)}
                    className="text-base text-primary underline min-h-[48px] min-w-[48px] py-3"
                  >
                    {tx('profile.rulesEdit')}
                  </Text>
                </CardContent>
              </Card>
            )}
          </View>
        </>
      ) : null}

    </ScrollView>
  );
}
