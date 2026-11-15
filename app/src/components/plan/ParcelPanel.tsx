// Phase 32 (EDIT3-15): size and boundary of the parcel, edited in the plan editor.
// Breite and Tiefe set the extent of the plan; the boundary is that rectangle or a free
// outline inside it whose corners are edited on the plan.

import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { t } from '@/src/lib/i18n';
import { formatMeters, parseMeters } from '@/src/lib/editor/numberFormat';
import { Field } from './PropertiesPanel';

/** Smallest and largest side of a parcel in metres (as in "Neuen Garten anlegen"). */
export const PARCEL_MIN_M = 0.5;
export const PARCEL_MAX_M = 100;

export interface ParcelPanelProps {
  widthM: number;
  heightM: number;
  /** True while the boundary is a free outline. */
  free: boolean;
  onSize: (size: { widthM: number; heightM: number }) => void;
  onShape: (shape: 'rect' | 'free') => void;
  onDone: () => void;
}

export function ParcelPanel({ widthM, heightM, free, onSize, onShape, onDone }: ParcelPanelProps): React.JSX.Element {
  const valid = (text: string): number | null => {
    const value = parseMeters(text);
    return value !== null && value >= PARCEL_MIN_M && value <= PARCEL_MAX_M ? value : null;
  };
  const choice = (key: 'rect' | 'free', label: string, active: boolean) => (
    <Pressable
      onPress={() => onShape(key)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={`parcel-${key}`}
      className={
        active
          ? 'flex-1 min-h-[48px] items-center justify-center border border-primary bg-surface-2 px-2'
          : 'flex-1 min-h-[48px] items-center justify-center border border-line px-2'
      }
    >
      <Text className={active ? 'text-base font-semibold text-ink' : 'text-base text-ink'}>{label}</Text>
    </Pressable>
  );
  return (
    <View className="border-t border-line bg-bg px-4 pt-3 pb-3 gap-3" testID="parcel-panel">
      <View className="flex-row items-end gap-3">
        <Text className="text-base font-display font-medium text-ink pb-2">{t('editor.parcel.title')}</Text>
        <Field
          label={t('editor.parcel.width')}
          value={formatMeters(widthM)}
          unit={t('editor.props.unitM')}
          inputMode="decimal"
          testID="parcel-width"
          onText={(text) => {
            const value = valid(text);
            if (value !== null) onSize({ widthM: value, heightM });
          }}
        />
        <Field
          label={t('editor.parcel.depth')}
          value={formatMeters(heightM)}
          unit={t('editor.props.unitM')}
          inputMode="decimal"
          testID="parcel-depth"
          onText={(text) => {
            const value = valid(text);
            if (value !== null) onSize({ widthM, heightM: value });
          }}
        />
      </View>
      <View className="flex-row gap-2">
        {choice('rect', t('editor.parcel.rect'), !free)}
        {choice('free', t('editor.parcel.free'), free)}
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          testID="parcel-done"
          className="min-h-[48px] items-center justify-center bg-primary px-4"
        >
          <Text className="text-base font-semibold text-on-primary">{t('editor.parcel.done')}</Text>
        </Pressable>
      </View>
      {free ? <Text className="text-sm text-ink-muted">{t('editor.outline.hint')}</Text> : null}
    </View>
  );
}
