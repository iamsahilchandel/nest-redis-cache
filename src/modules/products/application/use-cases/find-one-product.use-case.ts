import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { products, Product } from '../../../../infrastructure/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { CacheService } from '../../../cache/cache.service';
import { CacheKeys, CacheTags, CacheTTL } from '../../../cache/cache.keys';

@Injectable()
export class FindOneProductUseCase {
  private readonly logger = new Logger(FindOneProductUseCase.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async execute(id: number): Promise<ApiResponse<Product>> {
    const cacheKey = CacheKeys.PRODUCTS.byId(id);

    return this.cacheService.getOrFetch(cacheKey, () => this.fetchFromDb(id), {
      ttl: CacheTTL.PRODUCT_SINGLE,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCTS],
    });
  }

  private async fetchFromDb(id: number): Promise<ApiResponse<Product>> {
    this.logger.debug(`Fetching product ${id} from database...`);

    const [product] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return ApiResponseBuilder.success(product, undefined, 'Product retrieved successfully');
  }
}
