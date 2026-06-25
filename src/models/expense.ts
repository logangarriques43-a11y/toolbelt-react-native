/**
 * Expense model — port of Expense.swift (+ ExpenseCategory).
 */

import type { SFSymbol } from 'expo-symbols';

import type { TransactionPeriod } from '@/models/transaction';

export interface ExpenseCategoryDef {
  value: string;
  icon: SFSymbol;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  { value: 'Supplies', icon: 'bag.fill' },
  { value: 'Rent', icon: 'building.2.fill' },
  { value: 'Utilities', icon: 'bolt.fill' },
  { value: 'Equipment', icon: 'wrench.and.screwdriver.fill' },
  { value: 'Marketing', icon: 'megaphone.fill' },
  { value: 'Insurance', icon: 'shield.fill' },
  { value: 'Payroll', icon: 'person.2.fill' },
  { value: 'Professional Services', icon: 'briefcase.fill' },
  { value: 'Travel', icon: 'car.fill' },
  { value: 'Maintenance', icon: 'hammer.fill' },
  { value: 'Software', icon: 'laptopcomputer' },
  { value: 'Other', icon: 'ellipsis.circle.fill' },
];

export function expenseCategoryIcon(category: string): SFSymbol {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.icon ?? 'ellipsis.circle.fill';
}

export type RecurringFrequency = 'monthly' | 'quarterly' | 'annually';

export interface Expense {
  id: string;
  /** ISO datetime. */
  date: string;
  amount: number;
  category: string;
  vendorName?: string;
  description: string;
  isTaxDeductible: boolean;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  notes: string;
}

const mediumDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const expenseDateString = (iso: string) => mediumDate.format(new Date(iso));

/** Re-exported so call sites importing from the model get period filtering too. */
export type { TransactionPeriod };
