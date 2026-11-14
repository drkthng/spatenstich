// Phase 10 Plan 03: GanttLegende — Farb-Legende der 4 Gantt-Phasentypen.
// UI-SPEC §Gantt-Rendering-Kontrakt: flex-row flex-wrap, color dot (10x10px) + label text-xs.
import { tokens } from '@/src/theme/tokens';
import * as React from 'react';
import { View, Text } from 'react-native';
import de from '@spatenstich/shared/i18n/de';

// ── i18n helper ───────────────────────────────────────────────────────────────
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

// ── Module constants ──────────────────────────────────────────────────────────

/**
 * Legende-Einträge in der Reihenfolge aus UI-SPEC §Gantt-Phasen-Farben.
 */
const LEGENDE_ITEMS = [
  { typ: 'Vorkultur',   farbe: tokens.gantt.Vorkultur, key: 'kalender.legende.vorkultur'   },
  { typ: 'Direktsaat',  farbe: tokens.gantt.Direktsaat, key: 'kalender.legende.direktsaat'  },
  { typ: 'Auspflanzen', farbe: tokens.gantt.Auspflanzen, key: 'kalender.legende.auspflanzen' },
  { typ: 'Ernte',       farbe: tokens.gantt.Ernte, key: 'kalender.legende.ernte'       },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function GanttLegende(): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-1">
      {LEGENDE_ITEMS.map((item) => (
        <View key={item.typ} className="flex-row items-center gap-1">
          <View
            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.farbe }}
          />
          <Text className="text-xs text-ink-muted">{t(item.key)}</Text>
        </View>
      ))}
    </View>
  );
}
