// Dimensions Screen — shape selection + dimension input form + budget check.
// D-04: 4 shapes with dynamic fields. D-05: dimensions after photos.
// Phase 4 Plan 03 — UI-SPEC §"Shape Selection + Dimensions".
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { useAuthStore } from '@/src/stores/authStore';
import { useCaptureStore } from '@/src/stores/captureStore';
import { saveDimensions } from '@/src/lib/gardenPlanRepo';
import { enqueuePhoto } from '@/src/lib/photos/photoQueueRepo';
import { ShapeSelector, type GardenShape } from '@/src/components/ShapeSelector';
import { DimensionInput } from '@/src/components/DimensionInput';
import { BudgetWarningBanner } from '@/src/components/BudgetWarningBanner';
import { supabase } from '@/src/lib/supabase';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

function validateDim(value: string): string | undefined {
  const num = parseFloat(value);
  if (!value || isNaN(num) || num <= 0 || num > 200) {
    return t('capture.dimensions.error_range');
  }
  return undefined;
}

export default function DimensionsScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const photos = useCaptureStore((s) => s.photos);
  const resetCapture = useCaptureStore((s) => s.reset);

  const [shape, setShape] = React.useState<GardenShape>('rectangle');
  const [dims, setDims] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  // Budget pre-check
  const [budgetCount, setBudgetCount] = React.useState<number>(0);
  React.useEffect(() => {
    if (!activeGardenId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('garden_id', activeGardenId)
      .gte('created_at', today.toISOString())
      .then(({ count }) => {
        setBudgetCount(count ?? 0);
      });
  }, [activeGardenId]);

  const isBudgetHard = budgetCount >= 200;
  const isBudgetSoft = budgetCount >= 50 && budgetCount < 200;

  // Dynamic fields per shape
  const fields = React.useMemo((): { key: string; label: string }[] => {
    switch (shape) {
      case 'rectangle':
        return [
          { key: 'length', label: t('capture.dimensions.length') },
          { key: 'width', label: t('capture.dimensions.width') },
        ];
      case 'l_shape':
        return [
          { key: 'l_length_full', label: t('capture.dimensions.l_length_full') },
          { key: 'l_width_full', label: t('capture.dimensions.l_width_full') },
          { key: 'l_cutout_length', label: t('capture.dimensions.l_cutout_length') },
          { key: 'l_cutout_width', label: t('capture.dimensions.l_cutout_width') },
        ];
      case 'trapezoid':
        return [
          { key: 'trapez_top', label: t('capture.dimensions.trapez_top') },
          { key: 'trapez_bottom', label: t('capture.dimensions.trapez_bottom') },
          { key: 'depth', label: t('capture.dimensions.depth') },
        ];
      case 'freehand':
        return [
          { key: 'length', label: t('capture.dimensions.length') },
          { key: 'width', label: t('capture.dimensions.width') },
        ];
    }
  }, [shape]);

  const updateDim = (key: string, value: string) => {
    setDims((prev) => ({ ...prev, [key]: value }));
    // Clear error on edit
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      const err = validateDim(dims[field.key] ?? '');
      if (err) newErrors[field.key] = err;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasValidDimensions = fields.every((f) => {
    const val = parseFloat(dims[f.key] ?? '');
    return !isNaN(val) && val > 0 && val <= 200;
  });

  const canSubmit = hasValidDimensions && !isBudgetHard && !submitting;

  const handleSubmit = React.useCallback(async () => {
    if (!validateAll()) return;
    if (!activeGardenId || !mode) return;
    setSubmitting(true);

    try {
      // Determine widthM/heightM based on shape
      let widthM: number;
      let heightM: number;
      let extraDims: Record<string, unknown> | null = null;

      switch (shape) {
        case 'rectangle':
          widthM = parseFloat(dims['width']);
          heightM = parseFloat(dims['length']);
          break;
        case 'l_shape':
          widthM = parseFloat(dims['l_width_full']);
          heightM = parseFloat(dims['l_length_full']);
          extraDims = {
            cutoutLength: parseFloat(dims['l_cutout_length']),
            cutoutWidth: parseFloat(dims['l_cutout_width']),
          };
          break;
        case 'trapezoid':
          widthM = Math.max(
            parseFloat(dims['trapez_top']),
            parseFloat(dims['trapez_bottom']),
          );
          heightM = parseFloat(dims['depth']);
          extraDims = {
            topSide: parseFloat(dims['trapez_top']),
            bottomSide: parseFloat(dims['trapez_bottom']),
          };
          break;
        case 'freehand':
          widthM = parseFloat(dims['width']);
          heightM = parseFloat(dims['length']);
          extraDims = { freehand: true };
          break;
      }

      // 1. Save dimensions
      await saveDimensions(mode, activeGardenId, {
        shape,
        widthM,
        heightM,
        extraDims,
      });

      // 2. Enqueue all photos (geoOptIn = false for now, conservative default)
      for (const uri of photos) {
        await enqueuePhoto(activeGardenId, uri, false);
      }

      // 3. Reset capture store and navigate to analysing screen
      resetCapture();
      router.push('/(app)/capture/analysing' as any);
    } catch (err) {
      console.error('dimensions submit failed', err);
    } finally {
      setSubmitting(false);
    }
  }, [shape, dims, activeGardenId, mode, photos, resetCapture, router]);

  return (
    <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Title */}
        <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          {t('capture.dimensions.title')}
        </Text>

        {/* Shape selector */}
        <Text className="text-base font-semibold text-stone-700 dark:text-stone-200 mb-3">
          {t('capture.dimensions.shape_heading')}
        </Text>
        <ShapeSelector selected={shape} onSelect={setShape} />

        {/* Dynamic dimension fields */}
        <View className="mt-6">
          {shape === 'freehand' ? (
            <View className="mb-4">
              <Text className="text-sm text-stone-500 mb-3">
                {t('capture.dimensions.freehand_hint')}
              </Text>
              {/* Simplified freehand: just width + height for MVP bounding box */}
            </View>
          ) : null}

          {fields.map((field) => (
            <DimensionInput
              key={field.key}
              label={field.label}
              value={dims[field.key] ?? ''}
              onChangeText={(v) => updateDim(field.key, v)}
              error={errors[field.key]}
            />
          ))}
        </View>

        {/* Budget warnings */}
        {isBudgetSoft ? (
          <View className="mt-4">
            <BudgetWarningBanner count={budgetCount} variant="soft" />
          </View>
        ) : null}
        {isBudgetHard ? (
          <View className="mt-4">
            <BudgetWarningBanner count={budgetCount} variant="hard" />
          </View>
        ) : null}
      </ScrollView>

      {/* Footer CTA */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#F9F7F4] dark:bg-[#1C1917] border-t border-stone-200 dark:border-stone-700">
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          className={`w-full rounded-lg py-3 min-h-[44px] items-center justify-center ${
            canSubmit
              ? 'bg-[#4A7C59] dark:bg-[#6BAA7E] active:opacity-80'
              : 'bg-stone-300 dark:bg-stone-600'
          }`}
        >
          <Text
            className={`font-semibold ${
              canSubmit ? 'text-white' : 'text-stone-400'
            }`}
          >
            {t('capture.dimensions.submit')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
