// Quick 260616-mh4: Manueller "Garten anlegen"-Weg.
// Neuer Screen /(app)/plan/new — Form Breite/Höhe → saveDimensions → router.replace('/(app)/plan').
// Erweiterte Formen l_shape/trapezoid/freehand: deferred (MVP rectangle-only).

import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { useAuthStore } from '@/src/stores/authStore';
import { saveDimensions } from '@/src/lib/gardenPlanRepo';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

/** Parst einen Dezimal-String (deutsches Komma toleriert) zu einer Zahl. */
function parseDim(s: string): number {
  return parseFloat(s.replace(',', '.'));
}

/** Prüft ob eine geparste Dimension im erlaubten Bereich liegt (0,5–100 m). */
function isDimValid(value: number): boolean {
  return isFinite(value) && value >= 0.5 && value <= 100;
}

export default function NewGardenScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);

  const [widthInput, setWidthInput] = React.useState('10');
  const [heightInput, setHeightInput] = React.useState('5');
  const [saving, setSaving] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const widthVal = parseDim(widthInput);
  const heightVal = parseDim(heightInput);
  const widthValid = isDimValid(widthVal);
  const heightValid = isDimValid(heightVal);
  const formValid = widthValid && heightValid;

  const isLocalMode = mode !== 'account';

  const onCreate = async (): Promise<void> => {
    setSubmitted(true);
    // Lokal-Modus-Guard: kein Aufruf, kein Crash
    if (isLocalMode || !activeGardenId) return;
    // Validierungs-Guard
    if (!formValid) return;
    setSaving(true);
    try {
      await saveDimensions(mode, activeGardenId, {
        shape: 'rectangle',
        widthM: parseDim(widthInput),
        heightM: parseDim(heightInput),
        extraDims: null,
      });
      router.replace('/(app)/plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="flex-grow p-6 gap-4"
    >
      <Stack.Screen options={{ headerTitle: t('plan.new.title') }} />

      <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
        {t('plan.new.title')}
      </Text>
      <Text className="text-sm text-stone-600 dark:text-stone-300 mb-2">
        {t('plan.new.intro')}
      </Text>

      {/* Lokal-Modus-Hinweis */}
      {isLocalMode ? (
        <View testID="account-required-hint">
          <Text className="text-sm text-amber-700 dark:text-amber-400 mb-2">
            {t('plan.new.account_required')}
          </Text>
          <Button
            variant="outline"
            onPress={() => router.push('/(app)/settings' as any)}
            testID="account-required-settings-cta"
          >
            <Text className="font-semibold text-stone-700 dark:text-stone-200">
              {t('plan.new.account_required_cta')}
            </Text>
          </Button>
        </View>
      ) : null}

      {/* Eingabe-Felder */}
      <View className="gap-2">
        <Label nativeID="garden-width-label">{t('plan.new.widthLabel')}</Label>
        <Input
          value={widthInput}
          onChangeText={setWidthInput}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="10"
          testID="garden-width-input"
          accessibilityLabelledBy="garden-width-label"
        />
      </View>

      <View className="gap-2">
        <Label nativeID="garden-height-label">{t('plan.new.heightLabel')}</Label>
        <Input
          value={heightInput}
          onChangeText={setHeightInput}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="5"
          testID="garden-height-input"
          accessibilityLabelledBy="garden-height-label"
        />
      </View>

      {/* Inline-Fehler nach erstem Submit-Versuch */}
      {submitted && !formValid && !isLocalMode ? (
        <Text
          testID="garden-dims-error"
          accessibilityLiveRegion="polite"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {t('plan.new.error_invalid')}
        </Text>
      ) : null}

      <Button
        onPress={onCreate}
        disabled={saving}
        testID="create-garden-submit"
      >
        <Text className="text-white font-semibold">
          {saving ? t('common.loading') : t('plan.new.submit')}
        </Text>
      </Button>
    </ScrollView>
  );
}
