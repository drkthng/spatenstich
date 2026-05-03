// DimensionInput — labeled numeric input with "m" suffix and validation.
// Phase 4 Plan 03 — D-04, UI-SPEC §"Dimension Inputs".
import * as React from 'react';
import { View, Text, TextInput } from 'react-native';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export interface DimensionInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
}

export function DimensionInput({
  label,
  value,
  onChangeText,
  error,
}: DimensionInputProps): React.JSX.Element {
  return (
    <View className="mb-3">
      <Text className="text-sm text-stone-700 dark:text-stone-300 mb-1 font-normal">
        {label}
      </Text>
      <View className="flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          accessibilityLabel={label}
          className={`flex-1 border rounded-lg px-3 py-2 text-base text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 ${
            error
              ? 'border-red-600 ring-2 ring-red-600'
              : 'border-stone-300 dark:border-stone-600'
          }`}
          style={{ minHeight: 44 }}
          placeholder="0"
          placeholderTextColor="#A8A29E"
        />
        <Text className="ml-2 text-sm text-stone-500">{t('capture.dimensions.unit')}</Text>
      </View>
      {error ? (
        <Text className="text-sm text-red-600 mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
