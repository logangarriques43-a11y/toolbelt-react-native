/**
 * Time-off API — maps the backend `/busy-blocks` DTO to/from the RN
 * TimeOffEvent model. The wire contract is BusyBlockBackendDTO (Swift
 * TimeOffManager): the shared `busy_blocks` collection also holds Google
 * calendar blocks (source "google"), so we only read/write source "timeoff".
 * Backend doc id is used directly as the record id.
 *
 * Wire quirks the mapping handles:
 * - Two status fields: `approval` is the real workflow state
 *   (pending/approved/denied) and is what the RN model's `status` holds;
 *   `status` is a derived availability signal ("active" only when approved,
 *   else "cancelled") that the backend scheduler reads. We send both.
 * - `staffMemberId` on the wire is a staff backend id — which is exactly what
 *   the RN staff store already holds as its record ids, so no id translation.
 *   Business-wide events send null (block everyone).
 * - Not persisted server-side: colorHex, notes, location, and recurrence
 *   (recurrenceGroupId / recurrenceFrequency). These live only in the local
 *   cache and don't survive a cold refetch — same limitation as the Swift app,
 *   which restores them from its local row on merge. Recurring time off is
 *   already expanded into individual events by the form, so each occurrence is
 *   its own busy_block regardless.
 */

import { api } from '@/lib/api-client';
import type { TimeOffEvent, TimeOffStatus } from '@/models/time-off';

/** Default band color when a row arrives without a persisted colorHex. */
const DEFAULT_COLOR_HEX = '#3B82F6'; // blue, matching Swift's .blue default

interface BusyBlockDTO {
  id?: string;
  source?: string | null;
  title?: string | null;
  startTime: string;
  endTime: string;
  staffMemberId?: string | null;
  staffMemberName?: string | null;
  isBusinessWide?: boolean | null;
  isAllDay?: boolean | null;
  status?: string | null;
  approval?: string | null;
  cancellationRequested?: boolean | null;
  requestedByStaff?: boolean | null;
  lastModifiedAt?: string | null;
}

function fromDTO(dto: BusyBlockDTO): TimeOffEvent {
  return {
    id: dto.id ?? '',
    title: dto.title ?? '',
    startTime: dto.startTime,
    endTime: dto.endTime,
    staffName: dto.staffMemberName ?? '',
    colorHex: DEFAULT_COLOR_HEX,
    notes: undefined,
    location: undefined,
    isAllDay: dto.isAllDay ?? false,
    staffMemberId: dto.staffMemberId ?? undefined,
    // Prefer the explicit flag; legacy docs (null) fall back to the old
    // "no staff id = business-wide" inference.
    isBusinessWide: dto.isBusinessWide ?? dto.staffMemberId == null,
    status: (dto.approval as TimeOffStatus) ?? 'approved',
    requestedByStaff: dto.requestedByStaff ?? false,
    cancellationRequested: dto.cancellationRequested ?? false,
    recurrenceGroupId: undefined,
    recurrenceFrequency: undefined,
  };
}

/** Model → wire body. Id is carried in the URL, not the body. */
function toDTO(e: Omit<TimeOffEvent, 'id'>): BusyBlockDTO {
  return {
    source: 'timeoff',
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
    // Business-wide → null (blocks everyone); per-staff → that staff's id.
    staffMemberId: e.isBusinessWide ? null : e.staffMemberId ?? null,
    staffMemberName: e.staffName,
    isBusinessWide: e.isBusinessWide,
    isAllDay: e.isAllDay,
    // Only approved time off blocks availability; pending/denied push as
    // "cancelled" so the scheduler ignores them until approved.
    status: e.status === 'approved' ? 'active' : 'cancelled',
    approval: e.status,
    cancellationRequested: e.cancellationRequested,
    requestedByStaff: e.requestedByStaff,
  };
}

export async function listTimeOff(): Promise<TimeOffEvent[]> {
  const dtos = await api.get<BusyBlockDTO[]>('/busy-blocks');
  return dtos.filter((d) => (d.source ?? 'timeoff') === 'timeoff').map(fromDTO);
}

export async function createTimeOff(input: Omit<TimeOffEvent, 'id'>): Promise<TimeOffEvent> {
  const dto = await api.post<BusyBlockDTO>('/busy-blocks', toDTO(input));
  return fromDTO(dto);
}

export async function updateTimeOff(event: TimeOffEvent): Promise<TimeOffEvent> {
  const { id, ...rest } = event;
  const dto = await api.put<BusyBlockDTO>(`/busy-blocks/${id}`, toDTO(rest));
  return fromDTO(dto);
}

export async function deleteTimeOff(id: string): Promise<void> {
  await api.del(`/busy-blocks/${id}`);
}
