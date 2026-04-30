// Vereinsregeln Upload Screen — Plan 02-04 Task 2-04-02 Behaviors 3-6.
// Flow: tap "PDF auswählen" -> uploadVereinsregelPdf(userId)
//       -> if non-null, call extractVereinsregeln({ ..., signal })
//       -> show ExtractionLoader overlay while running
//       -> on cancel: abort signal -> loader closes, stays on upload screen
//       -> on timeout/server error: loader state='error' with retry
//       -> on success: merge candidates with existing rules, navigate to confirm.
//
// Bug-fix 2026-04-30: Also bridge rules into profileStore so profile overview
// reflects the current state.
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import { ExtractionLoader } from '@/src/components/ExtractionLoader';
import { uploadVereinsregelPdf } from '@/src/lib/uploadVereinsregelPdf';
import {
  extractVereinsregeln,
  ExtractVereinsregelnError,
} from '@/src/lib/extractVereinsregeln';
import { loadVereinsregeln } from '@/src/lib/vereinsregelnRepo';
import { useAuthStore } from '@/src/stores/authStore';
import { useVereinsregelnStore } from '@/src/stores/vereinsregelnStore';
import { useProfileStore } from '@/src/stores/profileStore';
import type { VereinsRegel } from '@spatenstich/shared';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

type ScreenState = 'idle' | 'loading' | 'error';

function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function VereinsregelnUploadScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.userId);
  const setRules = useVereinsregelnStore((s) => s.setRules);

  const [state, setState] = React.useState<ScreenState>('idle');
  const controllerRef = React.useRef<AbortController | null>(null);

  const runExtraction = React.useCallback(
    async (storagePath: string) => {
      if (!mode || !userId) return;
      const controller = new AbortController();
      controllerRef.current = controller;
      setState('loading');
      try {
        const candidates = await extractVereinsregeln({
          storagePath,
          userId,
          signal: controller.signal,
        });
        // Merge candidates with existing rules (incl. BKleingG seed) and push
        // into the in-memory store so the confirm screen renders them.
        const existing = await loadVereinsregeln(mode, userId);
        const drafts: VereinsRegel[] = candidates.map((c) => ({
          id: randomId('draft'),
          titel: c.titel,
          beschreibung: c.beschreibung,
          wert: c.wert,
          einheit: c.einheit,
          istBKleingG: false,
          aktiv: true,
          source: 'pdf_extraction',
        }));
        const merged = [...existing, ...drafts];
        setRules(merged);
        // Bridge to profileStore so profile overview reflects the current state.
        useProfileStore.getState().setVereinsregeln(merged);
        setState('idle');
        router.replace('/(app)/profile/vereinsregeln/confirm' as any);
      } catch (e) {
        if (
          e instanceof ExtractVereinsregelnError &&
          e.code === 'cancelled'
        ) {
          setState('idle'); // user cancelled — clean reset, no error toast
          return;
        }
        setState('error');
      } finally {
        controllerRef.current = null;
      }
    },
    [mode, userId, router, setRules],
  );

  const handlePick = React.useCallback(async () => {
    if (!userId) return;
    try {
      const result = await uploadVereinsregelPdf(userId);
      if (!result) return; // user cancelled the picker
      await runExtraction(result.storagePath);
    } catch {
      setState('error');
    }
  }, [userId, runExtraction]);

  const handleCancel = React.useCallback(() => {
    controllerRef.current?.abort('cancelled');
    setState('idle');
  }, []);

  const handleRetry = React.useCallback(() => {
    setState('idle');
    handlePick();
  }, [handlePick]);

  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900">
      <ScrollView contentContainerClassName="p-6 gap-6">
        <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Vereinssatzung hochladen
        </Text>
        <Text className="text-sm text-stone-600 dark:text-stone-300">
          Wähle ein PDF oder Foto deiner Vereinssatzung. Die App liest die
          Regeln automatisch ein.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="PDF auswählen"
          onPress={handlePick}
          testID="vereinsregeln-upload-picker"
          className="min-h-[120px] flex-row items-center gap-4 bg-stone-200 dark:bg-stone-800 rounded-2xl p-6 active:opacity-80"
        >
          <FileText size={48} color="#4A7C59" />
          <View className="flex-1">
            <Text className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              PDF auswählen
            </Text>
            <Text className="text-sm text-stone-600 dark:text-stone-300 mt-1">
              PDF, JPG oder PNG — max. 10 MB
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      {state !== 'idle' ? (
        <ExtractionLoader
          state={state}
          onCancel={handleCancel}
          onRetry={handleRetry}
          testID="vereinsregeln-extraction-loader"
        />
      ) : null}
    </View>
  );
}
