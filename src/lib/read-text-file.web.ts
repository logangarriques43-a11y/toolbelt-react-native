/**
 * Browser version of `read-text-file.ts`: expo-document-picker hands back the
 * picked `File`, which the browser can read directly (expo-file-system can't
 * read files on the web).
 */

export async function readPickedTextFile(asset: { uri: string; file?: unknown }): Promise<string> {
  if (asset.file instanceof Blob) return asset.file.text();
  const res = await fetch(asset.uri);
  if (!res.ok) throw new Error('Could not read the file.');
  return res.text();
}
