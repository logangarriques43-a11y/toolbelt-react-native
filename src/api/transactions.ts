/**
 * Sale transactions API — `/transactions` (list / create / delete), the same
 * collection the Swift SaleTransactionManager syncs to. The invoice webhook
 * also writes paid invoices here, so they show up in revenue.
 *
 * The wire has no line-item ids or client id (SaleTransactionBackendDTO), so
 * item ids are generated on read and clientId is local-only.
 */

import { api } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import type { PaymentMethod, SaleTransaction } from '@/models/sale';

interface SaleItemDTO {
  serviceName: string;
  serviceColorHex: string;
  price: number;
  quantity: number;
}

interface SaleTransactionDTO {
  id?: string;
  date: string;
  items: SaleItemDTO[];
  customAmount?: number | null;
  totalAmount: number;
  paymentMethod: string;
  clientName?: string | null;
  notes: string;
  isKeypadSale: boolean;
  taxAmount?: number | null;
  taxRate?: number | null;
  taxJurisdiction?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
}

function fromDTO(d: SaleTransactionDTO): SaleTransaction {
  return {
    id: d.id ?? '',
    date: d.date,
    items: (d.items ?? []).map((i) => ({
      id: uuid(),
      name: i.serviceName,
      colorHex: i.serviceColorHex,
      price: i.price,
      quantity: i.quantity,
    })),
    customAmount: d.customAmount ?? undefined,
    totalAmount: d.totalAmount,
    paymentMethod: d.paymentMethod as PaymentMethod,
    clientName: d.clientName ?? undefined,
    notes: d.notes ?? '',
    isKeypadSale: d.isKeypadSale,
    taxAmount: d.taxAmount ?? undefined,
    taxRate: d.taxRate ?? undefined,
    taxJurisdiction: d.taxJurisdiction ?? undefined,
    cardBrand: d.cardBrand ?? undefined,
    cardLast4: d.cardLast4 ?? undefined,
  };
}

function toDTO(s: Omit<SaleTransaction, 'id'>): SaleTransactionDTO {
  return {
    date: s.date,
    items: s.items.map((i) => ({
      serviceName: i.name,
      serviceColorHex: i.colorHex,
      price: i.price,
      quantity: i.quantity,
    })),
    customAmount: s.customAmount,
    totalAmount: s.totalAmount,
    paymentMethod: s.paymentMethod,
    clientName: s.clientName,
    notes: s.notes,
    isKeypadSale: s.isKeypadSale,
    taxAmount: s.taxAmount,
    taxRate: s.taxRate,
    taxJurisdiction: s.taxJurisdiction,
    cardBrand: s.cardBrand,
    cardLast4: s.cardLast4,
  };
}

export async function listTransactions(): Promise<SaleTransaction[]> {
  const dtos = await api.get<SaleTransactionDTO[]>('/transactions');
  return (dtos ?? []).map(fromDTO);
}

export async function createTransaction(input: Omit<SaleTransaction, 'id'>): Promise<SaleTransaction> {
  const dto = await api.post<SaleTransactionDTO>('/transactions', toDTO(input));
  return fromDTO(dto);
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.del(`/transactions/${id}`);
}
