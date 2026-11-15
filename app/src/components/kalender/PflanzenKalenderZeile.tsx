// One plant in the calendar list: its name, a mark when it stands in the plan, and its year
// as a strip. The whole row opens the plant's calendar page.
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { PlantRow } from '@spatenstich/shared';
import { GanttStreifen } from './GanttStreifen';
import { t } from '@/src/lib/i18n';

export interface PflanzenKalenderZeileProps {
  plant: PlantRow;
  klimazone: number;
  onPress: (slug: string) => void;
  /** Shows "im Plan" next to the name (in the list of all plants). */
  imPlan?: boolean;
  testID?: string;
}

/** Width share of the name column; the month scale above the list uses the same. */
export const NAME_COLUMN = '42%';

export function PflanzenKalenderZeile({
  plant,
  klimazone,
  onPress,
  imPlan = false,
  testID,
}: PflanzenKalenderZeileProps): React.JSX.Element {
  return (
    <Pressable
      onPress={() => onPress(plant.slug)}
      accessibilityRole="link"
      accessibilityLabel={t('kalender.zeileLabel', { name: plant.nameDe })}
      className="flex-row items-center border-b border-line-soft"
      style={{ minHeight: 48, paddingVertical: 6 }}
      testID={testID}
    >
      <View style={{ width: NAME_COLUMN, paddingRight: 12 }}>
        <Text className="font-body text-base text-ink">{plant.nameDe}</Text>
        {imPlan ? <Text className="font-body text-xs text-ink-muted">{t('kalender.imPlanTag')}</Text> : null}
      </View>
      <View className="flex-1">
        <GanttStreifen plant={plant} klimazone={klimazone} height={12} />
      </View>
    </Pressable>
  );
}

/** The twelve months above a list, in line with the strips of the rows below. */
export function MonatsLeiste({ nameColumn = true }: { nameColumn?: boolean }): React.JSX.Element {
  const months = t('kalender.monateKurz').split(' ');
  return (
    <View className="flex-row items-end" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {nameColumn ? <View style={{ width: NAME_COLUMN }} /> : null}
      <View className="flex-1 flex-row">
        {months.map((m, i) => (
          <Text key={i} className="font-body text-xs text-ink-muted" style={{ flex: 1, textAlign: 'center' }}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}
