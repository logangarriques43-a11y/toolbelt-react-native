/**
 * Appointments API — maps the backend `/appointments` DTO to/from the RN
 * Appointment model. The wire contract is AppointmentBackendDTO (Swift
 * AppointmentManager); the RN model mirrors it field-for-field, so the mapping
 * is nearly 1:1. Backend doc id is used directly as the record id.
 *
 * Deferred (optional on the wire): selectedAddOnIds / addOnsSnapshot (add-ons
 * aren't ported) and lastModifiedAt (the backend stamps it on every write).
 * Ids for client/service/staff are the backend serverIds, which is exactly
 * what the RN stores already hold as their record ids.
 */

import { api } from '@/lib/api-client';
import type {
  Appointment,
  AppointmentStatus,
  RecurrenceFrequency,
} from '@/models/appointment';

interface AppointmentDTO {
  id?: string;
  clientId?: string | null;
  clientName: string;
  clientPhone?: string | null;
  serviceId?: string | null;
  serviceName: string;
  serviceColor: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  processingTime: number;
  blockTime: number;
  staffMemberId?: string | null;
  staffMemberName?: string | null;
  reminderMinutesBefore?: number | null;
  notes?: string | null;
  internalNotes?: string | null;
  location?: string | null;
  status?: string | null;
  recurrenceGroupId?: string | null;
  recurrenceFrequency?: string | null;
}

function fromDTO(dto: AppointmentDTO): Appointment {
  return {
    id: dto.id ?? '',
    clientId: dto.clientId ?? '',
    clientName: dto.clientName,
    clientPhone: dto.clientPhone ?? undefined,
    serviceId: dto.serviceId ?? '',
    serviceName: dto.serviceName,
    serviceColor: dto.serviceColor,
    startTime: dto.startTime,
    endTime: dto.endTime,
    duration: dto.duration,
    price: dto.price,
    processingTime: dto.processingTime,
    blockTime: dto.blockTime,
    staffMemberId: dto.staffMemberId ?? undefined,
    staffMemberName: dto.staffMemberName ?? undefined,
    reminderMinutesBefore: dto.reminderMinutesBefore ?? 1440,
    status: (dto.status as AppointmentStatus) ?? 'scheduled',
    notes: dto.notes ?? '',
    internalNotes: dto.internalNotes ?? '',
    location: dto.location ?? '',
    recurrenceGroupId: dto.recurrenceGroupId ?? undefined,
    recurrenceFrequency: (dto.recurrenceFrequency as RecurrenceFrequency) ?? undefined,
  };
}

/** Model → wire body. Id is carried in the URL, not the body. */
function toDTO(a: Omit<Appointment, 'id'>): AppointmentDTO {
  return {
    clientId: a.clientId,
    clientName: a.clientName,
    clientPhone: a.clientPhone,
    serviceId: a.serviceId,
    serviceName: a.serviceName,
    serviceColor: a.serviceColor,
    startTime: a.startTime,
    endTime: a.endTime,
    duration: a.duration,
    price: a.price,
    processingTime: a.processingTime,
    blockTime: a.blockTime,
    staffMemberId: a.staffMemberId,
    staffMemberName: a.staffMemberName,
    reminderMinutesBefore: a.reminderMinutesBefore,
    notes: a.notes,
    internalNotes: a.internalNotes,
    location: a.location,
    status: a.status,
    recurrenceGroupId: a.recurrenceGroupId,
    recurrenceFrequency: a.recurrenceFrequency,
  };
}

export async function listAppointments(): Promise<Appointment[]> {
  const dtos = await api.get<AppointmentDTO[]>('/appointments');
  return dtos.map(fromDTO);
}

export async function createAppointment(input: Omit<Appointment, 'id'>): Promise<Appointment> {
  const dto = await api.post<AppointmentDTO>('/appointments', toDTO(input));
  return fromDTO(dto);
}

export async function updateAppointment(appt: Appointment): Promise<Appointment> {
  const { id, ...rest } = appt;
  const dto = await api.put<AppointmentDTO>(`/appointments/${id}`, toDTO(rest));
  return fromDTO(dto);
}

export async function deleteAppointment(id: string): Promise<void> {
  await api.del(`/appointments/${id}`);
}
