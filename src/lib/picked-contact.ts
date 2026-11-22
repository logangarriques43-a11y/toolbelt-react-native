/**
 * A contact picked from the device (or the browser's contact picker), and the
 * "which number?" prompt shared by every picker implementation.
 */

import { Alert, Platform } from 'react-native';

export interface PickedContact {
  name: string;
  /** Every phone number on the card, primary/mobile first. */
  phones: string[];
  email?: string;
}

/** When a contact has several numbers, ask which one to use. */
export function choosePhoneNumber(contact: PickedContact): Promise<string | null> {
  if (contact.phones.length <= 1) return Promise.resolve(contact.phones[0] ?? null);
  return new Promise((resolve) => {
    Alert.alert(
      contact.name || 'Choose a number',
      'Which number should ToolBelt use?',
      // Android dialogs hold at most three buttons: offer up to three numbers
      // there (tap outside to cancel); iOS gets up to five plus Cancel.
      Platform.OS === 'android'
        ? contact.phones.slice(0, 3).map((p) => ({ text: p, onPress: () => resolve(p) }))
        : [
            ...contact.phones.slice(0, 5).map((p) => ({ text: p, onPress: () => resolve(p) })),
            { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
          ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
