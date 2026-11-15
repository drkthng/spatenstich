// The year as a strip: one bar per calendar window of a plant, coloured by kind of action.
// Pure Views with percent positions, no SVG.
//
// Phase 38 (DESIGN3-06, DESIGN3-07): bars are placed by day of the year, carry a 1 px ink
// outline so they stay visible in sunlight, and a 2 px ink line marks today. Windows over
// New Year arrive from the engine as two parts and are drawn as two bars.
import { tokens } from '@/src/theme/tokens';
import * as React from 'react';
import { View } from 'react-native';
import type { PlantRow, AktionsTyp, KalenderFenster } from '@spatenstich/shared';
import { getFensterFuerPflanze } from '@spatenstich/shared';
import { stripBars, todayPercent } from '@/src/lib/kalenderAnzeige';
import { t } from '@/src/lib/i18n';

/** Colour per kind of action. KalenderWochenCard and the legend use the same map. */
export const FARBEN: Record<AktionsTyp, string> = {
  Vorkultur: tokens.gantt.Vorkultur,
  Direktsaat: tokens.gantt.Direktsaat,
  Auspflanzen: tokens.gantt.Auspflanzen,
  Ernte: tokens.gantt.Ernte,
};

export function GanttStreifen({
  plant,
  klimazone,
  height = 20,
  fenster,
  heute = true,
}: {
  plant: PlantRow;
  klimazone: number;
  height?: number;
  /** Draw only these windows (one kind of action on the detail screen). Default: all of the plant. */
  fenster?: readonly KalenderFenster[];
  /** Whether to mark today. */
  heute?: boolean;
}): React.JSX.Element {
  const bars = stripBars(fenster ?? getFensterFuerPflanze(plant, klimazone));

  return (
    <View
      style={{
        height,
        backgroundColor: tokens.color.surface2,
        borderWidth: 1,
        borderColor: tokens.color.line,
      }}
      accessibilityLabel={t('kalender.stripLabel', { name: plant.nameDe })}
    >
      {bars.map((bar, i) => (
        <View
          key={i}
          testID="gantt-bar"
          style={{
            position: 'absolute',
            top: -1,
            bottom: -1,
            left: `${bar.leftPercent}%` as any,
            width: `${bar.widthPercent}%` as any,
            // A window of a few days still shows.
            minWidth: 3,
            backgroundColor: FARBEN[bar.typ],
            borderWidth: 1,
            borderColor: tokens.color.ink,
          }}
        />
      ))}
      {heute ? (
        <View
          testID="gantt-heute"
          style={{
            position: 'absolute',
            top: -4,
            bottom: -4,
            left: `${todayPercent()}%` as any,
            width: 2,
            marginLeft: -1,
            backgroundColor: tokens.color.ink,
          }}
        />
      ) : null}
    </View>
  );
}
