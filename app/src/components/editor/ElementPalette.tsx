// Phase 7 Plan 04: 3-tab bottom palette (UI-SPEC §Component Inventory, Toolbar layout).
// Long-press on a PaletteCard flips the shared dragging value; screen-root Pan in
// Plan 05 plan/index.tsx reads it for drop placement.

import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { PaletteCard } from './PaletteCard';
import de from '@spatenstich/shared/i18n/de';

// Local t() falls back to the key when missing — Plan 05 fills concrete strings in de.json.
const t = (key: string): string =>
  (key
    .split('.')
    .reduce<unknown>((o, k) => {
      if (o && typeof o === 'object' && k in o) {
        return (o as Record<string, unknown>)[k];
      }
      return undefined;
    }, de) as string) ?? key;

export type PaletteTab = 'beete' | 'pflanzen' | 'infrastruktur';

// Per CONTEXT D-08
const BEETE_KINDS = ['Beet'] as const;
const INFRASTRUKTUR_KINDS = [
  'Weg',
  'Laube',
  'Zaun',
  'Wasserstelle',
  'Kompost',
  'Baum',
  'Sitzplatz',
  'Sonstiges',
] as const;
const PFLANZEN_KINDS = ['Pflanze'] as const; // expanded by Phase 8 (seed inventory)

export interface DraggingPayload {
  kind: string;
  ghostX: number;
  ghostY: number;
}

interface Props {
  activeTab: PaletteTab;
  onTabChange: (tab: PaletteTab) => void;
  draggingShared: SharedValue<DraggingPayload | null>;
  /** Controls Pflanzen empty-state per UI-SPEC. Plan 05 wires this from elements.some(... 'Beet'). */
  hasAnyBed?: boolean;
}

export function ElementPalette({
  activeTab,
  onTabChange,
  draggingShared,
  hasAnyBed = false,
}: Props): React.JSX.Element {
  const handleLongPress = React.useCallback(
    (kind: string) => {
      // Flip shared value — screen-root Pan in plan/index.tsx (Plan 05) reads this.
      draggingShared.value = { kind, ghostX: 0, ghostY: 0 };
    },
    [draggingShared],
  );

  const kinds =
    activeTab === 'beete'
      ? BEETE_KINDS
      : activeTab === 'pflanzen'
        ? PFLANZEN_KINDS
        : INFRASTRUKTUR_KINDS;

  return (
    <View className="bg-stone-100 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700">
      <View className="flex-row" testID="palette-tabs">
        {(['beete', 'pflanzen', 'infrastruktur'] as PaletteTab[]).map((tab) => (
          <Pressable
            key={tab}
            testID={`palette-tab-${tab}`}
            onPress={() => onTabChange(tab)}
            className={`flex-1 items-center py-2 ${
              activeTab === tab ? 'border-b-2 border-[#4A7C59]' : ''
            }`}
          >
            <Text className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              {t(
                `editor.palette.tab${tab[0].toUpperCase()}${tab.slice(1)}`,
              )}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-2 py-2"
      >
        {activeTab === 'pflanzen' && !hasAnyBed ? (
          <Text
            className="text-sm text-stone-700 dark:text-stone-300 px-2"
            testID="palette-empty-plants"
          >
            {t('editor.palette.emptyPlants')}
          </Text>
        ) : (
          kinds.map((kind) => (
            <PaletteCard
              key={kind}
              kind={kind}
              label={t(`editor.palette.items.${kind}`)}
              testID={`palette-${kind}`}
              onLongPressStart={handleLongPress}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
