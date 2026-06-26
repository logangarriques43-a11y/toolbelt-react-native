/**
 * Products store — RN counterpart to ProductManager.swift.
 * In-memory CRUD for POS quick-sell products + stock decrement after a sale.
 * No backend; inventory linkage arrives in Phase 6.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import type { Product } from '@/models/product';

export interface ProductsStore {
  products: Product[];
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
  /** Lower the tracked stock for a product after it sells. */
  decrementStock: (id: string, by: number) => void;
}

const ProductsContext = createContext<ProductsStore | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);

  const value = useMemo<ProductsStore>(
    () => ({
      products,
      addProduct: (p) => setProducts((prev) => [...prev, { ...p, id: uuid() }]),
      updateProduct: (id, updates) =>
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p))),
      deleteProduct: (id) => setProducts((prev) => prev.filter((p) => p.id !== id)),
      decrementStock: (id, by) =>
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id && p.trackInventory && p.stockQuantity != null
              ? { ...p, stockQuantity: Math.max(0, p.stockQuantity - by) }
              : p,
          ),
        ),
    }),
    [products],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsStore {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
}
