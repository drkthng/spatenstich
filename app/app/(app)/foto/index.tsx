// Photo check (Phase 35): take or choose up to six photos and have them compared with
// the plan. The photos live only in this screen's memory until they are sent; nothing
// stores them (PHOTO-10). What comes back are findings, shown for review on the next
// screen. The plan is not touched here.

import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { PHOTO_MAX_PHOTOS } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { useSharedPlants } from '@/src/hooks/usePlants';
import { countOpenFindings } from '@/src/lib/photo/openFindings';
import { runPhotoCheck, type PhotoCheckOutcome } from '@/src/lib/photo/photoRepo';
import { failureText } from '@/src/lib/photo/findingText';
import { formatUsd } from '@/src/lib/ai/aiMessages';
import { useDataVersion } from '@/src/lib/sync/dataVersion';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

interface Chosen {
  key: string;
  file: File;
  /** Object URL for the preview; revoked when the photo is removed or the screen closes. */
  url: string;
}

type Phase =
  | { name: 'choosing' }
  | { name: 'running' }
  | { name: 'done'; outcome: Extract<PhotoCheckOutcome, { ok: true }> }
  | { name: 'failed'; outcome: Extract<PhotoCheckOutcome, { ok: false }> };

let keyCounter = 0;

export default function PhotoCheckScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const gardenId = useAuthStore((s) => s.activeGardenId);
  const { data: catalog = [] } = useSharedPlants();
  const findingsVersion = useDataVersion('photo_findings');

  const [photos, setPhotos] = React.useState<Chosen[]>([]);
  const [phase, setPhase] = React.useState<Phase>({ name: 'choosing' });
  const [note, setNote] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(0);
  const cameraInput = React.useRef<HTMLInputElement | null>(null);
  const galleryInput = React.useRef<HTMLInputElement | null>(null);
  const photosRef = React.useRef<Chosen[]>([]);
  photosRef.current = photos;

  // Previews are released when the screen closes.
  React.useEffect(
    () => () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.url);
    },
    [],
  );

  React.useEffect(() => {
    let alive = true;
    if (!gardenId) return;
    void countOpenFindings(gardenId).then((n) => {
      if (alive) setOpen(n);
    });
    return () => {
      alive = false;
    };
  }, [gardenId, findingsVersion, phase.name]);

  const addFiles = (list: FileList | null): void => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list).filter((file) => file.type.startsWith('image/') || file.type === '');
    setPhotos((current) => {
      const room = PHOTO_MAX_PHOTOS - current.length;
      setNote(incoming.length > room ? t('photo.tooMany', { max: PHOTO_MAX_PHOTOS }) : null);
      const added = incoming.slice(0, Math.max(0, room)).map((file) => ({
        key: `p${keyCounter++}`,
        file,
        url: URL.createObjectURL(file),
      }));
      return [...current, ...added];
    });
    setPhase({ name: 'choosing' });
  };

  const remove = (key: string): void => {
    setPhotos((current) => {
      const gone = current.find((p) => p.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return current.filter((p) => p.key !== key);
    });
    setNote(null);
  };

  const clear = (): void => {
    for (const photo of photosRef.current) URL.revokeObjectURL(photo.url);
    setPhotos([]);
  };

  const run = async (): Promise<void> => {
    if (photos.length === 0 || phase.name === 'running') return;
    setPhase({ name: 'running' });
    setNote(null);
    const outcome = await runPhotoCheck(
      photos.map((p) => p.file),
      catalog,
    );
    if (outcome.ok) {
      // Sent and answered: the photos are no longer needed anywhere.
      clear();
      setPhase({ name: 'done', outcome });
    } else {
      setPhase({ name: 'failed', outcome });
    }
  };

  if (mode !== 'account' || !gardenId) {
    return (
      <View className="flex-1 bg-bg px-4 pt-6" testID="photo-screen">
        <Stack.Screen options={{ headerTitle: t('photo.title') }} />
        <Text className="font-body text-base text-ink" testID="photo-account-only">
          {t('photo.accountOnly')}
        </Text>
      </View>
    );
  }

  const running = phase.name === 'running';
  const full = photos.length >= PHOTO_MAX_PHOTOS;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pt-4 pb-12" testID="photo-screen">
      <Stack.Screen options={{ headerTitle: t('photo.title') }} />
      <Text className="font-body text-base text-ink">{t('photo.intro')}</Text>
      <Text className="font-body text-sm text-ink-muted mt-2">{t('photo.tips')}</Text>
      <Text className="font-body text-sm text-ink-muted mt-2" testID="photo-privacy">
        {t('photo.privacy')}
      </Text>

      {open > 0 && phase.name !== 'done' ? (
        <Pressable
          onPress={() => router.push('/(app)/foto/befunde' as never)}
          accessibilityRole="button"
          className="mt-4 p-3 border border-line bg-warn-soft"
          testID="photo-open-findings"
        >
          <Text className="font-body text-sm text-ink">
            {open === 1 ? t('photo.openOne') : t('photo.openMany', { n: open })}
          </Text>
          <Text className="font-body text-sm text-ink underline mt-1">{t('photo.showFindings')}</Text>
        </Pressable>
      ) : null}

      {/* The file inputs do the work; the buttons below are their visible faces. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        data-testid="photo-input-camera"
        onChange={(e) => {
          addFiles(e.currentTarget.files);
          e.currentTarget.value = '';
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        data-testid="photo-input-gallery"
        onChange={(e) => {
          addFiles(e.currentTarget.files);
          e.currentTarget.value = '';
        }}
      />

      <View className="flex-row flex-wrap gap-2 mt-5">
        <Pressable
          onPress={() => cameraInput.current?.click()}
          disabled={running || full}
          accessibilityRole="button"
          className={`min-h-[48px] px-4 items-center justify-center bg-primary ${running || full ? 'opacity-50' : ''}`}
          testID="photo-take"
        >
          <Text className="font-body text-base text-on-primary">{t('photo.takePhoto')}</Text>
        </Pressable>
        <Pressable
          onPress={() => galleryInput.current?.click()}
          disabled={running || full}
          accessibilityRole="button"
          className={`min-h-[48px] px-4 items-center justify-center border border-line ${running || full ? 'opacity-50' : ''}`}
          testID="photo-choose"
        >
          <Text className="font-body text-base text-ink">{t('photo.choosePhotos')}</Text>
        </Pressable>
      </View>

      <Text className="font-body text-sm text-ink-muted mt-3" testID="photo-count">
        {photos.length === 0 ? t('photo.countNone') : t('photo.count', { n: photos.length, max: PHOTO_MAX_PHOTOS })}
      </Text>
      {note ? (
        <Text className="font-body text-sm text-warn mt-1" testID="photo-note">
          {note}
        </Text>
      ) : null}

      {photos.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 mt-3" testID="photo-previews">
          {photos.map((photo, index) => (
            <View key={photo.key} className="border border-line" style={{ width: 104, height: 104 }}>
              <img
                src={photo.url}
                alt={t('photo.photoAlt', { n: index + 1 })}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {!running ? (
                <Pressable
                  onPress={() => remove(photo.key)}
                  accessibilityRole="button"
                  accessibilityLabel={t('photo.removePhoto', { n: index + 1 })}
                  className="absolute top-0 right-0 items-center justify-center bg-bg border-l border-b border-line"
                  style={{ width: 48, height: 48 }}
                  testID={`photo-remove-${index}`}
                >
                  <X size={20} color={tokens.color.ink} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {photos.length > 0 ? (
        <Pressable
          onPress={() => void run()}
          disabled={running}
          accessibilityRole="button"
          className={`mt-5 min-h-[52px] px-4 flex-row items-center justify-center bg-primary ${running ? 'opacity-60' : ''}`}
          testID="photo-start"
        >
          {running ? <ActivityIndicator color={tokens.color.onPrimary} /> : null}
          <Text className="font-body text-base text-on-primary ml-2">{t('photo.start')}</Text>
        </Pressable>
      ) : null}

      {running ? (
        <Text className="font-body text-sm text-ink-muted mt-3" testID="photo-running">
          {t('photo.running')}
        </Text>
      ) : null}

      {phase.name === 'failed' ? (
        <View className="mt-4 p-3 border border-line bg-warn-soft" testID="photo-error">
          <Text className="font-body text-sm text-ink" testID={`photo-error-${phase.outcome.code}`}>
            {failureText(phase.outcome.code)}
          </Text>
          {phase.outcome.retryable && photos.length > 0 ? (
            <Pressable
              onPress={() => void run()}
              accessibilityRole="button"
              className="self-start mt-3 min-h-[48px] px-4 items-center justify-center border border-line"
              testID="photo-retry"
            >
              <Text className="font-body text-sm text-ink">{t('photo.retry')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {phase.name === 'done' ? (
        <View className="mt-5 p-3 border border-line bg-ok-soft" testID="photo-result">
          <Text className="font-display text-lg text-ink" testID="photo-result-count">
            {phase.outcome.findings.length === 0
              ? t('photo.resultNone')
              : phase.outcome.findings.length === 1
                ? t('photo.resultOne')
                : t('photo.resultMany', { n: phase.outcome.findings.length })}
          </Text>
          {phase.outcome.summary ? (
            <Text className="font-body text-sm text-ink mt-2">{phase.outcome.summary}</Text>
          ) : null}
          <Text className="font-body text-xs text-ink-muted mt-2">
            {t('photo.cost', { cost: formatUsd(phase.outcome.costUsd) })}
          </Text>
          {open > 0 ? (
            <Pressable
              onPress={() => router.push('/(app)/foto/befunde' as never)}
              accessibilityRole="button"
              className="self-start mt-3 min-h-[48px] px-4 items-center justify-center bg-primary"
              testID="photo-show-findings"
            >
              <Text className="font-body text-base text-on-primary">{t('photo.showFindings')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
