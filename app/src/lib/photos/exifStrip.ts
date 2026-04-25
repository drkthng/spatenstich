// Platform-agnostic EXIF-Strip interface.
// Expo Router / Metro resolves `.native.ts` for iOS/Android and `.web.ts` for Web
// automatically via Metro platform extensions.
//
// NFR-05: EXIF is ALWAYS stripped from uploaded photos, regardless of optIn.
// D-24: GPS coordinates are only extracted and returned when optIn=true.

export interface StrippedPhoto {
  /** New URI pointing to the EXIF-free image. */
  strippedUri: string;
  /** GPS coordinates, only if optIn=true AND the image contains GPS data. null otherwise. */
  gps: { lat: number; lng: number } | null;
}

export interface StripExifOptions {
  /** DSGVO opt-in: when true, GPS coordinates are extracted (not sent — persisted separately). */
  optIn: boolean;
}

/**
 * Removes EXIF from the image and optionally extracts GPS coordinates.
 * NFR-05: EXIF is ALWAYS stripped regardless of optIn.
 * D-24: GPS lat/lng returned only when optIn=true.
 *
 * Platform split via Metro extensions:
 *   exifStrip.native.ts → iOS/Android (react-native-exify + expo-image-manipulator)
 *   exifStrip.web.ts    → Web (piexifjs on Blob/DataURL)
 */
export declare function stripExifAndExtractGps(
  uri: string,
  options: StripExifOptions,
): Promise<StrippedPhoto>;
