import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { useAuthStore } from '@/src/stores/authStore';
import { consumeInviteCode } from '@/src/lib/inviteCodeRepo';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function JoinGardenScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const setActiveGarden = useAuthStore((s) => s.setActiveGarden);

  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onChangeCode = React.useCallback(
    (input: string) => {
      const cleaned = input.toUpperCase().replace(/[^A-Z1-9]/g, '').slice(0, 6);
      setCode(cleaned);
      if (error) setError(null);
    },
    [error],
  );

  const onSubmit = async (): Promise<void> => {
    setError(null);
    if (code.length !== 6) {
      setError(t('auth.join.error_invalid'));
      return;
    }
    if (mode !== 'account') {
      setError(t('auth.join.error_generic'));
      return;
    }

    setLoading(true);
    try {
      const gardenId = await consumeInviteCode(mode, code);
      setActiveGarden(gardenId);
      router.replace('/(app)' as any);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'P9001' || err.code === 'P0002')
        setError(t('auth.join.error_invalid'));
      else if (err.code === '23514') setError(t('auth.join.error_full'));
      else setError(t('auth.join.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="flex-grow p-6 gap-4"
    >
      <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
        {t('auth.join.title')}
      </Text>
      <Text className="text-sm text-stone-600 dark:text-stone-300">
        {t('auth.join.subtitle')}
      </Text>

      <View className="gap-2 mt-4">
        <Label nativeID="join-code-label">{t('auth.join.code_label')}</Label>
        <Input
          value={code}
          onChangeText={onChangeCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          placeholder={t('auth.join.code_placeholder')}
          testID="join-code-input"
          accessibilityLabelledBy="join-code-label"
        />
      </View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm text-red-600 dark:text-red-400"
          testID="join-error"
        >
          {error}
        </Text>
      ) : null}

      <Button
        onPress={onSubmit}
        disabled={loading || code.length !== 6}
        testID="join-submit"
      >
        <Text className="text-white font-semibold">
          {loading ? t('common.loading') : t('auth.join.submit')}
        </Text>
      </Button>

      <Button
        variant="ghost"
        onPress={() => router.back()}
        testID="join-cancel"
      >
        <Text className="text-stone-700 dark:text-stone-200">
          {t('common.cancel')}
        </Text>
      </Button>

      <Text className="text-xs text-stone-500 mt-4">{t('auth.join.hint')}</Text>
    </ScrollView>
  );
}
