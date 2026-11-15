// "Mehr" (Phase 37, NAV3-06, NAV3-07): garden, tools and account in one list. Everything
// here is one tap from the tab; what lies behind an entry is two.

import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { countOpenFindings } from '@/src/lib/photo/openFindings';
import { useDataVersion } from '@/src/lib/sync/dataVersion';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

interface Entry {
  key: string;
  title: string;
  hint: string;
  href: string;
  /** Only with a garden in an account. */
  accountOnly?: boolean;
}

export default function MoreScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const gardenId = useAuthStore((s) => s.activeGardenId);
  const findingsVersion = useDataVersion('photo_findings');
  const [open, setOpen] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    if (mode !== 'account' || !gardenId) {
      setOpen(0);
      return;
    }
    countOpenFindings(gardenId)
      .then((n) => {
        if (alive) setOpen(n);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [mode, gardenId, findingsVersion]);

  const findingsHint =
    open === 0 ? t('more.findings.hintNone') : open === 1 ? t('more.findings.hintOne') : t('more.findings.hintMany', { n: open });

  const sections: { title: string; entries: Entry[] }[] = [
    {
      title: t('more.section.garden'),
      entries: [
        { key: 'garden', title: t('more.garden.title'), hint: t('more.garden.hint'), href: '/(app)/settings/garden', accountOnly: true },
        { key: 'profile', title: t('more.profile.title'), hint: t('more.profile.hint'), href: '/(app)/profile' },
        { key: 'join', title: t('more.join.title'), hint: t('more.join.hint'), href: '/(app)/join-garden', accountOnly: true },
      ],
    },
    {
      title: t('more.section.tools'),
      entries: [
        { key: 'photo', title: t('more.photo.title'), hint: t('more.photo.hint'), href: '/(app)/foto', accountOnly: true },
        { key: 'findings', title: t('more.findings.title'), hint: findingsHint, href: '/(app)/foto/befunde', accountOnly: true },
        { key: 'import', title: t('more.import.title'), hint: t('more.import.hint'), href: '/(app)/import', accountOnly: true },
        { key: 'ai', title: t('more.ai.title'), hint: t('more.ai.hint'), href: '/(app)/settings/ai', accountOnly: true },
      ],
    },
    {
      title: t('more.section.account'),
      entries: [
        { key: 'sync', title: t('more.sync.title'), hint: t('more.sync.hint'), href: '/(app)/settings/sync', accountOnly: true },
        { key: 'account', title: t('more.account.title'), hint: t('more.account.hint'), href: '/(app)/settings' },
      ],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pt-4 pb-12" testID="more-screen">
      <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Text className="font-body text-sm text-ink-muted">{t('more.intro')}</Text>
        {sections.map((section) => {
          const entries = section.entries.filter((entry) => !entry.accountOnly || mode === 'account');
          if (entries.length === 0) return null;
          return (
            <View key={section.title} className="mt-6">
              <Text className="font-body text-xs uppercase text-ink-muted mb-1">{section.title}</Text>
              {entries.map((entry) => (
                <Pressable
                  key={entry.key}
                  onPress={() => router.push(entry.href as never)}
                  accessibilityRole="link"
                  accessibilityLabel={`${entry.title}. ${entry.hint}`}
                  className="flex-row items-center gap-3 py-3 border-b border-line"
                  style={{ minHeight: 56 }}
                  testID={`more-${entry.key}`}
                >
                  <View className="flex-1">
                    <Text className="font-body text-base text-ink">{entry.title}</Text>
                    <Text className="font-body text-sm text-ink-muted" testID={`more-${entry.key}-hint`}>
                      {entry.hint}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={tokens.color.inkMuted} />
                </Pressable>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
