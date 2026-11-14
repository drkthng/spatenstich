// Phase 34 (AI-08): photos are made smaller before they are sent, so a phone photo of
// 12 megapixels does not cost many times what a sufficient one costs. Shared building
// block; the photo comparison of Phase 35 uses it.
//
// Web only (the app is a web app): decode, draw onto a canvas, encode as JPEG.

/** Longest edge in pixels. Enough for the model to read plants and beds. */
export const MAX_IMAGE_EDGE = 1568;
export const JPEG_QUALITY = 0.82;
/** Upper bound for one encoded photo. Quality is lowered until it fits. */
export const MAX_IMAGE_BYTES = 1_500_000;
const MIN_QUALITY = 0.5;

export interface Size {
  width: number;
  height: number;
}

export interface ResizedImage extends Size {
  /** Base64 without a data-URL prefix, as the API wants it. */
  base64: string;
  mediaType: 'image/jpeg';
  bytes: number;
}

/** The size that fits within `maxEdge` on the longer side. Never enlarges. */
export function fitWithin(width: number, height: number, maxEdge: number = MAX_IMAGE_EDGE): Size & { scaled: boolean } {
  const longest = Math.max(width, height);
  if (!(longest > 0)) return { width: 0, height: 0, scaled: false };
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height), scaled: false };
  const factor = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
    scaled: true,
  };
}

/** Bytes that a base64 string stands for. */
export function base64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), 'image/jpeg', quality);
  });
}

/**
 * Makes a photo small enough to send: longest edge at most `maxEdge`, JPEG, upright
 * (the camera's orientation note is applied), and under MAX_IMAGE_BYTES.
 * Throws when the file is not an image the browser can decode.
 */
export async function downscaleImage(
  file: Blob,
  opts: { maxEdge?: number; quality?: number; maxBytes?: number } = {},
): Promise<ResizedImage> {
  const maxEdge = opts.maxEdge ?? MAX_IMAGE_EDGE;
  const maxBytes = opts.maxBytes ?? MAX_IMAGE_BYTES;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const size = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    // Photos with transparency (PNG) get a white ground instead of black.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);

    let quality = opts.quality ?? JPEG_QUALITY;
    let blob = await encode(canvas, quality);
    while (blob.size > maxBytes && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.1);
      blob = await encode(canvas, quality);
    }
    const base64 = await blobToBase64(blob);
    return { base64, mediaType: 'image/jpeg', width: size.width, height: size.height, bytes: blob.size };
  } finally {
    bitmap.close();
  }
}
