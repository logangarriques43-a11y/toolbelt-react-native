/**
 * Appointment model — port of Appointment.swift.
 * Dates are ISO strings; serviceColor is a hex string. Backend-sync fields omitted.
 */

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
