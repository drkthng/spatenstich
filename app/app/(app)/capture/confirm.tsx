// Confirm Screen — element acceptance toggles after Claude Vision analysis.
// Phase 4 Plan 04 — D-06 toggle list, D-07 zero elements, PHOTO-05/PHOTO-08.
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import type { PlanElementCandidate } from '@spatenstich/shared';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { useCaptureStore } from '@/src/stores/captureStore';
import { saveElements } from '@/src/lib/gardenPlanRepo';
import { PlanElementRow } from '@/src/components/PlanElementRow';
import { InlineBanner } from '@/src/components/InlineBanner';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

type ElementWithAccept = PlanElementCandidate & { isAccepted: boolean };

export default function ConfirmScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);

  const [elements, setElements] = React.useState<ElementWithAccept[]>([]);
  const [aiResultId, setAiResultId] = React.useState<string | null>(null);
  const [budgetWarning, setBudgetWarning] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Load ai_results for the completed job
  React.useEffect(() => {
    if (!params.jobId) return;
    (async () => {
      try {
        const { data: result } = await supabase
          .from('ai_results')
          .select('parsed_result, id')
          .eq('job_id', params.jobId!)
          .single();

        if (result) {
          setAiResultId(result.id);
          const parsed = result.parsed_result as any;
          const rawElements: PlanElementCandidate[] = Array.isArray(parsed?.elements)
            ? parsed.elements
            : [];

          // D-06 auto-default: high/medium → accepted, low → rejected
          const withAccept: ElementWithAccept[] = rawElements.map((el: any) => ({
            elementType: el.element_type ?? el.elementType ?? 'Sonstiges',
            label: el.label ?? 'Unbekannt',
            xM: Number(el.x_m ?? el.xM ?? 0),
            yM: Number(el.y_m ?? el.yM ?? 0),
            widthM: Number(el.width_m ?? el.widthM ?? 1),
            heightM: Number(el.height_m ?? el.heightM ?? 1),
            confidence: (['high', 'medium', 'low'].includes(el.confidence)
              ? el.confidence
              : 'medium') as 'high' | 'medium' | 'low',
            isAccepted:
              el.confidence === 'low' ? false : true,
          }));
          setElements(withAccept);

          // Budget warning from parsed result
          if (parsed?._budget_warning === true) {
            setBudgetWarning(true);
          }
        }
      } catch (err) {
        console.error('confirm: load ai_results failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.jobId]);

  const toggleElement = (index: number) => {
    setElements((prev) =>
      prev.map((el, i) =>
        i === index ? { ...el, isAccepted: !el.isAccepted } : el,
      ),
    );
  };

  const allAccepted = elements.length > 0 && elements.every((e) => e.isAccepted);

  const toggleAll = () => {
    const newValue = !allAccepted;
    setElements((prev) => prev.map((el) => ({ ...el, isAccepted: newValue })));
  };

  const handleSubmit = async () => {
    if (!activeGardenId || !mode) return;
    setSubmitting(true);
    try {
      const accepted = elements.filter((e) => e.isAccepted);
      await saveElements(mode, activeGardenId, accepted, aiResultId);
      useCaptureStore.getState().reset();
      router.replace('/(app)/capture/plan' as any);
    } catch (err) {
      console.error('confirm: saveElements failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F9F7F4] dark:bg-[#1C1917]">
        <Text className="text-stone-500">...</Text>
      </View>
    );
  }

  // Zero elements case (PHOTO-08, D-07)
  if (elements.length === 0) {
    return (
      <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917] items-center justify-center px-6">
        <View className="w-20 h-20 rounded-full bg-stone-200 dark:bg-stone-700 items-center justify-center mb-4">
          <Sprout size={36} color="#78716C" />
        </View>
        <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100 text-center">
          {t('capture.confirm.empty_heading')}
        </Text>
        <Text className="text-sm text-stone-500 mt-2 text-center max-w-xs">
          {t('capture.confirm.empty_body')}
        </Text>
        <Pressable
          onPress={handleSubmit}
          accessibilityRole="button"
          className="mt-6 bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-lg px-6 py-3 min-h-[44px] items-center justify-center active:opacity-80"
        >
          <Text className="text-white font-semibold">
            {t('capture.confirm.empty_cta')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Budget warning */}
        {budgetWarning ? (
          <View className="mb-4">
            <InlineBanner
              message={t('capture.budget.soft_warning').replace('{n}', '50+')}
              onDismiss={() => setBudgetWarning(false)}
            />
          </View>
        ) : null}

        {/* Title + count */}
        <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100">
          {t('capture.confirm.title')}
        </Text>
        <Text className="text-sm text-stone-500 mt-1 mb-4">
          {t('capture.confirm.count').replace('{n}', String(elements.length))}
        </Text>

        {/* Select all / deselect all button */}
        <Pressable
          onPress={toggleAll}
          accessibilityRole="button"
          className="mb-4 rounded-lg border border-stone-300 dark:border-stone-600 py-2 px-4 min-h-[44px] items-center justify-center active:opacity-80"
        >
          <Text className="text-stone-900 dark:text-stone-100 font-semibold text-sm">
            {allAccepted
              ? t('capture.confirm.deselect_all')
              : t('capture.confirm.select_all')}
          </Text>
        </Pressable>

        {/* Element list */}
        {elements.map((el, index) => (
          <PlanElementRow
            key={index}
            element={el}
            onToggle={toggleElement}
            index={index}
            testID={`plan-element-row-${index}`}
          />
        ))}
      </ScrollView>

      {/* Footer CTA */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#F9F7F4] dark:bg-[#1C1917] border-t border-stone-200 dark:border-stone-700">
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          className={`w-full rounded-lg py-3 min-h-[44px] items-center justify-center ${
            submitting
              ? 'bg-stone-300 dark:bg-stone-600'
              : 'bg-[#4A7C59] dark:bg-[#6BAA7E] active:opacity-80'
          }`}
        >
          <Text
            className={`font-semibold ${
              submitting ? 'text-stone-400' : 'text-white'
            }`}
          >
            {t('capture.confirm.submit')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
