// Phase 7.5 — Bottom palette for the Web editor.
// Click an item → primes placingKind in parent → next canvas click places the element.
// Click "Abbrechen" → clears placingKind. Active item visually highlighted.

import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { PLAN_COLORS } from '@/src/lib/colors';
import de from '@spatenstich/shared/i18n/de';
import plantsBundle from '@spatenstich/shared/data/plants';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export type PaletteTab = 'beete' | 'pflanzen' | 'infrastruktur';

const TABS: { id: PaletteTab; label: string; kinds: string[] }[] = [
  { id: 'beete', label: 'Beete', kinds: ['Beet'] },
  { id: 'pflanzen', label: 'Pflanzen', kinds: ['Pflanze'] },
  {
    id: 'infrastruktur',
    label: 'Infrastruktur',
    kinds: ['Rasen', 'Weg', 'Laube', 'Kompost', 'Wasserstelle', 'Zaun', 'Baum', 'Sitzplatz', 'Sonstiges'],
  },
];

export interface PlantMeta {
  slug: string;
  label: string;
}

export interface WebPaletteBarProps {
  placingKind: string | null;
  onSelectKind: (kind: string) => void;
  onSelectPlant?: (meta: PlantMeta) => void;
  onCancel: () => void;
}

const sortedPlants = [...plantsBundle.plants].sort((a, b) => a.nameDe.localeCompare(b.nameDe, 'de'));

export function WebPaletteBar({
  placingKind,
  onSelectKind,
  onSelectPlant,
  onCancel,
}: WebPaletteBarProps): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<PaletteTab>('beete');
  const currentTab = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <View
      className="border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
      testID="web-palette-bar"
    >
      {/* Placing-mode indicator + cancel */}
      {placingKind && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-sky-50 dark:bg-sky-900/30 border-b border-sky-200 dark:border-sky-800">
          <Text className="text-sm text-sky-900 dark:text-sky-100">
            Klick in den Plan, um <Text className="font-semibold">{placingKind}</Text> zu platzieren.
          </Text>
          <Pressable
            onPress={onCancel}
            className="px-3 py-1 rounded-md bg-sky-100 dark:bg-sky-800"
            testID="web-palette-cancel"
            accessibilityRole="button"
          >
            <Text className="text-xs font-medium text-sky-900 dark:text-sky-100">Abbrechen</Text>
          </Pressable>
        </View>
      )}

      {/* Tab strip */}
      <View className="flex-row border-b border-stone-200 dark:border-stone-700">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 items-center ${
                active ? 'border-b-2 border-stone-900 dark:border-stone-100' : ''
              }`}
              testID={`web-palette-tab-${tab.id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                className={`text-sm ${
                  active
                    ? 'font-semibold text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Swatch grid / plant dropdown for current tab */}
      {activeTab === 'pflanzen' ? (
        <View className="p-3" testID="web-palette-swatches-pflanzen">
          <select
            onChange={(e: any) => {
              const slug = e.target.value;
              if (!slug) return;
              const plant = sortedPlants.find((p) => p.slug === slug);
              if (plant) {
                onSelectPlant?.({ slug: plant.slug, label: plant.nameDe });
                onSelectKind('Pflanze');
              }
            }}
            value=""
            style={{ padding: 8, fontSize: 14, borderRadius: 6, width: '100%', border: '1px solid #a8a29e' }}
          >
            <option value="">Pflanze wählen...</option>
            {sortedPlants.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.iconEmoji} {p.nameDe}
              </option>
            ))}
          </select>
        </View>
      ) : (
        <View className="flex-row flex-wrap p-3 gap-3" testID={`web-palette-swatches-${activeTab}`}>
          {currentTab.kinds.map((kind) => {
            const color = PLAN_COLORS[kind as keyof typeof PLAN_COLORS] ?? PLAN_COLORS.Sonstiges;
            const active = placingKind === kind;
            return (
              <Pressable
                key={kind}
                onPress={() => onSelectKind(kind)}
                className={`items-center ${active ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
                testID={`web-palette-swatch-${kind}`}
                accessibilityRole="button"
                accessibilityLabel={`${kind} zur Platzierung wählen`}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: color,
                    borderRadius: 6,
                    borderWidth: active ? 3 : 1,
                    borderColor: active ? '#0EA5E9' : '#8B7355',
                  }}
                />
                <Text className="text-xs text-stone-700 dark:text-stone-300 mt-1">{kind}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
