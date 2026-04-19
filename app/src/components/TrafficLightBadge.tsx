// TrafficLightBadge — BKleingG 1/3-Ampel (D-10, RULES-05).
// UI-SPEC §"Component Contract" — 4 states (green/amber/red/neutral).
// Phase 2-02-01.
import * as React from 'react';
import { Pressable, View, Text } from 'react-native';
import { cn } from '@/src/lib/utils';

export type TrafficLightState = 'green' | 'amber' | 'red' | 'neutral';

export interface TrafficLightBadgeProps {
  state: TrafficLightState;
  label: string;
  onPress?: () => void;
  testID?: string;
}

// UI-SPEC colors — hard-coded hex so color-reporting greps find them.
const STATE_COLORS: Record<TrafficLightState, string> = {
  green: '#15803D',
  amber: '#D97706',
  red: '#DC2626',
  neutral: '#78716C',
};

export function TrafficLightBadge({
  state,
  label,
  onPress,
  testID,
}: TrafficLightBadgeProps): React.JSX.Element {
  const color = STATE_COLORS[state];
  const content = (
    <View
      className="flex-row items-center gap-2"
      accessibilityLabel={`BKleingG-Status: ${label}`}
    >
      <View
        className="w-7 h-7 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Text className="text-sm text-stone-800 dark:text-stone-100">{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`BKleingG-Status: ${label}`}
        testID={testID}
        className={cn(
          'min-h-[44px] flex-row items-center active:opacity-80 px-2'
        )}
        hitSlop={8}
      >
        {content}
      </Pressable>
    );
  }
  return <View testID={testID}>{content}</View>;
}
