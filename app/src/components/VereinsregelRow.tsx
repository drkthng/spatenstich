// VereinsregelRow — single Vereinsregel row for confirm/checklist screens.
// Plan 02-04 Task 2-04-02 + UI-SPEC §"Component Contract" §"Rule row states".
//
// Branching on istBKleingG:
//   istBKleingG === true  →  stone-400 text + Lock icon + NO Switch (RULES-04 UI guard)
//   istBKleingG === false →  full-opacity text + Switch + Pencil edit button + Trash
//                            delete button (tap fallback — swipe gesture deferred;
//                            react-native-gesture-handler not in stack).
import * as React from 'react';
import { View, Switch, Pressable, Text } from 'react-native';
import { Lock, Pencil, Trash2 } from 'lucide-react-native';
import type { VereinsRegel } from '@spatenstich/shared';

export interface VereinsregelRowProps {
  rule: VereinsRegel;
  onToggle?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  testID?: string;
}

export function VereinsregelRow({
  rule,
  onToggle,
  onEdit,
  onDelete,
  testID,
}: VereinsregelRowProps): React.JSX.Element {
  // RULES-04 UI guard: BKleingG rules render without any interactive control
  // except the lock icon supplementing the stone-400 text.
  if (rule.istBKleingG) {
    return (
      <View
        testID={testID}
        className="flex-row items-center gap-3 py-3 px-3 min-h-[52px]"
      >
        <Lock size={14} color="#A8A29E" accessibilityLabel="BKleingG-Grundregel, nicht deaktivierbar" />
        <View className="flex-1">
          <Text className="text-base text-stone-400">{rule.titel}</Text>
          {rule.wert != null ? (
            <Text className="text-xs text-stone-400">
              {rule.wert} {rule.einheit ?? ''}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  // User rule — interactive row.
  return (
    <View
      testID={testID}
      className="flex-row items-center gap-3 py-3 px-3 min-h-[52px]"
    >
      <Switch
        value={rule.aktiv}
        onValueChange={() => onToggle?.(rule.id)}
        accessibilityLabel={`Regel ${rule.titel} aktiv`}
      />
      <View className="flex-1">
        <Text className="text-base text-stone-900 dark:text-stone-100">
          {rule.titel}
        </Text>
        {rule.wert != null ? (
          <Text className="text-xs text-stone-500">
            {rule.wert} {rule.einheit ?? ''}
          </Text>
        ) : null}
      </View>
      {onEdit ? (
        <Pressable
          onPress={() => onEdit(rule.id)}
          accessibilityRole="button"
          accessibilityLabel="Regel bearbeiten"
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          hitSlop={8}
        >
          <Pencil size={18} color="#78716C" />
        </Pressable>
      ) : null}
      {onDelete ? (
        <Pressable
          onPress={() => onDelete(rule.id)}
          accessibilityRole="button"
          accessibilityLabel="Regel löschen"
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          hitSlop={8}
        >
          <Trash2 size={18} color="#DC2626" />
        </Pressable>
      ) : null}
    </View>
  );
}
