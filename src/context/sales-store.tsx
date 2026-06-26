/**
 * Sales store — RN counterpart to SaleTransactionManager.swift.
 * In-memory sale transactions from the Payments checkout. Exposes period-aware
 * revenue + collected-tax totals that fold into the Accounting hub and Tax
 * Dashboard (mirrors Swift `revenue(for:)`). Backend webhook sync is omitted.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import type { SaleTransaction } from '@/models/sale';
import { periodContains, type TransactionPeriod } from '@/models/transaction';

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

export function SalesProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<SaleTransaction[]>([]);

  const value = useMemo<SalesStore>(() => {
    const salesFor = (period: TransactionPeriod) =>
      sales
        .filter((s) => periodContains(period, s.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
      sales,
      addSale: (s) => {
        const sale: SaleTransaction = { ...s, id: uuid() };
        setSales((prev) => [sale, ...prev]);
        return sale;
      },
      deleteSale: (id) => setSales((prev) => prev.filter((s) => s.id !== id)),
      salesFor,
      revenue: (period) => salesFor(period).reduce((sum, s) => sum + s.totalAmount, 0),
      taxCollected: (period) => salesFor(period).reduce((sum, s) => sum + (s.taxAmount ?? 0), 0),
    };
  }, [sales]);

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales(): SalesStore {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within a SalesProvider');
  return ctx;
}
