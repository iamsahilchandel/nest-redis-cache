import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { products, Product } from '../../../../infrastructure/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { CacheService } from '../../../cache/cache.service';
import { CacheKeys, CacheTags, CacheTTL } from '../../../cache/cache.keys';

@Injectable()
export class GetFeaturedProductsUseCase {
  private readonly logger = new Logger(GetFeaturedProductsUseCase.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async execute(limit: number = 10): Promise<ApiResponse<Product[]>> {
    const cacheKey = CacheKeys.PRODUCTS.featured(limit);

    return this.cacheService.getOrFetch(cacheKey, () => this.fetchFromDb(limit), {
      ttl: CacheTTL.PRODUCTS_FEATURED,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCT_FEATURED, CacheTags.PRODUCTS],
    });
  }

  private async fetchFromDb(limit: number): Promise<ApiResponse<Product[]>> {
    this.logger.debug(`Fetching ${limit} featured products from database...`);

    const featuredProducts = await this.db
      .select()
      .from(products)
      .where(and(eq(products.isFeatured, true), eq(products.status, 'active')))
      .orderBy(desc(products.createdAt))
      .limit(limit);

    return ApiResponseBuilder.success(
      featuredProducts,
      { count: featuredProducts.length },
      'Featured products retrieved',
    );
  }
}
