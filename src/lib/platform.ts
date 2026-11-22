/**
 * Platform capability flags — one place to ask "can this build do X?" instead
 * of scattering `Platform.OS === 'web'` checks across screens.
 */

import { Platform } from 'react-native';

/** True in the browser build (app.toolbelt.tools). */
export const IS_WEB = Platform.OS === 'web';

/**
 * Passkeys: the backend's relying-party id is the API host, which the browser
 * origin (app.toolbelt.tools) can't use — see `api/webauthn.web.ts`.
 */
export const PASSKEYS_OFFERED = !IS_WEB;

/** Tap to Pay needs NFC + Stripe's native Terminal SDK. */
export const TAP_TO_PAY_SUPPORTED = !IS_WEB;

/** Reading the device's own calendars / camera barcode scanner. */
export const DEVICE_CALENDAR_SUPPORTED = !IS_WEB;
export const BARCODE_SCANNER_SUPPORTED = !IS_WEB;

/**
 * Picking from the device's contacts. In a browser only Chrome on Android has
 * the Contact Picker API (`navigator.contacts.select`).
 */
export const CONTACT_PICKER_SUPPORTED =
  !IS_WEB ||
  (typeof navigator !== 'undefined' &&
    typeof (navigator as Navigator & { contacts?: { select?: unknown } }).contacts?.select === 'function');
