/**
 * Import data models — port of ImportModels.swift + the ImportStep enum.
 * Drives the CSV/ICS import wizard (clients / services / appointments).
 */

import type { SFSymbol } from 'expo-symbols';

export type ImportFileType = 'csv' | 'ics';

export const IMPORT_FILE_TYPES: { type: ImportFileType; label: string; icon: SFSymbol; description: string }[] = [
  {
    type: 'csv',
    label: 'CSV',
    icon: 'tablecells',
    description: 'Import from a CSV file exported from apps like Goldie, Fresha, Square, or Vagaro',
  },
  {
    type: 'ics',
    label: 'ICS / iCal',
    icon: 'calendar',
    description: 'Import from an iCal/ICS file exported from Google Calendar, Apple Calendar, or Calendly',
  },
];

export type ImportDataCategory = 'clients' | 'services' | 'appointments';

export const IMPORT_CATEGORIES: { category: ImportDataCategory; label: string; icon: SFSymbol; color: string }[] = [
  { category: 'clients', label: 'Clients', icon: 'person.3.fill', color: '#4CBF80' },
  { category: 'services', label: 'Services', icon: 'list.clipboard.fill', color: '#9966E6' },
  { category: 'appointments', label: 'Appointments', icon: 'calendar.badge.plus', color: '#4285F5' },
];

export type MappableField =
  | 'clientName'
  | 'clientPhone'
  | 'clientEmail'
  | 'clientNotes'
  | 'clientLocation'
  | 'serviceName'
  | 'servicePrice'
  | 'serviceDuration'
  | 'serviceColor'
  | 'appointmentDate'
  | 'appointmentStartTime'
  | 'appointmentEndTime'
  | 'appointmentClientName'
  | 'appointmentServiceName'
  | 'appointmentPrice'
  | 'appointmentNotes'
  | 'appointmentStaff';

export interface MappableFieldDef {
  field: MappableField;
  label: string;
  category: ImportDataCategory;
  commonHeaders: string[];
}

export const MAPPABLE_FIELDS: MappableFieldDef[] = [
  { field: 'clientName', label: 'Client Name', category: 'clients', commonHeaders: ['name', 'client name', 'client', 'full name', 'customer name', 'customer'] },
  { field: 'clientPhone', label: 'Phone Number', category: 'clients', commonHeaders: ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'phone_number'] },
  { field: 'clientEmail', label: 'Email', category: 'clients', commonHeaders: ['email', 'email address', 'e-mail', 'email_address'] },
  { field: 'clientNotes', label: 'Notes', category: 'clients', commonHeaders: ['notes', 'note', 'comments', 'comment', 'description'] },
  { field: 'clientLocation', label: 'Location', category: 'clients', commonHeaders: ['location', 'address', 'city', 'area'] },
  { field: 'serviceName', label: 'Service Name', category: 'services', commonHeaders: ['service', 'service name', 'treatment', 'service_name', 'type'] },
  { field: 'servicePrice', label: 'Price', category: 'services', commonHeaders: ['price', 'cost', 'amount', 'rate', 'fee', 'service price'] },
  { field: 'serviceDuration', label: 'Duration (min)', category: 'services', commonHeaders: ['duration', 'length', 'time', 'minutes', 'mins', 'duration_minutes'] },
  { field: 'serviceColor', label: 'Color', category: 'services', commonHeaders: ['color', 'colour', 'hex', 'color_hex'] },
  { field: 'appointmentDate', label: 'Date', category: 'appointments', commonHeaders: ['date', 'appointment date', 'day', 'scheduled date', 'booking date'] },
  { field: 'appointmentStartTime', label: 'Start Time', category: 'appointments', commonHeaders: ['start time', 'start', 'time', 'begins', 'from', 'start_time'] },
  { field: 'appointmentEndTime', label: 'End Time', category: 'appointments', commonHeaders: ['end time', 'end', 'finish', 'to', 'ends', 'end_time'] },
  { field: 'appointmentClientName', label: 'Client Name (Appt)', category: 'appointments', commonHeaders: ['client', 'client name', 'customer', 'customer name', 'booked by'] },
  { field: 'appointmentServiceName', label: 'Service Name (Appt)', category: 'appointments', commonHeaders: ['service', 'service name', 'treatment', 'appointment type'] },
  { field: 'appointmentPrice', label: 'Price (Appt)', category: 'appointments', commonHeaders: ['price', 'cost', 'amount', 'total', 'charge'] },
  { field: 'appointmentNotes', label: 'Notes (Appt)', category: 'appointments', commonHeaders: ['notes', 'note', 'comments', 'memo'] },
  { field: 'appointmentStaff', label: 'Staff Member', category: 'appointments', commonHeaders: ['staff', 'staff member', 'provider', 'stylist', 'therapist', 'employee'] },
];

export function fieldsForCategory(category: ImportDataCategory): MappableFieldDef[] {
  return MAPPABLE_FIELDS.filter((f) => f.category === category);
}

export function fieldLabel(field: MappableField): string {
  return MAPPABLE_FIELDS.find((f) => f.field === field)?.label ?? field;
}

export interface ColumnMapping {
  id: string;
  csvHeader: string;
  mappedField: MappableField | null;
}

export interface ParsedClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  location?: string;
  selected: boolean;
}

export interface ParsedService {
  id: string;
  name: string;
  price: number;
  duration: number;
  colorHex?: string;
  selected: boolean;
}

export interface ParsedAppointment {
  id: string;
  clientName: string;
  serviceName: string;
  /** ISO datetime. */
  startTime: string;
  /** ISO datetime. */
  endTime: string;
  price: number;
  notes?: string;
  staffName?: string;
  selected: boolean;
}

export interface ImportResult {
  clientsImported: number;
  servicesImported: number;
  appointmentsImported: number;
  /** Personal calendar events imported as time off (Sync-4 detection). */
  timeOffImported: number;
  errors: string[];
}

export function importTotal(r: ImportResult): number {
  return r.clientsImported + r.servicesImported + r.appointmentsImported + r.timeOffImported;
}

export function importSummary(r: ImportResult): string {
  const parts: string[] = [];
  if (r.clientsImported > 0) parts.push(`${r.clientsImported} client${r.clientsImported === 1 ? '' : 's'}`);
  if (r.servicesImported > 0) parts.push(`${r.servicesImported} service${r.servicesImported === 1 ? '' : 's'}`);
  if (r.appointmentsImported > 0) parts.push(`${r.appointmentsImported} appointment${r.appointmentsImported === 1 ? '' : 's'}`);
  if (r.timeOffImported > 0) parts.push(`${r.timeOffImported} time off${r.timeOffImported === 1 ? '' : 's'}`);
  return parts.join(', ');
}

// ── Smart type detection (Sync-4) — port of DetectedServiceGroup / Resolution ──

/** What the import should do with a detected appointment-type group. */
export type Resolution =
  /** Map every appointment in the group onto this existing service. */
  | { kind: 'assignExisting'; serviceId: string }
  /** Create one new service named after the label, then assign it. */
  | { kind: 'createNew' }
  /** Import raw titles as service names (pre-detection behavior). */
  | { kind: 'leaveAsIs' }
  /** Personal events → TIME OFF: block the schedule, no client/service/appt. */
  | { kind: 'convertToTimeOff' }
  /** Don't bring these events over at all. */
  | { kind: 'skip' };

/**
 * One detected appointment type ("Massage") and every parsed appointment that
 * matched it, plus the owner's chosen resolution + staff connection.
 */
export interface DetectedServiceGroup {
  id: string;
  /** Display label, e.g. "Massage" (most common original casing). */
  label: string;
  /** ParsedAppointment.ids in this group (mutable so groups can be merged). */
  appointmentIds: string[];
  /** Client names split out of titles, keyed by ParsedAppointment.id. */
  refinedClientNames: Record<string, string>;
  /** A representative raw title, shown so the owner can sanity-check. */
  sampleTitle: string;
  /** Local id of the best-matching existing service, when one was found. */
  matchedServiceId?: string;
  /** What the import should do with this group. */
  resolution: Resolution;
  /** Staff member the owner connected this type to (nil = fall back to rules). */
  assignedStaffId?: string;
}

export function groupCount(g: DetectedServiceGroup): number {
  return g.appointmentIds.length;
}

/** Short label for a group's current resolution (needs services for names). */
export function resolutionLabel(g: DetectedServiceGroup, services: { id: string; name: string }[]): string {
  switch (g.resolution.kind) {
    case 'assignExisting': {
      const name = services.find((s) => s.id === (g.resolution as { serviceId: string }).serviceId)?.name ?? 'service';
      return `Use “${name}”`;
    }
    case 'createNew': return 'New service';
    case 'leaveAsIs': return 'Keep as-is';
    case 'convertToTimeOff': return 'Time off';
    case 'skip': return "Don't import";
  }
}

export type ImportStep = 'selectSource' | 'pickFile' | 'mapColumns' | 'preview' | 'importing' | 'complete';

export const IMPORT_STEPS: ImportStep[] = ['selectSource', 'pickFile', 'mapColumns', 'preview', 'importing', 'complete'];

export const IMPORT_STEP_TITLES: Record<ImportStep, string> = {
  selectSource: 'Select Source',
  pickFile: 'Choose File',
  mapColumns: 'Map Columns',
  preview: 'Preview',
  importing: 'Importing',
  complete: 'Complete',
};
