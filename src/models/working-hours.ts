/**
 * Working-hours model — port of WorkingHoursInterval / DaySchedule
 * (WorkingHoursManager.swift). Times are 24-hour. Weekdays are keyed 0–6
 * (0 = Sunday) to match JS `Date.getDay()`.
 *
 * Simplified vs. Swift: date-specific overrides are deferred — only the weekly
 * schedule is modeled.
 */

export interface WorkingHoursInterval {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface DaySchedule {
  isWorkingDay: boolean;
  intervals: WorkingHoursInterval[];
}

export const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/** Default: Mon–Fri 9am–5pm, weekends off. */
export function defaultWeeklySchedule(): Record<number, DaySchedule> {
  const out: Record<number, DaySchedule> = {};
  for (let d = 0; d < 7; d++) {
    const working = d >= 1 && d <= 5;
    out[d] = working
      ? { isWorkingDay: true, intervals: [{ startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }] }
      : { isWorkingDay: false, intervals: [] };
  }
  return out;
}

export function intervalTimeString(hour: number, minute: number): string {
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}
