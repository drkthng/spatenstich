// Vereinsregeln Confirm Screen — Plan 02-04 Task 2-04-02 Behaviors 7-10.
// D-08 ordering: BKleingG group FIRST (sticky/non-removable), user rules below.
// Scroll gate: Save button is DISABLED until the user has scrolled past the
// BKleingG section (measured via onLayout on the last BKleingG row).
import * as React from 'react';
import {
  View,
  Text,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { VereinsregelRow } from '@/src/components/VereinsregelRow';
import { Button } from '@/src/components/ui/button';
import { useAuthStore } from '@/src/stores/authStore';
import { useVereinsregelnStore } from '@/src/stores/vereinsregelnStore';
import { useVereinsregeln } from '@/src/hooks/useVereinsregeln';
import {
  saveVereinsregeln,
  deleteVereinsregel,
} from '@/src/lib/vereinsregelnRepo';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function VereinsregelnConfirmScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.userId);

  // Subscribe to the store for reactive re-renders on toggle/remove.
  // useVereinsregeln hydrates from the repo on mount if the store is empty.
  useVereinsregeln();
  const rules = useVereinsregelnStore((s) => s.rules);
  const toggleAktiv = useVereinsregelnStore((s) => s.toggleAktiv);
  const removeRule = useVereinsregelnStore((s) => s.removeRule);

  const bkleingGRules = rules.filter((r) => r.istBKleingG);
  const userRules = rules.filter((r) => !r.istBKleingG);

  const [bkleingGBottomY, setBkleingGBottomY] = React.useState<number>(0);
  const [scrolledPastBKleingG, setScrolledPastBKleingG] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const onLastBkLayout = React.useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setBkleingGBottomY(y + height);
  }, []);

  const onScroll = React.useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = e.nativeEvent;
      // User has "scrolled past" once the viewport bottom exceeds the BKleingG
      // section's bottom y coordinate.
      if (
        bkleingGBottomY > 0 &&
        contentOffset.y + layoutMeasurement.height >= bkleingGBottomY
      ) {
        setScrolledPastBKleingG(true);
      }
    },
    [bkleingGBottomY],
  );

  // If the BKleingG section already fits entirely on the initial screen, enable
  // the Save button without requiring a scroll (short PDFs / Checklist flows).
  React.useEffect(() => {
    if (bkleingGBottomY > 0 && bkleingGBottomY < 400) {
      setScrolledPastBKleingG(true);
    }
  }, [bkleingGBottomY]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      if (!mode || !userId) return;
      removeRule(id); // optimistic — client guard keeps BKleingG anyway
      try {
        await deleteVereinsregel(id, mode, userId);
      } catch {
        // Keep the UI state; a subsequent save will reconcile.
      }
    },
    [mode, userId, removeRule],
  );

  const handleSave = React.useCallback(async () => {
    if (!mode || !userId) return;
    setSaving(true);
    try {
      await saveVereinsregeln(rules, mode, userId);
      router.back();
    } catch {
      // Keep user on screen; UI does not currently show a generic save error
      // banner. Future enhancement per deferred items.
    } finally {
      setSaving(false);
    }
  }, [rules, mode, userId, router]);

  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900">
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerClassName="p-4 gap-4"
      >
        {/* BKleingG group — ALWAYS first (D-08, RULES-04) */}
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-stone-500">
            {t('rules.confirm.bkleingg_group')}
          </Text>
          {bkleingGRules.map((r, idx) => (
            <View
              key={r.id}
              onLayout={idx === bkleingGRules.length - 1 ? onLastBkLayout : undefined}
              className="bg-stone-200 dark:bg-stone-800 rounded-lg"
            >
              <VereinsregelRow rule={r} testID={`bk-row-${r.id}`} />
            </View>
          ))}
        </View>

        {/* User rules group */}
        <View className="gap-2 mt-4">
          <Text className="text-xs font-semibold uppercase text-stone-500">
            {t('rules.confirm.user_group')}
          </Text>
          {userRules.length === 0 ? (
            <View className="p-4 gap-3 bg-stone-200 dark:bg-stone-800 rounded-lg">
              <Text className="text-sm text-stone-700 dark:text-stone-200">
                {t('rules.confirm.empty')}
              </Text>
              <Button
                variant="outline"
                onPress={() =>
                  router.replace('/(app)/profile/vereinsregeln/checklist' as any)
                }
                testID="vereinsregeln-confirm-empty-cta"
              >
                <Text className="text-stone-900 dark:text-stone-100 font-semibold">
                  {t('rules.confirm.empty_cta')}
                </Text>
              </Button>
            </View>
          ) : (
            userRules.map((r) => (
              <View
                key={r.id}
                className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700"
              >
                <VereinsregelRow
                  rule={r}
                  onToggle={toggleAktiv}
                  onDelete={handleDelete}
                  testID={`user-row-${r.id}`}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        <Button
          onPress={handleSave}
          disabled={!scrolledPastBKleingG || saving}
          testID="vereinsregeln-confirm-save"
        >
          <Text className="text-white font-semibold">
            {saving ? t('common.loading') : t('rules.confirm.submit')}
          </Text>
        </Button>
      </View>
    </View>
  );
}
