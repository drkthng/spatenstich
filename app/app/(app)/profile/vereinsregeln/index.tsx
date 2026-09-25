// Vereinsregeln-Einstieg — Checkliste (PDF-Upload entfernt, Plan 20-02 D-05).
// Plan 02-04 Task 2-04-02 Behavior 2; UI-SPEC lines 169-172 (Pitfall 4 redirect).
import * as React from 'react';
import { Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import { AuthChoiceCard } from '@/src/components/AuthChoiceCard';

export default function VereinsregelnEntryScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="p-4 gap-4"
    >
      <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
        Vereinsregeln
      </Text>

      <AuthChoiceCard
        icon={ClipboardList}
        title="Checkliste ausfüllen"
        description="Typische Vereinsregeln manuell auswählen und Werte eintragen."
        onPress={() => router.push('/(app)/profile/vereinsregeln/checklist' as any)}
        testID="vereinsregeln-checklist"
      />
    </ScrollView>
  );
}
