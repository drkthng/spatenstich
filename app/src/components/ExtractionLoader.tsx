// ExtractionLoader — full-screen overlay shown while the Edge Function extracts
// Vereinsregeln from an uploaded PDF.
// Plan 02-04 Task 2-04-02 + UI-SPEC lines 155-160 (loading) / 158-160 (error).
//
// States:
//   'loading' → heading + sub + indeterminate progress (animate-pulse) + Abbrechen
//   'error'   → alert icon + error_timeout heading + Erneut versuchen + Abbrechen
//
// Note on animation: Reanimated indeterminate bar would require useSharedValue +
// withRepeat. For MVP simplicity + SSR-safety on web, we use a tailwind
// `animate-pulse` class on the bar — it plays as CSS keyframes on web and as a
// compiled RN animation on native via NativeWind 4.x. This is a conscious
// simplification over a Reanimated translateX bar; the visual intent (progress
// feedback) is satisfied.
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Loader2, AlertCircle } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export type ExtractionLoaderState = 'loading' | 'error';

export interface ExtractionLoaderProps {
  state: ExtractionLoaderState;
  onCancel: () => void;
  onRetry?: () => void;
  testID?: string;
}

export function ExtractionLoader({
  state,
  onCancel,
  onRetry,
  testID,
}: ExtractionLoaderProps): React.JSX.Element {
  return (
    <View
      accessibilityLabel="Extrahiere Vereinsregeln"
      accessibilityLiveRegion="polite"
      testID={testID}
      className="absolute inset-0 bg-white/95 dark:bg-stone-900/95 items-center justify-center px-8"
    >
      <View className="w-full max-w-md items-center">
        {state === 'loading' ? (
          <>
            <Loader2 size={48} color="#4A7C59" />
            <Text className="text-xl font-semibold text-stone-900 dark:text-stone-100 mt-4 text-center">
              {t('rules.upload.loading_title')}
            </Text>
            <Text className="text-sm text-stone-600 dark:text-stone-300 mt-2 text-center">
              {t('rules.upload.loading_sub')}
            </Text>
            <View className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full mt-6 overflow-hidden">
              <View className="h-full w-1/2 bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-full animate-pulse" />
            </View>
          </>
        ) : (
          <>
            <AlertCircle size={48} color="#DC2626" />
            <Text className="text-xl font-semibold text-stone-900 dark:text-stone-100 mt-4 text-center">
              {t('rules.upload.error_timeout')}
            </Text>
          </>
        )}

        <View className="w-full mt-8 gap-3">
          {state === 'error' && onRetry ? (
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel={t('rules.upload.retry')}
              className="min-h-[44px] rounded-lg bg-[#4A7C59] dark:bg-[#6BAA7E] items-center justify-center px-6 active:opacity-80"
            >
              <Text className="text-white font-semibold">
                {t('rules.upload.retry')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            className="min-h-[44px] rounded-lg border border-stone-300 dark:border-stone-700 items-center justify-center px-6 active:opacity-80"
          >
            <Text className="text-stone-900 dark:text-stone-100 font-semibold">
              {t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
