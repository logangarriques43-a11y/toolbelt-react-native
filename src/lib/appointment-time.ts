/**
 * Appointment time math — port of the time helpers in CreateAppointmentViewModel.
 * Times are 12-hour (hour 1–12, isPM) until converted for storage.
 */

/** 12-hour → 24-hour. */
export function to24(hour: number, isPM: boolean): number {
  return isPM ? (hour % 12) + 12 : hour % 12;
}

/** "9:00" — leading hour with zero-padded minutes (hour 0 shows as 12). */
export function formatTimeDisplay(hour: number, minute: number): string {
  const displayHour = hour === 0 ? 12 : hour;
  return `${displayHour}:${String(minute).padStart(2, '0')}`;
}

/** Minutes between two 12-hour times, handling overnight wrap. */
export function durationMinutes(
  sH: number, sM: number, sPM: boolean,
  eH: number, eM: number, ePM: boolean,
): number {
  const start = to24(sH, sPM) * 60 + sM;
  let end = to24(eH, ePM) * 60 + eM;
  if (end <= start) end += 24 * 60;
  return end - start;
}

/** "45 min" / "1 hr" / "1 hr 30 min". */
export function formatDurationLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/** "h:mm AM/PM" for start + addingMinutes. */
export function endTimeString(sH: number, sM: number, sPM: boolean, addingMinutes: number): string {
  const total = to24(sH, sPM) * 60 + sM + addingMinutes;
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const isPM = h24 >= 12;
  const displayHour = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  return `${displayHour}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

/** End time = start + serviceDuration, as 12-hour components. */
export function recalcEndTime(
  serviceDuration: number, sH: number, sM: number, sPM: boolean,
): { endHour: number; endMinute: number; endIsPM: boolean } {
  const total = to24(sH, sPM) * 60 + sM + serviceDuration;
  const h24 = Math.floor(total / 60) % 24;
  const endMinute = total % 60;
  const endIsPM = h24 >= 12;
  const endHour = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  return { endHour, endMinute, endIsPM };
}

/** Combines a calendar date (ISO) with 12-hour time components into a Date. */
export function combineDateTime(dateISO: string, hour: number, minute: number, isPM: boolean): Date {
  const d = new Date(dateISO);
  d.setHours(to24(hour, isPM), minute, 0, 0);
  return d;
}

const fullFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});
const shortFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export const formattedDateFull = (dateISO: string) => fullFmt.format(new Date(dateISO));
export const formattedDateShort = (dateISO: string) => shortFmt.format(new Date(dateISO));
