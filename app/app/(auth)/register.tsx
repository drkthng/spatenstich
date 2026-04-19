// Registrierung — email/password sign-up.
// Pattern: 02-UI-SPEC.md §"Registrierung" + 02-RESEARCH.md (generic error — no account-exists leak).
// T-2-02-02 mitigation: never branch on error.message; always show error_generic.
import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) {
        // Generic — never reveal whether account exists (T-2-02-02).
        setError(t('auth.register.error_generic'));
        return;
      }
      if (data.session === null) {
        // Email confirmation required.
        router.replace('/(auth)/verify-email');
        return;
      }
      // Session issued directly — flip Zustand mode; onAuthStateChange updates AuthProvider identity.
      useAuthStore.getState().setAccountMode(data.session.user.id);
    } catch {
      setError(t('auth.register.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="flex-grow p-6 gap-4"
    >
      <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
        {t('auth.choice.create_account')}
      </Text>

      <View className="gap-2">
        <Label nativeID="register-email-label">E-Mail</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          testID="register-email"
          accessibilityLabelledBy="register-email-label"
        />
      </View>

      <View className="gap-2">
        <Label nativeID="register-password-label">Passwort</Label>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          testID="register-password"
          accessibilityLabelledBy="register-password-label"
        />
      </View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </Text>
      ) : null}

      <Button onPress={onSubmit} disabled={loading || !email || !password} testID="register-submit">
        <Text className="text-white font-semibold">
          {loading ? t('common.loading') : t('auth.register.submit')}
        </Text>
      </Button>

      <View className="items-center mt-4">
        <Text
          accessibilityRole="link"
          onPress={() => router.replace('/(auth)/login')}
          className="text-sm text-[#4A7C59] dark:text-[#6BAA7E] min-h-[44px] py-3"
        >
          Bereits ein Konto? Jetzt anmelden
        </Text>
      </View>
    </ScrollView>
  );
}
