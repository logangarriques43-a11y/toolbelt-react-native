/**
 * Invoice model — port of Invoice + InvoiceLineItem (CreateInvoiceView.swift).
 */

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: number;
  invoiceName?: string;
  clientId?: string;
  clientName?: string;
  lineItems: InvoiceLineItem[];
  taxRate?: number;
  dueDate: string; // ISO
  message?: string;
  emailAddress: string;
  notifyWhenPaid: boolean;
  status: InvoiceStatus;
  createdAt: string; // ISO
}

export const lineItemTotal = (i: InvoiceLineItem) => i.quantity * i.unitPrice;
export const invoiceSubtotal = (inv: Pick<Invoice, 'lineItems'>) =>
  inv.lineItems.reduce((s, i) => s + lineItemTotal(i), 0);
export const invoiceTaxAmount = (inv: Pick<Invoice, 'lineItems' | 'taxRate'>) =>
  inv.taxRate ? invoiceSubtotal(inv) * (inv.taxRate / 100) : 0;
export const invoiceTotalDue = (inv: Pick<Invoice, 'lineItems' | 'taxRate'>) =>
  invoiceSubtotal(inv) + invoiceTaxAmount(inv);
export const invoiceDisplayName = (inv: Pick<Invoice, 'invoiceName' | 'invoiceNumber'>) =>
  inv.invoiceName && inv.invoiceName.trim() ? inv.invoiceName : `Invoice #${inv.invoiceNumber}`;
