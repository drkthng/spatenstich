// Plan 02-04 Task 2-04-01 Step D — PDF/image picker + Supabase Storage upload.
// Implements RESEARCH Pattern 7:
//   1. DocumentPicker.getDocumentAsync({ type: ['application/pdf','image/*'] })
//   2. Read file contents as a Uint8Array
//      - Web: File.arrayBuffer() (RN Blob doesn't support arrayBuffer reliably)
//      - Native: expo-file-system readAsStringAsync(base64) → Uint8Array
//   3. supabase.storage.from('vereinsregeln').upload(<userId>/<timestamp>_<safe>, bytes)
//
// Security:
//   - Filename sanitisation: strip anything outside [A-Za-z0-9._-] to block path
//     injection into the storage key (T-2-04-06).
//   - Path prefix = `${userId}/` — matches the storage bucket RLS policy
//     `(storage.foldername(name))[1] = auth.uid()::text` from Migration 002.
//   - MIME type is allow-listed at the bucket level (PDF + PNG/JPEG/HEIC/WEBP).
//
// Return:
//   { storagePath, mimeType } on success, `null` when the user cancels the picker.
//   Throws the Supabase upload error on server-side failure.

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface UploadResult {
  storagePath: string;
  mimeType: string;
}

/**
 * Open the system document picker and upload the selected file to the
 * `vereinsregeln` bucket under `<userId>/<timestamp>_<safeName>`.
 * Returns `null` if the user cancels the picker.
 */
export async function uploadVereinsregelPdf(
  userId: string,
): Promise<UploadResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  let bytes: Uint8Array;
  if (Platform.OS === 'web') {
    // Web: asset.file is a Blob/File — File.arrayBuffer() is the reliable path.
    const webFile = (asset as unknown as { file?: Blob }).file;
    if (!webFile) {
      // Defensive — Expo web should always populate asset.file for DocumentPicker.
      throw new Error('document_picker_missing_file_on_web');
    }
    bytes = new Uint8Array(await webFile.arrayBuffer());
  } else {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  // Sanitise the filename to block path injection in the storage key (T-2-04-06).
  const safeName = (asset.name ?? 'satzung.pdf').replace(
    /[^A-Za-z0-9._-]/g,
    '_',
  );
  const storagePath = `${userId}/${Date.now()}_${safeName}`;
  const mimeType = asset.mimeType ?? 'application/pdf';

  const { error } = await supabase.storage
    .from('vereinsregeln')
    .upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: true,
    });
  if (error) throw error;
  return { storagePath, mimeType };
}
