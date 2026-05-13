// Phase 7 Plan 05: Modal for plant-draft → bed selection. RN <Modal> (no expo-router).
// Pattern: ImportEntityCard.tsx (Card + testID-per-item) + DraftReviewCard's Annehmen/Verwerfen footer.

import * as React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import type { PlanElementRow } from '@spatenstich/shared';
import { Card, CardHeader, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export interface BedPickerModalProps {
  visible: boolean;
  beds: PlanElementRow[];
  onPick: (bed: PlanElementRow) => void;
  onCancel: () => void;
}

export function BedPickerModal({
  visible,
  beds,
  onPick,
  onCancel,
}: BedPickerModalProps): React.JSX.Element | null {
  const [selected, setSelected] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!visible) setSelected(null);
  }, [visible]);

  if (!visible) return null;

  const empty = beds.length === 0;
  const selectedBed = selected ? (beds.find((b) => b.id === selected) ?? null) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/30">
        <View
          testID="bed-picker-modal"
          className="w-11/12 max-w-md bg-stone-100 dark:bg-stone-800 rounded-lg p-6"
        >
          <Text className="text-lg font-semibold text-stone-700 dark:text-stone-200 mb-4">
            {t('editor.tray.applyPlantModalTitle')}
          </Text>

          {empty ? (
            <Text
              className="text-sm text-stone-500 dark:text-stone-400 mb-6"
              testID="bed-picker-empty"
            >
              {t('editor.tray.applyPlantModalEmpty')}
            </Text>
          ) : (
            <ScrollView className="max-h-72 mb-4">
              {beds.map((b) => (
                <Pressable
                  key={b.id}
                  testID={`bed-picker-${b.id}`}
                  onPress={() => setSelected(b.id)}
                  className={`mb-2 rounded-md ${
                    selected === b.id
                      ? 'border-2 border-[#4A7C59]'
                      : 'border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <Card>
                    <CardHeader>
                      <Text className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                        {b.label && b.label.length > 0 ? b.label : b.elementType}
                      </Text>
                    </CardHeader>
                    <CardContent>
                      <Text className="text-xs text-stone-500 dark:text-stone-400">
                        {b.widthM.toFixed(2)} × {b.heightM.toFixed(2)} m
                      </Text>
                    </CardContent>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View className="flex-row justify-end">
            <Button
              variant="outline"
              onPress={onCancel}
              testID="bed-picker-cancel"
              className="mr-2"
            >
              <Text className="text-stone-700 dark:text-stone-200">
                {t('editor.tray.applyPlantCancel')}
              </Text>
            </Button>
            <Button
              variant="default"
              onPress={() => selectedBed && onPick(selectedBed)}
              disabled={!selected}
              testID="bed-picker-confirm"
            >
              <Text className="text-white font-semibold">{t('editor.tray.applyPlantConfirm')}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
