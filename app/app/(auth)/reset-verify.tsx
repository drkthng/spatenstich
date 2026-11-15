// Password reset, step 2 (Phase 37, NAV3-04): the six-digit code from the e-mail and a
// new password. Everything happens in the app, so it also works in the installed app
// without a detour through the browser.

import * as React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { isResetCode, MIN_PASSWORD } from '@/src/lib/nav/startRoute';
import { t } from '@/src/lib/i18n';

const input = 'min-h-[48px] px-3 py-2 border border-line bg-bg font-body text-lg text-ink';

export default function ResetVerifyScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = React.useState(params.email ?? '');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (): Promise<void> => {
    if (busy) return;
    if (!isResetCode(code)) {
      setError(t('auth.reset.codeInvalid'));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t('auth.register.password_short'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const verified = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
      if (verified.error || !verified.data.session) {
        setError(t('auth.reset.codeWrong'));
        setBusy(false);
        return;
      }
      const updated = await supabase.auth.updateUser({ password });
      if (updated.error) {
        setError(t('auth.reset.failed'));
        setBusy(false);
        return;
      }
      // Signed in with the new password: the guard takes it from here.
      useAuthStore.getState().setAccountMode(verified.data.session.user.id);
    } catch {
      setError(t('auth.reset.failed'));
      setBusy(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="flex-grow px-6 pt-10 pb-10"
      keyboardShouldPersistTaps="handled"
      testID="reset-verify"
    >
      <View style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Text className="font-display text-3xl text-ink">{t('auth.reset.title')}</Text>
        <Text className="font-body text-base text-ink-muted mt-2">{t('auth.reset.verifyIntro')}</Text>
        <Text className="font-body text-xs text-ink-muted mt-2">{t('auth.reset.noCodeHint')}</Text>

        <Text className="font-body text-sm text-ink mt-6 mb-1">{t('auth.reset.email')}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          inputMode="email"
          autoCapitalize="none"
          autoComplete="email"
          accessibilityLabel={t('auth.reset.email')}
          className={input}
          testID="reset-verify-email"
        />

        <Text className="font-body text-sm text-ink mt-4 mb-1">{t('auth.reset.code')}</Text>
        <TextInput
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          accessibilityLabel={t('auth.reset.code')}
          className={`${input} tracking-widest`}
          testID="reset-code"
        />

        <Text className="font-body text-sm text-ink mt-4 mb-1">{t('auth.reset.newPassword')}</Text>
        <View className="flex-row gap-2">
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoComplete="new-password"
            accessibilityLabel={t('auth.reset.newPassword')}
            className={`${input} flex-1`}
            testID="reset-password"
          />
          <Pressable
            onPress={() => setShow((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={show ? t('auth.reset.hidePassword') : t('auth.reset.showPassword')}
            className="min-h-[48px] px-3 items-center justify-center border border-line"
            testID="reset-password-toggle"
          >
            <Text className="font-body text-sm text-ink">{show ? t('auth.reset.hide') : t('auth.reset.show')}</Text>
          </Pressable>
        </View>
        <Text className="font-body text-xs text-ink-muted mt-1">{t('auth.register.password_hint')}</Text>

        {error ? (
          <Text className="font-body text-sm text-danger mt-3" accessibilityLiveRegion="polite" testID="reset-error">
            {error}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap gap-3 mt-6">
          <Pressable
            onPress={() => void submit()}
            disabled={busy}
            accessibilityRole="button"
            className={`min-h-[52px] px-6 items-center justify-center bg-primary ${busy ? 'opacity-50' : ''}`}
            testID="reset-submit"
          >
            <Text className="font-body text-base text-on-primary">{t('auth.reset.save')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/(auth)/reset-request' as never)}
            accessibilityRole="link"
            className="min-h-[52px] px-4 items-center justify-center"
            testID="reset-again"
          >
            <Text className="font-body text-base text-primary">{t('auth.reset.again')}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
