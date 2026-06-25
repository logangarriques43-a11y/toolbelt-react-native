/**
 * Expenses store — RN counterpart to ExpenseManager.swift.
 * In-memory CRUD + period/category totals. Folds into the Accounting hub totals.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import type { Expense } from '@/models/expense';
import { periodContains, type TransactionPeriod } from '@/models/transaction';

export interface ExpensesStore {
  expenses: Expense[];
  addExpense: (e: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  totalAmount: (period: TransactionPeriod) => number;
  expensesByCategory: () => Record<string, number>;
}

const ExpensesContext = createContext<ExpensesStore | null>(null);

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const value = useMemo<ExpensesStore>(
    () => ({
      expenses,
      addExpense: (e) => setExpenses((prev) => [{ ...e, id: uuid() }, ...prev]),
      deleteExpense: (id) => setExpenses((prev) => prev.filter((x) => x.id !== id)),
      totalAmount: (period) =>
        expenses.filter((e) => periodContains(period, e.date)).reduce((s, e) => s + e.amount, 0),
      expensesByCategory: () =>
        expenses.reduce<Record<string, number>>((acc, e) => {
          acc[e.category] = (acc[e.category] ?? 0) + e.amount;
          return acc;
        }, {}),
    }),
    [expenses],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesStore {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used within an ExpensesProvider');
  return ctx;
}
