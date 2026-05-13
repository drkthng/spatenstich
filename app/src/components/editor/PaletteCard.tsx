// Phase 7 Plan 04: One palette item card (UI-SPEC §Component Inventory PaletteCard 64×80).
// Long-press flips the shared `dragging` value in the parent ElementPalette.

import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PLAN_COLORS, darkenColor } from '@/src/lib/colors';

interface Props {
  kind: string;
  label: string;
  testID: string;
  onLongPressStart: (kind: string) => void;
}

export function PaletteCard({
  kind,
  label,
  testID,
  onLongPressStart,
}: Props): React.JSX.Element {
  const swatch =
    (PLAN_COLORS as Record<string, string>)[kind] ?? PLAN_COLORS.Sonstiges;
  const stroke = darkenColor(swatch);

  const longPress = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      onLongPressStart(kind);
    });

  return (
    <GestureDetector gesture={longPress}>
      <Pressable
        testID={testID}
        className="mr-2 w-16 items-center"
        accessibilityLabel={label}
      >
        <View
          style={{
            width: 64,
            height: 64,
            backgroundColor: swatch,
            borderWidth: 2,
            borderColor: stroke,
            borderRadius: 8,
          }}
        />
        <Text
          className="text-xs text-stone-700 dark:text-stone-300 mt-1"
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </GestureDetector>
  );
}
