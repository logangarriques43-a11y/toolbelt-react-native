/**
 * Invoices store — RN counterpart to InvoiceManager.swift.
 * Backed by `/invoices` (GET list, POST/PUT/DELETE) via React Query.
 *
 * Write sites fire and navigate away, so mutations are OPTIMISTIC: patch the
 * cache immediately, roll back and Alert on failure. The wire is lossy —
 * invoiceName and per-line-item ids aren't persisted server-side — so, like
 * time-off, we NEVER invalidate/refetch or reconcile with the server row
 * after a write (create only grafts the backend id). Those reset on a cold
 * reload, matching the Swift app.
 *
 * `addInvoice` stays SYNCHRONOUS (returns the optimistic invoice) so the
 * create screen's fire-and-navigate flow is unchanged. `invoiceNumber` is
 * client-assigned (no server increment), so nextInvoiceNumber = max + 1.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Alert } from 'react-native';

import {
  createInvoice,
  deleteInvoice as deleteInvoiceApi,
  listInvoices,
  updateInvoice as updateInvoiceApi,
} from '@/api/invoices';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import type { Invoice, InvoiceStatus } from '@/models/invoice';

export const INVOICES_QUERY_KEY = ['invoices'] as const;

export interface InvoicesStore {
  invoices: Invoice[];
  nextInvoiceNumber: number;
  addInvoice: (inv: Omit<Invoice, 'id' | 'createdAt'>) => Invoice;
  updateInvoice: (inv: Invoice) => void;
  deleteInvoice: (id: string) => void;
  setStatus: (id: string, status: InvoiceStatus) => void;
}

const InvoicesContext = createContext<InvoicesStore | null>(null);

function alertFailure(action: string, err: unknown) {
  const message =
    err instanceof ApiError
      ? err.message
      : 'Please check your connection and try again.';
  Alert.alert(`Couldn't ${action} invoice`, message);
}

export function InvoicesProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: INVOICES_QUERY_KEY, queryFn: listInvoices });

  const read = () => qc.getQueryData<Invoice[]>(INVOICES_QUERY_KEY) ?? [];
  const write = (next: Invoice[]) => qc.setQueryData(INVOICES_QUERY_KEY, next);

  // CREATE — the optimistic row is written synchronously in addInvoice (so it
  // can return the row); the mutation carries that row's tempId so it can
  // graft the real backend id on success or drop the row on failure. No
  // invalidate, so the local-only invoiceName / line-item ids aren't blanked
  // by a refetch.
  const createMutation = useMutation({
    mutationFn: (vars: { input: Omit<Invoice, 'id' | 'createdAt'>; tempId: string }) =>
      createInvoice(vars.input),
    onError: (err, vars) => {
      write(read().filter((i) => i.id !== vars.tempId));
      alertFailure('save', err);
    },
    onSuccess: (saved, vars) => {
      write(read().map((i) => (i.id === vars.tempId ? { ...i, id: saved.id } : i)));
    },
  });

  // UPDATE — optimistically replace; roll back on error. Keep the optimistic
  // row on success rather than reconciling with the (lossy) server row.
  const updateMutation = useMutation({
    mutationFn: (inv: Invoice) => updateInvoiceApi(inv),
    onMutate: (inv) => {
      const prev = read();
      write(prev.map((i) => (i.id === inv.id ? inv : i)));
      return { prev };
    },
    onError: (err, _inv, ctx) => {
      if (ctx) write(ctx.prev);
      alertFailure('update', err);
    },
  });

  const addInvoice = (input: Omit<Invoice, 'id' | 'createdAt'>): Invoice => {
    const tempId = `optimistic-${uuid()}`;
    const created: Invoice = { ...input, id: tempId, createdAt: new Date().toISOString() };
    write([...read(), created]);
    createMutation.mutate({ input, tempId });
    return created;
  };

  const deleteInvoice = (id: string) => {
    const prev = read();
    write(prev.filter((i) => i.id !== id));
    deleteInvoiceApi(id).catch((err) => {
      write(prev);
      alertFailure('delete', err);
    });
  };

  const invoices = query.data ?? [];

  const value = useMemo<InvoicesStore>(
    () => ({
      invoices,
      nextInvoiceNumber: invoices.reduce((m, i) => Math.max(m, i.invoiceNumber), 0) + 1,
      addInvoice,
      updateInvoice: (inv) => updateMutation.mutate(inv),
      deleteInvoice,
      setStatus: (id, status) => {
        const target = read().find((i) => i.id === id);
        if (target) updateMutation.mutate({ ...target, status });
      },
    }),
    // mutation objects are stable; re-derive when the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices],
  );

  return <InvoicesContext.Provider value={value}>{children}</InvoicesContext.Provider>;
}

export function useInvoices(): InvoicesStore {
  const ctx = useContext(InvoicesContext);
  if (!ctx) throw new Error('useInvoices must be used within an InvoicesProvider');
  return ctx;
}
