/**
 * Product model — port of Product.swift (POS quick-sell items).
 * SwiftData/sync fields (serverId, lastModifiedAt, inventoryItemId) are omitted
 * until the sync/inventory layers land.
 */

import { iOSColors } from '@/theme/tokens';

export interface Product {
  id: string;
  name: string;
  colorHex: string;
  price: number;
  costPrice?: number;
  category?: string;
  sku?: string;
  description?: string;
  /** Tracked stock count; undefined when inventory isn't tracked. */
  stockQuantity?: number;
  trackInventory: boolean;
  salesTaxEnabled: boolean;
  /** Percent, e.g. 8.25. */
  salesTaxRate: number;
}

export const DEFAULT_PRODUCT_COLOR = iOSColors.teal;

/** Display string shown after a leading "$". */
export function productPriceDisplay(p: Product): string {
  return p.price % 1 === 0 ? p.price.toFixed(0) : p.price.toFixed(2);
}
