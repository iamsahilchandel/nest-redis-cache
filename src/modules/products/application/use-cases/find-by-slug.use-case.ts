import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { products, Product } from '../../../../infrastructure/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { CacheService } from '../../../cache/cache.service';
import { CacheKeys, CacheTags, CacheTTL } from '../../../cache/cache.keys';

@Injectable()
export class FindBySlugUseCase {
  private readonly logger = new Logger(FindBySlugUseCase.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async execute(slug: string): Promise<ApiResponse<Product>> {
    const cacheKey = CacheKeys.PRODUCTS.bySlug(slug);

    return this.cacheService.getOrFetch(cacheKey, () => this.fetchFromDb(slug), {
      ttl: CacheTTL.PRODUCT_SINGLE,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCTS],
    });
  }

  private async fetchFromDb(slug: string): Promise<ApiResponse<Product>> {
    this.logger.debug(`Fetching product by slug "${slug}" from database...`);

    const [product] = await this.db.select().from(products).where(eq(products.slug, slug)).limit(1);

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return ApiResponseBuilder.success(product, undefined, 'Product retrieved successfully');
  }
}
