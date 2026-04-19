// AuthChoiceCard — large tappable card for Auth-Wahl screen.
// UI-SPEC §"Component Contract" + §"Interaction Contract".
// Phase 2-02-01.
import * as React from 'react';
import { Pressable, View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { cn } from '@/src/lib/utils';

export interface AuthChoiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void | Promise<void>;
  testID?: string;
}

export function AuthChoiceCard({
  icon: Icon,
  title,
  description,
  onPress,
  testID,
}: AuthChoiceCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      className={cn(
        'min-h-[120px] bg-stone-200 dark:bg-stone-800 rounded-2xl p-6 active:opacity-80'
      )}
    >
      <View className="flex-row items-start gap-4">
        <View className="w-16 h-16 items-center justify-center">
          <Icon size={64} color="#4A7C59" />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </Text>
          <Text
            className="text-sm text-stone-600 dark:text-stone-300 mt-1"
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
