/**
 * Where local photos live on a phone: copied into `documentDirectory/photos/`
 * so they survive cache clears. Used by `local-photos.ts`; the browser build
 * uses `local-photo-files.web.ts`.
 */

import * as FileSystem from 'expo-file-system/legacy';

import { uuid } from '@/lib/id';

const PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}photos/`;

export async function deletePhotoFile(uri: string): Promise<void> {
  if (!uri.startsWith(PHOTO_DIR)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best effort — a stray file in the photos folder is harmless.
  }
}

/** Copy a picker/cache URI into the app's documents folder and return the new URI. */
export async function persistPhoto(uri: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true }).catch(() => {});
  const ext = (uri.split('?')[0].match(/\.(\w{3,4})$/)?.[1] ?? 'jpg').toLowerCase();
  const dest = `${PHOTO_DIR}${uuid()}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
