/**
 * Accounting store — RN counterpart to AccountingManager.swift.
 * Manually-recorded income/expense entries backed by `/ledger` via React Query;
 * period filtering + totals are derived client-side. (POS sale revenue from
 * /transactions folds into the hub later with Payments — deferred.)
 *
 * Mutations are OPTIMISTIC and reconcile on success (the wire is non-lossy),
 * rolling back and alerting on failure. Public API is unchanged.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Alert } from 'react-native';

import {
  createLedgerEntry,
  deleteLedgerEntry as deleteLedgerEntryApi,
  listLedger,
} from '@/api/ledger';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import { periodContains, type Transaction, type TransactionPeriod } from '@/models/transaction';

export const LEDGER_QUERY_KEY = ['ledger'] as const;

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

function alertFailure(action: string, err: unknown) {
  const message =
    err instanceof ApiError ? err.message : 'Please check your connection and try again.';
  Alert.alert(`Couldn't ${action}`, message);
}

export function AccountingProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: LEDGER_QUERY_KEY, queryFn: listLedger });

  const read = () => qc.getQueryData<Transaction[]>(LEDGER_QUERY_KEY) ?? [];
  const write = (next: Transaction[]) => qc.setQueryData(LEDGER_QUERY_KEY, next);

  const value = useMemo<AccountingStore>(() => {
    const transactions = query.data ?? [];

    const transactionsFor = (period: TransactionPeriod) =>
      transactions
        .filter((t) => periodContains(period, t.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sum = (period: TransactionPeriod, cat: 'Income' | 'Expense') =>
      transactionsFor(period).filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0);

    return {
      transactions,
      addTransaction: (input) => {
        const tempId = `optimistic-${uuid()}`;
        write([...read(), { ...input, id: tempId }]);
        createLedgerEntry(input)
          .then((saved) => write(read().map((t) => (t.id === tempId ? saved : t))))
          .catch((err) => {
            write(read().filter((t) => t.id !== tempId));
            alertFailure('save transaction', err);
          });
      },
      deleteTransaction: (id) => {
        const prev = read();
        write(prev.filter((t) => t.id !== id));
        deleteLedgerEntryApi(id).catch((err) => {
          write(prev);
          alertFailure('delete transaction', err);
        });
      },
      transactionsFor,
      totalIncome: (p) => sum(p, 'Income'),
      totalExpenses: (p) => sum(p, 'Expense'),
      netRevenue: (p) => sum(p, 'Income') - sum(p, 'Expense'),
    };
    // handlers close over stable refs (qc); re-derive when the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
}

export function useAccounting(): AccountingStore {
  const ctx = useContext(AccountingContext);
  if (!ctx) throw new Error('useAccounting must be used within an AccountingProvider');
  return ctx;
}
