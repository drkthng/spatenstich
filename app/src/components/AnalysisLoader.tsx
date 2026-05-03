// AnalysisLoader — full-screen overlay for Claude Vision analysis loading/error states.
// Phase 4 Plan 04 — reuses ExtractionLoader visual structure with garden-specific copy.
// States:
//   'loading' → spinner + heading + sub + indeterminate progress bar + cancel
//   'error'   → alert icon + error heading + retry + cancel
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Loader2, AlertCircle } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export type AnalysisLoaderState = 'loading' | 'error';

export interface AnalysisLoaderProps {
  state: AnalysisLoaderState;
  onCancel: () => void;
  onRetry: () => void;
  testID?: string;
}

export function AnalysisLoader({
  state,
  onCancel,
  onRetry,
  testID,
}: AnalysisLoaderProps): React.JSX.Element {
  return (
    <View
      accessibilityLabel="Garten wird analysiert"
      accessibilityLiveRegion="polite"
      testID={testID}
      className="absolute inset-0 bg-white/95 dark:bg-stone-900/95 items-center justify-center px-8"
    >
      <View className="w-full max-w-md items-center">
        {state === 'loading' ? (
          <>
            <Loader2 size={48} color="#4A7C59" className="animate-spin" />
            <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100 mt-4 text-center">
              {t('capture.analysis.loading_title')}
            </Text>
            <Text className="text-sm text-stone-500 dark:text-stone-300 mt-2 text-center">
              {t('capture.analysis.loading_sub')}
            </Text>
            {/* Indeterminate progress bar */}
            <View className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full mt-6 overflow-hidden">
              <View className="h-full w-1/2 bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-full animate-pulse" />
            </View>
          </>
        ) : (
          <>
            <AlertCircle size={48} color="#DC2626" />
            <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100 mt-4 text-center">
              {t('capture.analysis.error')}
            </Text>
          </>
        )}

        <View className="w-full mt-8 gap-3">
          {state === 'error' ? (
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel={t('capture.analysis.retry')}
              className="min-h-[44px] rounded-lg bg-[#4A7C59] dark:bg-[#6BAA7E] items-center justify-center px-6 active:opacity-80"
            >
              <Text className="text-white font-semibold">
                {t('capture.analysis.retry')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t('capture.analysis.cancel')}
            className="min-h-[44px] rounded-lg border border-stone-300 dark:border-stone-700 items-center justify-center px-6 active:opacity-80"
          >
            <Text className="text-stone-900 dark:text-stone-100 font-semibold">
              {t('capture.analysis.cancel')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
