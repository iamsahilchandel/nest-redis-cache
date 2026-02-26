import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IProductRepository } from '../../domain/ports/product-repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product-repository.port';
import type { ICachePort } from '../../../../shared/domain/ports/cache.port';
import { CACHE_PORT } from '../../../../shared/domain/ports/cache.port';
import { EntityNotFoundException } from '../../../../shared/domain/exceptions';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';
import { CacheKeys, CacheTags, CacheTTL } from '../../../cache/cache.keys';
import type { Product } from '../../../../infrastructure/database/schemas/product.schema';

@Injectable()
export class FindOneProductUseCase {
  private readonly logger = new Logger(FindOneProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(CACHE_PORT) private readonly cache: ICachePort,
  ) {}

  async execute(id: number): Promise<ApiResponse<Product>> {
    const cacheKey = CacheKeys.PRODUCTS.byId(id);

    return this.cache.getOrFetch(cacheKey, () => this.fetchFromRepo(id), {
      ttl: CacheTTL.PRODUCT_SINGLE,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCTS],
    });
  }

  private async fetchFromRepo(id: number): Promise<ApiResponse<Product>> {
    this.logger.debug(`Fetching product ${id} via repository...`);

    const entity = await this.productRepo.findById(id);
    if (!entity) {
      throw new EntityNotFoundException('Product', id);
    }

    const product = ProductMapper.toPersistence(entity);
    return ApiResponseBuilder.success(
      { ...product, id: entity.id, createdAt: entity.createdAt } as Product,
      undefined,
      'Product retrieved successfully',
    );
  }
}
