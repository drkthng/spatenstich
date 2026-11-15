// AI and usage (Phase 34): what the month's AI budget looks like, the limit (owner),
// a connection test, and the usage book. Both members see the same numbers (AI-04).
// Lives in the settings until the tabs arrive in Phase 37.

import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import type { AiCode, AiUsageEntry, ProfileRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { storage } from '@/src/storage';
import { callAi } from '@/src/lib/ai/aiClient';
import { loadAiUsage, loadUsageBook, setAiMonthlyLimit, type UsageView } from '@/src/lib/ai/usage';
import {
  aiMessage,
  budgetLine,
  formatDay,
  formatMoment,
  formatUsd,
  parseLimit,
  requestsLine,
  usedShare,
} from '@/src/lib/ai/aiMessages';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

type TestState =
  | { phase: 'idle' }
  | { phase: 'running' }
  | { phase: 'answer'; text: string; costUsd: number }
  | { phase: 'failed'; code: AiCode; retryable: boolean };

const TONE_CLASS = { normal: 'text-ink-muted', warn: 'text-warn', blocked: 'text-danger' } as const;

function SectionTitle({ children }: { children: string }): React.JSX.Element {
  return <Text className="font-display text-lg text-ink mt-8 mb-2">{children}</Text>;
}

export default function AiSettingsScreen(): React.JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const gardenId = useAuthStore((s) => s.activeGardenId);

  const [view, setView] = React.useState<UsageView | null>(null);
  const [book, setBook] = React.useState<AiUsageEntry[]>([]);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [limitText, setLimitText] = React.useState('');
  const [limitNote, setLimitNote] = React.useState<{ text: string; tone: 'normal' | 'warn' } | null>(null);
  const [savingLimit, setSavingLimit] = React.useState(false);
  const [test, setTest] = React.useState<TestState>({ phase: 'idle' });

  const refresh = React.useCallback(async () => {
    if (mode !== 'account' || !gardenId) {
      setLoading(false);
      return;
    }
    const [usage, entries] = await Promise.all([loadAiUsage(gardenId), loadUsageBook(gardenId)]);
    setView(usage);
    setBook(entries);
    if (usage) setLimitText(String(usage.summary.limitUsd).replace('.', ','));
    const found: Record<string, string> = {};
    for (const userId of new Set(entries.map((e) => e.userId))) {
      try {
        const profile = await storage.getRow<ProfileRow>('profiles', userId);
        if (profile?.displayName) found[userId] = profile.displayName;
      } catch {
        // The entry shows a neutral word instead of a name.
      }
    }
    setNames(found);
    setLoading(false);
  }, [mode, gardenId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const runTest = async (): Promise<void> => {
    setTest({ phase: 'running' });
    const result = await callAi('test');
    setTest(
      result.ok
        ? { phase: 'answer', text: result.text, costUsd: result.costUsd }
        : { phase: 'failed', code: result.code, retryable: result.retryable },
    );
    void refresh();
  };

  const saveLimit = async (): Promise<void> => {
    if (!gardenId) return;
    const value = parseLimit(limitText);
    if (value === null) {
      setLimitNote({ text: t('ai.limit.invalid'), tone: 'warn' });
      return;
    }
    setSavingLimit(true);
    const result = await setAiMonthlyLimit(gardenId, value);
    setSavingLimit(false);
    if (result.ok) {
      setView(result.view);
      setLimitNote({ text: t('ai.limit.saved'), tone: 'normal' });
    } else {
      setLimitNote({
        text:
          result.error === 'not_owner'
            ? t('ai.limit.ownerOnly')
            : result.error === 'out_of_range'
              ? t('ai.limit.invalid')
              : t('ai.limit.failed'),
        tone: 'warn',
      });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Stack.Screen options={{ title: t('ai.title') }} />
        <ActivityIndicator testID="ai-loading" />
      </View>
    );
  }

  const summary = view?.summary ?? null;
  const line = summary ? budgetLine(summary) : null;
  const share = summary ? usedShare(summary) : 0;
  const barColor = summary?.blocked ? tokens.color.danger : summary?.warn ? tokens.color.warn : tokens.color.primary;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pt-4 pb-12" testID="ai-screen">
      <Stack.Screen options={{ title: t('ai.title') }} />
      <Text className="font-body text-sm text-ink-muted">{t('ai.intro')}</Text>

      {/* The month */}
      <SectionTitle>{t('ai.usage.title')}</SectionTitle>
      {summary && line ? (
        <View testID="ai-usage">
          <Text className="font-display text-2xl text-ink" testID="ai-usage-spent">
            {t('ai.usage.spent', { spent: formatUsd(summary.spentUsd), limit: formatUsd(summary.limitUsd) })}
          </Text>
          <View
            className="h-3 mt-3 border border-line bg-surface-2"
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(share * 100) }}
            testID="ai-usage-bar"
          >
            <View style={{ width: `${Math.round(share * 100)}%`, height: '100%', backgroundColor: barColor }} />
          </View>
          <Text className={`font-body text-sm mt-3 ${TONE_CLASS[line.tone]}`} testID={`ai-usage-line-${line.tone}`}>
            {line.text}
          </Text>
          <Text className="font-body text-sm text-ink-muted mt-1">{requestsLine(summary.requests)}</Text>
          <Text className="font-body text-xs text-ink-muted mt-1">
            {t('ai.usage.hourly', { n: summary.hourlyLimit, used: summary.myRequestsLastHour })}
          </Text>
          {view?.stale ? (
            <Text className="font-body text-xs text-warn mt-2" testID="ai-usage-stale">
              {t('ai.usage.stale', { date: formatMoment(view.fetchedAt) })}
            </Text>
          ) : null}
        </View>
      ) : (
        <View testID="ai-usage-unknown">
          <Text className="font-body text-sm text-ink-muted">{t('ai.usage.unknown')}</Text>
          <Pressable onPress={() => void refresh()} className="self-start mt-3 px-3 py-2 border border-line">
            <Text className="font-body text-sm text-ink">{t('ai.usage.reload')}</Text>
          </Pressable>
        </View>
      )}

      {/* The limit */}
      <SectionTitle>{t('ai.limit.title')}</SectionTitle>
      {summary?.isOwner ? (
        <View testID="ai-limit-owner">
          <Text className="font-body text-sm text-ink mb-2">{t('ai.limit.label')}</Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={limitText}
              onChangeText={(text) => {
                setLimitText(text);
                setLimitNote(null);
              }}
              inputMode="decimal"
              accessibilityLabel={t('ai.limit.label')}
              placeholderTextColor={tokens.color.inkMuted}
              className="min-h-[48px] w-28 px-3 py-2 border border-line bg-bg font-body text-base text-ink"
              testID="ai-limit-input"
            />
            <Pressable
              onPress={() => void saveLimit()}
              disabled={savingLimit}
              className="min-h-[48px] px-4 items-center justify-center bg-primary"
              testID="ai-limit-save"
            >
              <Text className="font-body text-sm text-on-primary">
                {savingLimit ? t('ai.limit.saving') : t('ai.limit.save')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text className="font-body text-sm text-ink-muted" testID="ai-limit-member">
          {t('ai.limit.ownerOnly')}
        </Text>
      )}
      {limitNote ? (
        <Text
          className={`font-body text-sm mt-2 ${limitNote.tone === 'warn' ? 'text-warn' : 'text-ink'}`}
          testID="ai-limit-note"
        >
          {limitNote.text}
        </Text>
      ) : null}
      <Text className="font-body text-xs text-ink-muted mt-2">{t('ai.limit.hint')}</Text>

      {/* The test */}
      <SectionTitle>{t('ai.test.title')}</SectionTitle>
      <Text className="font-body text-sm text-ink-muted">{t('ai.test.body')}</Text>
      {test.phase === 'answer' ? (
        <View className="mt-3 p-3 border border-line bg-ok-soft" testID="ai-test-answer">
          <Text className="font-body text-xs uppercase text-ink-muted">{t('ai.test.answer')}</Text>
          <Text className="font-body text-base text-ink mt-1">{test.text}</Text>
          <Text className="font-body text-xs text-ink-muted mt-2">
            {t('ai.test.cost', { cost: formatUsd(test.costUsd) })}
          </Text>
        </View>
      ) : null}
      {test.phase === 'failed' ? (
        <View className="mt-3 p-3 border border-line bg-warn-soft" testID="ai-test-error">
          <Text className="font-body text-sm text-ink" testID={`ai-test-error-${test.code}`}>
            {aiMessage(test.code)}
          </Text>
        </View>
      ) : null}
      {test.phase === 'failed' && !test.retryable ? null : (
        <Pressable
          onPress={() => void runTest()}
          disabled={test.phase === 'running'}
          className="self-start mt-3 min-h-[48px] px-4 items-center justify-center bg-primary"
          testID="ai-test-button"
        >
          <Text className="font-body text-sm text-on-primary">
            {test.phase === 'running'
              ? t('ai.test.running')
              : test.phase === 'failed'
                ? t('ai.test.retry')
                : t('ai.test.button')}
          </Text>
        </Pressable>
      )}

      {/* The usage book */}
      <SectionTitle>{t('ai.book.title')}</SectionTitle>
      {book.length === 0 ? (
        <Text className="font-body text-sm text-ink-muted" testID="ai-book-empty">
          {t('ai.book.empty')}
        </Text>
      ) : (
        <View testID="ai-book">
          {book.map((entry) => {
            const featureKey = `ai.feature.${entry.feature}`;
            const feature = t(featureKey) === featureKey ? entry.feature : t(featureKey);
            const who = names[entry.userId] ?? t('ai.book.someone');
            const flag = entry.status === 'ok' ? '' : ` · ${t(`ai.book.${entry.status}`)}`;
            return (
              <View key={entry.id} className="py-3 border-b border-line" testID={`ai-book-row-${entry.id}`}>
                <View className="flex-row justify-between gap-3">
                  <Text className="font-body text-sm text-ink flex-1">
                    {who} · {feature}
                    {flag}
                  </Text>
                  <Text className="font-body text-sm text-ink">{formatUsd(entry.costUsd)}</Text>
                </View>
                <Text className="font-body text-xs text-ink-muted mt-1">
                  {formatMoment(entry.createdAt)} · {t('ai.book.tokens', { in: entry.inputTokens, out: entry.outputTokens })}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      {summary ? (
        <Text className="font-body text-xs text-ink-muted mt-4">
          {formatDay(summary.monthStart)} – {formatDay(summary.nextMonthStart)}
        </Text>
      ) : null}
    </ScrollView>
  );
}
