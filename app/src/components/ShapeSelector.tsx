// ShapeSelector — 2x2 grid of garden shape silhouette cards.
// Each card: icon + German label. Selected: accent border + checkmark.
// Phase 4 Plan 03 — D-04, UI-SPEC §"Shape Selection + Dimensions".
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Square, Check } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export type GardenShape = 'rectangle' | 'l_shape' | 'trapezoid' | 'freehand';

export interface ShapeSelectorProps {
  selected: GardenShape;
  onSelect: (shape: GardenShape) => void;
}

const SHAPES: { key: GardenShape; labelKey: string }[] = [
  { key: 'rectangle', labelKey: 'capture.dimensions.shape.rectangle' },
  { key: 'l_shape', labelKey: 'capture.dimensions.shape.l_shape' },
  { key: 'trapezoid', labelKey: 'capture.dimensions.shape.trapezoid' },
  { key: 'freehand', labelKey: 'capture.dimensions.shape.freehand' },
];

export function ShapeSelector({
  selected,
  onSelect,
}: ShapeSelectorProps): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-3">
      {SHAPES.map(({ key, labelKey }) => {
        const isSelected = selected === key;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            accessibilityRole="button"
            accessibilityLabel={t(labelKey)}
            accessibilityState={{ selected: isSelected }}
            className={`flex-1 min-w-[140px] min-h-[44px] p-4 rounded-xl items-center justify-center ${
              isSelected
                ? 'bg-[#E7E5E4] dark:bg-[#292524] border-2 border-[#4A7C59]'
                : 'bg-[#E7E5E4] dark:bg-[#292524] border-2 border-transparent'
            }`}
          >
            {/* Shape icon placeholder */}
            <View className="w-11 h-11 items-center justify-center mb-1">
              <ShapeIcon shape={key} />
            </View>
            <Text className="text-sm text-stone-800 dark:text-stone-100 text-center">
              {t(labelKey)}
            </Text>
            {/* Selected checkmark */}
            {isSelected ? (
              <View className="absolute top-2 right-2">
                <Check size={16} color="#4A7C59" />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Simple geometric shape representations using basic views
function ShapeIcon({ shape }: { shape: GardenShape }): React.JSX.Element {
  switch (shape) {
    case 'rectangle':
      return <Square size={32} color="#78716C" />;
    case 'l_shape':
      return (
        <View className="w-8 h-8">
          <View className="absolute top-0 left-0 w-5 h-8 border-2 border-stone-500 rounded-sm" />
          <View className="absolute bottom-0 right-0 w-5 h-4 border-2 border-stone-500 rounded-sm" />
        </View>
      );
    case 'trapezoid':
      return (
        <View className="w-8 h-6 items-center justify-center">
          <View className="w-5 h-0 border-b-2 border-stone-500 mb-1" />
          <View className="w-8 h-0 border-b-2 border-stone-500" />
        </View>
      );
    case 'freehand':
      return (
        <View className="w-8 h-8 border-2 border-stone-500 border-dashed rounded-md" />
      );
  }
}
