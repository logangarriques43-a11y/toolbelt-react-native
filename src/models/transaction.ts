/**
 * Transaction model — port of Transaction.swift (+ TransactionCategory / Period).
 */

export type TransactionCategory = 'Income' | 'Expense';
export type TransactionPeriod = 'Lifetime' | 'Today' | 'This Week' | 'This Month' | 'This Year';

export const TRANSACTION_PERIODS: TransactionPeriod[] = ['Lifetime', 'Today', 'This Week', 'This Month', 'This Year'];

export interface Transaction {
  id: string;
  title: string;
  detail: string;
  /** Always positive; category determines sign. */
  amount: number;
  category: TransactionCategory;
  /** ISO datetime. */
  date: string;
  note: string;
}

function startOfWeek(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

/** Whether `iso` falls inside `period` relative to now. */
export function periodContains(period: TransactionPeriod, iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  switch (period) {
    case 'Lifetime':
      return true;
    case 'Today':
      return d.toDateString() === now.toDateString();
    case 'This Week': {
      const start = startOfWeek(now);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return d >= start && d < end;
    }
    case 'This Month':
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    case 'This Year':
      return d.getFullYear() === now.getFullYear();
  }
}
