/**
 * Device contact picker — "Import from Contacts" for the client / staff forms
 * and the Messages "new conversation" flow.
 *
 * expo-contacts in this SDK ships `presentContactPickerAsync()`, which opens the
 * system's own contact picker (CNContactPickerViewController on iOS, the
 * Contacts app's ACTION_PICK on Android) — so no custom list sheet is needed.
 * Android requires READ_CONTACTS before the picker can return details; iOS
 * needs no permission. When access is permanently denied the user gets an
 * Open Settings prompt. Contacts are read on-device only; nothing is uploaded
 * except what the user then saves into the form.
 */

import * as Contacts from 'expo-contacts';
import { Alert, Linking, Platform } from 'react-native';

export interface PickedContact {
  name: string;
  /** Every phone number on the card, primary/mobile first. */
  phones: string[];
  email?: string;
}

const FIELDS = [Contacts.Fields.Name, Contacts.Fields.FirstName, Contacts.Fields.LastName, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails];

function rankPhone(p: Contacts.PhoneNumber): number {
  if (p.isPrimary) return 0;
  const label = (p.label ?? '').toLowerCase();
  if (label.includes('mobile') || label.includes('cell') || label.includes('iphone')) return 1;
  return 2;
}

function toPicked(c: Contacts.Contact): PickedContact {
  const name = (c.name || [c.firstName, c.lastName].filter(Boolean).join(' ')).trim();
  const phones = [...(c.phoneNumbers ?? [])]
    .sort((a, b) => rankPhone(a) - rankPhone(b))
    .map((p) => (p.number ?? p.digits ?? '').trim())
    .filter(Boolean);
  const email = c.emails?.find((e) => e.isPrimary)?.email ?? c.emails?.[0]?.email;
  return { name, phones: Array.from(new Set(phones)), email: email || undefined };
}

async function ensureAndroidPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const current = await Contacts.getPermissionsAsync();
  if (current.granted) return true;
  const req = current.canAskAgain ? await Contacts.requestPermissionsAsync() : current;
  if (req.granted) return true;
  if (!req.canAskAgain) {
    Alert.alert('Contacts access is off', 'Turn on Contacts for ToolBelt in Settings to import from your contacts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
  }
  return false;
}

/**
 * Open the system contact picker. Resolves with the chosen contact's name,
 * phones and email, or null if the user cancelled / denied access.
 */
export async function pickDeviceContact(): Promise<PickedContact | null> {
  try {
    if (!(await ensureAndroidPermission())) return null;
    const picked = await Contacts.presentContactPickerAsync();
    if (!picked) return null;
    let contact: Contacts.Contact = picked;
    // Some Android pickers hand back a sparse record — refetch the details.
    if (Platform.OS === 'android' && picked.id && !picked.phoneNumbers?.length && !picked.emails?.length) {
      contact = (await Contacts.getContactByIdAsync(picked.id, FIELDS)) ?? picked;
    }
    return toPicked(contact);
  } catch (e) {
    Alert.alert('Could not open contacts', e instanceof Error ? e.message : 'Please try again.');
    return null;
  }
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
