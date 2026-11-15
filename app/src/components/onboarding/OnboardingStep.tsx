// Phase 37 (NAV3-02): the frame of one of the three first steps. The buttons are part
// of the page flow, so the on-screen keyboard never covers them (NAV3-05).

import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { t } from '@/src/lib/i18n';

export interface OnboardingStepProps {
  step: 1 | 2 | 3;
  title: string;
  intro: string;
  children: React.ReactNode;
  nextLabel?: string;
  onNext: () => void;
  nextDisabled?: boolean;
  /** Steps 2 and 3 can be skipped. */
  onSkip?: () => void;
  error?: string | null;
  testID: string;
}

export function OnboardingStep(props: OnboardingStepProps): React.JSX.Element {
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="flex-grow px-6 pt-10 pb-10"
      keyboardShouldPersistTaps="handled"
      testID={props.testID}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Text className="font-body text-xs uppercase text-ink-muted" testID="onboarding-step">
          {t('onboarding.step', { n: props.step })}
        </Text>
        <Text className="font-display text-3xl text-ink mt-2">{props.title}</Text>
        <Text className="font-body text-base text-ink-muted mt-2">{props.intro}</Text>
        <View className="mt-6 gap-4">{props.children}</View>
        {props.error ? (
          <Text className="font-body text-sm text-danger mt-4" accessibilityLiveRegion="polite" testID="onboarding-error">
            {props.error}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap gap-3 mt-8">
          <Pressable
            onPress={props.onNext}
            disabled={props.nextDisabled}
            accessibilityRole="button"
            className={`min-h-[52px] px-6 items-center justify-center bg-primary ${props.nextDisabled ? 'opacity-50' : ''}`}
            testID="onboarding-next"
          >
            <Text className="font-body text-base text-on-primary">{props.nextLabel ?? t('onboarding.next')}</Text>
          </Pressable>
          {props.onSkip ? (
            <Pressable
              onPress={props.onSkip}
              accessibilityRole="button"
              className="min-h-[52px] px-6 items-center justify-center border border-line"
              testID="onboarding-skip"
            >
              <Text className="font-body text-base text-ink">{t('onboarding.skip')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

export const onboardingInputClass = 'min-h-[48px] px-3 py-2 border border-line bg-bg font-body text-lg text-ink';
