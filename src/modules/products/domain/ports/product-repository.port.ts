import type { ProductEntity } from '../entities/product.entity';

export interface ProductQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  categoryId?: number;
  brandId?: number;
  sellerId?: number;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IProductRepository {
  findById(id: number): Promise<ProductEntity | null>;
  findBySlug(slug: string): Promise<ProductEntity | null>;
  findAll(filters: ProductQueryFilters): Promise<PaginatedResult<ProductEntity>>;
  findFeatured(limit: number): Promise<ProductEntity[]>;
  save(entity: ProductEntity): Promise<ProductEntity>;
  create(data: CreateProductData): Promise<ProductEntity>;
  delete(id: number): Promise<void>;
  slugExists(slug: string, excludeId?: number): Promise<boolean>;
}

export interface CreateProductData {
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price: string;
  compareAtPrice?: string | null;
  costPrice?: string | null;
  sku?: string | null;
  barcode?: string | null;
  quantity?: number;
  lowStockThreshold?: number | null;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  weight?: string | null;
  weightUnit?: string | null;
  categoryId?: number | null;
  brandId?: number | null;
  sellerId?: number | null;
  status?: string;
  isFeatured?: boolean;
  isDigital?: boolean;
  imageUrl?: string | null;
  images?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  tags?: string | null;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
