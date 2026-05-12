// Import Entry Screen — Phase 6 Plan 06-03.
// Two entry paths for spatenstich-import.v1 JSON payloads:
//   1. Share-intent file URI (from OS share sheet) — reads fileUri param, validates on load.
//   2. Paste fallback — multiline TextInput with onBlur validation.
//   3. File picker — expo-document-picker for manual JSON file selection.
// Security (T-06-08, T-06-09): JSON.parse + validatePayload before any navigation or state update.
// Payload passed via importStore (Zustand), NOT navigation params (Pitfall 1 from RESEARCH).
import * as React from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '@/src/components/ui/button';
import { ImportErrorState } from '@/src/components/ImportErrorState';
import { useImportStore } from '@/src/stores/importStore';
import { validatePayload } from '@/src/lib/importValidator';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function ImportEntryScreen(): React.JSX.Element {
  const router = useRouter();
  const { fileUri } = useLocalSearchParams<{ fileUri?: string }>();
  const [pasteValue, setPasteValue] = React.useState('');
  const [errors, setErrors] = React.useState<string[] | null>(null);
  const [loading, setLoading] = React.useState(false);

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
  }, [fileUri]);

  const handleValidate = (input: string) => {
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
      setErrors(result.errors);
    }
  };

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
    <View className="flex-1 bg-stone-50 dark:bg-stone-900">
      <Stack.Screen options={{ headerTitle: t('import.title') }} />
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Text className="text-base text-stone-600 dark:text-stone-400 text-center">
          JSON-Datei teilen oder einfügen
        </Text>

        <TextInput
          multiline
          numberOfLines={8}
          placeholder={t('import.pasteHint')}
          placeholderTextColor="#A8A29E"
          value={pasteValue}
          onChangeText={(v) => { setPasteValue(v); setErrors(null); }}
          className="font-mono text-xs min-h-[120px] p-3 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100"
          textAlignVertical="top"
          testID="import-paste-textarea"
        />

        {errors && <ImportErrorState errors={errors} testID="import-errors" />}

        <Button
          onPress={() => handleValidate(pasteValue)}
          variant="default"
          disabled={!canImport || loading}
          testID="import-submit-button"
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
          <Text className="text-white font-semibold">{t('import.importButton')}</Text>
        </Button>

        <View className="flex-row items-center gap-3 my-2">
          <View className="flex-1 h-px bg-stone-300 dark:bg-stone-600" />
          <Text className="text-sm text-stone-400">oder</Text>
          <View className="flex-1 h-px bg-stone-300 dark:bg-stone-600" />
        </View>

        <Button
          onPress={handleFilePicker}
          variant="outline"
          disabled={loading}
          testID="import-filepicker-button"
        >
          <Text className="font-semibold text-stone-700 dark:text-stone-200">
            {t('import.filePickerButton')}
          </Text>
        </Button>
      </ScrollView>
    </View>
  );
}
