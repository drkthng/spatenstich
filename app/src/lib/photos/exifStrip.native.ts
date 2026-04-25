// Native platform implementation (iOS/Android).
// Uses @lodev09/react-native-exify to read GPS from EXIF,
// then expo-image-manipulator to re-encode the JPEG (guaranteed EXIF-free).
//
// NFR-05: expo-image-manipulator re-encode drops EXIF segment by default.
import { readAsync } from '@lodev09/react-native-exify';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { StrippedPhoto, StripExifOptions } from './exifStrip';

export async function stripExifAndExtractGps(
  uri: string,
  options: StripExifOptions,
): Promise<StrippedPhoto> {
  // 1. Extract GPS only when user opted in (D-24)
  let gps: { lat: number; lng: number } | null = null;
  if (options.optIn) {
    try {
      const exif = await readAsync(uri);
      if (
        exif &&
        typeof exif.GPSLatitude === 'number' &&
        typeof exif.GPSLongitude === 'number'
      ) {
        gps = { lat: exif.GPSLatitude, lng: exif.GPSLongitude };
      }
    } catch {
      // No EXIF or not parseable — no GPS, harmless
      gps = null;
    }
  }

  // 2. Strip EXIF via re-encode (guarantees EXIF-free output, independent of EXIF lib).
  //    expo-image-manipulator re-encodes the JPEG without the EXIF APP1 segment.
  const result = await manipulateAsync(uri, [], {
    format: SaveFormat.JPEG,
    compress: 0.9,
  });

  return {
    strippedUri: result.uri,
    gps,
  };
}
