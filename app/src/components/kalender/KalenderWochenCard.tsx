// "Diese Woche": what the calendar says is due now, for the plants in the plan or, while the
// plan has none, for the whole catalog. A long list shows its first entries and opens on request.
//
// Phase 38: each entry names its kind of action in words next to a colour swatch (the colour
// alone does not carry the meaning, and light text on the lighter colours was hard to read).
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { tokens } from '@/src/theme/tokens';
import { FARBEN } from './GanttStreifen';
import type { PlantRow, KalenderFenster } from '@spatenstich/shared';
import { t } from '@/src/lib/i18n';

export interface KalenderWochenCardProps {
  aktionen: Array<{ plant: PlantRow; fenster: KalenderFenster }>;
  aktuelleKw: number;
  onPlantPress: (slug: string) => void;
  /** Whether the list is about the plants in the plan (true) or the whole catalog (false). */
  ausPlan?: boolean;
}

/** How many entries show before "Alle anzeigen". */
export const WOCHE_KURZ = 6;

export function KalenderWochenCard({
  aktionen,
  aktuelleKw,
  onPlantPress,
  ausPlan = true,
}: KalenderWochenCardProps): React.JSX.Element {
  const year = new Date().getFullYear();
  const [open, setOpen] = React.useState(false);
  const shown = open ? aktionen : aktionen.slice(0, WOCHE_KURZ);

  return (
    <View className="bg-surface-2 border border-line p-4" testID="kalender-woche">
      <View className="flex-row justify-between items-baseline">
        <Text className="font-display text-xl text-ink" accessibilityRole="header">
          {t('kalender.dieseWoche')}
        </Text>
        <Text className="font-body text-sm text-ink-muted">{t('kalender.kwLabel', { kw: aktuelleKw, year })}</Text>
      </View>
      <Text className="font-body text-sm text-ink-muted mb-2" testID="kalender-woche-quelle">
        {ausPlan ? t('kalender.wocheAusPlan') : t('kalender.wocheAusAllen')}
      </Text>

      {aktionen.length === 0 ? (
        <Text className="font-body text-base text-ink">{t('kalender.keineAktionenDieseWoche')}</Text>
      ) : (
        <>
          {shown.map(({ plant, fenster }) => {
            const aktion = t(`kalender.legende.${fenster.typ.toLowerCase()}`);
            return (
              <Pressable
                key={`${plant.slug}-${fenster.typ}`}
                onPress={() => onPlantPress(plant.slug)}
                accessibilityRole="link"
                accessibilityLabel={t('kalender.aktionLabel', { name: plant.nameDe, aktion })}
                className="flex-row items-center gap-2"
                style={{ minHeight: 48 }}
              >
                <View
                  style={{
                    width: 14,
                    height: 10,
                    backgroundColor: FARBEN[fenster.typ],
                    borderWidth: 1,
                    borderColor: tokens.color.ink,
                  }}
                />
                <Text className="font-body text-base text-ink flex-1">{plant.nameDe}</Text>
                <Text className="font-body text-sm text-ink-muted">{aktion}</Text>
              </Pressable>
            );
          })}
          {aktionen.length > WOCHE_KURZ ? (
            <Pressable
              onPress={() => setOpen((v) => !v)}
              accessibilityRole="button"
              className="justify-center"
              style={{ minHeight: 48 }}
              testID="kalender-woche-mehr"
            >
              <Text className="font-body text-base text-ink underline">
                {open ? t('kalender.wocheWeniger') : t('kalender.wocheAlle', { n: aktionen.length })}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}
