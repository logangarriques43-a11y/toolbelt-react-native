/**
 * ICS / iCal parser — port of ICSParser.swift.
 * Extracts VEVENT components into appointments and derives unique clients +
 * services. TZID-based timezone conversion is approximated as local time
 * (full IANA conversion would need an extra dependency).
 */

import { uuid } from '@/lib/id';
import type { ParsedAppointment, ParsedClient, ParsedService } from '@/models/import-data';

interface ICSEvent {
  summary?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  organizer?: string;
  attendees: string[];
}

export function parseICS(text: string): {
  appointments: ParsedAppointment[];
  clients: ParsedClient[];
  services: ParsedService[];
} {
  const events = extractEvents(text);
  const appointments: ParsedAppointment[] = [];
  const clientNames = new Set<string>();
  const serviceNames = new Set<string>();

  for (const event of events) {
    if (!event.startDate || !event.endDate) continue;
    const clientName = extractClientName(event) ?? 'Unknown Client';
    const serviceName = event.summary ?? 'Imported Appointment';
    appointments.push({
      id: uuid(),
      clientName,
      serviceName,
      startTime: event.startDate.toISOString(),
      endTime: event.endDate.toISOString(),
      price: 0,
      notes: event.description || undefined,
      staffName: event.organizer || undefined,
      selected: true,
    });
    if (clientName !== 'Unknown Client') clientNames.add(clientName);
    serviceNames.add(serviceName);
  }

  const clients: ParsedClient[] = [...clientNames].map((name) => ({ id: uuid(), name, phone: '', selected: true }));
  const services: ParsedService[] = [...serviceNames].map((name) => ({
    id: uuid(),
    name,
    price: 0,
    duration: 30,
    selected: true,
  }));

  return { appointments, clients, services };
}

function extractEvents(text: string): ICSEvent[] {
  // Unfold continuation lines (a leading space/tab continues the previous line).
  const unfolded = text
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\r|\n/);

  const events: ICSEvent[] = [];
  let current: ICSEvent | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') {
      current = { attendees: [] };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    if (line.startsWith('SUMMARY:')) {
      current.summary = line.slice('SUMMARY:'.length);
    } else if (line.startsWith('DESCRIPTION:')) {
      current.description = line.slice('DESCRIPTION:'.length).replace(/\\n/g, '\n').replace(/\\,/g, ',');
    } else if (line.startsWith('DTSTART')) {
      current.startDate = parseICSDate(line) ?? undefined;
    } else if (line.startsWith('DTEND')) {
      current.endDate = parseICSDate(line) ?? undefined;
    } else if (line.startsWith('LOCATION:')) {
      current.location = line.slice('LOCATION:'.length).replace(/\\,/g, ',');
    } else if (line.startsWith('ORGANIZER')) {
      current.organizer = extractMailto(line) ?? extractCN(line) ?? undefined;
    } else if (line.startsWith('ATTENDEE')) {
      const a = extractCN(line) ?? extractMailto(line);
      if (a) current.attendees.push(a);
    }
  }
  return events;
}

function parseICSDate(line: string): Date | null {
  const colon = line.lastIndexOf(':');
  if (colon < 0) return null;
  const value = line.slice(colon + 1).trim();

  // UTC: 20260115T100000Z
  let m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  }
  // Local: 20260115T100000 (TZID, if present, is treated as local)
  m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  }
  // Date-only: 20260115
  m = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  return null;
}

/** ATTENDEE;CN=John Doe:mailto:… → "John Doe". */
function extractCN(line: string): string | null {
  const i = line.indexOf('CN=');
  if (i < 0) return null;
  const after = line.slice(i + 3);
  const end = after.search(/[;:]/);
  const name = (end >= 0 ? after.slice(0, end) : after).replace(/"/g, '').trim();
  return name || null;
}

function extractMailto(line: string): string | null {
  const i = line.toLowerCase().indexOf('mailto:');
  if (i < 0) return null;
  const email = line.slice(i + 'mailto:'.length).trim();
  return email || null;
}

function extractClientName(event: ICSEvent): string | null {
  if (event.attendees.length > 0) return event.attendees[0];
  if (event.description) {
    for (const pattern of ['Client:', 'Customer:', 'Booked by:', 'Name:']) {
      const idx = event.description.toLowerCase().indexOf(pattern.toLowerCase());
      if (idx >= 0) {
        const after = event.description.slice(idx + pattern.length);
        const name = after.split(/[\n\r]/)[0].trim();
        if (name) return name;
      }
    }
  }
  return null;
}
