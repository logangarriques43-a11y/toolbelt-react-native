/**
 * Services store — RN counterpart to ServiceManager.swift.
 * In-memory CRUD; backend sync (pushToBackend/syncFromBackend) is deferred.
 * Seeds a sample "Swedish Massage" when empty, matching `seedSampleIfEmpty`.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import { DEFAULT_SERVICE_COLOR, type Service } from '@/models/service';

export interface ServicesStore {
  services: Service[];
  /** Returns the created service (with its generated id). */
  addService: (s: Omit<Service, 'id'>) => Service;
  updateService: (s: Service) => void;
  deleteService: (id: string) => void;
  findService: (id: string) => Service | undefined;
}

function sampleService(): Service {
  return {
    id: uuid(),
    name: 'Swedish Massage',
    colorHex: DEFAULT_SERVICE_COLOR,
    price: 35,
    duration: 35,
    priceType: 'Fixed',
    processingTime: 0,
    blockTime: 0,
    noDoubleBooking: false,
    availableForOnlineBooking: true,
  };
}

const ServicesContext = createContext<ServicesStore | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Service[]>(() => [sampleService()]);

  const value = useMemo<ServicesStore>(
    () => ({
      services,
      addService: (s) => {
        const created: Service = { ...s, id: uuid() };
        setServices((prev) => [...prev, created]);
        return created;
      },
      updateService: (s) =>
        setServices((prev) => prev.map((it) => (it.id === s.id ? s : it))),
      deleteService: (id) => setServices((prev) => prev.filter((it) => it.id !== id)),
      findService: (id) => services.find((it) => it.id === id),
    }),
    [services],
  );

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): ServicesStore {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used within a ServicesProvider');
  return ctx;
}
