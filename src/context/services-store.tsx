/**
 * Services store — backed by the real backend via React Query (was in-memory).
 *
 * List from `GET /services` (cached, refetched on invalidation); create/update/
 * delete POST/PUT/DELETE and invalidate the list. Same public API as before,
 * but the mutations are async (they hit the network). No sample seed — the list
 * is whatever the backend returns for the signed-in business.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createService, deleteService as apiDeleteService, listServices, updateService as apiUpdateService } from '@/api/services';
import type { Service } from '@/models/service';

export const SERVICES_QUERY_KEY = ['services'] as const;

export interface ServicesStore {
  services: Service[];
  isLoading: boolean;
  error: unknown;
  /** POSTs to the backend; resolves with the created service (server id). */
  addService: (s: Omit<Service, 'id'>) => Promise<Service>;
  updateService: (s: Service) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  findService: (id: string) => Service | undefined;
}

const ServicesContext = createContext<ServicesStore | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: SERVICES_QUERY_KEY, queryFn: listServices });
  const services = useMemo(() => data ?? [], [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
  const createMut = useMutation({ mutationFn: createService, onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: apiUpdateService, onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: apiDeleteService, onSuccess: invalidate });

  const value = useMemo<ServicesStore>(
    () => ({
      services,
      isLoading,
      error,
      addService: (s) => createMut.mutateAsync(s),
      updateService: async (s) => {
        await updateMut.mutateAsync(s);
      },
      deleteService: async (id) => {
        await deleteMut.mutateAsync(id);
      },
      findService: (id) => services.find((it) => it.id === id),
    }),
    [services, isLoading, error, createMut, updateMut, deleteMut],
  );

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): ServicesStore {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used within a ServicesProvider');
  return ctx;
}
