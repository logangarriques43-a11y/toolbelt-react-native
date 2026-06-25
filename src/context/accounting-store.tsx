/**
 * Accounting store — RN counterpart to AccountingManager.swift.
 * Manually-recorded income/expense transactions; period filtering + totals.
 * (Sales from paid invoices/tap-to-pay arrive with Phase 5; business expenses
 * with Phase 4b — both fold into the hub totals later.)
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import { periodContains, type Transaction, type TransactionPeriod } from '@/models/transaction';

export interface AccountingStore {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  transactionsFor: (period: TransactionPeriod) => Transaction[];
  totalIncome: (period: TransactionPeriod) => number;
  totalExpenses: (period: TransactionPeriod) => number;
  netRevenue: (period: TransactionPeriod) => number;
}

const AccountingContext = createContext<AccountingStore | null>(null);

export function AccountingProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const value = useMemo<AccountingStore>(() => {
    const transactionsFor = (period: TransactionPeriod) =>
      transactions
        .filter((t) => periodContains(period, t.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sum = (period: TransactionPeriod, cat: 'Income' | 'Expense') =>
      transactionsFor(period).filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0);
    return {
      transactions,
      addTransaction: (t) => setTransactions((prev) => [...prev, { ...t, id: uuid() }]),
      deleteTransaction: (id) => setTransactions((prev) => prev.filter((t) => t.id !== id)),
      transactionsFor,
      totalIncome: (p) => sum(p, 'Income'),
      totalExpenses: (p) => sum(p, 'Expense'),
      netRevenue: (p) => sum(p, 'Income') - sum(p, 'Expense'),
    };
  }, [transactions]);

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
}

export function useAccounting(): AccountingStore {
  const ctx = useContext(AccountingContext);
  if (!ctx) throw new Error('useAccounting must be used within an AccountingProvider');
  return ctx;
}
