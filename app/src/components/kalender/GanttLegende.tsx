// What the colours of the year strip mean, and what the line for today looks like.
// Every colour has its word next to it; the colour is never the only carrier.
import { tokens } from '@/src/theme/tokens';
import * as React from 'react';
import { View, Text } from 'react-native';
import { t } from '@/src/lib/i18n';

const LEGENDE_ITEMS = [
  { typ: 'Vorkultur', farbe: tokens.gantt.Vorkultur, key: 'kalender.legende.vorkultur' },
  { typ: 'Direktsaat', farbe: tokens.gantt.Direktsaat, key: 'kalender.legende.direktsaat' },
  { typ: 'Auspflanzen', farbe: tokens.gantt.Auspflanzen, key: 'kalender.legende.auspflanzen' },
  { typ: 'Ernte', farbe: tokens.gantt.Ernte, key: 'kalender.legende.ernte' },
] as const;

export function GanttLegende(): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-x-4 gap-y-1" testID="gantt-legende">
      {LEGENDE_ITEMS.map((item) => (
        <View key={item.typ} className="flex-row items-center gap-1">
          <View
            style={{
              width: 14,
              height: 10,
              backgroundColor: item.farbe,
              borderWidth: 1,
              borderColor: tokens.color.ink,
            }}
          />
          <Text className="font-body text-sm text-ink">{t(item.key)}</Text>
        </View>
      ))}
      <View className="flex-row items-center gap-1">
        <View style={{ width: 14, height: 14, alignItems: 'center' }}>
          <View style={{ width: 2, height: 14, backgroundColor: tokens.color.ink }} />
        </View>
        <Text className="font-body text-sm text-ink">{t('kalender.heute')}</Text>
      </View>
    </View>
  );
}
