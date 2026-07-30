/**
 * StaffMember model — port of StaffMember (StaffMember.swift).
 * Photo deferred (native). assignedServiceIds links services this member performs.
 *
 * Sync-1a additions (match current Swift source): per-staff calendar color,
 * recurring weekly lunch breaks, and per-staff weekly working hours, plus the
 * booking-eligibility helpers the calendar/booking flows read. Staff-login +
 * permission-map fields are carried but their UI lands in Sync-1b.
 *
 * WEEKDAY CONVENTION: staff hours/lunch use 1=Sun … 7=Sat (Swift `.weekday`),
 * NOT the 0=Sun … 6=Sat used by the business-wide working-hours model. Keep the
 * two straight — staff math mirrors the Swift source exactly.
 */

/** One recurring weekly lunch window. weekday 1=Sun … 7=Sat. */
export interface StaffLunchBreak {
  weekday: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

/** One weekday's custom working window. weekday 1=Sun … 7=Sat. */
export interface StaffWorkingDay {
  weekday: number;
  isWorkingDay: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  email?: string;
  isActive: boolean;
  isOwner: boolean;
  assignedServiceIds: string[];
  /** Per-staff calendar color, hex `#RRGGBB`. Empty = no color (neutral card). */
  colorHex: string;
  /** Recurring weekly lunch breaks. Empty = none. */
  lunchBreaks: StaffLunchBreak[];
  /** Per-staff weekly hours. Empty = follow the business hours (default). */
  workingHours: StaffWorkingDay[];
  /** Per-staff permission map (Permission key → allowed). Owner ignores it. Sync-1b. */
  permissions?: Record<string, boolean>;
}

/** The orange accent used throughout the Staff UI — Color(0.95, 0.6, 0.2). */
export const STAFF_ORANGE = '#F29933';

export function staffInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return '?';
}

/** Owner-picked calendar color, or null when none set (caller falls back to neutral). */
export function staffColor(m: StaffMember): string | null {
  return m.colorHex && m.colorHex.length > 0 ? m.colorHex : null;
}

const startMin = (h: number, m: number) => h * 60 + m;

/** JS Date → Swift-style weekday (1=Sun … 7=Sat). */
function weekdayOf(d: Date): number {
  return d.getDay() + 1;
}

/**
 * Whether this member provides the given service. A null/undefined serviceId
 * (none chosen yet) matches everyone. Mirrors Swift `provides(serviceId:)`.
 */
export function staffProvides(m: StaffMember, serviceId?: string | null): boolean {
  if (!serviceId) return true;
  return m.assignedServiceIds.includes(serviceId);
}

/**
 * Whether the member is on the clock for the whole [start, end) window — inside
 * their custom hours for that weekday (if any) and clear of any lunch break. A
 * member with no custom hours for the day follows the business hours and counts
 * as working. Mirrors Swift `worksDuring(start:end:)`.
 */
export function staffWorksDuring(m: StaffMember, start: Date, end: Date): boolean {
  const weekday = weekdayOf(start);
  const s = startMin(start.getHours(), start.getMinutes());
  const e = startMin(end.getHours(), end.getMinutes());

  const day = m.workingHours.find((d) => d.weekday === weekday);
  if (day) {
    if (!day.isWorkingDay) return false;
    if (s < startMin(day.startHour, day.startMinute) || e > startMin(day.endHour, day.endMinute)) return false;
  }

  for (const lunch of m.lunchBreaks) {
    if (lunch.weekday !== weekday) continue;
    if (s < startMin(lunch.endHour, lunch.endMinute) && e > startMin(lunch.startHour, lunch.startMinute)) {
      return false;
    }
  }
  return true;
}

/**
 * Whether the member's OWN schedule affirmatively covers [start, end). Unlike
 * `staffWorksDuring`, a member with no custom hours for the weekday returns
 * false — used to suppress the business-hours warning only when the member's
 * schedule explicitly says they're on the clock. Mirrors Swift `scheduleCovers`.
 */
export function staffScheduleCovers(m: StaffMember, start: Date, end: Date): boolean {
  const weekday = weekdayOf(start);
  const day = m.workingHours.find((d) => d.weekday === weekday);
  if (!day || !day.isWorkingDay) return false;
  const s = startMin(start.getHours(), start.getMinutes());
  const e = startMin(end.getHours(), end.getMinutes());
  return s >= startMin(day.startHour, day.startMinute) && e <= startMin(day.endHour, day.endMinute);
}
