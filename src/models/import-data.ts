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
  errors: string[];
}

export function importTotal(r: ImportResult): number {
  return r.clientsImported + r.servicesImported + r.appointmentsImported;
}

export function importSummary(r: ImportResult): string {
  const parts: string[] = [];
  if (r.clientsImported > 0) parts.push(`${r.clientsImported} client${r.clientsImported === 1 ? '' : 's'}`);
  if (r.servicesImported > 0) parts.push(`${r.servicesImported} service${r.servicesImported === 1 ? '' : 's'}`);
  if (r.appointmentsImported > 0) parts.push(`${r.appointmentsImported} appointment${r.appointmentsImported === 1 ? '' : 's'}`);
  return parts.join(', ');
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
