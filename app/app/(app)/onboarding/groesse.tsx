// First step after signing up (Phase 37, NAV3-02): how big is the garden. With a size
// the plan exists and the person is not led here again.

import * as React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { saveDimensions } from '@/src/lib/gardenPlanRepo';
import { bumpDataVersion } from '@/src/lib/sync/dataVersion';
import { parseMetres } from '@/src/lib/nav/startRoute';
import { OnboardingStep, onboardingInputClass } from '@/src/components/onboarding/OnboardingStep';
import { t } from '@/src/lib/i18n';

export default function OnboardingSizeScreen(): React.JSX.Element {
  const router = useRouter();
  const gardenId = useAuthStore((s) => s.activeGardenId);
  const [width, setWidth] = React.useState('');
  const [length, setLength] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const next = async (): Promise<void> => {
    if (saving || !gardenId) return;
    const widthM = parseMetres(width);
    const heightM = parseMetres(length);
    if (widthM === null || heightM === null) {
      setError(t('onboarding.size.invalid'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveDimensions('account', gardenId, { shape: 'rectangle', widthM, heightM, extraDims: null });
      bumpDataVersion('garden_dimensions');
      router.replace('/(app)/onboarding/plz' as never);
    } catch {
      setError(t('onboarding.failed'));
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      step={1}
      title={t('onboarding.size.title')}
      intro={t('onboarding.size.intro')}
      onNext={() => void next()}
      nextDisabled={saving || !gardenId}
      error={error}
      testID="onboarding-size"
    >
      <View>
        <Text className="font-body text-sm text-ink mb-1">{t('onboarding.size.width')}</Text>
        <TextInput
          value={width}
          onChangeText={setWidth}
          inputMode="decimal"
          accessibilityLabel={t('onboarding.size.width')}
          className={onboardingInputClass}
          testID="onboarding-size-width"
        />
      </View>
      <View>
        <Text className="font-body text-sm text-ink mb-1">{t('onboarding.size.length')}</Text>
        <TextInput
          value={length}
          onChangeText={setLength}
          inputMode="decimal"
          accessibilityLabel={t('onboarding.size.length')}
          className={onboardingInputClass}
          testID="onboarding-size-length"
        />
      </View>
    </OnboardingStep>
  );
}
