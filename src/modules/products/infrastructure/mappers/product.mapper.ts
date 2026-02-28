import type { Product } from '@/infrastructure/database/schemas/product.schema';
import { ProductEntity, ProductStatus } from '../../domain/entities/product.entity';
import { Money, Slug } from '../../domain/value-objects';

export class ProductMapper {
  static toDomain(row: Product): ProductEntity {
    return ProductEntity.create({
      id: row.id,
      name: row.name,
      slug: new Slug(row.slug),
      description: row.description,
      shortDescription: row.shortDescription,
      price: new Money(row.price),
      compareAtPrice: row.compareAtPrice ? new Money(row.compareAtPrice) : null,
      costPrice: row.costPrice ? new Money(row.costPrice) : null,
      sku: row.sku,
      barcode: row.barcode,
      quantity: row.quantity,
      lowStockThreshold: row.lowStockThreshold,
      trackInventory: row.trackInventory,
      allowBackorder: row.allowBackorder,
      weight: row.weight,
      weightUnit: row.weightUnit,
      categoryId: row.categoryId,
      brandId: row.brandId,
      sellerId: row.sellerId,
      status: row.status as ProductStatus,
      isFeatured: row.isFeatured,
      isDigital: row.isDigital,
      imageUrl: row.imageUrl,
      images: row.images,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      tags: row.tags,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: ProductEntity): Omit<Product, 'id' | 'createdAt'> & { id?: number } {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug.value,
      description: entity.description,
      shortDescription: entity.shortDescription,
      price: entity.price.amount,
      compareAtPrice: entity.compareAtPrice?.amount ?? null,
      costPrice: entity.costPrice?.amount ?? null,
      sku: entity.sku,
      barcode: entity.barcode,
      quantity: entity.quantity,
      lowStockThreshold: entity.lowStockThreshold,
      trackInventory: entity.trackInventory,
      allowBackorder: entity.allowBackorder,
      weight: entity.weight,
      weightUnit: entity.weightUnit,
      categoryId: entity.categoryId,
      brandId: entity.brandId,
      sellerId: entity.sellerId,
      status: entity.status,
      isFeatured: entity.isFeatured,
      isDigital: entity.isDigital,
      imageUrl: entity.imageUrl,
      images: entity.images,
      metaTitle: entity.metaTitle,
      metaDescription: entity.metaDescription,
      tags: entity.tags,
      updatedAt: entity.updatedAt,
    };
  }
}
