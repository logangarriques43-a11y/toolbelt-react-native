/**
 * Vendor marketplace API — maps the backend `/vendors` and `/vendor-products`
 * DTOs to/from the RN models. Mirrors Swift's VendorManager.
 *
 * - GET /vendors returns verified vendors (the marketplace) plus the caller's
 *   own vendors (any status), deduped. `ownedByMe` is derived by comparing the
 *   DTO's ownerUid to the signed-in Firebase uid.
 * - Vendor products are fetched for the caller's own vendors (?mine=true); the
 *   only consumer is the owner's product-management screen.
 * - No reviews or favorites endpoints exist, so those stay client-side.
 * Both routers are mounted at /api and /api/v1, so the /api/v1 base reaches them.
 */

import { api } from '@/lib/api-client';
import { auth } from '@/lib/firebase';
import type { Vendor, VendorProduct, VendorStatus, VendorType } from '@/models/vendor';

interface VendorDTO {
  id?: string;
  ownerUid?: string | null;
  businessName: string;
  contactName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  vendorType?: string | null;
  status?: string | null;
  categories?: string[] | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  descriptionText?: string | null;
  minimumOrderAmount?: number | null;
  shippingInfo?: string | null;
  leadTimeDays?: number | null;
  acceptsReturns?: boolean | null;
  shipsNationwide?: boolean | null;
  shipsRadiusMiles?: number | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  dateRegistered?: string | null;
}

/** Editable fields sent on create/update (server owns status/rating/dates). */
type VendorInput = Omit<
  Vendor,
  'id' | 'status' | 'dateRegistered' | 'ownedByMe' | 'averageRating' | 'totalReviews'
>;

function fromVendorDTO(dto: VendorDTO): Vendor {
  return {
    id: dto.id ?? '',
    businessName: dto.businessName,
    contactName: dto.contactName ?? '',
    email: dto.email ?? '',
    phoneNumber: dto.phoneNumber ?? '',
    website: dto.website ?? '',
    vendorType: (dto.vendorType as VendorType) ?? 'supplier',
    status: (dto.status as VendorStatus) ?? 'pending',
    categories: dto.categories ?? [],
    addressLine1: dto.addressLine1 ?? '',
    addressLine2: dto.addressLine2 ?? '',
    city: dto.city ?? '',
    state: dto.state ?? '',
    zipCode: dto.zipCode ?? '',
    country: dto.country ?? 'US',
    descriptionText: dto.descriptionText ?? '',
    minimumOrderAmount: dto.minimumOrderAmount ?? 0,
    shippingInfo: dto.shippingInfo ?? '',
    leadTimeDays: dto.leadTimeDays ?? 0,
    acceptsReturns: dto.acceptsReturns ?? true,
    shipsNationwide: dto.shipsNationwide ?? true,
    shipsRadiusMiles: dto.shipsRadiusMiles ?? undefined,
    averageRating: dto.averageRating ?? 0,
    totalReviews: dto.totalReviews ?? 0,
    dateRegistered: dto.dateRegistered ?? new Date().toISOString(),
    ownedByMe: dto.ownerUid != null && dto.ownerUid === auth.currentUser?.uid,
  };
}

function toVendorDTO(v: VendorInput): VendorDTO {
  return {
    businessName: v.businessName,
    contactName: v.contactName,
    email: v.email,
    phoneNumber: v.phoneNumber,
    website: v.website,
    vendorType: v.vendorType,
    categories: v.categories,
    addressLine1: v.addressLine1,
    addressLine2: v.addressLine2,
    city: v.city,
    state: v.state,
    zipCode: v.zipCode,
    country: v.country,
    descriptionText: v.descriptionText,
    minimumOrderAmount: v.minimumOrderAmount,
    shippingInfo: v.shippingInfo,
    leadTimeDays: v.leadTimeDays,
    acceptsReturns: v.acceptsReturns,
    shipsNationwide: v.shipsNationwide,
    shipsRadiusMiles: v.shipsRadiusMiles ?? null,
  };
}

export async function listVendors(): Promise<Vendor[]> {
  const dtos = await api.get<VendorDTO[]>('/vendors');
  return dtos.map(fromVendorDTO);
}

export async function createVendor(input: VendorInput): Promise<Vendor> {
  const dto = await api.post<VendorDTO>('/vendors', toVendorDTO(input));
  return fromVendorDTO(dto);
}

export async function updateVendor(v: Vendor): Promise<Vendor> {
  const dto = await api.put<VendorDTO>(`/vendors/${v.id}`, toVendorDTO(v));
  return fromVendorDTO(dto);
}

interface VendorProductDTO {
  id?: string;
  vendorId: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  categoryTags?: string[] | null;
  price?: number | null;
  currency?: string | null;
  unit?: string | null;
  stockQuantity?: number | null;
  minimumOrderQuantity?: number | null;
  isActive?: boolean | null;
  createdAt?: string | null;
}

function fromProductDTO(dto: VendorProductDTO): VendorProduct {
  return {
    id: dto.id ?? '',
    vendorId: dto.vendorId,
    name: dto.name,
    description: dto.description ?? '',
    sku: dto.sku ?? '',
    categoryTags: dto.categoryTags ?? [],
    price: dto.price ?? 0,
    currency: dto.currency ?? 'USD',
    unit: dto.unit ?? 'each',
    stockQuantity: dto.stockQuantity ?? undefined,
    minimumOrderQuantity: dto.minimumOrderQuantity ?? 1,
    isActive: dto.isActive ?? true,
    createdAt: dto.createdAt ?? new Date().toISOString(),
  };
}

function toProductDTO(p: Omit<VendorProduct, 'id' | 'createdAt'>): VendorProductDTO {
  return {
    vendorId: p.vendorId,
    name: p.name,
    description: p.description,
    sku: p.sku,
    categoryTags: p.categoryTags,
    price: p.price,
    currency: p.currency,
    unit: p.unit,
    stockQuantity: p.stockQuantity ?? null,
    minimumOrderQuantity: p.minimumOrderQuantity,
    isActive: p.isActive,
  };
}

/** Products across the caller's own vendors (owner-facing catalog management). */
export async function listMyVendorProducts(): Promise<VendorProduct[]> {
  const dtos = await api.get<VendorProductDTO[]>('/vendor-products', { mine: 'true' });
  return dtos.map(fromProductDTO);
}

export async function createVendorProduct(
  input: Omit<VendorProduct, 'id' | 'createdAt'>,
): Promise<VendorProduct> {
  const dto = await api.post<VendorProductDTO>('/vendor-products', toProductDTO(input));
  return fromProductDTO(dto);
}

export async function updateVendorProduct(p: VendorProduct): Promise<VendorProduct> {
  const { id, createdAt: _createdAt, ...rest } = p;
  const dto = await api.put<VendorProductDTO>(`/vendor-products/${id}`, toProductDTO(rest));
  return fromProductDTO(dto);
}

export async function deleteVendorProduct(id: string): Promise<void> {
  await api.del(`/vendor-products/${id}`);
}
