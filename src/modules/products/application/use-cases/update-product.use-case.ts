import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { products, Product, NewProduct } from '../../../../infrastructure/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { UpdateProductDto } from '../../presentation/dto/product.dto';
import { CacheService } from '../../../cache/cache.service';
import { CacheKeys, InvalidationKeys } from '../../../cache/cache.keys';

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async execute(id: number, updateProductDto: UpdateProductDto): Promise<ApiResponse<Product>> {
    const [existingProduct] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check slug uniqueness if updating slug
    if (updateProductDto.slug && updateProductDto.slug !== existingProduct.slug) {
      const [duplicateSlug] = await this.db
        .select()
        .from(products)
        .where(eq(products.slug, updateProductDto.slug))
        .limit(1);

      if (duplicateSlug) {
        throw new ConflictException('Product with this slug already exists');
      }
    }

    const { images, tags, ...rest } = updateProductDto;

    const updateData: Partial<NewProduct> = {
      ...rest,
      updatedAt: new Date(),
    };

    if (images !== undefined) {
      updateData.images = JSON.stringify(images);
    }

    if (tags !== undefined) {
      updateData.tags = JSON.stringify(tags);
    }

    const [updatedProduct] = await this.db.update(products).set(updateData).where(eq(products.id, id)).returning();

    // Invalidate related caches (old slug + new slug if changed)
    const invalidationKeys = InvalidationKeys.PRODUCTS.onUpdate(id, existingProduct.slug);
    if (updateProductDto.slug && updateProductDto.slug !== existingProduct.slug) {
      invalidationKeys.push(CacheKeys.PRODUCTS.bySlug(updateProductDto.slug));
    }
    await this.cacheService.invalidateMany(invalidationKeys);
    this.logger.debug(`Updated product ${id}, invalidated ${invalidationKeys.length} cache keys`);

    return ApiResponseBuilder.success(updatedProduct, { productId: id }, 'Product updated successfully');
  }
}
