/**
 * Invoices API — maps the backend `/invoices` DTO to/from the RN Invoice
 * model. Backend doc id is used directly as the record id.
 *
 * Wire quirks the mapping handles:
 * - Lossy fields NOT persisted server-side: `invoiceName` (the create/update
 *   handlers don't read it) and per-line-item `id` (the backend stores only
 *   description/quantity/unitPrice). We regenerate line-item ids on read and
 *   keep invoiceName only in the local cache — so, like the Swift app, the
 *   custom name resets on a cold reload and the row shows "Invoice #N".
 * - `createdAt` is stored but NOT returned by the backend, yet the RN list
 *   sorts by it. The list endpoint already returns rows `createdAt desc`, so
 *   we synthesize a strictly-decreasing createdAt by index to preserve that
 *   order through the RN re-sort.
 * - `invoiceNumber` is client-supplied (the backend does `invoiceNumber || 1`,
 *   no server-side increment), so the store keeps computing next = max + 1.
 *
 * Every invoice route is gated by requireSecondFactor(), which is a
 * pass-through while the backend runs with ENFORCE_2FA off — the runtime this
 * app targets (email/password only).
 */

import { api } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import type { Invoice, InvoiceStatus } from '@/models/invoice';

interface InvoiceLineItemDTO {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceDTO {
  id?: string;
  invoiceNumber: number;
  clientId?: string | null;
  clientName?: string | null;
  lineItems: InvoiceLineItemDTO[];
  taxRate?: number | null;
  dueDate: string;
  message?: string | null;
  emailAddress: string;
  notifyWhenPaid?: boolean | null;
  status?: string | null;
}

/**
 * @param index position in the `createdAt desc` list, used to synthesize a
 *   strictly-decreasing createdAt (the backend doesn't return the real one).
 */
function fromDTO(dto: InvoiceDTO, index = 0): Invoice {
  return {
    id: dto.id ?? '',
    invoiceNumber: dto.invoiceNumber,
    invoiceName: undefined, // not persisted server-side
    clientId: dto.clientId ?? undefined,
    clientName: dto.clientName ?? undefined,
    lineItems: (dto.lineItems ?? []).map((li) => ({
      id: uuid(), // backend doesn't persist line-item ids
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    })),
    taxRate: dto.taxRate ?? undefined,
    dueDate: dto.dueDate,
    message: dto.message ?? undefined,
    emailAddress: dto.emailAddress,
    notifyWhenPaid: dto.notifyWhenPaid ?? true,
    status: (dto.status as InvoiceStatus) ?? 'draft',
    // Preserve the backend's newest-first order through the RN list re-sort.
    createdAt: new Date(Date.now() - index * 1000).toISOString(),
  };
}

/** Model → wire body. Id is carried in the URL, not the body. */
function toDTO(inv: Omit<Invoice, 'id' | 'createdAt'>): InvoiceDTO {
  return {
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId ?? null,
    clientName: inv.clientName ?? null,
    lineItems: inv.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    })),
    taxRate: inv.taxRate ?? null,
    dueDate: inv.dueDate,
    message: inv.message ?? null,
    emailAddress: inv.emailAddress,
    notifyWhenPaid: inv.notifyWhenPaid,
    status: inv.status,
  };
}

export async function listInvoices(): Promise<Invoice[]> {
  const dtos = await api.get<InvoiceDTO[]>('/invoices');
  return dtos.map(fromDTO);
}

export async function createInvoice(input: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
  const dto = await api.post<InvoiceDTO>('/invoices', toDTO(input));
  return fromDTO(dto);
}

export async function updateInvoice(inv: Invoice): Promise<Invoice> {
  const { id, createdAt: _createdAt, ...rest } = inv;
  const dto = await api.put<InvoiceDTO>(`/invoices/${id}`, toDTO(rest));
  return fromDTO(dto);
}

export async function deleteInvoice(id: string): Promise<void> {
  await api.del(`/invoices/${id}`);
}

/** Result of a server-side Postmark send. */
export interface SendInvoiceResult {
  sent: boolean;
  sentAt?: string;
  recipient?: string;
  postmarkMessageId?: string | null;
  paymentLinkUrl?: string | null;
}

/**
 * Dispatch the invoice by email via the backend's Postmark integration
 * (`POST /invoices/:id/send`, no body). The invoice must already exist, so
 * callers create it first, then send. The backend enforces preconditions with
 * distinct errors surfaced as ApiError.message:
 * - 400 no email address on the invoice
 * - 409 SENDER_SETTINGS_INCOMPLETE (business name + address not set up)
 * - 503 POSTMARK_NOT_CONFIGURED / 502 Postmark send failure
 */
export async function sendInvoice(id: string): Promise<SendInvoiceResult> {
  return api.post<SendInvoiceResult>(`/invoices/${id}/send`);
}
