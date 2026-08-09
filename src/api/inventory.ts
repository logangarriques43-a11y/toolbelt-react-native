/**
 * Inventory API — maps the backend `/inventory/items` DTO to/from the RN
 * InventoryItem model. Mirrors the Swift InventoryManager, which syncs ITEMS
 * to the backend but keeps the activity log purely local.
 *
 * Lossy wire (kept local, not persisted server-side, matching Swift):
 * - serviceUsageRates (per-service depletion counters) — regenerated empty on
 *   read; live only in the cache for the session.
 * - the activity log — a client-side audit view, never sent.
 * The wire also carries `unitCost` (defaults to unitPrice); the RN model has no
 * such field, so we don't send it and the backend falls back to unitPrice.
 * Timestamps: wire createdAt -> dateAdded, lastModifiedAt -> lastUpdated.
 *
 * inventoryRoutes is mounted at /api and /api/v1, so the /api/v1 base reaches
 * it. The `/inventory/purchases` audit trail is separate and not wired here.
 */

import { api } from '@/lib/api-client';
import type { InventoryItem } from '@/models/inventory';

interface InventoryItemDTO {
  id?: string;
  name: string;
  sku?: string | null;
  quantity?: number | null;
  reorderLevel?: number | null;
  unitPrice?: number | null;
  unitCost?: number | null;
  category?: string | null;
  vendorId?: string | null;
  reorderURL?: string | null;
  vendorSku?: string | null;
  autoCalculateReorder?: boolean | null;
  autoReorder?: boolean | null;
  reorderQuantity?: number | null;
  createdAt?: string | null;
  lastModifiedAt?: string | null;
}

function fromDTO(dto: InventoryItemDTO): InventoryItem {
  const created = dto.createdAt ?? new Date().toISOString();
  return {
    id: dto.id ?? '',
    name: dto.name,
    sku: dto.sku ?? '',
    quantity: dto.quantity ?? 0,
    reorderLevel: dto.reorderLevel ?? 0,
    unitPrice: dto.unitPrice ?? 0,
    category: dto.category ?? 'General',
    dateAdded: created,
    lastUpdated: dto.lastModifiedAt ?? created,
    serviceUsageRates: [], // local-only, not persisted server-side
    autoCalculateReorder: dto.autoCalculateReorder ?? false,
    reorderQuantity: dto.reorderQuantity ?? undefined,
    autoReorder: dto.autoReorder ?? false,
    vendorId: dto.vendorId ?? undefined,
    reorderURL: dto.reorderURL ?? undefined,
    vendorSku: dto.vendorSku ?? undefined,
  };
}

/** Model -> wire body. Id is carried in the URL; serviceUsageRates/dates are dropped. */
function toDTO(item: InventoryItem): InventoryItemDTO {
  return {
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    reorderLevel: item.reorderLevel,
    unitPrice: item.unitPrice,
    category: item.category,
    vendorId: item.vendorId ?? null,
    reorderURL: item.reorderURL ?? null,
    vendorSku: item.vendorSku ?? null,
    autoCalculateReorder: item.autoCalculateReorder,
    autoReorder: item.autoReorder,
    reorderQuantity: item.reorderQuantity ?? null,
  };
}

export async function listInventory(): Promise<InventoryItem[]> {
  const dtos = await api.get<InventoryItemDTO[]>('/inventory/items');
  return dtos.map(fromDTO);
}

export async function createInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  const dto = await api.post<InventoryItemDTO>('/inventory/items', toDTO(item));
  return fromDTO(dto);
}

export async function updateInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  const dto = await api.put<InventoryItemDTO>(`/inventory/items/${item.id}`, toDTO(item));
  return fromDTO(dto);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await api.del(`/inventory/items/${id}`);
}
