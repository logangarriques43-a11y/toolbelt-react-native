/**
 * Products store — RN counterpart to ProductManager.swift.
 * POS quick-sell catalog backed by `/products` via React Query, plus the
 * stock-decrement hook used after a sale. Mutations are OPTIMISTIC and
 * reconcile the affected row on success (the wire is non-lossy); they roll
 * back and Alert on failure. Public API is unchanged.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Alert } from 'react-native';

import {
  createProduct,
  deleteProduct as deleteProductApi,
  listProducts,
  updateProduct as updateProductApi,
} from '@/api/products';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import type { Product } from '@/models/product';

export const PRODUCTS_QUERY_KEY = ['products'] as const;

export interface ProductsStore {
  products: Product[];
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
  /** Lower the tracked stock for a product after it sells. */
  decrementStock: (id: string, by: number) => void;
}

const ProductsContext = createContext<ProductsStore | null>(null);

function alertFailure(action: string, err: unknown) {
  const message =
    err instanceof ApiError ? err.message : 'Please check your connection and try again.';
  Alert.alert(`Couldn't ${action}`, message);
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: PRODUCTS_QUERY_KEY, queryFn: listProducts });

  const read = () => qc.getQueryData<Product[]>(PRODUCTS_QUERY_KEY) ?? [];
  const write = (next: Product[]) => qc.setQueryData(PRODUCTS_QUERY_KEY, next);

  // Persist a full product row (used by update/decrementStock): optimistic row
  // is already written; PUT and reconcile, or roll back to `prev` on failure.
  const persist = (next: Product, prev: Product[], action: string) => {
    updateProductApi(next)
      .then((saved) => write(read().map((p) => (p.id === saved.id ? saved : p))))
      .catch((err) => {
        write(prev);
        alertFailure(action, err);
      });
  };

  const value = useMemo<ProductsStore>(() => {
    const products = query.data ?? [];

    return {
      products,

      addProduct: (input) => {
        const tempId = `optimistic-${uuid()}`;
        write([...read(), { ...input, id: tempId }]);
        createProduct(input)
          .then((saved) => write(read().map((p) => (p.id === tempId ? saved : p))))
          .catch((err) => {
            write(read().filter((p) => p.id !== tempId));
            alertFailure('add product', err);
          });
      },

      updateProduct: (id, updates) => {
        const prev = read();
        const current = prev.find((p) => p.id === id);
        if (!current) return;
        const next: Product = { ...current, ...updates };
        write(prev.map((p) => (p.id === id ? next : p)));
        persist(next, prev, 'update product');
      },

      deleteProduct: (id) => {
        const prev = read();
        write(prev.filter((p) => p.id !== id));
        deleteProductApi(id).catch((err) => {
          write(prev);
          alertFailure('delete product', err);
        });
      },

      decrementStock: (id, by) => {
        const prev = read();
        const current = prev.find((p) => p.id === id);
        if (!current || !current.trackInventory || current.stockQuantity == null) return;
        const next: Product = { ...current, stockQuantity: Math.max(0, current.stockQuantity - by) };
        write(prev.map((p) => (p.id === id ? next : p)));
        persist(next, prev, 'update stock');
      },
    };
    // handlers close over stable refs (qc); re-derive when the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsStore {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
}
