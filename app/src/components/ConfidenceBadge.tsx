// ConfidenceBadge — small badge showing confidence level for detected plan elements.
// Phase 4 Plan 04 — UI-SPEC §"Element Confirmation" / Component Contract.
// Two variants:
//   high/medium → "sicher" badge (green)
//   low → "unsicher" badge (outline/stone)
import * as React from 'react';
import { View, Text } from 'react-native';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export interface ConfidenceBadgeProps {
  confidence: 'high' | 'medium' | 'low';
  testID?: string;
}

export function ConfidenceBadge({
  confidence,
  testID,
}: ConfidenceBadgeProps): React.JSX.Element {
  const isConfident = confidence === 'high' || confidence === 'medium';

  return (
    <View
      testID={testID}
      className={`px-2 py-0.5 rounded-full ${
        isConfident
          ? 'bg-green-100 dark:bg-green-900'
          : 'border border-stone-300 dark:border-stone-600'
      }`}
    >
      <Text
        className={`text-xs ${
          isConfident
            ? 'text-green-800 dark:text-green-200'
            : 'text-stone-700 dark:text-stone-300'
        }`}
      >
        {isConfident
          ? t('capture.confirm.confidence_high')
          : t('capture.confirm.confidence_low')}
      </Text>
    </View>
  );
}
