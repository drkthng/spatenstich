// Second step (Phase 37, NAV3-02): where the garden is. The postcode sets the climate
// zone for the calendar and is what the weather forecast is fetched for. Can be skipped.

import * as React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { lookupKlimazone } from '@spatenstich/shared';
import { useProfile } from '@/src/hooks/useProfile';
import { OnboardingStep, onboardingInputClass } from '@/src/components/onboarding/OnboardingStep';
import { t } from '@/src/lib/i18n';

export default function OnboardingPlzScreen(): React.JSX.Element {
  const router = useRouter();
  const { plz: stored, setPlz } = useProfile();
  const [plz, setPlzText] = React.useState(stored ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const onward = (): void => router.replace('/(app)/onboarding/partner' as never);

  const next = async (): Promise<void> => {
    if (saving) return;
    if (!/^\d{5}$/.test(plz)) {
      setError(t('onboarding.plz.invalid'));
      return;
    }
    const zone = lookupKlimazone(plz);
    if (!zone) {
      setError(t('onboarding.plz.unknown'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setPlz(plz, zone);
      onward();
    } catch {
      setError(t('onboarding.failed'));
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      step={2}
      title={t('onboarding.plz.title')}
      intro={t('onboarding.plz.intro')}
      onNext={() => void next()}
      nextDisabled={saving}
      onSkip={onward}
      error={error}
      testID="onboarding-plz"
    >
      <View>
        <Text className="font-body text-sm text-ink mb-1">{t('onboarding.plz.label')}</Text>
        <TextInput
          value={plz}
          onChangeText={(text) => setPlzText(text.replace(/[^0-9]/g, '').slice(0, 5))}
          inputMode="numeric"
          maxLength={5}
          accessibilityLabel={t('onboarding.plz.label')}
          className={onboardingInputClass}
          testID="onboarding-plz-input"
        />
      </View>
    </OnboardingStep>
  );
}
