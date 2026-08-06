/**
 * Clients API — typed calls over the backend `/clients` endpoints, mapping the
 * backend DTO (ClientBackendDTO in the Swift app) to the RN `Client` model.
 *
 * The backend id is used directly as the RN `Client.id` (no local-uuid/serverId
 * duality — the RN app has no offline-create requirement yet). Responses are
 * bare JSON (arrays / objects), which the api client unwraps.
 */

import { api } from '@/lib/api-client';
import type { Client } from '@/models/client';

/** Wire shape (matches Swift ClientBackendDTO / backend req.body fields). */
interface ClientDTO {
  id?: string;
  name: string;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  email?: string | null;
  notes?: string | null;
  location?: string | null;
  birthday?: string | null;
  clientBlockTime?: number | null;
  smsConsentGiven?: boolean | null;
  smsConsentDate?: string | null;
  smsConsentMethod?: string | null;
  lastModifiedAt?: string | null;
  createdAt?: string | null;
}

function fromDTO(d: ClientDTO): Client {
  return {
    id: d.id ?? '',
    name: d.name,
    phoneNumber: d.phonePrimary ?? '',
    secondaryPhoneNumber: d.phoneSecondary ?? undefined,
    email: d.email ?? undefined,
    notes: d.notes ?? undefined,
    location: d.location ?? undefined,
    birthday: d.birthday ?? undefined,
    clientBlockTime: d.clientBlockTime ?? 0,
    smsConsentGiven: d.smsConsentGiven ?? false,
    smsConsentDate: d.smsConsentDate ?? undefined,
    smsConsentMethod: d.smsConsentMethod ?? undefined,
    createdAt: d.createdAt ?? undefined,
  };
}

/** Build the create/update request body from a Client (or partial for create). */
function toDTO(c: Omit<Client, 'id'>): ClientDTO {
  return {
    name: c.name,
    phonePrimary: c.phoneNumber || undefined,
    phoneSecondary: c.secondaryPhoneNumber || undefined,
    email: c.email || undefined,
    notes: c.notes || undefined,
    location: c.location || undefined,
    birthday: c.birthday || undefined,
    clientBlockTime: c.clientBlockTime ?? 0,
    smsConsentGiven: c.smsConsentGiven ?? false,
    smsConsentDate: c.smsConsentDate || undefined,
    smsConsentMethod: c.smsConsentMethod || undefined,
  };
}

export async function listClients(): Promise<Client[]> {
  const dtos = await api.get<ClientDTO[]>('/clients');
  return (dtos ?? []).map(fromDTO);
}

export async function createClient(input: Omit<Client, 'id'>): Promise<Client> {
  const dto = await api.post<ClientDTO>('/clients', toDTO(input));
  return fromDTO(dto);
}

export async function updateClient(client: Client): Promise<Client> {
  const dto = await api.put<ClientDTO>(`/clients/${client.id}`, toDTO(client));
  return fromDTO(dto);
}

export async function deleteClient(id: string): Promise<void> {
  await api.del(`/clients/${id}`);
}
