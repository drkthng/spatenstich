// Phase 10 Plan 03: KalenderWochenCard — "Diese Woche" Aktionsliste.
// CAL-03: Aktions-Badges distinguishing Vorkultur/Direktsaat/Auspflanzen/Ernte by color+label.
// UI-SPEC §Screen 1 KalenderWochenCard anatomy.
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import de from '@spatenstich/shared/i18n/de';
import { Badge } from '@/src/components/ui/badge';
import { FARBEN } from './GanttStreifen';
import type { PlantRow, KalenderFenster } from '@spatenstich/shared';

// ── i18n helper ───────────────────────────────────────────────────────────────
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

// ── Component ─────────────────────────────────────────────────────────────────

export interface KalenderWochenCardProps {
  aktionen: Array<{ plant: PlantRow; fenster: KalenderFenster }>;
  aktuelleKw: number;
  onPlantPress: (slug: string) => void;
}

export function KalenderWochenCard({
  aktionen,
  aktuelleKw,
  onPlantPress,
}: KalenderWochenCardProps): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <View className="bg-stone-200 dark:bg-stone-800 rounded-xl p-4">
      {/* Card header: "Diese Woche" title + KW label */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-xl font-semibold text-stone-900 dark:text-stone-50">
          {t('kalender.dieseWoche')}
        </Text>
        <Text className="text-xs text-stone-400">
          {t('kalender.kwLabel')
            .replace('{kw}', String(aktuelleKw))
            .replace('{year}', String(year))}
        </Text>
      </View>

      {/* Aktionsliste */}
      {aktionen.length === 0 ? (
        <Text className="text-sm text-stone-500 dark:text-stone-400">
          {t('kalender.keineAktionenDieseWoche')}
        </Text>
      ) : (
        <>
          {aktionen.map(({ plant, fenster }) => (
            <Pressable
              key={`${plant.slug}-${fenster.typ}`}
              onPress={() => onPlantPress(plant.slug)}
              accessibilityRole="button"
              accessibilityLabel={`${plant.nameDe}, ${fenster.typ} öffnen`}
              className="flex-row items-center gap-2 min-h-[44px]"
            >
              {/* CAL-03: colored badge per Aktionstyp */}
              <Badge
                className="border-transparent"
                style={{ backgroundColor: FARBEN[fenster.typ] }}
              >
                <Text className="text-xs text-white font-medium">
                  {t(`kalender.legende.${fenster.typ.toLowerCase()}`)}
                </Text>
              </Badge>
              <Text className="text-sm text-stone-800 dark:text-stone-100 flex-1">
                {plant.nameDe}
              </Text>
            </Pressable>
          ))}
          {/* Hint text when at least one action exists */}
          <Text className="text-xs text-stone-400 mt-2">
            → Tippe auf eine Pflanze für Details und Gantt-Ansicht
          </Text>
        </>
      )}
    </View>
  );
}
