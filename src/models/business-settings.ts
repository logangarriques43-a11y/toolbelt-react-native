/**
 * Business settings model — the values edited from the Settings hub + children.
 * Mirrors the various UserDefaults keys the SwiftUI screens persisted.
 */

export interface BusinessAddress {
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export const EMPTY_ADDRESS: BusinessAddress = {
  street: '', apt: '', city: '', state: '', zip: '', country: '',
};

export const REMINDER_TIMING_OPTIONS: { label: string; subtitle: string; hours: number }[] = [
  { label: '1 hour before', subtitle: 'Last-minute reminder', hours: 1 },
  { label: '3 hours before', subtitle: 'Same-day heads up', hours: 3 },
  { label: '12 hours before', subtitle: 'Half-day notice', hours: 12 },
  { label: '24 hours before', subtitle: 'Day before reminder', hours: 24 },
  { label: '48 hours before', subtitle: 'Two days in advance', hours: 48 },
  { label: '72 hours before', subtitle: 'Three days in advance', hours: 72 },
];

export function reminderTimingLabel(hours: number): string {
  return REMINDER_TIMING_OPTIONS.find((o) => o.hours === hours)?.label ?? `${hours} hours before`;
}
