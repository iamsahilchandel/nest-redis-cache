import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Product } from '@/infrastructure/database/schemas/product.schema';
import { CACHE_PORT, type ICachePort } from '@/shared/domain/ports/cache.port';
import { EntityNotFoundException } from '@/shared/domain/exceptions';
import { ApiResponseBuilder, ApiResponse } from '@/shared/helpers/api-response';
import { PRODUCT_REPOSITORY, type IProductRepository } from '../../domain/ports';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';
import { CacheKeys, CacheTags, CacheTTL } from '../../../cache/cache.keys';

@Injectable()
export class FindBySlugUseCase {
  private readonly logger = new Logger(FindBySlugUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(CACHE_PORT) private readonly cache: ICachePort,
  ) {}

  async execute(slug: string): Promise<ApiResponse<Product>> {
    const cacheKey = CacheKeys.PRODUCTS.bySlug(slug);

    return this.cache.getOrFetch(cacheKey, () => this.fetchFromRepo(slug), {
      ttl: CacheTTL.PRODUCT_SINGLE,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCTS],
    });
  }

  private async fetchFromRepo(slug: string): Promise<ApiResponse<Product>> {
    this.logger.debug(`Fetching product by slug "${slug}" via repository...`);

    const entity = await this.productRepo.findBySlug(slug);
    if (!entity) {
      throw new EntityNotFoundException('Product', slug);
    }

    const product = ProductMapper.toPersistence(entity);
    return ApiResponseBuilder.success(
      { ...product, id: entity.id, createdAt: entity.createdAt } as Product,
      undefined,
      'Product retrieved successfully',
    );
  }
}
