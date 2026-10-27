/**
 * Local photos — device-only images for clients, staff and appointments.
 *
 * iOS keeps these photos on the device and never uploads them (see
 * gap-contracts §10); the RN app does the same. Picked images are copied into
 * `documentDirectory/photos/` (so they survive cache clears) and their file
 * URIs are stored in AsyncStorage under `localPhotos:<kind>:<recordId>`.
 *
 * `choosePhoto()` shows the Take Photo / Choose from Library prompt, handles
 * camera permission (with an Open Settings path when denied) and returns the
 * persisted URI, or null if the user backed out.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { uuid } from '@/lib/id';

export type PhotoKind = 'client' | 'staff' | 'appointment';

const key = (kind: PhotoKind, id: string) => `localPhotos:${kind}:${id}`;
const PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}photos/`;

/** All photo URIs stored for a record (oldest first). */
export async function getPhotos(kind: PhotoKind, id: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key(kind, id));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

/** Replace a record's photo list. Files dropped from the list are deleted. */
export async function setPhotos(kind: PhotoKind, id: string, uris: string[]): Promise<void> {
  const previous = await getPhotos(kind, id);
  if (uris.length === 0) await AsyncStorage.removeItem(key(kind, id));
  else await AsyncStorage.setItem(key(kind, id), JSON.stringify(uris));
  await Promise.all(previous.filter((u) => !uris.includes(u)).map(deleteFile));
}

/** First (avatar) photo for a record, if any. */
export async function getPhoto(kind: PhotoKind, id: string): Promise<string | undefined> {
  return (await getPhotos(kind, id))[0];
}

/** Set (or clear with `undefined`) the single avatar photo for a record. */
export async function setPhoto(kind: PhotoKind, id: string, uri: string | undefined): Promise<void> {
  await setPhotos(kind, id, uri ? [uri] : []);
}

/** Delete a picked file that was never saved against a record (e.g. form cancelled). */
export async function discardPhoto(uri: string): Promise<void> {
  await deleteFile(uri);
}

async function deleteFile(uri: string): Promise<void> {
  if (!uri.startsWith(PHOTO_DIR)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best effort — a stray file in the photos folder is harmless.
  }
}

/** Copy a picker/cache URI into the app's documents folder and return the new URI. */
async function persist(uri: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true }).catch(() => {});
  const ext = (uri.split('?')[0].match(/\.(\w{3,4})$/)?.[1] ?? 'jpg').toLowerCase();
  const dest = `${PHOTO_DIR}${uuid()}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

function openSettingsAlert(what: string) {
  Alert.alert(`${what} access is off`, `Turn on ${what} for ToolBelt in Settings to add photos.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
}

async function pick(source: 'camera' | 'library', square: boolean): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    quality: 0.7,
  };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) openSettingsAlert('Camera');
      return null;
    }
  }
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return persist(result.assets[0].uri);
}

/**
 * Ask Take Photo / Choose from Library (plus Remove Photo when `onRemove` is
 * given). Resolves with the persisted URI, or null when cancelled / removed.
 * `square` crops to 1:1 for avatars.
 */
export function choosePhoto({
  title = 'Photo',
  square = true,
  onRemove,
}: { title?: string; square?: boolean; onRemove?: () => void } = {}): Promise<string | null> {
  return new Promise((resolve) => {
    const run = (source: 'camera' | 'library') =>
      pick(source, square)
        .then(resolve)
        .catch((e) => {
          Alert.alert('Could not add photo', e instanceof Error ? e.message : 'Please try again.');
          resolve(null);
        });
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'Take Photo', onPress: () => run('camera') },
      { text: 'Choose from Library', onPress: () => run('library') },
    ];
    if (onRemove) {
      buttons.push({ text: 'Remove Photo', style: 'destructive', onPress: () => { onRemove(); resolve(null); } });
    }
    // Android dialogs hold at most three buttons; tapping outside cancels there.
    if (!(Platform.OS === 'android' && onRemove)) {
      buttons.push({ text: 'Cancel', style: 'cancel', onPress: () => resolve(null) });
    }
    Alert.alert(title, undefined, buttons, { cancelable: true, onDismiss: () => resolve(null) });
  });
}

/** React hook: the stored photo list for a record, refreshed when `id` changes. */
export function useLocalPhotos(kind: PhotoKind, id: string | undefined) {
  const [photos, setState] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setState([]);
      return;
    }
    getPhotos(kind, id).then((p) => alive && setState(p));
    return () => {
      alive = false;
    };
  }, [kind, id]);
  const save = useCallback(
    async (uris: string[]) => {
      if (!id) return;
      setState(uris);
      await setPhotos(kind, id, uris);
    },
    [kind, id],
  );
  return { photos, save };
}
