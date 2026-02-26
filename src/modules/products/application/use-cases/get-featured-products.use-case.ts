import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IProductRepository } from '../../domain/ports/product-repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product-repository.port';
import type { ICachePort } from '../../../../shared/domain/ports/cache.port';
import { CACHE_PORT } from '../../../../shared/domain/ports/cache.port';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';
import { CacheKeys, CacheTags, CacheTTL } from '../../../cache/cache.keys';
import type { Product } from '../../../../infrastructure/database/schemas/product.schema';

@Injectable()
export class GetFeaturedProductsUseCase {
  private readonly logger = new Logger(GetFeaturedProductsUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(CACHE_PORT) private readonly cache: ICachePort,
  ) {}

  async execute(limit: number = 10): Promise<ApiResponse<Product[]>> {
    const cacheKey = CacheKeys.PRODUCTS.featured(limit);

    return this.cache.getOrFetch(cacheKey, () => this.fetchFromRepo(limit), {
      ttl: CacheTTL.PRODUCTS_FEATURED,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCT_FEATURED, CacheTags.PRODUCTS],
    });
  }

  private async fetchFromRepo(limit: number): Promise<ApiResponse<Product[]>> {
    this.logger.debug(`Fetching ${limit} featured products via repository...`);

    const entities = await this.productRepo.findFeatured(limit);
    const products = entities.map((entity) => {
      const p = ProductMapper.toPersistence(entity);
      return { ...p, id: entity.id, createdAt: entity.createdAt } as Product;
    });

    return ApiResponseBuilder.success(products, { count: products.length }, 'Featured products retrieved');
  }
}
