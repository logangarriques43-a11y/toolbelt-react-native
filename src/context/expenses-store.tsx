/**
 * Expenses store — RN counterpart to ExpenseManager.swift.
 * Business expenses backed by `/tax/expenses` via React Query; period/category
 * totals derived client-side and fold into the Accounting hub.
 *
 * Mutations are OPTIMISTIC and reconcile on success (the wire is non-lossy),
 * rolling back and alerting on failure. Public API is unchanged.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Alert } from 'react-native';

import {
  createExpense,
  deleteExpense as deleteExpenseApi,
  listExpenses,
} from '@/api/expenses';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import type { Expense } from '@/models/expense';
import { periodContains, type TransactionPeriod } from '@/models/transaction';

export const EXPENSES_QUERY_KEY = ['expenses'] as const;

export interface ExpensesStore {
  expenses: Expense[];
  addExpense: (e: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  totalAmount: (period: TransactionPeriod) => number;
  expensesByCategory: () => Record<string, number>;
}

const ExpensesContext = createContext<ExpensesStore | null>(null);

function alertFailure(action: string, err: unknown) {
  const message =
    err instanceof ApiError ? err.message : 'Please check your connection and try again.';
  Alert.alert(`Couldn't ${action}`, message);
}

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: EXPENSES_QUERY_KEY, queryFn: listExpenses });

  const read = () => qc.getQueryData<Expense[]>(EXPENSES_QUERY_KEY) ?? [];
  const write = (next: Expense[]) => qc.setQueryData(EXPENSES_QUERY_KEY, next);

  const value = useMemo<ExpensesStore>(() => {
    const expenses = query.data ?? [];

    return {
      expenses,
      addExpense: (input) => {
        const tempId = `optimistic-${uuid()}`;
        write([{ ...input, id: tempId }, ...read()]);
        createExpense(input)
          .then((saved) => write(read().map((e) => (e.id === tempId ? saved : e))))
          .catch((err) => {
            write(read().filter((e) => e.id !== tempId));
            alertFailure('save expense', err);
          });
      },
      deleteExpense: (id) => {
        const prev = read();
        write(prev.filter((e) => e.id !== id));
        deleteExpenseApi(id).catch((err) => {
          write(prev);
          alertFailure('delete expense', err);
        });
      },
      totalAmount: (period) =>
        expenses.filter((e) => periodContains(period, e.date)).reduce((s, e) => s + e.amount, 0),
      expensesByCategory: () =>
        expenses.reduce<Record<string, number>>((acc, e) => {
          acc[e.category] = (acc[e.category] ?? 0) + e.amount;
          return acc;
        }, {}),
    };
    // handlers close over stable refs (qc); re-derive when the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesStore {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used within an ExpensesProvider');
  return ctx;
}
