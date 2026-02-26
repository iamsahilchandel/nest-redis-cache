import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { products, Product } from '../../../../infrastructure/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { CacheService } from '../../../cache/cache.service';
import { InvalidationKeys } from '../../../cache/cache.keys';

@Injectable()
export class UpdateInventoryUseCase {
  private readonly logger = new Logger(UpdateInventoryUseCase.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async execute(id: number, quantity: number): Promise<ApiResponse<Product>> {
    const [existingProduct] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const [updatedProduct] = await this.db
      .update(products)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    // Invalidate related caches
    await this.cacheService.invalidateMany(InvalidationKeys.PRODUCTS.onInventoryUpdate(id));
    this.logger.debug(`Updated inventory for product ${id}, invalidated cache`);

    return ApiResponseBuilder.success(updatedProduct, { productId: id }, 'Inventory updated successfully');
  }
}
