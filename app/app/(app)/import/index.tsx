// Import Entry Screen — Phase 6 Plan 06-03.
// Two entry paths for spatenstich-import.v1 JSON payloads:
//   1. Share-intent file URI (from OS share sheet) — reads fileUri param, validates on load.
//   2. Paste fallback — multiline TextInput with onBlur validation.
//   3. File picker — expo-document-picker for manual JSON file selection.
// Security (T-06-08, T-06-09): JSON.parse + validatePayload before any navigation or state update.
// Payload passed via importStore (Zustand), NOT navigation params (Pitfall 1 from RESEARCH).
import { tokens } from '@/src/theme/tokens';
import * as React from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '@/src/components/ui/button';
import { ImportErrorState } from '@/src/components/ImportErrorState';
import { useImportStore } from '@/src/stores/importStore';
import { validatePayload } from '@/src/lib/importValidator';
import * as shareInbox from '@/src/lib/shareInbox';
import de from '@spatenstich/shared/i18n/de';
import { t as tx } from '@/src/lib/i18n';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function ImportEntryScreen(): React.JSX.Element {
  const router = useRouter();
  const { fileUri } = useLocalSearchParams<{ fileUri?: string }>();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [pasteValue, setPasteValue] = React.useState('');
  const [errors, setErrorList] = React.useState<string[] | null>(null);
  // What the checker found, in its own words; shown small under the message.
  const [details, setDetails] = React.useState<string[]>([]);
  const setErrors = React.useCallback((list: string[] | null, technical: string[] = []) => {
    setErrorList(list);
    setDetails(technical);
  }, []);
  const [loading, setLoading] = React.useState(false);
  const [shareLoading, setShareLoading] = React.useState(false);

  const handleValidate = React.useCallback((input: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      setErrors([t('import.errorJsonSyntax')]);
      return;
    }
    // T-06-08: validatePayload validates before any navigation or state update
    const result = validatePayload(parsed);
    if (result.ok) {
      setErrors(null);
      useImportStore.getState().setPayload(result.payload);
      router.push('/(app)/import/preview' as any);
    } else {
      setErrors([tx('import.errorShape')], result.errors);
    }
  }, [router, setErrors]);

  // Handle incoming file URI from share-intent (T-06-09: same validation path as paste)
  React.useEffect(() => {
    if (!fileUri) return;
    (async () => {
      setLoading(true);
      try {
        const content =
          Platform.OS === 'web'
            ? await (await fetch(fileUri)).text()
            : await FileSystem.readAsStringAsync(fileUri);
        handleValidate(content);
      } catch {
        setErrors([t('import.errorJsonSyntax')]);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileUri, handleValidate, setErrors]);

  // Web Share Target (T-20-03-02, ASVS V5): Teilen aus einer beliebigen App
  // (z.B. Claude.ai) landet über den Service Worker in der IndexedDB-Inbox
  // (app/sw-src.js) und leitet auf /import?from=share weiter. Der geteilte
  // Inhalt durchläuft EXAKT dieselbe handleValidate()-Funktion wie der
  // Einfüge- und der Dateiweg — kein Sonderpfad, keine Übernahme ohne Prüfung.
  React.useEffect(() => {
    if (from !== 'share') return;
    (async () => {
      setShareLoading(true);
      try {
        const entry = await shareInbox.readAndClear();
        if (!entry || !entry.text) {
          setErrors([t('import.share.empty')]);
          return;
        }
        setPasteValue(entry.text);
        handleValidate(entry.text);
      } catch {
        setErrors([t('import.share.error')]);
      } finally {
        setShareLoading(false);
      }
    })();
  }, [from, handleValidate, setErrors]);

  const handleFilePicker = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    setLoading(true);
    try {
      const asset = result.assets[0];
      const content =
        Platform.OS === 'web' && asset.file
          ? await asset.file.text()
          : await FileSystem.readAsStringAsync(asset.uri);
      handleValidate(content);
    } catch {
      setErrors([t('import.errorJsonSyntax')]);
    } finally {
      setLoading(false);
    }
  };

  const canImport = pasteValue.trim().length > 0;

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerTitle: t('import.title') }} />
      <ScrollView contentContainerClassName="p-4 gap-4">
        <View className="p-3 border border-line bg-surface-2" testID="import-howto">
          <Text className="font-display text-lg text-ink">{t('more.import.howTitle')}</Text>
          <Text className="text-sm text-ink mt-1">1. {t('more.import.how1')}</Text>
          <Text className="text-sm text-ink mt-1">2. {t('more.import.how2')}</Text>
          <Text className="text-sm text-ink mt-1">3. {t('more.import.how3')}</Text>
        </View>

        {shareLoading && (
          <Text
            className="text-sm text-ink-muted text-center"
            testID="import-share-loading"
          >
            {t('import.share.loading')}
          </Text>
        )}

        <TextInput
          multiline
          numberOfLines={8}
          placeholder={t('import.pasteHint')}
          placeholderTextColor={tokens.color.inkMuted}
          value={pasteValue}
          onChangeText={(v) => { setPasteValue(v); setErrors(null); }}
          className="font-mono text-xs min-h-[120px] p-3 rounded-lg border border-line bg-bg text-ink"
          textAlignVertical="top"
          testID="import-paste-textarea"
        />

        {errors && <ImportErrorState errors={errors} details={details} testID="import-errors" />}

        <Button
          onPress={() => handleValidate(pasteValue)}
          variant="default"
          disabled={!canImport || loading}
          testID="import-submit-button"
        >
          {loading ? <ActivityIndicator size="small" color={tokens.color.onPrimary} /> : null}
          <Text className="text-on-primary font-semibold">{t('import.importButton')}</Text>
        </Button>

        <View className="flex-row items-center gap-3 my-2">
          <View className="flex-1 h-px bg-line" />
          <Text className="text-sm text-ink-muted">{tx('common.or')}</Text>
          <View className="flex-1 h-px bg-line" />
        </View>

        <Button
          onPress={handleFilePicker}
          variant="outline"
          disabled={loading}
          testID="import-filepicker-button"
        >
          <Text className="font-semibold text-ink">
            {t('import.filePickerButton')}
          </Text>
        </Button>
      </ScrollView>
    </View>
  );
}
