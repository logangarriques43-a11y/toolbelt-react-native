/**
 * Clients store — RN counterpart to ClientManager.swift.
 * In-memory CRUD + search; backend sync is deferred. Starts empty.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import type { Client } from '@/models/client';

export interface ClientsStore {
  clients: Client[];
  /** Returns the created client (with its generated id). */
  addClient: (c: Omit<Client, 'id'>) => Client;
  updateClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  findClient: (id: string) => Client | undefined;
  searchClients: (query: string) => Client[];
}

const ClientsContext = createContext<ClientsStore | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);

  const value = useMemo<ClientsStore>(
    () => ({
      clients,
      addClient: (c) => {
        const created: Client = { ...c, id: uuid(), createdAt: c.createdAt ?? new Date().toISOString() };
        setClients((prev) => [...prev, created]);
        return created;
      },
      updateClient: (c) =>
        setClients((prev) => prev.map((it) => (it.id === c.id ? c : it))),
      deleteClient: (id) => setClients((prev) => prev.filter((it) => it.id !== id)),
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
    [clients],
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients(): ClientsStore {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error('useClients must be used within a ClientsProvider');
  return ctx;
}
