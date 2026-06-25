/**
 * SMS reminder options — port of ReminderOption (CreateAppointmentViewModel).
 */
export const REMINDERS: { label: string; value: number }[] = [
  { label: 'None', value: 0 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '4 hours before', value: 240 },
  { label: '12 hours before', value: 720 },
  { label: '24 hours before', value: 1440 },
  { label: '48 hours before', value: 2880 },
];

export function reminderLabel(minutes: number): string {
  return REMINDERS.find((o) => o.value === minutes)?.label ?? `${Math.round(minutes / 60)} hours before`;
}
