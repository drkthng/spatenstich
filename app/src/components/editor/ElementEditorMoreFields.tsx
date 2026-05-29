// Phase 09.1 Plan 02: Collapsible "Mehr Felder" section inside ElementEditorModal.
// D-10: Extended fields: note, plantedAt, accentColor (all stored in provenance).
// D-11: Default-collapsed; counter "(N)" next to toggle label when fields have values.
// Security V5: maxLength={500} on note TextInput to mitigate DoS (T-09.1-DOS-NOTE).

import * as React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import de from '@spatenstich/shared/i18n/de';
import { CrossPlatformDatePicker } from './CrossPlatformDatePicker';
import { CrossPlatformColorPicker } from './CrossPlatformColorPicker';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export interface ElementEditorMoreFieldsProps {
  expanded: boolean;
  onToggle: () => void;
  note: string;
  setNote: (s: string) => void;
  plantedAt: string | null;
  setPlantedAt: (s: string | null) => void;
  accentColor: string | null;
  setAccentColor: (s: string | null) => void;
}

export function ElementEditorMoreFields({
  expanded,
  onToggle,
  note,
  setNote,
  plantedAt,
  setPlantedAt,
  accentColor,
  setAccentColor,
}: ElementEditorMoreFieldsProps): React.JSX.Element {
  const extraCount = [note, plantedAt, accentColor].filter(Boolean).length;

  return (
    <View className="mt-3">
      <Pressable
        testID="more-fields-toggle"
        onPress={onToggle}
        className="flex-row items-center py-2"
      >
        <Text className="text-sm font-medium text-stone-600 dark:text-stone-300">
          {expanded ? t('editor.elementEditor.lessFields') : t('editor.elementEditor.moreFields')}
          {extraCount > 0 && !expanded ? ` (${extraCount})` : ''}
        </Text>
      </Pressable>

      {expanded && (
        <View className="mt-2 gap-3">
          {/* Notiz — maxLength 500 per Security V5 / T-09.1-DOS-NOTE */}
          <View>
            <Text className="text-xs text-stone-500 dark:text-stone-400 mb-1">
              {t('editor.elementEditor.note')}
            </Text>
            <TextInput
              testID="more-note"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
              className="border border-stone-300 dark:border-stone-600 rounded-md p-2 min-h-[60px] text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-700"
              placeholderTextColor="#a8a29e"
              placeholder={t('editor.elementEditor.note')}
            />
          </View>

          {/* Pflanzdatum */}
          <View>
            <Text className="text-xs text-stone-500 dark:text-stone-400 mb-1">
              {t('editor.elementEditor.plantedAt')}
            </Text>
            <CrossPlatformDatePicker
              value={plantedAt}
              onChange={setPlantedAt}
              testID="more-plantedAt"
            />
          </View>

          {/* Akzentfarbe */}
          <View>
            <Text className="text-xs text-stone-500 dark:text-stone-400 mb-1">
              {t('editor.elementEditor.accentColor')}
            </Text>
            <CrossPlatformColorPicker
              value={accentColor}
              onChange={setAccentColor}
              testID="more-accentColor"
            />
          </View>
        </View>
      )}
    </View>
  );
}
