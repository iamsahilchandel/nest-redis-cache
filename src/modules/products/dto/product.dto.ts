import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Zod Schemas for validation
export const CreateProductDtoSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  price: z
    .string()
    .or(z.number())
    .transform((val) => String(val)),
  compareAtPrice: z
    .string()
    .or(z.number())
    .transform((val) => String(val))
    .optional(),
  costPrice: z
    .string()
    .or(z.number())
    .transform((val) => String(val))
    .optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  quantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  trackInventory: z.boolean().default(true),
  allowBackorder: z.boolean().default(false),
  weight: z
    .string()
    .or(z.number())
    .transform((val) => String(val))
    .optional(),
  weightUnit: z.enum(['kg', 'g', 'lb', 'oz']).optional(),
  categoryId: z.number().int().optional(),
  brandId: z.number().int().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  isFeatured: z.boolean().default(false),
  isDigital: z.boolean().default(false),
  imageUrl: z.string().url().max(500).optional(),
  images: z.array(z.string().url()).optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateProductDtoSchema = CreateProductDtoSchema.partial();

export const ProductQueryDtoSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  categoryId: z.string().transform(Number).optional(),
  brandId: z.string().transform(Number).optional(),
  sellerId: z.string().transform(Number).optional(),
  minPrice: z.string().transform(Number).optional(),
  maxPrice: z.string().transform(Number).optional(),
  isFeatured: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'quantity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// TypeScript types
export type CreateProductDto = z.infer<typeof CreateProductDtoSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductDtoSchema>;
export type ProductQueryDto = z.infer<typeof ProductQueryDtoSchema>;

// Swagger DTOs for API documentation
export class CreateProductDtoSwagger {
  @ApiProperty({ description: 'Product name', example: 'Wireless Bluetooth Headphones' })
  name!: string;

  @ApiPropertyOptional({ description: 'URL-friendly slug', example: 'wireless-bluetooth-headphones' })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Full product description',
    example: 'Premium wireless headphones with noise cancellation...',
  })
  description?: string;

  @ApiPropertyOptional({ description: 'Short description', example: 'Premium wireless headphones', maxLength: 500 })
  shortDescription?: string;

  @ApiProperty({ description: 'Product price', example: '99.99' })
  price!: string;

  @ApiPropertyOptional({ description: 'Compare at price (original price)', example: '149.99' })
  compareAtPrice?: string;

  @ApiPropertyOptional({ description: 'Cost price', example: '50.00' })
  costPrice?: string;

  @ApiPropertyOptional({ description: 'Stock Keeping Unit', example: 'WBH-001' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode/UPC', example: '123456789012' })
  barcode?: string;

  @ApiPropertyOptional({ description: 'Available quantity', example: 100, default: 0 })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Low stock alert threshold', example: 10 })
  lowStockThreshold?: number;

  @ApiPropertyOptional({ description: 'Track inventory', default: true })
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Allow backorder when out of stock', default: false })
  allowBackorder?: boolean;

  @ApiPropertyOptional({ description: 'Product weight', example: '0.5' })
  weight?: string;

  @ApiPropertyOptional({ description: 'Weight unit', enum: ['kg', 'g', 'lb', 'oz'], example: 'kg' })
  weightUnit?: string;

  @ApiPropertyOptional({ description: 'Category ID', example: 1 })
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Brand ID', example: 1 })
  brandId?: number;

  @ApiPropertyOptional({ description: 'Product status', enum: ['draft', 'active', 'archived'], default: 'draft' })
  status?: string;

  @ApiPropertyOptional({ description: 'Is featured product', default: false })
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Is digital product', default: false })
  isDigital?: boolean;

  @ApiPropertyOptional({ description: 'Main product image URL', example: 'https://example.com/image.jpg' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Additional image URLs', type: [String] })
  images?: string[];

  @ApiPropertyOptional({ description: 'SEO meta title', example: 'Buy Wireless Headphones Online' })
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description', example: 'Shop premium wireless headphones...' })
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Product tags', type: [String], example: ['electronics', 'audio', 'wireless'] })
  tags?: string[];
}

export class UpdateProductDtoSwagger extends CreateProductDtoSwagger {}

export class ProductQueryDtoSwagger {
  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 10, maximum: 100 })
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term for name or description', example: 'headphones' })
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ['draft', 'active', 'archived'] })
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID', example: 1 })
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Filter by brand ID', example: 1 })
  brandId?: number;

  @ApiPropertyOptional({ description: 'Filter by seller ID', example: 1 })
  sellerId?: number;

  @ApiPropertyOptional({ description: 'Minimum price filter', example: 10 })
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter', example: 1000 })
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filter featured products', example: true })
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['name', 'price', 'createdAt', 'quantity'] })
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  sortOrder?: string;
}
