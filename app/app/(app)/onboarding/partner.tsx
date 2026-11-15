// Third step (Phase 37, NAV3-02): invite the second person. The code is what they type
// when they sign up. Can be skipped; the code is also under "Mehr" → "Mein Garten".

import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '@/src/stores/authStore';
import { createInviteForGarden } from '@/src/lib/inviteCodeRepo';
import { OnboardingStep } from '@/src/components/onboarding/OnboardingStep';
import { t } from '@/src/lib/i18n';

export default function OnboardingPartnerScreen(): React.JSX.Element {
  const router = useRouter();
  const gardenId = useAuthStore((s) => s.activeGardenId);
  const [code, setCode] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const finish = (): void => router.replace('/(app)' as never);

  const create = async (): Promise<void> => {
    if (creating || !gardenId) return;
    setCreating(true);
    setError(null);
    try {
      setCode(await createInviteForGarden('account', gardenId));
    } catch (e) {
      const problem = (e as { code?: string } | null)?.code;
      setError(
        problem === '42501'
          ? t('onboarding.partner.notOwner')
          : problem === 'P9006'
            ? t('onboarding.partner.full')
            : t('onboarding.failed'),
      );
    }
    setCreating(false);
  };

  const copy = async (): Promise<void> => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
    } catch {
      setError(t('garden.invite.copy_failed'));
    }
  };

  return (
    <OnboardingStep
      step={3}
      title={t('onboarding.partner.title')}
      intro={t('onboarding.partner.intro')}
      nextLabel={t('onboarding.done')}
      onNext={finish}
      onSkip={code ? undefined : finish}
      error={error}
      testID="onboarding-partner"
    >
      {code ? (
        <View className="p-4 border border-line bg-surface-2" testID="onboarding-code">
          <Text className="font-body text-xs uppercase text-ink-muted">{t('onboarding.partner.codeTitle')}</Text>
          <Text className="font-display text-4xl text-ink tracking-widest mt-1" testID="onboarding-code-value" selectable>
            {code}
          </Text>
          <Text className="font-body text-sm text-ink-muted mt-2">{t('onboarding.partner.codeHint')}</Text>
          <Pressable
            onPress={() => void copy()}
            accessibilityRole="button"
            className="self-start mt-3 min-h-[48px] px-4 items-center justify-center border border-line"
            testID="onboarding-code-copy"
          >
            <Text className="font-body text-base text-ink">
              {copied ? t('onboarding.partner.copied') : t('onboarding.partner.copy')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => void create()}
          disabled={creating || !gardenId}
          accessibilityRole="button"
          className={`self-start min-h-[48px] px-5 items-center justify-center border border-line ${creating ? 'opacity-50' : ''}`}
          testID="onboarding-code-create"
        >
          <Text className="font-body text-base text-ink">{t('onboarding.partner.create')}</Text>
        </Pressable>
      )}
    </OnboardingStep>
  );
}
