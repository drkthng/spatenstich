// Login — email/password sign-in.
// Pattern: 02-UI-SPEC.md §"Login" + 02-RESEARCH.md (generic error — never confirm account existence).
// T-2-02-02 mitigation: never branch on error.message; always show auth.login.error_generic.
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

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !data.session) {
        // Always generic — T-2-02-02: never reveal whether account exists.
        setError(t('auth.login.error_generic'));
        return;
      }
      useAuthStore.getState().setAccountMode(data.session.user.id);
    } catch {
      setError(t('auth.login.error_generic'));
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
        {t('auth.login.submit')}
      </Text>

      <View className="gap-2">
        <Label nativeID="login-email-label">E-Mail</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          testID="login-email"
          accessibilityLabelledBy="login-email-label"
        />
      </View>

      <View className="gap-2">
        <Label nativeID="login-password-label">Passwort</Label>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          testID="login-password"
          accessibilityLabelledBy="login-password-label"
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

      <Button onPress={onSubmit} disabled={loading || !email || !password} testID="login-submit">
        <Text className="text-white font-semibold">
          {loading ? t('common.loading') : t('auth.login.submit')}
        </Text>
      </Button>

      <View className="items-center mt-4">
        <Text
          accessibilityRole="link"
          onPress={() => router.replace('/(auth)/register')}
          className="text-sm text-[#4A7C59] dark:text-[#6BAA7E] min-h-[44px] py-3"
        >
          Noch kein Konto? Jetzt erstellen
        </Text>
      </View>
    </ScrollView>
  );
}
