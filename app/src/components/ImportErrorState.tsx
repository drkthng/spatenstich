// ImportErrorState — what went wrong with an import, in a sentence, with a button that copies
// the template the Claude.ai project should answer in (the public import schema, T-06-11).
//
// Phase 38 (DESIGN3-05): the checker's own messages ("/beds/0/label: must be string") are
// no longer the message. They are listed below it as a technical note, small, for whoever
// wants to hand them back to Claude.ai.
import * as React from 'react';
import { Text, View } from 'react-native';
import { InlineBanner } from '@/src/components/InlineBanner';
import * as Clipboard from 'expo-clipboard';
import schema from '../../../schemas/spatenstich-import.v1.json';
import { t } from '@/src/lib/i18n';

/** How many technical lines are listed before "und {n} weitere". */
const MAX_DETAILS = 5;

export function ImportErrorState({
  errors,
  details,
  testID,
}: {
  errors: string[];
  /** The checker's own lines, shown small under the message. */
  details?: string[];
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
          actionLabel={copied ? t('import.templateCopied') : t('import.templateCopy')}
          onAction={handleCopy}
          variant="warning"
          testID={`import-error-${i}`}
        />
      ))}
      {details && details.length > 0 ? (
        <View className="mt-2" testID="import-error-details">
          <Text className="font-body text-sm text-ink-muted">{t('import.errorDetails')}</Text>
          {details.slice(0, MAX_DETAILS).map((line, i) => (
            <Text key={i} className="font-body text-sm text-ink-muted" selectable>
              {line}
            </Text>
          ))}
          {details.length > MAX_DETAILS ? (
            <Text className="font-body text-sm text-ink-muted">
              {t('import.errorDetailsMore', { n: details.length - MAX_DETAILS })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
