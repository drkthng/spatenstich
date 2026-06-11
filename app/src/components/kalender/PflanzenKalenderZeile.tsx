// Phase 10 Plan 03: PflanzenKalenderZeile — eine Zeile in der Jahresübersicht-Pflanzenliste.
// Pressable row: Plant name + Miniatur-GanttStreifen (height=8).
// UI-SPEC §PflanzenKalenderZeile, 10-PATTERNS.md §PflanzenKalenderZeile.
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { PlantRow } from '@spatenstich/shared';
import { GanttStreifen } from './GanttStreifen';

// ── Component ─────────────────────────────────────────────────────────────────

export interface PflanzenKalenderZeileProps {
  plant: PlantRow;
  klimazone: number;
  onPress: (slug: string) => void;
  testID?: string;
}

export function PflanzenKalenderZeile({
  plant,
  klimazone,
  onPress,
  testID,
}: PflanzenKalenderZeileProps): React.JSX.Element {
  return (
    <Pressable
      onPress={() => onPress(plant.slug)}
      accessibilityRole="button"
      accessibilityLabel={`${plant.nameDe}, Kalenderdetails öffnen`}
      className="flex-row items-center gap-3 py-2 min-h-[44px]"
      testID={testID}
    >
      <Text className="flex-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
        {plant.nameDe}
      </Text>
      <View style={{ width: 128 }}>
        <GanttStreifen plant={plant} klimazone={klimazone} height={8} />
      </View>
    </Pressable>
  );
}
