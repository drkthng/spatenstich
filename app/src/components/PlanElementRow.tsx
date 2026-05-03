// PlanElementRow — single detected plan element for the confirmation screen.
// Phase 4 Plan 04 — follows VereinsregelRow toggle pattern.
// Layout: icon (color circle) | label + size | ConfidenceBadge + Switch
import * as React from 'react';
import { View, Switch, Text } from 'react-native';
import type { PlanElementCandidate } from '@spatenstich/shared';
import { ConfidenceBadge } from './ConfidenceBadge';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

/** Color mapping for element type icon circles — uses Plan Rendering Colors. */
const ELEMENT_COLORS: Record<string, string> = {
  Rasen: '#8DB580',
  Beet: '#C4956A',
  Weg: '#D4C5A9',
  Laube: '#A0785A',
  Kompost: '#7A6148',
  Wasserstelle: '#7EB5C4',
  Zaun: '#8B7355',
  Baum: '#6B9B5E',
  Sitzplatz: '#C9B99A',
  Sonstiges: '#B8AFA7',
};

export interface PlanElementRowProps {
  element: PlanElementCandidate & { isAccepted: boolean };
  onToggle: (index: number) => void;
  index: number;
  testID?: string;
}

export function PlanElementRow({
  element,
  onToggle,
  index,
  testID,
}: PlanElementRowProps): React.JSX.Element {
  const color = ELEMENT_COLORS[element.elementType] ?? ELEMENT_COLORS.Sonstiges;
  const confidenceLabel =
    element.confidence === 'low'
      ? t('capture.confirm.confidence_low')
      : t('capture.confirm.confidence_high');
  const acceptedLabel = element.isAccepted ? 'akzeptiert' : 'abgelehnt';

  return (
    <View
      testID={testID}
      className="flex-row items-center gap-3 py-4 px-4 min-h-[52px]"
      accessibilityLabel={`${element.label}, Konfidenz ${confidenceLabel}, ${acceptedLabel}`}
    >
      {/* Element type icon — colored circle */}
      <View
        className="w-6 h-6 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Center: label + estimated size */}
      <View className="flex-1">
        <Text
          className={`text-base ${
            element.isAccepted
              ? 'text-stone-900 dark:text-stone-100'
              : 'text-stone-400'
          }`}
        >
          {element.label}
        </Text>
        <Text className="text-sm text-stone-500">
          {t('capture.confirm.estimated_size')
            .replace('{w}', String(element.widthM))
            .replace('{h}', String(element.heightM))}
        </Text>
      </View>

      {/* Right: confidence badge + toggle */}
      <ConfidenceBadge confidence={element.confidence} />
      <Switch
        value={element.isAccepted}
        onValueChange={() => onToggle(index)}
        trackColor={{ false: '#D6D3D1', true: '#4A7C59' }}
        accessibilityLabel={`${element.label} ${acceptedLabel}`}
      />
    </View>
  );
}
