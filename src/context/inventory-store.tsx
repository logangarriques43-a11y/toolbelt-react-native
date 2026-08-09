/**
 * Inventory store — RN counterpart to InventoryManager.swift.
 * Items are backed by `/inventory/items` via React Query; the activity log
 * stays LOCAL (a session audit view — the Swift app also keeps it client-side,
 * never syncing it). All the stock math (add/update/delete, manual restock, the
 * recordSale hook, low/out/in-stock buckets) is unchanged.
 *
 * The wire is lossy — serviceUsageRates aren't persisted server-side — so
 * mutations are OPTIMISTIC and never invalidate/refetch or reconcile with the
 * server row (create only grafts the backend id); those counters live in the
 * cache for the session and reset on a cold reload, matching the Swift app.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import {
  createInventoryItem,
  deleteInventoryItem as deleteInventoryItemApi,
  listInventory,
  updateInventoryItem as updateInventoryItemApi,
} from '@/api/inventory';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import {
  DEFAULT_INVENTORY_CATEGORIES,
  stockStatus,
  type InventoryActivity,
  type InventoryItem,
  type ServiceUsageRate,
} from '@/models/inventory';

export const INVENTORY_QUERY_KEY = ['inventory', 'items'] as const;

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

function alertFailure(action: string, err: unknown) {
  const message =
    err instanceof ApiError ? err.message : 'Please check your connection and try again.';
  Alert.alert(`Couldn't ${action}`, message);
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: INVENTORY_QUERY_KEY, queryFn: listInventory });
  const [activities, setActivities] = useState<InventoryActivity[]>([]);

  const read = () => qc.getQueryData<InventoryItem[]>(INVENTORY_QUERY_KEY) ?? [];
  const write = (next: InventoryItem[]) => qc.setQueryData(INVENTORY_QUERY_KEY, next);

  const logActivity = (
    action: string,
    itemName: string,
    quantityChange: number,
    type: InventoryActivity['type'],
  ) =>
    setActivities((prev) =>
      [{ id: uuid(), action, itemName, quantityChange, date: new Date().toISOString(), type }, ...prev].slice(0, 100),
    );

  const items = query.data ?? [];

  const value = useMemo<InventoryStore>(() => {
    // CREATE — optimistic insert with a temp id, graft the real backend id on
    // success (keeping local-only serviceUsageRates). Returns the optimistic row.
    const addItem = (input: NewInventoryItem): InventoryItem => {
      const now = new Date().toISOString();
      const tempId = `optimistic-${uuid()}`;
      const item: InventoryItem = {
        id: tempId,
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
      write([item, ...read()]);
      logActivity('Item Added', item.name, item.quantity, 'incoming');
      createInventoryItem(item)
        .then((saved) => write(read().map((i) => (i.id === tempId ? { ...i, id: saved.id } : i))))
        .catch((err) => {
          write(read().filter((i) => i.id !== tempId));
          alertFailure('add item', err);
        });
      return item;
    };

    // UPDATE — optimistic replace (logging the quantity delta); PUT; roll back
    // on error. Keeps the local serviceUsageRates (never reconciles the server row).
    const updateItem = (updated: InventoryItem) => {
      const prev = read();
      const old = prev.find((i) => i.id === updated.id);
      if (old && updated.quantity !== old.quantity) {
        const diff = updated.quantity - old.quantity;
        logActivity(diff > 0 ? 'Stock Added' : 'Stock Removed', updated.name, diff, diff > 0 ? 'incoming' : 'outgoing');
      }
      const next: InventoryItem = { ...updated, lastUpdated: new Date().toISOString() };
      write(prev.map((i) => (i.id === updated.id ? next : i)));
      updateInventoryItemApi(next).catch((err) => {
        write(prev);
        alertFailure('update item', err);
      });
    };

    const deleteItem = (id: string) => {
      const prev = read();
      const item = prev.find((i) => i.id === id);
      if (item) logActivity('Item Deleted', item.name, -item.quantity, 'outgoing');
      write(prev.filter((i) => i.id !== id));
      deleteInventoryItemApi(id).catch((err) => {
        write(prev);
        alertFailure('delete item', err);
      });
    };

    const addStock = (id: string, quantity: number, note = 'Manual re-order') => {
      if (quantity <= 0) return;
      const prev = read();
      const item = prev.find((i) => i.id === id);
      if (!item) return;
      logActivity(note, item.name, quantity, 'incoming');
      const next: InventoryItem = { ...item, quantity: item.quantity + quantity, lastUpdated: new Date().toISOString() };
      write(prev.map((i) => (i.id === id ? next : i)));
      updateInventoryItemApi(next).catch((err) => {
        write(prev);
        alertFailure('restock', err);
      });
    };

    // RECORD SALE — decrement per-product stock and deplete service-linked items
    // by usage rate, logging each change. Persists every touched item. (Driven
    // by the Payments checkout, which is deferred, so currently has no caller.)
    const recordSale = (
      products: { inventoryItemId: string; soldQuantity: number }[],
      services: { serviceId: string; soldQuantity: number }[],
    ) => {
      const prev = read();
      const now = new Date().toISOString();
      const next = prev.map((i) => ({ ...i, serviceUsageRates: i.serviceUsageRates.map((r) => ({ ...r })) }));
      const changed = new Set<string>();

      for (const { inventoryItemId, soldQuantity } of products) {
        if (soldQuantity <= 0) continue;
        const item = next.find((i) => i.id === inventoryItemId);
        if (!item) continue;
        const before = item.quantity;
        item.quantity = Math.max(0, before - soldQuantity);
        item.lastUpdated = now;
        const delta = before - item.quantity;
        if (delta > 0) {
          logActivity('Sold', item.name, -delta, 'outgoing');
          changed.add(item.id);
        }
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
            if (delta > 0) {
              logActivity('Used via service', item.name, -delta, 'appointmentUsage');
              changed.add(item.id);
            }
          }
        }
      }

      write(next);
      const touched = next.filter((i) => changed.has(i.id));
      Promise.all(touched.map((i) => updateInventoryItemApi(i))).catch((err) => {
        write(prev);
        alertFailure('record sale', err);
      });
    };

    return {
      items,
      activities,
      addItem,
      updateItem,
      deleteItem,
      addStock,
      recordSale,
      lowStockItems: items.filter((i) => stockStatus(i) === 'lowStock'),
      outOfStockItems: items.filter((i) => stockStatus(i) === 'outOfStock'),
      inStockItems: items.filter((i) => stockStatus(i) === 'inStock'),
      totalItemCount: items.reduce((s, i) => s + i.quantity, 0),
      totalValue: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      recentActivities: activities.slice(0, 20),
      allCategories: [...new Set([...DEFAULT_INVENTORY_CATEGORIES, ...items.map((i) => i.category)])].sort(),
    };
    // handlers close over stable refs (qc, setActivities); re-derive on data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activities]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryStore {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within an InventoryProvider');
  return ctx;
}
