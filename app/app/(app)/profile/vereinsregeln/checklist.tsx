// Vereinsregeln Checklist Screen — Plan 02-04 Task 2-04-02 Behavior 11.
// User toggles entries from STANDARD_VEREINSREGELN_CHECKLIST and optionally
// tweaks the numeric value; on save, selected items become VereinsRegel rows
// (istBKleingG=false) and are persisted via the repo (account -> Supabase,
// local -> StorageAdapter).
//
// Bug-fix 2026-04-30: Bridge saved rules into profileStore so profile overview
// reflects persisted state.
//
// Deviation from plan: packages/shared's VereinsregelChecklistItem does NOT
// carry a 'kategorie' field (defined in Plan 02-01 without it). Grouping into
// 7 categories is therefore impossible without extending the shared type --
// a change out of scope here. The checklist renders as a flat list with each
// item's own label; the 7-category grouping is deferred to a future plan that
// extends the shared shape. See SUMMARY.md Deviations.
import * as React from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import {
  STANDARD_VEREINSREGELN_CHECKLIST,
  type VereinsregelChecklistItem,
  type VereinsRegel,
} from '@spatenstich/shared';
import de from '@spatenstich/shared/i18n/de';
import { Button } from '@/src/components/ui/button';
import { useAuthStore } from '@/src/stores/authStore';
import { useProfileStore } from '@/src/stores/profileStore';
import { useVereinsregeln } from '@/src/hooks/useVereinsregeln';
import { saveVereinsregeln } from '@/src/lib/vereinsregelnRepo';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface Row {
  item: VereinsregelChecklistItem;
  checked: boolean;
  wert: string;
}

export default function VereinsregelnChecklistScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.userId);
  const { rules: existingRules } = useVereinsregeln();

  const [rows, setRows] = React.useState<Row[]>(() =>
    STANDARD_VEREINSREGELN_CHECKLIST.map((item) => ({
      item,
      checked: false,
      wert: item.defaultWert != null ? String(item.defaultWert) : '',
    })),
  );
  const [saving, setSaving] = React.useState(false);

  const toggleRow = React.useCallback((id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.item.id === id ? { ...r, checked: !r.checked } : r,
      ),
    );
  }, []);

  const setRowWert = React.useCallback((id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.item.id === id ? { ...r, wert: value } : r)),
    );
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!mode || !userId) return;
    setSaving(true);
    try {
      const newRules: VereinsRegel[] = rows
        .filter((r) => r.checked)
        .map((r) => ({
          id: randomId('chk'),
          titel: r.item.label,
          wert: r.wert.trim() !== '' ? Number(r.wert) : undefined,
          einheit: r.item.einheit,
          istBKleingG: false,
          aktiv: true,
          source: 'checklist',
        }));
      const keptBK = existingRules.filter((r) => r.istBKleingG);
      // Keep any existing user rules (e.g. PDF extractions) AND append the
      // newly-checked checklist items — additive, not destructive.
      const keptUser = existingRules.filter((r) => !r.istBKleingG);
      const merged = [...keptBK, ...keptUser, ...newRules];
      await saveVereinsregeln(merged, mode, userId);
      // Bridge to profileStore so profile overview reflects the saved rules.
      useProfileStore.getState().setVereinsregeln(merged);
      router.replace('/(app)/profile/vereinsregeln/confirm' as any);
    } finally {
      setSaving(false);
    }
  }, [rows, mode, userId, existingRules, router]);

  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900">
      <ScrollView contentContainerClassName="p-4 gap-3">
        <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Checkliste
        </Text>
        <Text className="text-sm text-stone-600 dark:text-stone-300">
          Wähle zutreffende Regeln aus deiner Vereinssatzung und trage Werte ein.
        </Text>

        {rows.map((row) => (
          <View
            key={row.item.id}
            className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 p-3 gap-2"
          >
            <Pressable
              onPress={() => toggleRow(row.item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: row.checked }}
              testID={`checklist-toggle-${row.item.id}`}
              className="flex-row items-center gap-3 min-h-[44px]"
            >
              <View
                className={`w-6 h-6 rounded border-2 items-center justify-center ${
                  row.checked
                    ? 'bg-[#4A7C59] border-[#4A7C59]'
                    : 'border-stone-400 dark:border-stone-500'
                }`}
              >
                {row.checked ? <Check size={14} color="white" /> : null}
              </View>
              <Text className="flex-1 text-base text-stone-900 dark:text-stone-100">
                {row.item.label}
              </Text>
            </Pressable>
            {row.checked && row.item.einheit ? (
              <View className="flex-row items-center gap-2 ml-9">
                <TextInput
                  value={row.wert}
                  onChangeText={(v) => setRowWert(row.item.id, v)}
                  keyboardType="numeric"
                  accessibilityLabel={`Wert für ${row.item.label}`}
                  testID={`checklist-input-${row.item.id}`}
                  className="min-h-[40px] min-w-[80px] px-3 rounded border border-stone-300 dark:border-stone-600 text-base text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900"
                />
                <Text className="text-sm text-stone-600 dark:text-stone-300">
                  {row.item.einheit}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        <Button
          onPress={handleSave}
          disabled={saving}
          testID="vereinsregeln-checklist-save"
        >
          <Text className="text-white font-semibold">
            {saving ? t('common.loading') : t('rules.confirm.submit')}
          </Text>
        </Button>
      </View>
    </View>
  );
}
