/**
 * CSV parser — port of CSVParser.swift.
 * Parses raw CSV text into rows, auto-maps headers to app fields, and turns
 * mapped rows into ParsedClient/Service/Appointment records. Pure functions.
 */

import { uuid } from '@/lib/id';
import {
  fieldsForCategory,
  type ColumnMapping,
  type ImportDataCategory,
  type MappableField,
  type ParsedAppointment,
  type ParsedClient,
  type ParsedService,
} from '@/models/import-data';

/** Split a single CSV line, honoring quoted fields containing commas. */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else current += char;
  }
  fields.push(current);
  return fields;
}

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (i < values.length) row[header] = values[i].trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

/** Match CSV headers to fields for a category via their common header aliases. */
export function autoMapColumns(headers: string[], category: ImportDataCategory): ColumnMapping[] {
  const fields = fieldsForCategory(category);
  return headers.map((header) => {
    const normalized = header.toLowerCase().trim();
    const match = fields.find((f) => f.commonHeaders.includes(normalized));
    return { id: uuid(), csvHeader: header, mappedField: match?.field ?? null };
  });
}

function headerFor(mappings: ColumnMapping[], field: MappableField): string | undefined {
  return mappings.find((m) => m.mappedField === field)?.csvHeader;
}

const val = (row: Record<string, string>, header?: string): string | undefined =>
  header ? row[header] : undefined;

export function parseClients(rows: Record<string, string>[], mappings: ColumnMapping[]): ParsedClient[] {
  const nameH = headerFor(mappings, 'clientName');
  const phoneH = headerFor(mappings, 'clientPhone');
  const emailH = headerFor(mappings, 'clientEmail');
  const notesH = headerFor(mappings, 'clientNotes');
  const locationH = headerFor(mappings, 'clientLocation');

  const out: ParsedClient[] = [];
  for (const row of rows) {
    const name = val(row, nameH);
    if (!name) continue;
    out.push({
      id: uuid(),
      name,
      phone: val(row, phoneH) ?? '',
      email: val(row, emailH) || undefined,
      notes: val(row, notesH) || undefined,
      location: val(row, locationH) || undefined,
      selected: true,
    });
  }
  return out;
}

export function parseServices(rows: Record<string, string>[], mappings: ColumnMapping[]): ParsedService[] {
  const nameH = headerFor(mappings, 'serviceName');
  const priceH = headerFor(mappings, 'servicePrice');
  const durationH = headerFor(mappings, 'serviceDuration');
  const colorH = headerFor(mappings, 'serviceColor');

  const seen = new Set<string>();
  const out: ParsedService[] = [];
  for (const row of rows) {
    const name = val(row, nameH);
    if (!name) continue;
    const norm = name.toLowerCase().trim();
    if (seen.has(norm)) continue;
    seen.add(norm);
    const durationStr = val(row, durationH) ?? '30';
    out.push({
      id: uuid(),
      name,
      price: parsePrice(val(row, priceH) ?? '0'),
      duration: parseInt(durationStr.replace(/[^0-9]/g, ''), 10) || 30,
      colorHex: val(row, colorH) || undefined,
      selected: true,
    });
  }
  return out;
}

export function parseAppointments(rows: Record<string, string>[], mappings: ColumnMapping[]): ParsedAppointment[] {
  const dateH = headerFor(mappings, 'appointmentDate');
  const startH = headerFor(mappings, 'appointmentStartTime');
  const endH = headerFor(mappings, 'appointmentEndTime');
  const clientH = headerFor(mappings, 'appointmentClientName');
  const serviceH = headerFor(mappings, 'appointmentServiceName');
  const priceH = headerFor(mappings, 'appointmentPrice');
  const notesH = headerFor(mappings, 'appointmentNotes');
  const staffH = headerFor(mappings, 'appointmentStaff');

  const out: ParsedAppointment[] = [];
  for (const row of rows) {
    const dateStr = val(row, dateH);
    const startStr = val(row, startH);
    if (!dateStr || !startStr) continue;

    const start = parseDateTime(dateStr, startStr);
    if (!start) continue;

    const endStr = val(row, endH);
    const end = (endStr && parseDateTime(dateStr, endStr)) || new Date(start.getTime() + 30 * 60_000);

    out.push({
      id: uuid(),
      clientName: val(row, clientH) || 'Unknown Client',
      serviceName: val(row, serviceH) || 'Imported Service',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      price: parsePrice(val(row, priceH) ?? '0'),
      notes: val(row, notesH) || undefined,
      staffName: val(row, staffH) || undefined,
      selected: true,
    });
  }
  return out;
}

/** "$50", "50.00", "$1,200" → number. */
export function parsePrice(s: string): number {
  const cleaned = s.replace(/\$/g, '').replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const MONTHS_3 = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Convert "h:mm a" / "HH:mm" → minutes since midnight. */
function parseClock(timeStr: string): number | null {
  const m = timeStr.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3];
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Parse a date column into [year, month(0-based), day], across common formats. */
function parseDateParts(dateStr: string): [number, number, number] | null {
  const s = dateStr.trim();
  // yyyy-MM-dd
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return [+m[1], +m[2] - 1, +m[3]];
  // MM/dd/yyyy or MM-dd-yyyy (US default)
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return [+m[3], +m[1] - 1, +m[2]];
  // "Jan 5, 2026" / "5 Jan 2026"
  m = s.toLowerCase().match(/([a-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mo = MONTHS_3.indexOf(m[1].slice(0, 3));
    if (mo >= 0) return [+m[3], mo, +m[2]];
  }
  return null;
}

/** Combine a date string + time string into a local Date, or null. */
export function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const combined = `${dateStr} ${timeStr}`.trim();

  // ISO 8601 (e.g. "2026-01-15T10:00:00") — let the engine try first.
  if (/^\d{4}-\d{2}-\d{2}T/.test(combined.replace(' ', 'T'))) {
    const iso = new Date(combined.replace(' ', 'T'));
    if (!Number.isNaN(iso.getTime())) return iso;
  }

  const date = parseDateParts(dateStr);
  const minutes = parseClock(timeStr);
  if (date && minutes != null) {
    return new Date(date[0], date[1], date[2], Math.floor(minutes / 60), minutes % 60);
  }

  // Last resort: native Date parsing.
  const fallback = new Date(combined);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
