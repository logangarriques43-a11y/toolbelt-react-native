/**
 * Sale models — port of SaleTransaction / SaleItem (SaleTransactionManager.swift).
 * A completed sale from the Payments checkout (services, products, or a keypad
 * amount). Sales feed the Accounting hub's combined revenue + the Tax Dashboard's
 * collected-tax totals. Backend/provider sync fields are omitted (in-memory only);
 * real card capture (Stripe / Tap-to-Pay) lands as native modules later.
 */

import type { SFSymbol } from 'expo-symbols';

import { iOSColors } from '@/theme/tokens';

/** A single line on a sale (a service or product, with a quantity). */
export interface SaleItem {
  id: string;
  name: string;
  colorHex: string;
  price: number;
  quantity: number;
}

export function saleItemSubtotal(item: SaleItem): number {
  return item.price * item.quantity;
}

export type PaymentMethod = 'Card' | 'Cash' | 'Digital' | 'Tap to Pay';

/** The four checkout methods, in the Swift 2×2 grid order. */
export const PAYMENT_METHODS: { method: PaymentMethod; icon: SFSymbol; color: string }[] = [
  { method: 'Card', icon: 'creditcard.fill', color: iOSColors.blue },
  { method: 'Cash', icon: 'banknote.fill', color: iOSColors.green },
  { method: 'Digital', icon: 'iphone', color: iOSColors.purple },
  { method: 'Tap to Pay', icon: 'wave.3.right', color: '#33C773' },
];

export interface SaleTransaction {
  id: string;
  /** ISO datetime. */
  date: string;
  items: SaleItem[];
  /** Set when the sale was entered as a raw keypad amount (no line items). */
  customAmount?: number;
  /** Grand total charged, including any tax. */
  totalAmount: number;
  paymentMethod: PaymentMethod;
  clientId?: string;
  clientName?: string;
  notes: string;
  isKeypadSale: boolean;
  taxAmount?: number;
  /** Percent applied, e.g. 8.25. */
  taxRate?: number;
  taxJurisdiction?: string;
  /** Transient display details, populated when a card was used. */
  cardBrand?: string;
  cardLast4?: string;
}

/** Pre-tax total of the line items (or the keypad amount). */
export function saleSubtotal(sale: SaleTransaction): number {
  if (sale.isKeypadSale) return sale.customAmount ?? 0;
  return sale.items.reduce((s, i) => s + saleItemSubtotal(i), 0);
}

/** Headline shown in transaction lists (mirrors the Swift card title). */
export function saleTitle(sale: SaleTransaction): string {
  if (sale.clientName && sale.clientName.length > 0) return sale.clientName;
  if (sale.isKeypadSale) return 'Quick Sale';
  if (sale.items.length === 1) return sale.items[0].name;
  return 'Sale';
}

/** Sub-line describing what was sold. */
export function saleDetail(sale: SaleTransaction): string {
  if (sale.isKeypadSale) return 'Keypad Sale';
  const count = sale.items.reduce((s, i) => s + i.quantity, 0);
  if (sale.items.length === 1) return `${count} item${count === 1 ? '' : 's'}`;
  return `${sale.items.length} services · ${count} item${count === 1 ? '' : 's'}`;
}
