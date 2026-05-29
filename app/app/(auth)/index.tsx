// Auth-Wahl — first screen for unidentified users (AUTH-05).
// Pattern: 02-UI-SPEC.md §"Auth-Wahl Screen". NFR-07: collapsible Haftungsausschluss in-screen.
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { UserPlus, LogIn, UsersRound, ChevronDown, ChevronUp } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import { AuthChoiceCard } from '@/src/components/AuthChoiceCard';

// Phase-2 inline i18n helper (no full i18n library yet; a later phase will swap this out).
// Keys like 'auth.choice.tagline' are read from the shared de.json bundle.
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function AuthChoiceScreen(): React.JSX.Element {
  const router = useRouter();
  const [disclaimerOpen, setDisclaimerOpen] = React.useState(false);

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
            icon={LogIn}
            title={t('auth.choice.login')}
            description={t('auth.choice.login_desc')}
            onPress={() => router.push('/(auth)/login')}
            testID="auth-choice-login"
          />
          <AuthChoiceCard
            icon={UsersRound}
            title={t('auth.choice.join_garden')}
            description={t('auth.choice.join_garden_desc')}
            onPress={() => router.push('/(auth)/join-by-code' as any)}
            testID="auth-choice-join"
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
