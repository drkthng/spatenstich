// Phase 38 (DESIGN3-08): privacy notes, Impressum and which version is running. The same
// content is reachable signed in (under "Mehr") and before signing up (from the start screen).
//
// The texts are in de.json (`legal.*`). Two things are decided when the app is built and not
// written into the repository: the operator's name and address (EXPO_PUBLIC_IMPRINT) and
// whether crash reports are sent and where to (EXPO_PUBLIC_SENTRY_DSN).

import * as React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import de from '@spatenstich/shared/i18n/de';
import { describeBuild, errorReporting, imprintLines, type BuildInfo } from '@/src/lib/buildInfo';
import { t } from '@/src/lib/i18n';

interface Section {
  title: string;
  body: string[];
}

export function currentBuild(): BuildInfo {
  return describeBuild({
    version: Constants.expoConfig?.version,
    sha: process.env.EXPO_PUBLIC_BUILD_SHA,
    date: process.env.EXPO_PUBLIC_BUILD_DATE,
  });
}

/** "Version 3.0.0, Build a1b2c3d vom 15.11.2026" with whatever of it is known. */
export function buildLine(info: BuildInfo): string {
  const version = info.version ? t('legal.version.version', { version: info.version }) : t('legal.version.unknown');
  if (!info.build) return `${version}, ${t('legal.version.localBuild')}`;
  return info.date
    ? `${version}, ${t('legal.version.buildDated', { build: info.build, date: info.date })}`
    : `${version}, ${t('legal.version.build', { build: info.build })}`;
}

function Page({ children, testID }: { children: React.ReactNode; testID: string }): React.JSX.Element {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pt-4 pb-12" testID={testID}>
      <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>{children}</View>
    </ScrollView>
  );
}

function SectionBlock({ section, testID }: { section: Section; testID?: string }): React.JSX.Element {
  return (
    <View className="mt-6" testID={testID}>
      <Text className="font-display text-xl text-ink" accessibilityRole="header">
        {section.title}
      </Text>
      {section.body.map((paragraph, i) => (
        <Text key={i} className="font-body text-base text-ink mt-2">
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

export function PrivacyContent({ dsn = process.env.EXPO_PUBLIC_SENTRY_DSN }: { dsn?: string | null }): React.JSX.Element {
  const p = de.legal.privacy;
  const reports = errorReporting(dsn);
  return (
    <Page testID="legal-privacy">
      <Text className="font-body text-base text-ink">{p.lead}</Text>
      <SectionBlock section={p.who} />
      <SectionBlock section={p.stored} />
      <SectionBlock section={p.device} />
      <SectionBlock section={p.photos} testID="legal-privacy-photos" />
      <SectionBlock section={p.tasks} />
      <SectionBlock section={p.weather} />
      <SectionBlock section={p.delivery} />
      <SectionBlock
        section={{ title: p.reports.title, body: [p.reports[reports]] }}
        testID={`legal-privacy-reports-${reports}`}
      />
      <SectionBlock section={p.claudeImport} />
      <SectionBlock section={p.rights} />
      <Text className="font-body text-sm text-ink-muted mt-6">{p.asOf}</Text>
    </Page>
  );
}

export function ImprintContent({
  imprint = process.env.EXPO_PUBLIC_IMPRINT,
  build = currentBuild(),
}: {
  imprint?: string | null;
  build?: BuildInfo;
}): React.JSX.Element {
  const lines = imprintLines(imprint);
  return (
    <Page testID="legal-imprint">
      <Text className="font-display text-xl text-ink" accessibilityRole="header">
        {t('legal.imprint.operatorTitle')}
      </Text>
      {lines.length > 0 ? (
        <View className="mt-2" testID="legal-imprint-operator">
          {lines.map((line, i) => (
            <Text key={i} className="font-body text-base text-ink" selectable>
              {line}
            </Text>
          ))}
        </View>
      ) : (
        <Text className="font-body text-base text-ink mt-2" testID="legal-imprint-private">
          {t('legal.imprint.private')}
        </Text>
      )}
      <Text className="font-body text-base text-ink mt-4">{t('legal.imprint.about')}</Text>
      <Text className="font-body text-base text-ink mt-2">{t('legal.imprint.liability')}</Text>

      <Text className="font-display text-xl text-ink mt-6" accessibilityRole="header">
        {t('legal.version.title')}
      </Text>
      <Text className="font-body text-base text-ink mt-2" testID="legal-version" selectable>
        {buildLine(build)}
      </Text>
    </Page>
  );
}
