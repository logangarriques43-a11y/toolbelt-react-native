/**
 * Products API — maps the backend `/products` DTO to/from the RN Product
 * model (POS quick-sell catalog). Mirrors Swift's ProductManager. Backend doc
 * id is the record id. All routes are Firebase-authed and business-scoped;
 * productRoutes is mounted at /api and /api/v1.
 *
 * The only field-name difference is description: the RN model's `description`
 * is stored as `productDescription` on the wire. Everything else is 1:1 and
 * fully persisted (non-lossy).
 */

import { api } from '@/lib/api-client';
import type { Product } from '@/models/product';

interface ProductDTO {
  id?: string;
  name: string;
  colorHex?: string | null;
  price?: number | null;
  costPrice?: number | null;
  category?: string | null;
  sku?: string | null;
  productDescription?: string | null;
  stockQuantity?: number | null;
  trackInventory?: boolean | null;
  salesTaxEnabled?: boolean | null;
  salesTaxRate?: number | null;
}

function fromDTO(dto: ProductDTO): Product {
  return {
    id: dto.id ?? '',
    name: dto.name,
    colorHex: dto.colorHex ?? '#6366F1',
    price: dto.price ?? 0,
    costPrice: dto.costPrice ?? undefined,
    category: dto.category ?? undefined,
    sku: dto.sku ?? undefined,
    description: dto.productDescription ?? undefined,
    stockQuantity: dto.stockQuantity ?? undefined,
    trackInventory: dto.trackInventory ?? false,
    salesTaxEnabled: dto.salesTaxEnabled ?? false,
    salesTaxRate: dto.salesTaxRate ?? 0,
  };
}

/** Model -> wire body. Id is carried in the URL; description -> productDescription. */
function toDTO(p: Omit<Product, 'id'>): ProductDTO {
  return {
    name: p.name,
    colorHex: p.colorHex,
    price: p.price,
    costPrice: p.costPrice ?? null,
    category: p.category ?? null,
    sku: p.sku ?? null,
    productDescription: p.description ?? null,
    stockQuantity: p.stockQuantity ?? null,
    trackInventory: p.trackInventory,
    salesTaxEnabled: p.salesTaxEnabled,
    salesTaxRate: p.salesTaxRate,
  };
}

export async function listProducts(): Promise<Product[]> {
  const dtos = await api.get<ProductDTO[]>('/products');
  return dtos.map(fromDTO);
}

export async function createProduct(input: Omit<Product, 'id'>): Promise<Product> {
  const dto = await api.post<ProductDTO>('/products', toDTO(input));
  return fromDTO(dto);
}

export async function updateProduct(product: Product): Promise<Product> {
  const { id, ...rest } = product;
  const dto = await api.put<ProductDTO>(`/products/${id}`, toDTO(rest));
  return fromDTO(dto);
}

export async function deleteProduct(id: string): Promise<void> {
  await api.del(`/products/${id}`);
}
