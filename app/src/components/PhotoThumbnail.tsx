// PhotoThumbnail — Photo preview card for review grid.
// 80x80px minimum, rounded-lg, number badge, long-press delete.
// Phase 4 Plan 03 — D-03, UI-SPEC §"Photo Review Screen".
import * as React from 'react';
import { View, Image, Text, Pressable } from 'react-native';

export interface PhotoThumbnailProps {
  uri: string;
  index: number;
  onDelete?: (index: number) => void;
}

export function PhotoThumbnail({
  uri,
  index,
  onDelete,
}: PhotoThumbnailProps): React.JSX.Element {
  const [showDelete, setShowDelete] = React.useState(false);

  return (
    <View className="relative">
      <Pressable
        onLongPress={() => setShowDelete(true)}
        accessibilityLabel={`Foto ${index + 1}`}
        accessibilityRole="button"
        className="min-w-[80px] min-h-[80px] rounded-lg border border-stone-300 overflow-hidden"
        style={{ width: 80, height: 80 }}
      >
        <Image
          source={{ uri }}
          className="w-full h-full"
          resizeMode="cover"
        />
        {/* Number badge top-left */}
        <View className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#4A7C59] items-center justify-center">
          <Text className="text-xs text-white font-semibold">{index + 1}</Text>
        </View>
      </Pressable>

      {/* Inline delete confirmation (no modal per UI-SPEC) */}
      {showDelete && onDelete ? (
        <View className="mt-1 items-center">
          <Text className="text-xs text-stone-500 mb-1">Foto entfernen?</Text>
          <Pressable
            onPress={() => {
              onDelete(index);
              setShowDelete(false);
            }}
            accessibilityRole="button"
            className="min-h-[44px] px-2 py-1 items-center justify-center"
          >
            <Text className="text-xs text-red-600 font-semibold">Entfernen</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
