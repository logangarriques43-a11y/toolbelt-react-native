/**
 * Appointment model — port of Appointment.swift.
 * Dates are ISO strings; serviceColor is a hex string. Backend-sync fields omitted.
 *
 * Sync-2a additions (match current Swift source): booking lifecycle `status`,
 * free-text `notes`/`internalNotes`/`location`, and recurrence (`recurrenceGroupId`
 * + `recurrenceFrequency`). Per-service add-ons and photos are NOT ported (add-ons
 * are a separate feature; photos are native) — so `duration`/`price`/etc. stay the
 * plain service values plus the client's block-time.
 */

import type { SFSymbol } from 'expo-symbols';

import { iOSColors } from '@/theme/tokens';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'noShow';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = ['scheduled', 'completed', 'cancelled', 'noShow'];

export function statusDisplayName(s: AppointmentStatus): string {
  switch (s) {
    case 'scheduled': return 'Scheduled';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'noShow': return 'No-show';
  }
}

export function statusIcon(s: AppointmentStatus): SFSymbol {
  switch (s) {
    case 'scheduled': return 'calendar';
    case 'completed': return 'checkmark.seal.fill';
    case 'cancelled': return 'xmark.circle.fill';
    case 'noShow': return 'person.fill.xmark';
  }
}

export function statusTint(s: AppointmentStatus): string {
  switch (s) {
    case 'scheduled': return iOSColors.blue;
    case 'completed': return iOSColors.green;
    case 'cancelled': return iOSColors.red;
    case 'noShow': return iOSColors.orange;
  }
}

/** A cancelled/no-show appointment frees its time and is visually muted. */
export function statusIsInactive(s: AppointmentStatus): boolean {
  return s === 'cancelled' || s === 'noShow';
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export const RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly'];

export function recurrenceDisplayName(f: RecurrenceFrequency): string {
  switch (f) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'biweekly': return 'Every 2 weeks';
    case 'monthly': return 'Monthly';
  }
}

/**
 * The start date of each occurrence in a series of `count` bookings beginning at
 * `start` (the first element is always `start`). `count` is clamped to 1…52.
 * Mirrors Swift `RecurrenceFrequency.occurrences(startingFrom:count:)`.
 */
export function recurrenceOccurrences(frequency: RecurrenceFrequency, start: Date, count: number): Date[] {
  const clamped = Math.max(1, Math.min(count, 52));
  const out: Date[] = [];
  for (let i = 0; i < clamped; i++) {
    if (i === 0) {
      out.push(new Date(start));
      continue;
    }
    const d = new Date(start);
    switch (frequency) {
      case 'daily': d.setDate(d.getDate() + i); break;
      case 'weekly': d.setDate(d.getDate() + 7 * i); break;
      case 'biweekly': d.setDate(d.getDate() + 14 * i); break;
      case 'monthly': d.setMonth(d.getMonth() + i); break;
    }
    out.push(d);
  }
  return out;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  serviceId: string;
  serviceName: string;
  serviceColor: string;
  /** ISO datetime. */
  startTime: string;
  /** ISO datetime. */
  endTime: string;
  duration: number;
  price: number;
  processingTime: number;
  blockTime: number;
  staffMemberId?: string;
  staffMemberName?: string;
  reminderMinutesBefore: number;
  /** Booking lifecycle; defaults to 'scheduled'. */
  status: AppointmentStatus;
  /** Client-visible context. */
  notes: string;
  /** Staff-only notes. */
  internalNotes: string;
  /** Appointment address (mobile / house-call businesses). */
  location: string;
  /** Every occurrence in a repeating series shares this id (undefined = one-off). */
  recurrenceGroupId?: string;
  /** Cadence the series was created with (undefined = one-off). */
  recurrenceFrequency?: RecurrenceFrequency;
}

/** True when this booking is one occurrence of a repeating series. */
export function isRecurring(a: Appointment): boolean {
  return a.recurrenceGroupId != null;
}

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/** "9:00 AM - 10:00 AM" — accepts anything with start/end ISO times. */
export function appointmentTimeRange(a: { startTime: string; endTime: string }): string {
  return `${timeFmt.format(new Date(a.startTime))} - ${timeFmt.format(new Date(a.endTime))}`;
}

/** duration + processingTime + blockTime. */
export function appointmentTotalDuration(a: Appointment): number {
  return a.duration + a.processingTime + a.blockTime;
}
