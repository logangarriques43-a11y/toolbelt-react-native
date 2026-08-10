/**
 * Accounting ledger API — maps the backend `/ledger` DTO to/from the RN
 * Transaction model (manually-recorded income/expense entries). Mirrors Swift's
 * AccountingManager, which syncs manual entries to /ledger (the POS sale
 * revenue feed at /transactions is separate and deferred with Payments).
 *
 * DTO is 1:1 with the model (id, title, detail, amount, category, date, note).
 * ledgerRoutes is Firebase-authed (no 2FA gate) and mounted at /api and /api/v1.
 */

import { api } from '@/lib/api-client';
import type { Transaction, TransactionCategory } from '@/models/transaction';

interface LedgerDTO {
  id?: string;
  title: string;
  detail?: string | null;
  amount: number;
  category: string;
  date?: string | null;
  note?: string | null;
}

function fromDTO(dto: LedgerDTO): Transaction {
  return {
    id: dto.id ?? '',
    title: dto.title,
    detail: dto.detail ?? '',
    amount: dto.amount,
    category: (dto.category as TransactionCategory) ?? 'Income',
    date: dto.date ?? new Date().toISOString(),
    note: dto.note ?? '',
  };
}

function toDTO(t: Omit<Transaction, 'id'>): LedgerDTO {
  return {
    title: t.title,
    detail: t.detail,
    amount: t.amount,
    category: t.category,
    date: t.date,
    note: t.note,
  };
}

export async function listLedger(): Promise<Transaction[]> {
  const dtos = await api.get<LedgerDTO[]>('/ledger');
  return dtos.map(fromDTO);
}

export async function createLedgerEntry(input: Omit<Transaction, 'id'>): Promise<Transaction> {
  const dto = await api.post<LedgerDTO>('/ledger', toDTO(input));
  return fromDTO(dto);
}

export async function deleteLedgerEntry(id: string): Promise<void> {
  await api.del(`/ledger/${id}`);
}
