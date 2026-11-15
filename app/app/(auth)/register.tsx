// Registrierung — email/password sign-up.
// Pattern: 02-UI-SPEC.md §"Registrierung" + 02-RESEARCH.md (generic error — no account-exists leak).
// T-2-02-02 mitigation: never branch on error.message; always show error_generic.
import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { isInviteCode, MIN_PASSWORD, normalizeInviteCode } from '@/src/lib/nav/startRoute';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  // Phase 37 (NAV3-03): someone who was invited types the code here and lands in the
  // shared garden right after signing up.
  const [inviteCode, setInviteCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    setError(null);
    if (loading) return; // a second tap while the first is on its way
    if (inviteCode.trim() !== '' && !isInviteCode(inviteCode)) {
      setError(t('auth.register.code_invalid'));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t('auth.register.password_short'));
      return;
    }
    setLoading(true);
    // Kept until the first sign-in; redeemed before a garden of one's own is created.
    useAuthStore.getState().setPendingInviteCode(isInviteCode(inviteCode) ? normalizeInviteCode(inviteCode) : null);
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
      className="flex-1 bg-bg"
      contentContainerClassName="flex-grow p-6 gap-4"
    >
      <Text className="text-2xl font-display font-semibold text-ink mb-2">
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

      <Text className="text-xs text-ink-muted" testID="register-password-hint">
        {t('auth.register.password_hint')}
      </Text>

      <View className="gap-2">
        <Label nativeID="register-code-label">{t('auth.register.code_label')}</Label>
        <Input
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          placeholder={t('auth.join.code_placeholder')}
          testID="register-invite-code"
          accessibilityLabelledBy="register-code-label"
        />
        <Text className="text-xs text-ink-muted">{t('auth.register.code_hint')}</Text>
      </View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          testID="register-error"
          className="text-sm text-danger"
        >
          {error}
        </Text>
      ) : null}

      <Button onPress={onSubmit} disabled={loading || !email || !password} testID="register-submit">
        <Text className="text-on-primary font-semibold">
          {loading ? t('common.loading') : t('auth.register.submit')}
        </Text>
      </Button>

      <View className="items-center mt-4">
        <Text
          accessibilityRole="link"
          onPress={() => router.replace('/(auth)/login')}
          className="text-sm text-primary min-h-[44px] py-3"
        >
          Bereits ein Konto? Jetzt anmelden
        </Text>
      </View>
    </ScrollView>
  );
}
