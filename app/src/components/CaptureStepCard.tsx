// CaptureStepCard — instruction overlay for each photo capture step.
// Shows: step indicator dots (3 dots) + instruction text + optional example image.
// Background: semi-transparent dark overlay at bottom of camera view.
// Phase 4 Plan 03 — D-01, D-02, UI-SPEC §"Capture Flow Navigation".
import * as React from 'react';
import { View, Text, Image, type ImageSourcePropType } from 'react-native';

export interface CaptureStepCardProps {
  step: number;
  totalSteps: number;
  instruction: string;
  exampleImageSource?: ImageSourcePropType;
}

export function CaptureStepCard({
  step,
  totalSteps,
  instruction,
  exampleImageSource,
}: CaptureStepCardProps): React.JSX.Element {
  return (
    <View className="bg-[#1C1917]/70 px-4 py-4" style={{ minHeight: 120 }}>
      {/* Step indicator dots */}
      <View
        className="flex-row items-center justify-center gap-2 mb-3"
        accessibilityLabel={`Schritt ${step} von ${totalSteps}`}
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const isActive = i + 1 === step;
          const isCompleted = i + 1 < step;
          return (
            <View
              key={i}
              className={`w-2 h-2 rounded-full ${
                isActive || isCompleted
                  ? 'bg-[#4A7C59]'
                  : 'bg-stone-300'
              }`}
            />
          );
        })}
      </View>

      {/* Instruction + example image row */}
      <View className="flex-row items-center gap-3">
        <Text className="flex-1 text-base text-white font-normal leading-6">
          {instruction}
        </Text>
        {exampleImageSource ? (
          <Image
            source={exampleImageSource}
            className="rounded-md"
            style={{ width: 96, height: 72 }}
            resizeMode="cover"
            accessibilityLabel="Beispielfoto"
          />
        ) : null}
      </View>
    </View>
  );
}
