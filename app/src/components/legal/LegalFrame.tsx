// The sign-in screens have no header bar. This gives the legal pages there a title and a way back.
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

export function LegalFrame({ titleKey, children }: { titleKey: string; children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center border-b border-line px-2" style={{ minHeight: 56 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel={t('auth.choice.back')}
          className="items-center justify-center"
          style={{ width: 48, height: 48 }}
          testID="legal-back"
        >
          <ArrowLeft size={22} color={tokens.color.ink} />
        </Pressable>
        <Text className="font-display text-xl text-ink ml-1" accessibilityRole="header">
          {t(titleKey)}
        </Text>
      </View>
      {children}
    </View>
  );
}
