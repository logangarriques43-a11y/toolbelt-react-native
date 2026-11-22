/**
 * Contact picker in the browser — the Contact Picker API, which only Chrome on
 * Android offers (`navigator.contacts.select`). The UI hides "Import from
 * Contacts" where it's missing (`CONTACT_PICKER_SUPPORTED`), so the fallback
 * alert below is only a safety net. Same exports as `contacts-picker-sheet.tsx`.
 */

import { Alert } from 'react-native';

import type { PickedContact } from '@/lib/picked-contact';

export { choosePhoneNumber, type PickedContact } from '@/lib/picked-contact';

interface BrowserContact {
  name?: string[];
  tel?: string[];
  email?: string[];
}

type ContactsManager = {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<BrowserContact[]>;
};

export async function pickDeviceContact(): Promise<PickedContact | null> {
  const contacts = (navigator as Navigator & { contacts?: ContactsManager }).contacts;
  if (!contacts?.select) {
    Alert.alert('Not available in this browser', 'Importing from your contacts works in the ToolBelt phone app.');
    return null;
  }
  try {
    const [picked] = await contacts.select(['name', 'tel', 'email'], { multiple: false });
    if (!picked) return null;
    const phones = Array.from(new Set((picked.tel ?? []).map((t) => t.trim()).filter(Boolean)));
    return { name: (picked.name?.[0] ?? '').trim(), phones, email: picked.email?.[0] || undefined };
  } catch (e) {
    Alert.alert('Could not open contacts', e instanceof Error ? e.message : 'Please try again.');
    return null;
  }
}
