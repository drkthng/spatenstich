// Password reset, step 1 (Phase 37, NAV3-04): ask for a code by e-mail. The answer is
// the same whether or not an account with that address exists.

import * as React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { t } from '@/src/lib/i18n';

const input = 'min-h-[48px] px-3 py-2 border border-line bg-bg font-body text-lg text-ink';

export default function ResetRequestScreen(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const send = async (): Promise<void> => {
    const address = email.trim();
    if (sending || !address.includes('@')) return;
    setSending(true);
    setFailed(false);
    try {
      // The result is not looked at beyond "did the request go out": telling apart known
      // and unknown addresses would reveal who has an account.
      await supabase.auth.resetPasswordForEmail(address);
      setSent(true);
    } catch {
      setFailed(true);
    }
    setSending(false);
  };

  const toVerify = (): void =>
    router.push({ pathname: '/(auth)/reset-verify', params: { email: email.trim() } } as never);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="flex-grow px-6 pt-10 pb-10"
      keyboardShouldPersistTaps="handled"
      testID="reset-request"
    >
      <View style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Text className="font-display text-3xl text-ink">{t('auth.reset.title')}</Text>
        <Text className="font-body text-base text-ink-muted mt-2">{t('auth.reset.requestIntro')}</Text>

        <Text className="font-body text-sm text-ink mt-6 mb-1">{t('auth.reset.email')}</Text>
        <TextInput
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setSent(false);
          }}
          inputMode="email"
          autoCapitalize="none"
          autoComplete="email"
          accessibilityLabel={t('auth.reset.email')}
          className={input}
          testID="reset-email"
        />

        {failed ? (
          <Text className="font-body text-sm text-danger mt-3" accessibilityLiveRegion="polite" testID="reset-failed">
            {t('auth.reset.failed')}
          </Text>
        ) : null}
        {sent ? (
          <Text className="font-body text-sm text-ink mt-3" accessibilityLiveRegion="polite" testID="reset-sent">
            {t('auth.reset.sent')}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap gap-3 mt-6">
          {sent ? (
            <Pressable
              onPress={toVerify}
              accessibilityRole="button"
              className="min-h-[52px] px-6 items-center justify-center bg-primary"
              testID="reset-to-verify"
            >
              <Text className="font-body text-base text-on-primary">{t('onboarding.next')}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void send()}
              disabled={sending || !email.includes('@')}
              accessibilityRole="button"
              className={`min-h-[52px] px-6 items-center justify-center bg-primary ${sending || !email.includes('@') ? 'opacity-50' : ''}`}
              testID="reset-send"
            >
              <Text className="font-body text-base text-on-primary">{t('auth.reset.send')}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.replace('/(auth)/login' as never)}
            accessibilityRole="link"
            className="min-h-[52px] px-4 items-center justify-center"
            testID="reset-back"
          >
            <Text className="font-body text-base text-primary">{t('auth.reset.back')}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
