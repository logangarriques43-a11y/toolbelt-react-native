/**
 * Vendor marketplace models — port of Vendor.swift + VendorProduct.swift.
 * The real feature is fully backend-driven (VendorManager hits /vendors, plus
 * Google Places for nearby search); here these back an in-memory seeded store so
 * the directory/detail/registration UI is faithful offline. Backend/admin/geo
 * fields (serverId, ownerUid, origin coords, EIN/legitimacy) are omitted.
 */

import type { SFSymbol } from 'expo-symbols';

import { iOSColors } from '@/theme/tokens';

export type VendorStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export function vendorStatusLabel(s: VendorStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function vendorStatusColor(s: VendorStatus): string {
  switch (s) {
    case 'pending':
      return iOSColors.orange;
    case 'verified':
      return iOSColors.green;
    case 'rejected':
    case 'suspended':
      return iOSColors.red;
  }
}

export type VendorType = 'supplier' | 'wholesaler' | 'manufacturer' | 'distributor' | 'localBusiness';

export const VENDOR_TYPES: { type: VendorType; label: string; icon: SFSymbol }[] = [
  { type: 'supplier', label: 'Supplier', icon: 'shippingbox.fill' },
  { type: 'wholesaler', label: 'Wholesaler', icon: 'building.2.fill' },
  { type: 'manufacturer', label: 'Manufacturer', icon: 'hammer.fill' },
  { type: 'distributor', label: 'Distributor', icon: 'box.truck.fill' },
  { type: 'localBusiness', label: 'Local Business', icon: 'storefront.fill' },
];

export function vendorTypeLabel(t: VendorType): string {
  return VENDOR_TYPES.find((v) => v.type === t)?.label ?? t;
}
export function vendorTypeIcon(t: VendorType): SFSymbol {
  return VENDOR_TYPES.find((v) => v.type === t)?.icon ?? 'shippingbox.fill';
}

export interface Vendor {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phoneNumber: string;
  website: string;
  vendorType: VendorType;
  status: VendorStatus;
  categories: string[];
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  descriptionText: string;
  minimumOrderAmount: number;
  shippingInfo: string;
  leadTimeDays: number;
  acceptsReturns: boolean;
  shipsNationwide: boolean;
  shipsRadiusMiles?: number;
  averageRating: number;
  totalReviews: number;
  /** ISO datetime. */
  dateRegistered: string;
  /** Set when this listing belongs to the current user. */
  ownedByMe?: boolean;
}

export interface VendorReview {
  id: string;
  vendorId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  /** ISO datetime. */
  datePosted: string;
}

export interface VendorProduct {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  sku: string;
  categoryTags: string[];
  price: number;
  currency: string;
  unit: string;
  stockQuantity?: number;
  minimumOrderQuantity: number;
  isActive: boolean;
  /** ISO datetime. */
  createdAt: string;
}

export function vendorInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const second = words[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

export function vendorFullAddress(v: Vendor): string {
  return [v.addressLine1, v.addressLine2, v.city, v.state, v.zipCode].filter((x) => x.length > 0).join(', ');
}

export function vendorRatingDisplay(v: Vendor): string {
  return v.totalReviews === 0 ? 'No reviews' : `${v.averageRating.toFixed(1)} (${v.totalReviews})`;
}

export function vendorServiceArea(v: Vendor): string {
  if (v.shipsNationwide) return 'Ships nationwide';
  if (v.shipsRadiusMiles && v.shipsRadiusMiles > 0) return `Ships within ${Math.round(v.shipsRadiusMiles)} mi`;
  return 'Local pickup only';
}

export function vendorProductPriceDisplay(p: VendorProduct): string {
  return p.price % 1 === 0 ? `$${p.price.toFixed(0)}` : `$${p.price.toFixed(2)}`;
}

export const DEFAULT_VENDOR_CATEGORIES = [
  'Hair Products',
  'Nail Supplies',
  'Skincare',
  'Equipment',
  'Cleaning Supplies',
  'Disposables',
  'Furniture',
  'Retail Products',
];
