/**
 * TimeOffEvent model — port of TimeOffEvent (TimeOffView.swift).
 * Dates are ISO strings; color is a hex string.
 */

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
}
