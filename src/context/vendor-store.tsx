/**
 * Vendor store — stands in for VendorManager.swift (backend /vendors + reviews)
 * and FavoriteVendorStore. Seeds verified sample vendors + reviews so the
 * marketplace UI is navigable offline; favorites + the user's own registered
 * vendor live in local state. Google-Places nearby search is out of scope.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import { DEFAULT_VENDOR_CATEGORIES, type Vendor, type VendorProduct, type VendorReview, type VendorType } from '@/models/vendor';

function seedVendors(): Vendor[] {
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86_400_000).toISOString();
  const base = {
    addressLine2: '',
    country: 'US',
    shipsNationwide: true,
    acceptsReturns: true,
  };
  return [
    {
      ...base,
      id: 'vendor-lumina',
      businessName: 'Lumina Beauty Supply',
      contactName: 'Dana Reyes',
      email: 'orders@luminabeauty.com',
      phoneNumber: '(310) 555-0142',
      website: 'luminabeauty.com',
      vendorType: 'wholesaler',
      status: 'verified',
      categories: ['Hair Products', 'Skincare', 'Retail Products'],
      addressLine1: '1200 Beauty Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90021',
      descriptionText: 'Wholesale salon-grade hair and skincare lines with fast restocking and no minimum on retail packs.',
      minimumOrderAmount: 150,
      shippingInfo: 'Free shipping over $250',
      leadTimeDays: 2,
      averageRating: 4.7,
      totalReviews: 38,
      dateRegistered: days(12),
    },
    {
      ...base,
      id: 'vendor-pronail',
      businessName: 'ProNail Distributors',
      contactName: 'Marcus Lee',
      email: 'sales@pronaildist.com',
      phoneNumber: '(702) 555-0188',
      website: 'pronaildist.com',
      vendorType: 'distributor',
      status: 'verified',
      categories: ['Nail Supplies', 'Disposables'],
      addressLine1: '88 Industrial Way',
      city: 'Las Vegas',
      state: 'NV',
      zipCode: '89101',
      descriptionText: 'Nail supplies, gels, and single-use disposables in bulk. Same-week delivery across the Southwest.',
      minimumOrderAmount: 100,
      shippingInfo: 'Flat $12 shipping',
      leadTimeDays: 3,
      acceptsReturns: false,
      shipsNationwide: false,
      shipsRadiusMiles: 300,
      averageRating: 4.3,
      totalReviews: 14,
      dateRegistered: days(40),
    },
    {
      ...base,
      id: 'vendor-clearco',
      businessName: 'ClearCo Cleaning Supply',
      contactName: 'Priya Shah',
      email: 'hello@clearco.com',
      phoneNumber: '(206) 555-0125',
      website: 'clearco.com',
      vendorType: 'supplier',
      status: 'verified',
      categories: ['Cleaning Supplies', 'Disposables'],
      addressLine1: '440 Market St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      descriptionText: 'Eco-friendly cleaning and sanitation supplies for salons and studios.',
      minimumOrderAmount: 0,
      shippingInfo: 'Ships in 1–2 business days',
      leadTimeDays: 1,
      averageRating: 4.9,
      totalReviews: 52,
      dateRegistered: days(5),
    },
    {
      ...base,
      id: 'vendor-craftform',
      businessName: 'CraftForm Furniture',
      contactName: 'Sam Whitman',
      email: 'quotes@craftform.com',
      phoneNumber: '(312) 555-0170',
      website: 'craftform.com',
      vendorType: 'manufacturer',
      status: 'verified',
      categories: ['Furniture', 'Equipment'],
      addressLine1: '15 Maker Row',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60607',
      descriptionText: 'Custom salon chairs, stations, and reception furniture, built to order.',
      minimumOrderAmount: 500,
      shippingInfo: 'Freight quoted per order',
      leadTimeDays: 21,
      averageRating: 4.6,
      totalReviews: 9,
      dateRegistered: days(75),
    },
  ];
}

function seedReviews(): VendorReview[] {
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86_400_000).toISOString();
  return [
    { id: uuid(), vendorId: 'vendor-lumina', reviewerName: 'Bella Studio', rating: 5, comment: 'Fast restocks and great prices on color lines.', datePosted: days(8) },
    { id: uuid(), vendorId: 'vendor-lumina', reviewerName: 'The Glow Bar', rating: 4, comment: 'Reliable, though a couple items were backordered.', datePosted: days(20) },
    { id: uuid(), vendorId: 'vendor-clearco', reviewerName: 'Shear Genius', rating: 5, comment: 'Best sanitation supplier we have used. Quick delivery.', datePosted: days(3) },
    { id: uuid(), vendorId: 'vendor-pronail', reviewerName: 'Polished', rating: 4, comment: 'Good bulk pricing on gels.', datePosted: days(15) },
  ];
}

export interface VendorStore {
  vendors: Vendor[];
  reviews: VendorReview[];
  myVendor: Vendor | null;
  verifiedVendors: Vendor[];
  allCategories: string[];
  defaultCategories: string[];
  vendorById: (id: string) => Vendor | undefined;
  searchVendors: (query: string) => Vendor[];
  vendorsInCategory: (category: string) => Vendor[];
  vendorsOfType: (type: VendorType) => Vendor[];
  recommendVendors: (inventoryCategories: string[]) => Vendor[];
  reviewsFor: (vendorId: string) => VendorReview[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  registerVendor: (v: Omit<Vendor, 'id' | 'status' | 'dateRegistered' | 'ownedByMe' | 'averageRating' | 'totalReviews'>) => Vendor;
  updateVendor: (v: Vendor) => void;
  productsFor: (vendorId: string) => VendorProduct[];
  addVendorProduct: (p: Omit<VendorProduct, 'id' | 'createdAt'>) => void;
  updateVendorProduct: (p: VendorProduct) => void;
  deleteVendorProduct: (id: string) => void;
}

const VendorContext = createContext<VendorStore | null>(null);

export function VendorProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>(seedVendors);
  const [reviews] = useState<VendorReview[]>(seedReviews);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [products, setProducts] = useState<VendorProduct[]>([]);

  const value = useMemo<VendorStore>(() => {
    const verified = vendors.filter((v) => v.status === 'verified');
    return {
      vendors,
      reviews,
      myVendor: vendors.find((v) => v.ownedByMe) ?? null,
      verifiedVendors: verified,
      allCategories: [...new Set(vendors.flatMap((v) => v.categories))].sort(),
      defaultCategories: DEFAULT_VENDOR_CATEGORIES,
      vendorById: (id) => vendors.find((v) => v.id === id),
      searchVendors: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return verified;
        return verified.filter(
          (v) =>
            v.businessName.toLowerCase().includes(q) ||
            v.categories.some((c) => c.toLowerCase().includes(q)) ||
            v.city.toLowerCase().includes(q) ||
            v.descriptionText.toLowerCase().includes(q),
        );
      },
      vendorsInCategory: (category) => verified.filter((v) => v.categories.includes(category)),
      vendorsOfType: (type) => verified.filter((v) => v.vendorType === type),
      recommendVendors: (inventoryCategories) => {
        const wanted = new Set(inventoryCategories.map((c) => c.toLowerCase()));
        if (wanted.size === 0) return [];
        return verified.filter((v) => v.categories.some((c) => wanted.has(c.toLowerCase())));
      },
      reviewsFor: (vendorId) => reviews.filter((r) => r.vendorId === vendorId),
      isFavorite: (id) => favorites.has(id),
      toggleFavorite: (id) =>
        setFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      registerVendor: (input) => {
        const vendor: Vendor = {
          ...input,
          id: uuid(),
          status: 'pending',
          dateRegistered: new Date().toISOString(),
          ownedByMe: true,
          averageRating: 0,
          totalReviews: 0,
        };
        setVendors((prev) => [vendor, ...prev]);
        return vendor;
      },
      updateVendor: (updated) => setVendors((prev) => prev.map((v) => (v.id === updated.id ? updated : v))),
      productsFor: (vendorId) => products.filter((p) => p.vendorId === vendorId),
      addVendorProduct: (input) =>
        setProducts((prev) => [{ ...input, id: uuid(), createdAt: new Date().toISOString() }, ...prev]),
      updateVendorProduct: (updated) => setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p))),
      deleteVendorProduct: (id) => setProducts((prev) => prev.filter((p) => p.id !== id)),
    };
  }, [vendors, reviews, favorites, products]);

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
}

export function useVendors(): VendorStore {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error('useVendors must be used within a VendorProvider');
  return ctx;
}
