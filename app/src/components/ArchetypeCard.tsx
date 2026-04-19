// ArchetypeCard — selection card for garden archetype (PROF-02).
// UI-SPEC §"Component Contract" — selected state: accent border + checkmark.
// Phase 2-02-01.
import * as React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import type { Archetype } from '@spatenstich/shared';
import { cn } from '@/src/lib/utils';

export interface ArchetypeCardProps {
  archetype: Archetype;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  testID?: string;
}

export function ArchetypeCard({
  archetype,
  label,
  description,
  selected,
  onSelect,
  testID,
}: ArchetypeCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testID ?? `archetype-${archetype}`}
      className={cn(
        'bg-stone-200 dark:bg-stone-800 rounded-xl p-4 min-h-[120px] flex-1 active:opacity-80',
        selected ? 'border-2 border-[#4A7C59] dark:border-[#6BAA7E]' : 'border border-stone-300 dark:border-stone-700'
      )}
    >
      {selected ? (
        <View className="absolute top-2 right-2">
          <Check size={20} color="#4A7C59" />
        </View>
      ) : null}
      <Text className="text-base font-semibold text-stone-900 dark:text-stone-100">
        {label}
      </Text>
      <Text
        className="text-xs text-stone-600 dark:text-stone-300 mt-1"
        numberOfLines={3}
      >
        {description}
      </Text>
    </Pressable>
  );
}
