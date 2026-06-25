/**
 * Invoices store — RN counterpart to InvoiceManager.swift.
 * In-memory CRUD + status transitions. Backend send/sync (email/SMS drafts,
 * Stripe payment links, payment reconciliation) is deferred.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import type { Invoice, InvoiceStatus } from '@/models/invoice';

export interface InvoicesStore {
  invoices: Invoice[];
  nextInvoiceNumber: number;
  addInvoice: (inv: Omit<Invoice, 'id' | 'createdAt'>) => Invoice;
  updateInvoice: (inv: Invoice) => void;
  deleteInvoice: (id: string) => void;
  setStatus: (id: string, status: InvoiceStatus) => void;
}

const InvoicesContext = createContext<InvoicesStore | null>(null);

export function InvoicesProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const value = useMemo<InvoicesStore>(
    () => ({
      invoices,
      nextInvoiceNumber: (invoices.reduce((m, i) => Math.max(m, i.invoiceNumber), 0) ?? 0) + 1,
      addInvoice: (inv) => {
        const created: Invoice = { ...inv, id: uuid(), createdAt: new Date().toISOString() };
        setInvoices((prev) => [...prev, created]);
        return created;
      },
      updateInvoice: (inv) => setInvoices((prev) => prev.map((i) => (i.id === inv.id ? inv : i))),
      deleteInvoice: (id) => setInvoices((prev) => prev.filter((i) => i.id !== id)),
      setStatus: (id, status) => setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i))),
    }),
    [invoices],
  );

  return <InvoicesContext.Provider value={value}>{children}</InvoicesContext.Provider>;
}

export function useInvoices(): InvoicesStore {
  const ctx = useContext(InvoicesContext);
  if (!ctx) throw new Error('useInvoices must be used within an InvoicesProvider');
  return ctx;
}
