/**
 * Checkout cart items — port of SelectedServiceItem / SelectedProductItem
 * (PaymentsView.swift). Held in the Payments hub's local state and handed to the
 * Review Sale sheet to finalize a SaleTransaction.
 */

import type { Product } from './product';
import type { Service } from './service';

export interface SelectedServiceItem {
  service: Service;
  quantity: number;
}

export interface SelectedProductItem {
  product: Product;
  quantity: number;
}

export function servicesTotal(items: SelectedServiceItem[]): number {
  return items.reduce((s, i) => s + i.service.price * i.quantity, 0);
}

export function productsTotal(items: SelectedProductItem[]): number {
  return items.reduce((s, i) => s + i.product.price * i.quantity, 0);
}

export function cartItemCount(
  services: SelectedServiceItem[],
  products: SelectedProductItem[],
): number {
  return (
    services.reduce((s, i) => s + i.quantity, 0) +
    products.reduce((s, i) => s + i.quantity, 0)
  );
}
