/**
 * AppointmentDefaults — in-memory analog of Swift `AppointmentDefaults`
 * (UserDefaults-backed there). Holds the reminder timing applied to NEW
 * appointments, editable from the appointment-detail reminder menu
 * ("Set as default for new appointments"). Persistence is deferred like the
 * rest of the in-memory stores; the value resets on app relaunch.
 */

/** Matches Swift's default of 24 hours before. */
let reminderMinutes = 1440;

/** The reminder timing (minutes-before) applied to newly created appointments. */
export function defaultReminderMinutes(): number {
  return reminderMinutes;
}

/** Make `minutes` the default reminder timing for new appointments. */
export function setDefaultReminderMinutes(minutes: number): void {
  reminderMinutes = minutes;
}
