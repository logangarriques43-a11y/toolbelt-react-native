/**
 * Services API — typed calls over the backend `/services` endpoints, mapping the
 * backend DTO (ServiceBackendDTO in the Swift app) to the RN `Service` model.
 * Backend id is used directly as `Service.id`. Add-ons / tax fields on the DTO
 * are not modeled in RN yet (deferred).
 */

import { api } from '@/lib/api-client';
import type { PriceType, Service } from '@/models/service';

interface ServiceDTO {
  id?: string;
  name: string;
  colorHex: string;
  price: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  duration: number;
  priceType: string;
  processingTime?: number | null;
  blockTime?: number | null;
  noDoubleBooking?: boolean | null;
  availableForOnlineBooking?: boolean | null;
  lastModifiedAt?: string | null;
}

function fromDTO(d: ServiceDTO): Service {
  return {
    id: d.id ?? '',
    name: d.name,
    colorHex: d.colorHex,
    price: d.price,
    minPrice: d.minPrice ?? undefined,
    maxPrice: d.maxPrice ?? undefined,
    duration: d.duration,
    priceType: (d.priceType === 'Variable' ? 'Variable' : 'Fixed') as PriceType,
    processingTime: d.processingTime ?? 0,
    blockTime: d.blockTime ?? 0,
    noDoubleBooking: d.noDoubleBooking ?? false,
    availableForOnlineBooking: d.availableForOnlineBooking ?? true,
  };
}

function toDTO(s: Omit<Service, 'id'>): ServiceDTO {
  return {
    name: s.name,
    colorHex: s.colorHex,
    price: s.price,
    minPrice: s.minPrice ?? undefined,
    maxPrice: s.maxPrice ?? undefined,
    duration: s.duration,
    priceType: s.priceType,
    processingTime: s.processingTime,
    blockTime: s.blockTime,
    noDoubleBooking: s.noDoubleBooking,
    availableForOnlineBooking: s.availableForOnlineBooking,
  };
}

export async function listServices(): Promise<Service[]> {
  const dtos = await api.get<ServiceDTO[]>('/services');
  return (dtos ?? []).map(fromDTO);
}

export async function createService(input: Omit<Service, 'id'>): Promise<Service> {
  const dto = await api.post<ServiceDTO>('/services', toDTO(input));
  return fromDTO(dto);
}

export async function updateService(service: Service): Promise<Service> {
  const dto = await api.put<ServiceDTO>(`/services/${service.id}`, toDTO(service));
  return fromDTO(dto);
}

export async function deleteService(id: string): Promise<void> {
  await api.del(`/services/${id}`);
}
