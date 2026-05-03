// BudgetWarningBanner — InlineBanner variant for AI budget warnings (NFR-03).
// Soft warning (amber) at 50 calls, Hard block (destructive) at 200 calls.
// Phase 4 Plan 03 — UI-SPEC §"Budget Warnings".
import * as React from 'react';
import { View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export interface BudgetWarningBannerProps {
  count: number;
  variant: 'soft' | 'hard';
}

export function BudgetWarningBanner({
  count,
  variant,
}: BudgetWarningBannerProps): React.JSX.Element {
  const isSoft = variant === 'soft';
  const message = isSoft
    ? t('capture.budget.soft_warning').replace('{n}', String(count))
    : t('capture.budget.hard_stop');

  const borderColor = isSoft ? 'border-amber-500' : 'border-red-600';
  const bgColor = isSoft
    ? 'bg-amber-50 dark:bg-amber-950'
    : 'bg-red-50 dark:bg-red-950';
  const iconColor = isSoft ? '#D97706' : '#DC2626';

  return (
    <View
      className={`border-l-4 ${borderColor} min-h-[52px] pl-3 pr-2 py-3 flex-row items-center ${bgColor} rounded-r-md`}
      accessibilityLiveRegion={isSoft ? 'polite' : 'assertive'}
      accessibilityLabel={message}
    >
      <AlertCircle size={16} color={iconColor} />
      <View className="flex-1 ml-2">
        <Text className="text-sm text-stone-800 dark:text-stone-100">
          {message}
        </Text>
      </View>
    </View>
  );
}
