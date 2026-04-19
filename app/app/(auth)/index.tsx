// Auth-Wahl — first screen for unidentified users (AUTH-05).
// Pattern: 02-UI-SPEC.md §"Auth-Wahl Screen". NFR-07: collapsible Haftungsausschluss in-screen.
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { UserPlus, Smartphone, ChevronDown, ChevronUp } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import { AuthChoiceCard } from '@/src/components/AuthChoiceCard';
import { getOrCreateLocalUUID } from '@/src/lib/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { useAuth } from '@/src/lib/auth';

// Phase-2 inline i18n helper (no full i18n library yet; a later phase will swap this out).
// Keys like 'auth.choice.tagline' are read from the shared de.json bundle.
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function AuthChoiceScreen(): React.JSX.Element {
  const router = useRouter();
  const { switchToLocal } = useAuth();
  const [disclaimerOpen, setDisclaimerOpen] = React.useState(false);

  const handleLocal = React.useCallback(async () => {
    // Create / read local UUID, update Zustand mode (used by profileRepo), and flip
    // AuthProvider identity (drives Stack.Protected). switchToLocal calls
    // getOrCreateLocalUUID internally and sets context identity to local.
    const uuid = await getOrCreateLocalUUID();
    useAuthStore.getState().setLocalMode(uuid);
    await switchToLocal();
  }, [switchToLocal]);

  return (
    <ScrollView
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="flex-grow items-center justify-center p-6"
    >
      <View className="w-full max-w-md items-center">
        <Text className="text-3xl font-semibold text-stone-900 dark:text-stone-100">
          Spatenstich
        </Text>
        <Text className="text-sm text-stone-500 mt-2 mb-8 text-center">
          {t('auth.choice.tagline')}
        </Text>

        <View className="w-full gap-4">
          <AuthChoiceCard
            icon={UserPlus}
            title={t('auth.choice.create_account')}
            description="Daten in der Cloud, geräteübergreifend"
            onPress={() => router.push('/(auth)/register')}
            testID="auth-choice-account"
          />
          <AuthChoiceCard
            icon={Smartphone}
            title={t('auth.choice.local_start')}
            description="Daten nur auf diesem Gerät, kein Account nötig"
            onPress={handleLocal}
            testID="auth-choice-local"
          />
        </View>

        {/* Haftungsausschluss — NFR-07, collapsible (D-04). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.choice.disclaimer_label')}
          onPress={() => setDisclaimerOpen((v) => !v)}
          className="flex-row items-center mt-8 min-h-[44px] px-2 active:opacity-80"
        >
          <Text className="text-sm text-stone-600 dark:text-stone-300">
            {t('auth.choice.disclaimer_label')}
          </Text>
          {disclaimerOpen ? (
            <ChevronUp size={16} color="#78716C" />
          ) : (
            <ChevronDown size={16} color="#78716C" />
          )}
        </Pressable>
        {disclaimerOpen ? (
          <Text className="text-xs text-stone-500 mt-2 px-2 text-center">
            {t('common.disclaimer_body')}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
