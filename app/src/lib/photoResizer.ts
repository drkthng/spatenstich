// Phase 4 Plan 04-01: Client-side photo resize to max 1.15 MP.
// PHOTO-03: Max 1.15 MP = 1092 x 1053 = 1,149,876 px.
// Claude Vision API scales down from 1568px on the long side.
// 1092px width keeps the image within the effective processing limit and minimizes latency.
import * as ImageManipulator from 'expo-image-manipulator';

export async function resizeToMaxMp(localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1092 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}
