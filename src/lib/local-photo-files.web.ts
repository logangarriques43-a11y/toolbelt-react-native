/**
 * Where local photos live in the browser. Like the phone apps, these photos
 * stay on this device and are never uploaded. A browser has no documents
 * folder, and a picked file's blob: URL dies on reload, so we keep a downscaled
 * JPEG data URL (≤ 800px on the long side, roughly 60–120 KB). `local-photos.ts`
 * stores it in AsyncStorage (localStorage on the web), the same way the phone
 * stores file URIs. Same exports as `local-photo-files.ts`.
 */

const MAX_EDGE = 800;
const QUALITY = 0.75;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be read as an image.'));
    img.src = src;
  });
}

/** Downscale the picked image and return it as a self-contained data URL. */
export async function persistPhoto(uri: string): Promise<string> {
  const img = await loadImage(uri);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser could not process the photo.');
  ctx.drawImage(img, 0, 0, w, h);
  if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
  return canvas.toDataURL('image/jpeg', QUALITY);
}

/** Data URLs live inside the stored list, so there is no separate file to delete. */
export async function deletePhotoFile(_uri: string): Promise<void> {}
