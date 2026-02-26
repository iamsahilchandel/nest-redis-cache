import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { products } from '../../../../infrastructure/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { CacheService } from '../../../cache/cache.service';
import { InvalidationKeys } from '../../../cache/cache.keys';

@Injectable()
export class RemoveProductUseCase {
  private readonly logger = new Logger(RemoveProductUseCase.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async execute(id: number): Promise<ApiResponse<{ message: string }>> {
    const [existingProduct] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.db.delete(products).where(eq(products.id, id));

    // Invalidate related caches
    await this.cacheService.invalidateMany(InvalidationKeys.PRODUCTS.onDelete(id, existingProduct.slug));
    this.logger.debug(`Deleted product ${id}, invalidated cache`);

    return ApiResponseBuilder.success({ message: 'Product deleted successfully' }, { productId: id });
  }
}
