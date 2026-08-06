/**
 * Clients store — now backed by the real backend via React Query (was in-memory).
 *
 * The list comes from `GET /clients` (cached, refetched on invalidation); create/
 * update/delete POST/PUT/DELETE and invalidate the list. The public API is the
 * same as before except the mutations are async (they hit the network), so
 * callers that need the created client `await addClient(...)`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createClient, deleteClient as apiDeleteClient, listClients, updateClient as apiUpdateClient } from '@/api/clients';
import type { Client } from '@/models/client';

export const CLIENTS_QUERY_KEY = ['clients'] as const;

export interface ClientsStore {
  clients: Client[];
  isLoading: boolean;
  error: unknown;
  /** POSTs to the backend; resolves with the created client (server id). */
  addClient: (c: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (c: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  findClient: (id: string) => Client | undefined;
  searchClients: (query: string) => Client[];
}

const ClientsContext = createContext<ClientsStore | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: CLIENTS_QUERY_KEY, queryFn: listClients });
  const clients = useMemo(() => data ?? [], [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
  const createMut = useMutation({ mutationFn: createClient, onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: apiUpdateClient, onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: apiDeleteClient, onSuccess: invalidate });

  const value = useMemo<ClientsStore>(
    () => ({
      clients,
      isLoading,
      error,
      addClient: (c) => createMut.mutateAsync(c),
      updateClient: async (c) => {
        await updateMut.mutateAsync(c);
      },
      deleteClient: async (id) => {
        await deleteMut.mutateAsync(id);
      },
      findClient: (id) => clients.find((it) => it.id === id),
      searchClients: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return clients;
        return clients.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phoneNumber.includes(query) ||
            (c.email?.toLowerCase().includes(q) ?? false) ||
            (c.location?.toLowerCase().includes(q) ?? false),
        );
      },
    }),
    [clients, isLoading, error, createMut, updateMut, deleteMut],
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients(): ClientsStore {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error('useClients must be used within a ClientsProvider');
  return ctx;
}
