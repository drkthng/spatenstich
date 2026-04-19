// Vereinsregeln-Einstieg — choose between PDF upload and Checkliste.
// Plan 02-04 Task 2-04-02 Behavior 1+2; UI-SPEC lines 169-172 (Pitfall 4 redirect).
//
// account mode → both AuthChoiceCard-style cards active.
// local mode   → PDF upload card is disabled (lock icon, stone-400) with an
//                 inline info block and "Account erstellen" link — NO modal.
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText, ClipboardList, Lock, UserPlus } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import { AuthChoiceCard } from '@/src/components/AuthChoiceCard';
import { useAuthStore } from '@/src/stores/authStore';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function VereinsregelnEntryScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const [showLocalInfo, setShowLocalInfo] = React.useState(false);
  const isLocal = mode === 'local';

  return (
    <ScrollView
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="p-4 gap-4"
    >
      <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
        Vereinsregeln
      </Text>

      {isLocal ? (
        <Pressable
          onPress={() => setShowLocalInfo((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="PDF-Upload nicht verfügbar in Lokal-Modus"
          testID="vereinsregeln-upload-disabled"
          className="min-h-[120px] bg-stone-100 dark:bg-stone-800 rounded-2xl p-6 border border-stone-300 dark:border-stone-700"
        >
          <View className="flex-row items-start gap-4">
            <View className="w-16 h-16 items-center justify-center">
              <Lock size={56} color="#A8A29E" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-semibold text-stone-400">
                PDF hochladen
              </Text>
              <Text className="text-sm text-stone-400 mt-1">
                Nur mit Account verfügbar
              </Text>
            </View>
          </View>
        </Pressable>
      ) : (
        <AuthChoiceCard
          icon={FileText}
          title="PDF hochladen"
          description="Vereinssatzung als PDF oder Foto — die App extrahiert die Regeln."
          onPress={() => router.push('/(app)/profile/vereinsregeln/upload' as any)}
          testID="vereinsregeln-upload-active"
        />
      )}

      {isLocal && showLocalInfo ? (
        <View className="p-4 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 gap-2">
          <Text className="text-sm text-stone-800 dark:text-stone-100">
            {t('rules.upload.local_disabled')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/register' as any)}
            className="min-h-[44px] flex-row items-center gap-2"
          >
            <UserPlus size={16} color="#4A7C59" />
            <Text className="text-sm font-semibold text-[#4A7C59] dark:text-[#6BAA7E]">
              Account erstellen
            </Text>
          </Pressable>
        </View>
      ) : null}

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
