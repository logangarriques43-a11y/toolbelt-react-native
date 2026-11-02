/**
 * Pick one image from the library as base64, for uploads through the backend.
 * No resize step: expo-image-manipulator isn't installed, so `quality` is the
 * only control we have over size. Callers still check the result's size.
 */

import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/** The picked image's base64, or null if the person backed out or refused access. */
export async function pickImageBase64(quality: number): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photo access needed', 'Allow photo access in Settings to add a photo.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality,
    base64: true,
  });
  return result.canceled ? null : (result.assets[0]?.base64 ?? null);
}
