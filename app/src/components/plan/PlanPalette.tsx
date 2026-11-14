// Phase 31 (EDIT3-09): the palette. Beds, plants (with search) and facilities; picking one
// starts placing it on the plan. On desktop it is a panel on the left, on a phone a sheet
// opened with "+".

import * as React from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Search } from 'lucide-react-native';
import { usePlants } from '@/src/hooks/usePlants';
import { t } from '@/src/lib/i18n';
import { tokens, elementFill } from '@/src/theme/tokens';
import {
  BED_KINDS,
  FACILITY_KINDS,
  kindItem,
  plantItem,
  searchPlants,
  type PaletteItem,
} from '@/src/lib/editor/placing';

function SectionLabel({ children }: { children: string }): React.JSX.Element {
  return (
    <Text className="px-4 pt-4 pb-1 text-[11px] uppercase tracking-widest text-ink-muted">{children}</Text>
  );
}

function Row({
  item,
  active,
  onPick,
}: {
  item: PaletteItem;
  active: boolean;
  onPick: (item: PaletteItem) => void;
}): React.JSX.Element {
  const round = item.kind === 'Pflanze' || item.kind === 'Baum';
  return (
    <Pressable
      onPress={() => onPick(item)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={`palette-${item.key}`}
      className={
        active
          ? 'flex-row items-center min-h-[44px] px-4 bg-surface-2'
          : 'flex-row items-center min-h-[44px] px-4'
      }
    >
      <View
        className={round ? 'h-4 w-4 rounded-full border border-line' : 'h-4 w-6 border border-line'}
        style={{ backgroundColor: elementFill(item.kind), opacity: 0.8 }}
      />
      <Text className="ml-3 flex-1 text-base text-ink" numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

export interface PlanPaletteProps {
  onPick: (item: PaletteItem) => void;
  /** Key of the item that is being placed, if any. */
  activeKey: string | null;
}

export function PlanPalette({ onPick, activeKey }: PlanPaletteProps): React.JSX.Element {
  const { data: plants = [] } = usePlants();
  const [query, setQuery] = React.useState('');
  const found = React.useMemo(() => searchPlants(plants, query), [plants, query]);
  const kindLabel = (kind: string) => t(`editor.palette.items.${kind}`);

  return (
    <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" testID="plan-palette">
      <SectionLabel>{t('editor.palette.sectionBeds')}</SectionLabel>
      {BED_KINDS.map((kind) => {
        const item = kindItem(kind, kindLabel(kind));
        return <Row key={item.key} item={item} active={activeKey === item.key} onPick={onPick} />;
      })}

      <SectionLabel>{t('editor.palette.sectionFacilities')}</SectionLabel>
      {FACILITY_KINDS.map((kind) => {
        const item = kindItem(kind, kindLabel(kind));
        return <Row key={item.key} item={item} active={activeKey === item.key} onPick={onPick} />;
      })}

      <SectionLabel>{t('editor.palette.sectionPlants')}</SectionLabel>
      <View className="mx-4 mb-1 flex-row items-center border-b border-line">
        <Search size={18} color={tokens.color.inkMuted} strokeWidth={1.5} />
        <TextInput
          className="ml-2 flex-1 min-w-0 min-h-[44px] text-base text-ink"
          style={{ outlineStyle: 'none' } as never}
          value={query}
          onChangeText={setQuery}
          placeholder={t('editor.palette.searchPlants')}
          placeholderTextColor={tokens.color.inkMuted}
          accessibilityLabel={t('editor.palette.searchPlants')}
          autoCapitalize="none"
          autoCorrect={false}
          testID="palette-plant-search"
        />
      </View>
      {found.length === 0 ? (
        <Text className="px-4 py-3 text-sm italic text-ink-muted" testID="palette-no-plants">
          {t('editor.palette.noPlants')}
        </Text>
      ) : (
        found.map((plant) => {
          const item = plantItem(plant);
          return <Row key={item.key} item={item} active={activeKey === item.key} onPick={onPick} />;
        })
      )}
      <View className="h-4" />
    </ScrollView>
  );
}
