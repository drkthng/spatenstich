// Phase 10 Plan 03: GanttStreifen — 12-Monats View-bar Gantt-Streifen.
// CAL-01: renders one positioned View bar per KalenderFenster, colored per Aktionstyp.
// NO SVG — pure View-based absolute positioning with percent values.
// Reusable: height prop allows Miniatur (8px in PflanzenKalenderZeile) vs. full (20px in Detail).
import * as React from 'react';
import { View } from 'react-native';
import type { PlantRow, AktionsTyp } from '@spatenstich/shared';
import { getFensterFuerPflanze } from '@spatenstich/shared';

// ── Module constants ──────────────────────────────────────────────────────────

/**
 * Total calendar weeks in a year (KW 53 wird auf KW 52 geclampt — Fallstrick 4 / UI-SPEC).
 */
const TOTAL_KW = 52;

/**
 * Phase-Farben per Aktionstyp (UI-SPEC §Gantt-Phasen-Farben).
 * Exported so KalenderWochenCard kann die gleiche Map importieren.
 */
export const FARBEN: Record<AktionsTyp, string> = {
  Vorkultur: '#A78BFA',
  Direktsaat: '#34D399',
  Auspflanzen: '#60A5FA',
  Ernte: '#FB923C',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function GanttStreifen({
  plant,
  klimazone,
  height = 20,
}: {
  plant: PlantRow;
  klimazone: number;
  height?: number;
}): React.JSX.Element {
  const fenster = getFensterFuerPflanze(plant, klimazone);

  return (
    <View
      style={{ flexDirection: 'row', height, backgroundColor: '#E5E7EB', borderRadius: 4 }}
      accessibilityLabel={`Gantt-Diagramm für ${plant.nameDe}`}
    >
      {fenster.map((f, i) => {
        const clampedStart = Math.max(1, f.startKw);
        const clampedEnd = Math.min(TOTAL_KW, f.endKw);
        const left = ((clampedStart - 1) / TOTAL_KW) * 100;
        const width = ((clampedEnd - clampedStart + 1) / TOTAL_KW) * 100;
        return (
          <View
            key={i}
            testID="gantt-bar"
            style={{
              position: 'absolute',
              left: `${left}%` as any,
              width: `${width}%` as any,
              height: '100%' as any,
              backgroundColor: FARBEN[f.typ],
              borderRadius: 3,
            }}
          />
        );
      })}
    </View>
  );
}
