// Web platform implementation.
// Uses piexifjs to load/strip EXIF from base64 DataURLs.
// Input URIs may be data:, blob:, or http: URLs from ImagePicker on Web.
//
// NFR-05: piexif.remove() strips ALL EXIF segments before upload.
// D-24: GPS IFD only parsed when optIn=true.
import piexif from 'piexifjs';
import type { StrippedPhoto, StripExifOptions } from './exifStrip';

export async function stripExifAndExtractGps(
  uri: string,
  options: StripExifOptions,
): Promise<StrippedPhoto> {
  const dataUrl = await ensureDataUrl(uri);

  // 1. Extract GPS only when user opted in (D-24)
  let gps: { lat: number; lng: number } | null = null;
  if (options.optIn) {
    try {
      const exifObj = piexif.load(dataUrl);
      const gpsIfd = exifObj['GPS'] as Record<string, unknown> | undefined;
      if (gpsIfd) {
        const lat = parseGpsRational(
          gpsIfd[piexif.GPSIFD.GPSLatitude],
          gpsIfd[piexif.GPSIFD.GPSLatitudeRef],
        );
        const lng = parseGpsRational(
          gpsIfd[piexif.GPSIFD.GPSLongitude],
          gpsIfd[piexif.GPSIFD.GPSLongitudeRef],
        );
        if (lat !== null && lng !== null) gps = { lat, lng };
      }
    } catch {
      gps = null;
    }
  }

  // 2. Strip all EXIF (NFR-05)
  const stripped = piexif.remove(dataUrl);

  // 3. Return as Blob URL for ArrayBuffer-ready upload
  const blob = await dataUrlToBlob(stripped);
  const strippedUri = URL.createObjectURL(blob);

  return { strippedUri, gps };
}

async function ensureDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  // blob: or http: URL — fetch and read as DataURL
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`ensureDataUrl fetch failed: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  // Decode data: URL directly (works in Node/jsdom/browser without needing fetch)
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * piexifjs delivers GPS coordinates as rational arrays:
 * [[deg_num, deg_den], [min_num, min_den], [sec_num, sec_den]]
 * plus a ref string 'N'/'S'/'E'/'W'. Converts to decimal degrees.
 */
function parseGpsRational(raw: unknown, ref: unknown): number | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  try {
    const [d, m, s] = raw as Array<[number, number]>;
    const deg = d[0] / d[1];
    const min = m[0] / m[1];
    const sec = s[0] / s[1];
    let decimal = deg + min / 60 + sec / 3600;
    if (ref === 'S' || ref === 'W') decimal = -decimal;
    return decimal;
  } catch {
    return null;
  }
}
