/**
 * TimeOffEvent model — port of TimeOffEvent (TimeOffView.swift).
 * Dates are ISO strings; color is a hex string.
 *
 * Sync-3 additions (match current Swift source): staff scoping
 * (`staffMemberId` / `isBusinessWide`), the approval workflow (`status` /
 * `requestedByStaff` / `cancellationRequested`), and recurrence
 * (`recurrenceGroupId` / `recurrenceFrequency`, reusing the appointment cadence).
 * Backend-sync fields (serverId, staffMemberServerId, lastModifiedAt) are
 * omitted — the RN app is in-memory, so sync is future-integration spec.
 */

import type { Appointment } from '@/models/appointment';
import type { RecurrenceFrequency } from '@/models/appointment';

/** Approval state. Only `approved` events block the schedule / availability. */
export type TimeOffStatus = 'pending' | 'approved' | 'denied';

export function timeOffStatusLabel(s: TimeOffStatus): string {
  switch (s) {
    case 'pending': return 'Pending';
    case 'approved': return 'Approved';
    case 'denied': return 'Denied';
  }
}

export interface TimeOffEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  staffName: string;
  colorHex: string;
  notes?: string;
  location?: string;
  isAllDay: boolean;
  /** LOCAL StaffMember.id this event applies to. nil when business-wide. */
  staffMemberId?: string;
  /** When true the event closes the business for EVERYONE (staffMemberId nil). */
  isBusinessWide: boolean;
  /** Owner-created = approved immediately; staff-requested starts pending. */
  status: TimeOffStatus;
  /** True when a staff member (not the owner) created the request. */
  requestedByStaff: boolean;
  /** A staff member asked to cancel this approved time off; awaiting the owner. */
  cancellationRequested: boolean;
  /** Every occurrence of a repeating time off shares this id (nil = one-off). */
  recurrenceGroupId?: string;
  /** Cadence the series was created with (nil = one-off). */
  recurrenceFrequency?: RecurrenceFrequency;
}

/** True when this event is one occurrence of a repeating series. */
export function timeOffIsRecurring(e: TimeOffEvent): boolean {
  return e.recurrenceGroupId != null;
}

/** Does [aStart, aEnd) overlap [bStart, bEnd)? Half-open, matching Swift. */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Label for a time-off band on the calendar grid. */
export function timeOffBandLabel(e: TimeOffEvent): string {
  return e.isBusinessWide ? `Closed — ${e.title}` : `${e.staffName} off — ${e.title}`;
}

/** Confirmation-dialog message for cancelling/requesting-cancel a time off. */
export function timeOffCancelMessage(e: TimeOffEvent, canManage: boolean): string {
  const label = `${e.isBusinessWide ? 'Closed — ' : e.staffName + ' — '}${e.title}`;
  if (canManage) return `${label} will be removed and the schedule reopened.`;
  if (e.cancellationRequested) return `${label}: a cancellation request is already pending the owner's approval.`;
  return `${label}: the owner will be asked to approve cancelling this time off.`;
}

/**
 * Approved time-off events that overlap the given calendar day and apply to the
 * viewer: business-wide always, per-staff only when filtered to that member.
 * Mirrors Swift `TimeOffManager.blockingEvents(for:staffId:)`.
 */
export function blockingTimeOff(events: TimeOffEvent[], date: Date, staffId?: string): TimeOffEvent[] {
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  return events.filter((e) => {
    if (e.status !== 'approved') return false;
    if (!overlaps(new Date(e.startTime), new Date(e.endTime), dayStart, dayEnd)) return false;
    if (e.isBusinessWide) return true;
    if (staffId) return e.staffMemberId === staffId;
    return false;
  });
}

/**
 * The first approved time-off event that blocks the proposed [start, end)
 * window for the given staff member (or business-wide). Used by the booking
 * save flow to hard-block a slot. Mirrors the Swift booking time-off guard.
 */
export function firstBlockingTimeOff(
  events: TimeOffEvent[],
  start: Date,
  end: Date,
  staffId?: string,
): TimeOffEvent | undefined {
  return events.find((e) => {
    if (e.status !== 'approved') return false;
    if (!overlaps(start, end, new Date(e.startTime), new Date(e.endTime))) return false;
    if (e.isBusinessWide) return true;
    if (staffId) return e.staffMemberId === staffId;
    return false;
  });
}

/**
 * Non-cancelled appointments that fall INSIDE a time-off window — this member's
 * clients (or everyone when business-wide). Used to warn before creating time
 * off that would strand existing bookings. Mirrors Swift
 * `AppointmentManager.appointmentsConflicting(with:)`.
 */
export function appointmentsConflictingWithTimeOff(
  event: Pick<TimeOffEvent, 'startTime' | 'endTime' | 'isBusinessWide' | 'staffMemberId'>,
  appointments: Appointment[],
): Appointment[] {
  const s = new Date(event.startTime);
  const e = new Date(event.endTime);
  return appointments.filter(
    (a) =>
      a.status !== 'cancelled' &&
      overlaps(new Date(a.startTime), new Date(a.endTime), s, e) &&
      (event.isBusinessWide || (event.staffMemberId != null && a.staffMemberId === event.staffMemberId)),
  );
}
