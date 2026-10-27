/**
 * Sales store — RN counterpart to SaleTransactionManager.swift.
 * Sale transactions from the Payments checkout, backed by `/transactions` via
 * React Query (the same records the iOS app shows). Exposes period-aware
 * revenue + collected-tax totals that fold into the Accounting hub and Tax
 * Dashboard (mirrors Swift `revenue(for:)`).
 *
 * Writes are OPTIMISTIC like the other stores: `addSale` returns the sale
 * immediately (so the checkout can show its receipt), then swaps in the saved
 * row; failures roll back and alert.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { createTransaction, deleteTransaction, listTransactions } from '@/api/transactions';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import type { SaleTransaction } from '@/models/sale';
import { periodContains, type TransactionPeriod } from '@/models/transaction';

export const SALES_QUERY_KEY = ['sales'] as const;

export interface SalesStore {
  sales: SaleTransaction[];
  addSale: (s: Omit<SaleTransaction, 'id'>) => SaleTransaction;
  deleteSale: (id: string) => void;
  salesFor: (period: TransactionPeriod) => SaleTransaction[];
  /** Gross charged (incl. tax) for the period — feeds combined income. */
  revenue: (period: TransactionPeriod) => number;
  /** Sales tax collected for the period — feeds the Tax Dashboard. */
  taxCollected: (period: TransactionPeriod) => number;
}

const SalesContext = createContext<SalesStore | null>(null);

function alertFailure(action: string, err: unknown) {
  const message =
    err instanceof ApiError ? err.message : 'Please check your connection and try again.';
  Alert.alert(`Couldn't ${action}`, message);
}

export function SalesProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: SALES_QUERY_KEY, queryFn: listTransactions });

  const read = () => qc.getQueryData<SaleTransaction[]>(SALES_QUERY_KEY) ?? [];
  const write = (next: SaleTransaction[]) => qc.setQueryData(SALES_QUERY_KEY, next);

  const value = useMemo<SalesStore>(() => {
    const sales = query.data ?? [];
    const salesFor = (period: TransactionPeriod) =>
      sales
        .filter((s) => periodContains(period, s.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
      sales,
      addSale: (input) => {
        const sale: SaleTransaction = { ...input, id: `optimistic-${uuid()}` };
        write([sale, ...read()]);
        createTransaction(input)
          .then((saved) =>
            // Keep the local line items (and their ids); take the server id.
            write(read().map((s) => (s.id === sale.id ? { ...sale, id: saved.id } : s))),
          )
          .catch((err) => {
            write(read().filter((s) => s.id !== sale.id));
            alertFailure('save sale', err);
          });
        return sale;
      },
      deleteSale: (id) => {
        const prev = read();
        write(prev.filter((s) => s.id !== id));
        if (id.startsWith('optimistic-')) return;
        deleteTransaction(id).catch((err) => {
          write(prev);
          alertFailure('delete sale', err);
        });
      },
      salesFor,
      revenue: (period) => salesFor(period).reduce((sum, s) => sum + s.totalAmount, 0),
      taxCollected: (period) => salesFor(period).reduce((sum, s) => sum + (s.taxAmount ?? 0), 0),
    };
    // handlers close over stable refs (qc); re-derive when the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales(): SalesStore {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within a SalesProvider');
  return ctx;
}
