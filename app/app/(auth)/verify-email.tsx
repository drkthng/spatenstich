// Verify-Email — info screen shown after sign-up when Supabase requires confirmation.
// Pattern: 02-UI-SPEC.md §"Verify-Email Screen".
import * as React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import { Button } from '@/src/components/ui/button';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function VerifyEmailScreen(): React.JSX.Element {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-stone-900 p-6 gap-4">
      <Mail size={64} color="#78716C" />
      <Text className="text-xl font-semibold text-stone-900 dark:text-stone-100 text-center">
        E-Mail bestätigen
      </Text>
      <Text className="text-sm text-stone-600 dark:text-stone-300 text-center max-w-md">
        {t('auth.register.verify_email')}
      </Text>
      <Button onPress={() => router.replace('/(auth)/login')} testID="verify-email-to-login">
        <Text className="text-white font-semibold">Zur Anmeldung</Text>
      </Button>
    </View>
  );
}
