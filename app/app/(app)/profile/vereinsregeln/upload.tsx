import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function VereinsregelnUploadScreen(): React.JSX.Element {
  const router = useRouter();
  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900">
      <ScrollView contentContainerClassName="p-6 gap-6">
        <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Vereinssatzung
        </Text>
        <Text className="text-sm text-stone-600 dark:text-stone-300">
          Vereinsregeln-Import wird in einem zukuenftigen Update verfuegbar.
          Alternativ koennen Regeln manuell eingegeben werden.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/profile/vereinsregeln/confirm' as any)}
          className="mt-4 bg-[#4A7C59] dark:bg-[#6BAA7E] rounded-lg px-6 py-3 min-h-[44px] items-center justify-center active:opacity-80"
        >
          <Text className="text-white font-semibold">Manuell eingeben</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
