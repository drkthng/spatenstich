// Photo Review Screen — shows grid of captured photos with add-more + 1-photo warning.
// D-03: additional photos allowed. D-08/PHOTO-07: 1-photo warning.
// Phase 4 Plan 03 — UI-SPEC §"Photo Review Screen".
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Plus } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import { resizeToMaxMp } from '@/src/lib/photoResizer';
import { useCaptureStore } from '@/src/stores/captureStore';
import { PhotoThumbnail } from '@/src/components/PhotoThumbnail';
import { InlineBanner } from '@/src/components/InlineBanner';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function ReviewScreen(): React.JSX.Element {
  const router = useRouter();
  const photos = useCaptureStore((s) => s.photos);
  const addPhoto = useCaptureStore((s) => s.addPhoto);
  const removePhoto = useCaptureStore((s) => s.removePhoto);

  const addMorePhoto = React.useCallback(async () => {
    // Offer camera or gallery — use gallery as default for extra photos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1.0,
    });
    if (result.canceled) return;
    const resized = await resizeToMaxMp(result.assets[0].uri);
    addPhoto(resized);
  }, [addPhoto]);

  const canProceed = photos.length >= 1;

  return (
    <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Title */}
        <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          {t('capture.review.title')}
        </Text>

        {/* Photo grid: 3 columns */}
        <View className="flex-row flex-wrap gap-2">
          {photos.map((uri, index) => (
            <PhotoThumbnail
              key={`${uri}-${index}`}
              uri={uri}
              index={index}
              onDelete={removePhoto}
            />
          ))}

          {/* Add more card */}
          <Pressable
            onPress={addMorePhoto}
            accessibilityRole="button"
            accessibilityLabel={t('capture.review.add_more')}
            className="min-w-[80px] min-h-[80px] rounded-lg border-2 border-dashed border-stone-300 items-center justify-center"
            style={{ width: 80, height: 80 }}
          >
            <Plus size={24} color="#4A7C59" />
          </Pressable>
        </View>

        {/* 1-photo warning (PHOTO-07, D-08) */}
        {photos.length === 1 ? (
          <View className="mt-4">
            <InlineBanner
              message={t('capture.review.single_photo_warning')}
              onDismiss={() => {}}
              testID="single-photo-warning"
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Footer CTA */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#F9F7F4] dark:bg-[#1C1917] border-t border-stone-200 dark:border-stone-700">
        <Pressable
          onPress={() => router.push('/(app)/capture/dimensions' as any)}
          disabled={!canProceed}
          accessibilityRole="button"
          className={`w-full rounded-lg py-3 min-h-[44px] items-center justify-center ${
            canProceed
              ? 'bg-[#4A7C59] dark:bg-[#6BAA7E] active:opacity-80'
              : 'bg-stone-300 dark:bg-stone-600'
          }`}
        >
          <Text
            className={`font-semibold ${
              canProceed ? 'text-white' : 'text-stone-400'
            }`}
          >
            {t('capture.review.proceed')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
