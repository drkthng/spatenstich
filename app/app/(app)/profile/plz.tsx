// PLZ-Eingabe — instant Klimazone lookup (no network, no debounce — static lookup).
// Pattern: 02-UI-SPEC.md §"PLZ-Eingabe"; 02-PATTERNS.md §"app/app/(app)/profile/plz.tsx".
import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { lookupKlimazone, type Klimazone } from '@spatenstich/shared';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { useProfile } from '@/src/hooks/useProfile';
import { t as tx } from '@/src/lib/i18n';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function PlzScreen(): React.JSX.Element {
  const router = useRouter();
  const { plz: storedPlz, setPlz } = useProfile();
  const [plzInput, setPlzInput] = React.useState<string>(storedPlz ?? '');
  const [saving, setSaving] = React.useState(false);

  const isComplete = /^[0-9]{5}$/.test(plzInput);
  const klimazone: Klimazone | null = isComplete ? lookupKlimazone(plzInput) : null;
  // Invalid only when user typed 5 chars but not all digits — handled by the regex above.
  // (keyboardType="number-pad" + numeric inputMode limit entry to digits on most platforms.)
  const showFormatError = plzInput.length === 5 && !isComplete;
  const canSubmit = isComplete && klimazone !== null && !saving;

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit || klimazone === null) return;
    setSaving(true);
    try {
      await setPlz(plzInput, klimazone);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="flex-grow p-6 gap-4"
    >
      <Text className="text-2xl font-display font-semibold text-ink mb-2">
        {tx('profile.plz.title')}
      </Text>
      <Text className="text-sm text-ink-muted">
        {tx('profile.plz.intro')}
      </Text>

      <View className="gap-2">
        <Label nativeID="plz-label">{tx('profile.plz.title')}</Label>
        <Input
          value={plzInput}
          onChangeText={(text) => setPlzInput(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={5}
          placeholder="12043"
          testID="plz-input"
          accessibilityLabelledBy="plz-label"
        />
      </View>

      {isComplete && klimazone !== null ? (
        <View className="flex-row">
          <Badge variant="default" testID="plz-klimazone-badge">
            {tx('profile.klimazone', { zone: klimazone })}
          </Badge>
        </View>
      ) : null}

      {isComplete && klimazone === null ? (
        <View className="flex-row">
          <Badge variant="outline" testID="plz-klimazone-unknown">
            {tx('profile.klimazoneUnknown')}
          </Badge>
        </View>
      ) : null}

      {showFormatError ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm text-danger"
        >
          {t('profile.plz.error_invalid')}
        </Text>
      ) : null}

      <Button onPress={onSubmit} disabled={!canSubmit} testID="plz-submit">
        <Text className="text-on-primary font-semibold">
          {saving ? t('common.loading') : t('profile.plz.submit')}
        </Text>
      </Button>
    </ScrollView>
  );
}
