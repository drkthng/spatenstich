// Verify-Email — info screen shown after sign-up when Supabase requires confirmation.
// Pattern: 02-UI-SPEC.md §"Verify-Email Screen".
import { tokens } from '@/src/theme/tokens';
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
    <View className="flex-1 items-center justify-center bg-bg p-6 gap-4">
      <Mail size={64} color={tokens.color.inkMuted} />
      <Text className="text-xl font-display font-semibold text-ink text-center">
        E-Mail bestätigen
      </Text>
      <Text className="text-sm text-ink-muted text-center max-w-md">
        {t('auth.register.verify_email')}
      </Text>
      <Button onPress={() => router.replace('/(auth)/login')} testID="verify-email-to-login">
        <Text className="text-on-primary font-semibold">Zur Anmeldung</Text>
      </Button>
    </View>
  );
}
