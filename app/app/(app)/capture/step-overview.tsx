// Capture Step 1 — Overview photo (1/3).
// D-01: guided flow with camera + gallery. D-02: instruction + example.
// Flow: capturePhoto/pickFromGallery -> resizeToMaxMp -> captureStore.addPhoto -> next step.
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';
import { resizeToMaxMp } from '@/src/lib/photoResizer';
import { useCaptureStore } from '@/src/stores/captureStore';
import { CaptureStepCard } from '@/src/components/CaptureStepCard';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function StepOverviewScreen(): React.JSX.Element {
  const router = useRouter();
  const addPhoto = useCaptureStore((s) => s.addPhoto);
  const [permissionDenied, setPermissionDenied] = React.useState(false);

  const handlePhoto = React.useCallback(
    async (uri: string) => {
      const resized = await resizeToMaxMp(uri);
      addPhoto(resized);
      router.push('/(app)/capture/step-north');
    },
    [addPhoto, router],
  );

  const capturePhoto = React.useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1.0,
    });
    if (result.canceled) return;
    await handlePhoto(result.assets[0].uri);
  }, [handlePhoto]);

  const pickFromGallery = React.useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1.0,
    });
    if (result.canceled) return;
    await handlePhoto(result.assets[0].uri);
  }, [handlePhoto]);

  if (permissionDenied) {
    return (
      <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917] items-center justify-center p-6">
        <Text className="text-xl font-semibold text-stone-800 dark:text-stone-100 text-center mb-4">
          Kamerazugriff benoetigt
        </Text>
        <Pressable
          onPress={capturePhoto}
          accessibilityRole="button"
          className="bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-lg px-6 py-3 min-h-[44px] items-center justify-center active:opacity-80 mb-3"
        >
          <Text className="text-white font-semibold">Einstellungen oeffnen</Text>
        </Pressable>
        <Pressable
          onPress={pickFromGallery}
          accessibilityRole="button"
          className="min-h-[44px] items-center justify-center"
        >
          <Text className="text-sm text-stone-500">{t('capture.gallery')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
      {/* Camera placeholder area */}
      <View className="flex-1 items-center justify-center">
        <Camera size={48} color="#78716C" />
        <Text className="text-sm text-stone-500 mt-2">
          {t('capture.step.indicator').replace('{current}', '1').replace('{total}', '3')}
        </Text>

        {/* Shutter button */}
        <Pressable
          onPress={capturePhoto}
          accessibilityRole="button"
          accessibilityLabel={t('capture.shutter')}
          className="mt-8 items-center justify-center rounded-full border-[3px] border-[#4A7C59] bg-white min-h-[44px]"
          style={{ width: 64, height: 64 }}
        >
          <View className="w-12 h-12 rounded-full bg-white" />
        </Pressable>

        {/* Gallery button */}
        <Pressable
          onPress={pickFromGallery}
          accessibilityRole="button"
          className="mt-4 min-h-[44px] items-center justify-center"
        >
          <Text className="text-sm text-stone-400">{t('capture.gallery')}</Text>
        </Pressable>
      </View>

      {/* Bottom instruction overlay */}
      <CaptureStepCard
        step={1}
        totalSteps={3}
        instruction={t('capture.step.overview')}
      />
    </View>
  );
}
