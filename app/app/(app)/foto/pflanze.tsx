// Editing a catalog entry of the garden (Phase 35, PHOTO-05). Entries accepted from a
// photo finding belong to the garden; both members can correct them, and the change
// reaches palette and calendar on both devices.

import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { GardenPlantRow, PhotoCatalogProposal, PlantCategory } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { useGardenPlants } from '@/src/hooks/usePlants';
import { saveGardenPlant } from '@/src/lib/photo/photoRepo';
import { doyToMonth, monthWindowToDoy } from '@/src/lib/photo/gardenPlants';
import {
  CATALOG_FIELDS,
  catalogFormValues,
  fieldLabel,
  isNumericField,
  readCatalogForm,
} from '@/src/lib/photo/findingText';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

/** A stored entry in the shape of the form (windows as months). */
function toForm(row: GardenPlantRow): PhotoCatalogProposal {
  return {
    nameDe: row.nameDe,
    nameBotanical: row.nameBotanical,
    family: row.family,
    category: row.category as PlantCategory,
    sowStartMonth: doyToMonth(row.sowOutdoorDoyStart),
    sowEndMonth: doyToMonth(row.sowOutdoorDoyEnd),
    plantStartMonth: doyToMonth(row.plantDoyStart),
    plantEndMonth: doyToMonth(row.plantDoyEnd),
    harvestStartMonth: doyToMonth(row.harvestDoyStart),
    harvestEndMonth: doyToMonth(row.harvestDoyEnd),
    spacingCm: row.minSpacingCm,
  };
}

export default function GardenPlantEditScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mode = useAuthStore((s) => s.mode);
  const own = useGardenPlants();
  const row = own.find((p) => p.id === id || p.slug === id);

  const [values, setValues] = React.useState<Record<string, string> | null>(null);
  const [notes, setNotes] = React.useState('');
  const [state, setState] = React.useState<'idle' | 'saving' | 'saved' | 'invalid' | 'failed'>('idle');
  const loadedFor = React.useRef<string | null>(null);

  // Fill the form once per entry; a sync that arrives while typing does not overwrite it.
  React.useEffect(() => {
    if (row && loadedFor.current !== row.id) {
      loadedFor.current = row.id;
      setValues(catalogFormValues(toForm(row)));
      setNotes(row.notesDe ?? '');
    }
  }, [row]);

  const save = async (): Promise<void> => {
    if (!row || !values) return;
    const form = readCatalogForm(values, toForm(row));
    if (!form) {
      setState('invalid');
      return;
    }
    setState('saving');
    const sow = monthWindowToDoy(form.sowStartMonth, form.sowEndMonth);
    const plant = monthWindowToDoy(form.plantStartMonth, form.plantEndMonth);
    const harvest = monthWindowToDoy(form.harvestStartMonth, form.harvestEndMonth);
    try {
      const saved = await saveGardenPlant({
        ...row,
        // The slug stays: plants on the plan refer to it.
        nameDe: form.nameDe,
        nameBotanical: form.nameBotanical,
        family: form.family,
        minSpacingCm: form.spacingCm,
        sowOutdoorDoyStart: sow.start,
        sowOutdoorDoyEnd: sow.end,
        plantDoyStart: plant.start,
        plantDoyEnd: plant.end,
        harvestDoyStart: harvest.start,
        harvestDoyEnd: harvest.end,
        notesDe: notes.trim().slice(0, 2000) || null,
      });
      setState(saved ? 'saved' : 'failed');
    } catch {
      setState('failed');
    }
  };

  if (mode !== 'account') {
    return (
      <View className="flex-1 bg-bg px-4 pt-6" testID="garden-plant-screen">
        <Stack.Screen options={{ headerTitle: t('photo.plant.title') }} />
        <Text className="font-body text-base text-ink">{t('photo.accountOnly')}</Text>
      </View>
    );
  }

  if (!row || !values) {
    return (
      <View className="flex-1 bg-bg px-4 pt-6" testID="garden-plant-screen">
        <Stack.Screen options={{ headerTitle: t('photo.plant.title') }} />
        <Text className="font-body text-base text-ink-muted" testID="garden-plant-missing">
          {t('photo.plant.notFound')}
        </Text>
      </View>
    );
  }

  const change = (field: string, text: string): void => {
    setValues({ ...values, [field]: text });
    setState('idle');
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pt-4 pb-12" testID="garden-plant-screen">
      <Stack.Screen options={{ headerTitle: t('photo.plant.title') }} />
      <Text className="font-body text-sm text-ink-muted">{t('photo.plant.intro')}</Text>

      {CATALOG_FIELDS.map((field) => (
        <View key={field} className="mt-3">
          <Text className="font-body text-xs text-ink-muted mb-1">{fieldLabel(field)}</Text>
          <TextInput
            value={values[field] ?? ''}
            onChangeText={(text) => change(field, text)}
            inputMode={isNumericField(field) ? 'numeric' : 'text'}
            accessibilityLabel={fieldLabel(field)}
            className="min-h-[44px] px-3 py-2 border border-line bg-bg font-body text-base text-ink"
            testID={`garden-plant-field-${field}`}
          />
        </View>
      ))}

      <View className="mt-3">
        <Text className="font-body text-xs text-ink-muted mb-1">{t('photo.plant.notes')}</Text>
        <TextInput
          value={notes}
          onChangeText={(text) => {
            setNotes(text);
            setState('idle');
          }}
          multiline
          accessibilityLabel={t('photo.plant.notes')}
          className="min-h-[88px] px-3 py-2 border border-line bg-bg font-body text-base text-ink"
          testID="garden-plant-notes"
        />
      </View>

      {state === 'invalid' ? (
        <Text className="font-body text-sm text-danger mt-3" testID="garden-plant-invalid">
          {t('photo.plant.invalid')}
        </Text>
      ) : null}
      {state === 'failed' ? (
        <Text className="font-body text-sm text-danger mt-3" testID="garden-plant-failed">
          {t('photo.findings.problem.failed')}
        </Text>
      ) : null}
      {state === 'saved' ? (
        <Text className="font-body text-sm text-ink mt-3" testID="garden-plant-saved">
          {t('photo.plant.saved')}
        </Text>
      ) : null}

      <Pressable
        onPress={() => void save()}
        disabled={state === 'saving'}
        accessibilityRole="button"
        className={`self-start mt-4 min-h-[48px] px-5 flex-row items-center justify-center bg-primary ${state === 'saving' ? 'opacity-60' : ''}`}
        testID="garden-plant-save"
      >
        {state === 'saving' ? <ActivityIndicator color={tokens.color.onPrimary} /> : null}
        <Text className="font-body text-base text-on-primary">{t('photo.plant.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}
