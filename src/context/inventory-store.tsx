/**
 * Inventory store — RN counterpart to InventoryManager.swift.
 * In-memory items + activity log, with the same stock math: add/update/delete
 * (logging incoming/outgoing activity), manual restock, the recordSale hook used
 * by checkout (per-product decrement + per-service usage-rate depletion), and the
 * derived low/out/in-stock buckets. Backend sync is omitted.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import {
  DEFAULT_INVENTORY_CATEGORIES,
  stockStatus,
  type InventoryActivity,
  type InventoryItem,
  type ServiceUsageRate,
} from '@/models/inventory';

export interface NewInventoryItem {
  name: string;
  sku?: string;
  quantity?: number;
  reorderLevel?: number;
  unitPrice?: number;
  category?: string;
  serviceUsageRates?: ServiceUsageRate[];
  autoCalculateReorder?: boolean;
  reorderQuantity?: number;
  autoReorder?: boolean;
  vendorId?: string;
  reorderURL?: string;
  vendorSku?: string;
}

export interface InventoryStore {
  items: InventoryItem[];
  activities: InventoryActivity[];
  addItem: (input: NewInventoryItem) => InventoryItem;
  updateItem: (item: InventoryItem) => void;
  deleteItem: (id: string) => void;
  addStock: (id: string, quantity: number, note?: string) => void;
  recordSale: (
    products: { inventoryItemId: string; soldQuantity: number }[],
    services: { serviceId: string; soldQuantity: number }[],
  ) => void;
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
  inStockItems: InventoryItem[];
  totalItemCount: number;
  totalValue: number;
  recentActivities: InventoryActivity[];
  allCategories: string[];
}

const InventoryContext = createContext<InventoryStore | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [activities, setActivities] = useState<InventoryActivity[]>([]);

  const value = useMemo<InventoryStore>(() => {
    const logActivity = (
      action: string,
      itemName: string,
      quantityChange: number,
      type: InventoryActivity['type'],
    ) =>
      setActivities((prev) =>
        [{ id: uuid(), action, itemName, quantityChange, date: new Date().toISOString(), type }, ...prev].slice(0, 100),
      );

    return {
      items,
      activities,

      addItem: (input) => {
        const now = new Date().toISOString();
        const item: InventoryItem = {
          id: uuid(),
          name: input.name,
          sku: input.sku ?? '',
          quantity: input.quantity ?? 0,
          reorderLevel: input.reorderLevel ?? 10,
          unitPrice: input.unitPrice ?? 0,
          category: input.category ?? 'General',
          dateAdded: now,
          lastUpdated: now,
          serviceUsageRates: input.serviceUsageRates ?? [],
          autoCalculateReorder: input.autoCalculateReorder ?? false,
          reorderQuantity: input.reorderQuantity,
          autoReorder: input.autoReorder ?? false,
          vendorId: input.vendorId,
          reorderURL: input.reorderURL,
          vendorSku: input.vendorSku,
        };
        setItems((prev) => [item, ...prev]);
        logActivity('Item Added', item.name, item.quantity, 'incoming');
        return item;
      },

      updateItem: (updated) => {
        setItems((prev) => {
          const old = prev.find((i) => i.id === updated.id);
          if (old) {
            const diff = updated.quantity - old.quantity;
            if (diff !== 0) {
              logActivity(diff > 0 ? 'Stock Added' : 'Stock Removed', updated.name, diff, diff > 0 ? 'incoming' : 'outgoing');
            }
          }
          return prev.map((i) => (i.id === updated.id ? { ...updated, lastUpdated: new Date().toISOString() } : i));
        });
      },

      deleteItem: (id) => {
        setItems((prev) => {
          const item = prev.find((i) => i.id === id);
          if (item) logActivity('Item Deleted', item.name, -item.quantity, 'outgoing');
          return prev.filter((i) => i.id !== id);
        });
      },

      addStock: (id, quantity, note = 'Manual re-order') => {
        if (quantity <= 0) return;
        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== id) return i;
            logActivity(note, i.name, quantity, 'incoming');
            return { ...i, quantity: i.quantity + quantity, lastUpdated: new Date().toISOString() };
          }),
        );
      },

      recordSale: (products, services) => {
        setItems((prev) => {
          const now = new Date().toISOString();
          const next = prev.map((i) => ({ ...i, serviceUsageRates: i.serviceUsageRates.map((r) => ({ ...r })) }));
          for (const { inventoryItemId, soldQuantity } of products) {
            if (soldQuantity <= 0) continue;
            const item = next.find((i) => i.id === inventoryItemId);
            if (!item) continue;
            const before = item.quantity;
            item.quantity = Math.max(0, before - soldQuantity);
            item.lastUpdated = now;
            const delta = before - item.quantity;
            if (delta > 0) logActivity('Sold', item.name, -delta, 'outgoing');
          }
          for (const { serviceId, soldQuantity } of services) {
            if (soldQuantity <= 0) continue;
            for (const item of next) {
              const rate = item.serviceUsageRates.find((r) => r.serviceId === serviceId);
              if (!rate) continue;
              rate.currentUsageCount += soldQuantity;
              const threshold = Math.max(rate.usesBeforeRefill, 1);
              const decrementBy = Math.floor(rate.currentUsageCount / threshold);
              if (decrementBy > 0) {
                const before = item.quantity;
                item.quantity = Math.max(0, before - decrementBy);
                item.lastUpdated = now;
                rate.currentUsageCount = rate.currentUsageCount % threshold;
                const delta = before - item.quantity;
                if (delta > 0) logActivity('Used via service', item.name, -delta, 'appointmentUsage');
              }
            }
          }
          return next;
        });
      },

      lowStockItems: items.filter((i) => stockStatus(i) === 'lowStock'),
      outOfStockItems: items.filter((i) => stockStatus(i) === 'outOfStock'),
      inStockItems: items.filter((i) => stockStatus(i) === 'inStock'),
      totalItemCount: items.reduce((s, i) => s + i.quantity, 0),
      totalValue: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      recentActivities: activities.slice(0, 20),
      allCategories: [...new Set([...DEFAULT_INVENTORY_CATEGORIES, ...items.map((i) => i.category)])].sort(),
    };
  }, [items, activities]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryStore {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within an InventoryProvider');
  return ctx;
}
