// Vereinsregeln-Einstieg — Checkliste (PDF-Upload entfernt, Plan 20-02 D-05).
// Plan 02-04 Task 2-04-02 Behavior 2; UI-SPEC lines 169-172 (Pitfall 4 redirect).
import * as React from 'react';
import { Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import { AuthChoiceCard } from '@/src/components/AuthChoiceCard';
import { t as tx } from '@/src/lib/i18n';

export default function VereinsregelnEntryScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="p-4 gap-4"
    >
      <Text className="text-2xl font-display font-semibold text-ink">
        {tx('rules.title')}
      </Text>

      <AuthChoiceCard
        icon={ClipboardList}
        title={tx('rules.checklist.cardTitle')}
        description={tx('rules.checklist.cardHint')}
        onPress={() => router.push('/(app)/profile/vereinsregeln/checklist' as any)}
        testID="vereinsregeln-checklist"
      />
    </ScrollView>
  );
}
