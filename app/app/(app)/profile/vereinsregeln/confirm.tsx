// Vereinsregeln Confirm Screen — Plan 02-04 Task 2-04-02 Behaviors 7-10.
// D-08 ordering: BKleingG group FIRST (sticky/non-removable), user rules below.
// Scroll gate: Save button is DISABLED until the user has scrolled past the
// BKleingG section (measured via onLayout on the last BKleingG row).
//
// Bug-fix 2026-04-30: Bridge saved rules into profileStore so profile overview
// reflects persisted state. Surface save errors via inline banner.
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
import { Input } from '@/src/components/ui/input';
import { useAuthStore } from '@/src/stores/authStore';
import { useVereinsregelnStore } from '@/src/stores/vereinsregelnStore';
import { useProfileStore } from '@/src/stores/profileStore';
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

  const updateRule = useVereinsregelnStore((s) => s.updateRule);

  const bkleingGRules = rules.filter((r) => r.istBKleingG);
  const userRules = rules.filter((r) => !r.istBKleingG);

  const [bkleingGBottomY, setBkleingGBottomY] = React.useState<number>(0);
  const [scrolledPastBKleingG, setScrolledPastBKleingG] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Inline edit state — only one row is editable at a time. `draft` mirrors
  // the rule fields as text so numeric input can be partially typed.
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitel, setDraftTitel] = React.useState<string>('');
  const [draftWert, setDraftWert] = React.useState<string>('');
  const [draftEinheit, setDraftEinheit] = React.useState<string>('');

  const handleEdit = React.useCallback(
    (id: string) => {
      const rule = rules.find((r) => r.id === id);
      if (!rule || rule.istBKleingG) return;
      setEditingId(id);
      setDraftTitel(rule.titel);
      setDraftWert(rule.wert != null ? String(rule.wert) : '');
      setDraftEinheit(rule.einheit ?? '');
    },
    [rules],
  );

  const handleCancelEdit = React.useCallback(() => {
    setEditingId(null);
    setDraftTitel('');
    setDraftWert('');
    setDraftEinheit('');
  }, []);

  const handleSaveEdit = React.useCallback(() => {
    if (!editingId) return;
    const titel = draftTitel.trim();
    if (titel.length === 0) return;
    const wertParsed = draftWert.trim() === '' ? null : Number(draftWert);
    const wert =
      wertParsed != null && Number.isFinite(wertParsed) ? wertParsed : null;
    const einheit = draftEinheit.trim();
    const patch: Parameters<typeof updateRule>[1] = {
      titel,
      ...(wert != null ? { wert } : { wert: undefined }),
      ...(einheit.length > 0 ? { einheit } : { einheit: undefined }),
    };
    updateRule(editingId, patch);
    handleCancelEdit();
  }, [editingId, draftTitel, draftWert, draftEinheit, updateRule, handleCancelEdit]);

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
    setSaveError(null);
    try {
      await saveVereinsregeln(rules, mode, userId);
      // Bridge to profileStore so profile overview reflects the saved rules.
      useProfileStore.getState().setVereinsregeln(rules);
      router.back();
    } catch (e) {
      // Surface save error to the user instead of silently swallowing it.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'no_active_garden') {
        setSaveError('Kein aktiver Garten gefunden. Bitte starte die App neu.');
      } else {
        setSaveError('Speichern fehlgeschlagen. Bitte versuche es erneut.');
      }
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
                {editingId === r.id ? (
                  <View className="p-3 gap-2" testID={`user-row-${r.id}-edit`}>
                    <Text className="text-xs text-stone-500">
                      {t('rules.confirm.edit.titel_label')}
                    </Text>
                    <Input
                      value={draftTitel}
                      onChangeText={setDraftTitel}
                      accessibilityLabel={t('rules.confirm.edit.titel_label')}
                      testID={`user-row-${r.id}-edit-titel`}
                    />
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Text className="text-xs text-stone-500">
                          {t('rules.confirm.edit.wert_label')}
                        </Text>
                        <Input
                          value={draftWert}
                          onChangeText={setDraftWert}
                          keyboardType="numeric"
                          accessibilityLabel={t('rules.confirm.edit.wert_label')}
                          testID={`user-row-${r.id}-edit-wert`}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-stone-500">
                          {t('rules.confirm.edit.einheit_label')}
                        </Text>
                        <Input
                          value={draftEinheit}
                          onChangeText={setDraftEinheit}
                          accessibilityLabel={t('rules.confirm.edit.einheit_label')}
                          testID={`user-row-${r.id}-edit-einheit`}
                        />
                      </View>
                    </View>
                    <View className="flex-row gap-2 mt-1">
                      <Button
                        variant="outline"
                        onPress={handleCancelEdit}
                        testID={`user-row-${r.id}-edit-cancel`}
                        className="flex-1"
                      >
                        <Text className="text-stone-900 dark:text-stone-100">
                          {t('rules.confirm.edit.cancel')}
                        </Text>
                      </Button>
                      <Button
                        onPress={handleSaveEdit}
                        disabled={draftTitel.trim().length === 0}
                        testID={`user-row-${r.id}-edit-save`}
                        className="flex-1"
                      >
                        <Text className="text-white font-semibold">
                          {t('rules.confirm.edit.save')}
                        </Text>
                      </Button>
                    </View>
                  </View>
                ) : (
                  <VereinsregelRow
                    rule={r}
                    onToggle={toggleAktiv}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    testID={`user-row-${r.id}`}
                  />
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        {saveError ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-sm text-red-600 dark:text-red-400 mb-2"
            testID="vereinsregeln-confirm-error"
          >
            {saveError}
          </Text>
        ) : null}
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
