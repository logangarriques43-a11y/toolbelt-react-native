/**
 * Inventory models — port of InventoryDataModel.swift (InventoryItem,
 * ServiceUsageRate, InventoryActivity, StockStatus). Backend-sync fields
 * (serverId) are omitted; dates are ISO strings.
 */

import type { SFSymbol } from 'expo-symbols';

import { iOSColors } from '@/theme/tokens';

export type StockStatus = 'inStock' | 'lowStock' | 'outOfStock';

export function statusColor(status: StockStatus): string {
  switch (status) {
    case 'inStock':
      return iOSColors.green;
    case 'lowStock':
      return iOSColors.orange;
    case 'outOfStock':
      return iOSColors.red;
  }
}

export function statusLabel(status: StockStatus): string {
  switch (status) {
    case 'inStock':
      return 'In Stock';
    case 'lowStock':
      return 'Low Stock';
    case 'outOfStock':
      return 'Out of Stock';
  }
}

/** Refill rate for a service that consumes an inventory item. */
export interface ServiceUsageRate {
  serviceId: string;
  usesBeforeRefill: number;
  /** Running count since the last decrement; resets (mod threshold) when it fires. */
  currentUsageCount: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  category: string;
  /** ISO datetime. */
  dateAdded: string;
  /** ISO datetime. */
  lastUpdated: string;
  serviceUsageRates: ServiceUsageRate[];
  autoCalculateReorder: boolean;
  reorderQuantity?: number;
  autoReorder: boolean;
  vendorId?: string;
  reorderURL?: string;
  vendorSku?: string;
}

export function stockStatus(item: InventoryItem): StockStatus {
  if (item.quantity <= 0) return 'outOfStock';
  if (item.quantity <= item.reorderLevel) return 'lowStock';
  return 'inStock';
}

export function itemTotalValue(item: InventoryItem): number {
  return item.quantity * item.unitPrice;
}

export const DEFAULT_INVENTORY_CATEGORIES = ['General', 'Supplies', 'Equipment', 'Consumables', 'Tools', 'Other'];

export type ActivityKind = 'incoming' | 'outgoing' | 'alert' | 'appointmentUsage';

export interface InventoryActivity {
  id: string;
  action: string;
  itemName: string;
  quantityChange: number;
  /** ISO datetime. */
  date: string;
  type: ActivityKind;
}

export function activityIcon(type: ActivityKind): SFSymbol {
  switch (type) {
    case 'incoming':
      return 'arrow.down.circle.fill';
    case 'outgoing':
      return 'arrow.up.circle.fill';
    case 'alert':
      return 'exclamationmark.triangle.fill';
    case 'appointmentUsage':
      return 'cross.case.fill';
  }
}

export function activityColor(type: ActivityKind): string {
  switch (type) {
    case 'incoming':
      return iOSColors.green;
    case 'outgoing':
      return iOSColors.blue;
    case 'alert':
      return iOSColors.orange;
    case 'appointmentUsage':
      return iOSColors.purple;
  }
}
