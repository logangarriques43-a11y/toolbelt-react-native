/**
 * Expenses API — maps the backend `/tax/expenses` DTO to/from the RN Expense
 * model. Mirrors Swift's ExpenseManager. DTO is 1:1 with the model (the wire
 * also carries related-item and updatedAt fields the RN model doesn't use).
 *
 * taxRoutes is Firebase-authed with requireSecondFactor() (a pass-through while
 * the backend runs with ENFORCE_2FA off) and mounted at /api/tax and
 * /api/v1/tax; responses use the { status, data } envelope.
 */

import { api } from '@/lib/api-client';
import type { Expense, RecurringFrequency } from '@/models/expense';

interface ExpenseDTO {
  id?: string;
  date?: string | null;
  amount: number;
  category: string;
  vendorName?: string | null;
  description?: string | null;
  isTaxDeductible?: boolean | null;
  isRecurring?: boolean | null;
  recurringFrequency?: string | null;
  notes?: string | null;
}

function fromDTO(dto: ExpenseDTO): Expense {
  return {
    id: dto.id ?? '',
    date: dto.date ?? new Date().toISOString(),
    amount: dto.amount,
    category: dto.category,
    vendorName: dto.vendorName ?? undefined,
    description: dto.description ?? '',
    isTaxDeductible: dto.isTaxDeductible ?? true,
    isRecurring: dto.isRecurring ?? false,
    recurringFrequency: (dto.recurringFrequency as RecurringFrequency) ?? undefined,
    notes: dto.notes ?? '',
  };
}

function toDTO(e: Omit<Expense, 'id'>): ExpenseDTO {
  return {
    date: e.date,
    amount: e.amount,
    category: e.category,
    vendorName: e.vendorName ?? null,
    description: e.description,
    isTaxDeductible: e.isTaxDeductible,
    isRecurring: e.isRecurring,
    recurringFrequency: e.recurringFrequency ?? null,
    notes: e.notes,
  };
}

export async function listExpenses(): Promise<Expense[]> {
  const dtos = await api.get<ExpenseDTO[]>('/tax/expenses');
  return dtos.map(fromDTO);
}

export async function createExpense(input: Omit<Expense, 'id'>): Promise<Expense> {
  const dto = await api.post<ExpenseDTO>('/tax/expenses', toDTO(input));
  return fromDTO(dto);
}

export async function deleteExpense(id: string): Promise<void> {
  await api.del(`/tax/expenses/${id}`);
}
