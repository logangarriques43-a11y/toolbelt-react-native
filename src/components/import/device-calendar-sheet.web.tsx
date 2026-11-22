/**
 * Device calendar import isn't possible from a browser (no access to the
 * phone's calendar database). The import screen hides the option on the web
 * (`DEVICE_CALENDAR_SUPPORTED`); people import an exported .ics file instead.
 * Same component export as `device-calendar-sheet.tsx` so the screen compiles.
 */

import type { ParsedAppointment, ParsedClient, ParsedService } from '@/models/import-data';

export interface DeviceCalendarImport {
  appointments: ParsedAppointment[];
  clients: ParsedClient[];
  services: ParsedService[];
  label: string;
}

export function DeviceCalendarSheet(_props: {
  visible: boolean;
  onClose: () => void;
  onLoaded: (result: DeviceCalendarImport) => void;
}) {
  return null;
}
