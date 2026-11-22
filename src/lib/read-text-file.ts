/**
 * Read a file the user picked (expo-document-picker asset) as text. Phones read
 * the cached file URI; the browser build (`read-text-file.web.ts`) reads the
 * picked File object instead.
 */

import * as FileSystem from 'expo-file-system/legacy';

export function readPickedTextFile(asset: { uri: string; file?: unknown }): Promise<string> {
  return FileSystem.readAsStringAsync(asset.uri);
}
