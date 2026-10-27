/**
 * AppointmentDefaults — analog of Swift `AppointmentDefaults`. Holds the
 * reminder timing applied to NEW appointments. Set from Settings → Reminder
 * Timing (via the business-settings store) or the appointment-detail reminder
 * menu ("Set as default for new appointments"); kept on the device in
 * AsyncStorage so it survives a relaunch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'appointmentDefaults.reminderMinutes';

/** Matches Swift's default of 24 hours before. */
let reminderMinutes = 1440;

AsyncStorage.getItem(STORAGE_KEY)
  .then((v) => {
    const n = v === null ? NaN : Number(v);
    if (Number.isFinite(n) && n >= 0) reminderMinutes = n;
  })
  .catch(() => {});

/** The reminder timing (minutes-before) applied to newly created appointments. */
export function defaultReminderMinutes(): number {
  return reminderMinutes;
}

/** Make `minutes` the default reminder timing for new appointments. */
export function setDefaultReminderMinutes(minutes: number): void {
  reminderMinutes = minutes;
  AsyncStorage.setItem(STORAGE_KEY, String(minutes)).catch(() => {});
}
