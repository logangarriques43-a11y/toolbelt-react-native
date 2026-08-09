/**
 * Vendor store — RN counterpart to VendorManager.swift + FavoriteVendorStore.
 * Vendors and the owner's vendor-products are backed by `/vendors` and
 * `/vendor-products` via React Query; favorites are local (no backend
 * endpoint), and per-vendor reviews aren't exposed by the backend so
 * `reviews`/`reviewsFor` return empty (aggregate averageRating/totalReviews
 * still come through on each vendor).
 *
 * GET /vendors returns the verified marketplace plus the caller's own vendors;
 * `ownedByMe` is derived server-side by uid. Mutations are optimistic and
 * reconcile the affected row on success (the wire isn't lossy).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import {
  createVendor,
  createVendorProduct,
  deleteVendorProduct as deleteVendorProductApi,
  listMyVendorProducts,
  listVendors,
  updateVendor as updateVendorApi,
  updateVendorProduct as updateVendorProductApi,
} from '@/api/vendors';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import { DEFAULT_VENDOR_CATEGORIES, type Vendor, type VendorProduct, type VendorReview, type VendorType } from '@/models/vendor';

export const VENDORS_QUERY_KEY = ['vendors'] as const;
export const VENDOR_PRODUCTS_QUERY_KEY = ['vendor-products', 'mine'] as const;

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

function alertFailure(action: string, err: unknown) {
  const message =
    err instanceof ApiError ? err.message : 'Please check your connection and try again.';
  Alert.alert(`Couldn't ${action}`, message);
}

export function VendorProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const vendorsQuery = useQuery({ queryKey: VENDORS_QUERY_KEY, queryFn: listVendors });
  const productsQuery = useQuery({ queryKey: VENDOR_PRODUCTS_QUERY_KEY, queryFn: listMyVendorProducts });
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  const vendors = vendorsQuery.data ?? [];
  const products = productsQuery.data ?? [];

  const readV = () => qc.getQueryData<Vendor[]>(VENDORS_QUERY_KEY) ?? [];
  const writeV = (next: Vendor[]) => qc.setQueryData(VENDORS_QUERY_KEY, next);
  const readP = () => qc.getQueryData<VendorProduct[]>(VENDOR_PRODUCTS_QUERY_KEY) ?? [];
  const writeP = (next: VendorProduct[]) => qc.setQueryData(VENDOR_PRODUCTS_QUERY_KEY, next);

  const value = useMemo<VendorStore>(() => {
    const verified = vendors.filter((v) => v.status === 'verified');

    // REGISTER — optimistic pending row (owned by me), swap in the saved row on
    // success. Returns the optimistic vendor (callers navigate away).
    const registerVendor = (
      input: Omit<Vendor, 'id' | 'status' | 'dateRegistered' | 'ownedByMe' | 'averageRating' | 'totalReviews'>,
    ): Vendor => {
      const tempId = `optimistic-${uuid()}`;
      const vendor: Vendor = {
        ...input,
        id: tempId,
        status: 'pending',
        dateRegistered: new Date().toISOString(),
        ownedByMe: true,
        averageRating: 0,
        totalReviews: 0,
      };
      writeV([vendor, ...readV()]);
      createVendor(input)
        .then((saved) => writeV(readV().map((v) => (v.id === tempId ? saved : v))))
        .catch((err) => {
          writeV(readV().filter((v) => v.id !== tempId));
          alertFailure('register vendor', err);
        });
      return vendor;
    };

    const updateVendor = (updated: Vendor) => {
      const prev = readV();
      writeV(prev.map((v) => (v.id === updated.id ? updated : v)));
      updateVendorApi(updated)
        .then((saved) => writeV(readV().map((v) => (v.id === saved.id ? saved : v))))
        .catch((err) => {
          writeV(prev);
          alertFailure('update vendor', err);
        });
    };

    const addVendorProduct = (input: Omit<VendorProduct, 'id' | 'createdAt'>) => {
      const tempId = `optimistic-${uuid()}`;
      const product: VendorProduct = { ...input, id: tempId, createdAt: new Date().toISOString() };
      writeP([product, ...readP()]);
      createVendorProduct(input)
        .then((saved) => writeP(readP().map((p) => (p.id === tempId ? saved : p))))
        .catch((err) => {
          writeP(readP().filter((p) => p.id !== tempId));
          alertFailure('add product', err);
        });
    };

    const updateVendorProduct = (updated: VendorProduct) => {
      const prev = readP();
      writeP(prev.map((p) => (p.id === updated.id ? updated : p)));
      updateVendorProductApi(updated)
        .then((saved) => writeP(readP().map((p) => (p.id === saved.id ? saved : p))))
        .catch((err) => {
          writeP(prev);
          alertFailure('update product', err);
        });
    };

    const deleteVendorProduct = (id: string) => {
      const prev = readP();
      writeP(prev.filter((p) => p.id !== id));
      deleteVendorProductApi(id).catch((err) => {
        writeP(prev);
        alertFailure('delete product', err);
      });
    };

    return {
      vendors,
      reviews: [], // no backend reviews endpoint; aggregate rating lives on the vendor
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
      reviewsFor: () => [],
      isFavorite: (id) => favorites.has(id),
      toggleFavorite: (id) =>
        setFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      registerVendor,
      updateVendor,
      productsFor: (vendorId) => products.filter((p) => p.vendorId === vendorId),
      addVendorProduct,
      updateVendorProduct,
      deleteVendorProduct,
    };
    // handlers close over stable refs (qc, setFavorites); re-derive on data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors, products, favorites]);

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
}

export function useVendors(): VendorStore {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error('useVendors must be used within a VendorProvider');
  return ctx;
}
