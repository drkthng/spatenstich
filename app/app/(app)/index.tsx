// Garten-Plan-Placeholder — empty state for users without a plan (Phase 4 will render real plan).
// Pattern: 02-UI-SPEC.md §"Empty state".
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function GartenPlanScreen(): React.JSX.Element {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-stone-900 p-6">
      <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100 text-center">
        {t('app.index.placeholder')}
      </Text>
      <Text className="text-sm text-stone-500 mt-2 text-center max-w-md">
        {t('app.index.placeholder_sub')}
      </Text>
      <Pressable
        onPress={() => router.push('/(app)/profile')}
        className="mt-6 bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-lg px-6 py-3 min-h-[44px] items-center justify-center active:opacity-80"
        accessibilityRole="button"
      >
        <Text className="text-white font-semibold">Zum Profil</Text>
      </Pressable>
    </View>
  );
}
