/**
 * Staff-aware calendar shading + tint — ports StaffScheduleShading.swift and
 * StaffColorTint (StaffColor.swift). When the calendar is filtered to a specific
 * staff member, the closed-hours shading reflects THAT person's working hours
 * (custom-or-business) minus their lunch; blocks are tinted with the assigned
 * staff member's color. With no staff selected, business hours are used unchanged.
 */

import type { Appointment } from '@/models/appointment';
import { staffColor, type StaffLunchBreak, type StaffMember } from '@/models/staff';
import type { DaySchedule, WorkingHoursInterval } from '@/models/working-hours';

/** Alpha of the staff color laid over the card background (Swift cardOpacity). */
export const STAFF_TINT_OPACITY = 0.18;

/**
 * The working hours to use for a given date's closed-hours shading. With a staff
 * member selected: their shift for that weekday (custom if set, else business),
 * MINUS their lunch. No staff → business hours unchanged. Mirrors Swift
 * `StaffScheduleShading.effectiveHours`. (weekday 1=Sun…7=Sat.)
 */
export function effectiveHours(date: Date, business: DaySchedule, staff: StaffMember | null): DaySchedule {
  if (!staff) return business;
  const weekday = date.getDay() + 1;

  let isWorkingDay = business.isWorkingDay;
  let intervals = business.intervals;
  if (staff.workingHours.length > 0) {
    const day = staff.workingHours.find((d) => d.weekday === weekday);
    if (day) {
      if (!day.isWorkingDay) return { isWorkingDay: false, intervals: [] };
      isWorkingDay = true;
      intervals = [{ startHour: day.startHour, startMinute: day.startMinute, endHour: day.endHour, endMinute: day.endMinute }];
    }
  }
  if (!isWorkingDay) return { isWorkingDay: false, intervals: [] };

  const lunches = staff.lunchBreaks.filter((l) => l.weekday === weekday);
  if (lunches.length > 0) intervals = subtractLunches(intervals, lunches);
  return { isWorkingDay: intervals.length > 0, intervals };
}

/** Whether a slot falls inside the (already staff-resolved) working intervals. */
export function isEffectiveWorkingTime(eff: DaySchedule, hour: number, minute: number): boolean {
  if (!eff.isWorkingDay) return false;
  const t = hour * 60 + minute;
  return eff.intervals.some((i) => t >= i.startHour * 60 + i.startMinute && t < i.endHour * 60 + i.endMinute);
}

/**
 * The calendar color of the staff member assigned to `appointment`, or null when
 * unassigned or that member has no color. Mirrors Swift `StaffColorTint.color`.
 */
export function staffTint(appointment: Appointment, staff: StaffMember[]): string | null {
  if (!appointment.staffMemberId) return null;
  const member = staff.find((m) => m.id === appointment.staffMemberId);
  return member ? staffColor(member) : null;
}

/** Remove lunch windows from the working intervals, splitting an interval in two
 *  when a lunch falls in its middle (9–5 minus 12–1 → 9–12 and 1–5). Pure minute math. */
function subtractLunches(intervals: WorkingHoursInterval[], lunches: StaffLunchBreak[]): WorkingHoursInterval[] {
  let ranges = intervals.map((i) => ({ start: i.startHour * 60 + i.startMinute, end: i.endHour * 60 + i.endMinute }));
  for (const lb of lunches) {
    const ls = lb.startHour * 60 + lb.startMinute;
    const le = lb.endHour * 60 + lb.endMinute;
    if (le <= ls) continue;
    const next: { start: number; end: number }[] = [];
    for (const r of ranges) {
      if (le <= r.start || ls >= r.end) {
        next.push(r); // no overlap
      } else {
        if (ls > r.start) next.push({ start: r.start, end: ls }); // left remainder
        if (le < r.end) next.push({ start: le, end: r.end }); // right remainder
        // otherwise the lunch fully covers the range → drop it
      }
    }
    ranges = next;
  }
  return ranges.map((r) => ({ startHour: Math.floor(r.start / 60), startMinute: r.start % 60, endHour: Math.floor(r.end / 60), endMinute: r.end % 60 }));
}
