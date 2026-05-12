// ImportErrorState — Phase 6 Plan 06-03.
// Displays validation errors with actionable InlineBanner items.
// D-12 from 06-CONTEXT.md: "Schema kopieren" button copies JSON schema to clipboard.
// 2-second "Kopiert!" feedback after copy (T-06-11 accepted: copies public schema only).
import * as React from 'react';
import { View } from 'react-native';
import { InlineBanner } from '@/src/components/InlineBanner';
import * as Clipboard from 'expo-clipboard';
import schema from '../../../schemas/spatenstich-import.v1.json';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export function ImportErrorState({
  errors,
  testID,
}: {
  errors: string[];
  testID?: string;
}): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(JSON.stringify(schema, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View testID={testID}>
      {errors.map((err, i) => (
        <InlineBanner
          key={i}
          message={err}
          actionLabel={copied ? t('import.schemaCopied') : t('import.schemaCopy')}
          onAction={handleCopy}
          variant="warning"
          testID={`import-error-${i}`}
        />
      ))}
    </View>
  );
}
