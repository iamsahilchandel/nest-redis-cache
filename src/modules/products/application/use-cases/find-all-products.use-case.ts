import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IProductRepository } from '../../domain/ports/product-repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product-repository.port';
import type { ICachePort } from '../../../../shared/domain/ports/cache.port';
import { CACHE_PORT } from '../../../../shared/domain/ports/cache.port';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { ProductQueryDto } from '../../presentation/dto/product.dto';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';
import { CacheKeys, CacheTags, CacheTTL, hashQuery } from '../../../cache/cache.keys';
import type { Product } from '../../../../infrastructure/database/schemas/product.schema';

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FindAllProductsUseCase {
  private readonly logger = new Logger(FindAllProductsUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(CACHE_PORT) private readonly cache: ICachePort,
  ) {}

  async execute(query: ProductQueryDto): Promise<ApiResponse<PaginatedProducts>> {
    const queryHash = hashQuery(query as Record<string, unknown>);
    const cacheKey = CacheKeys.PRODUCTS.all(queryHash);

    return this.cache.getOrFetch(cacheKey, () => this.fetchFromRepo(query), {
      ttl: CacheTTL.PRODUCTS_LIST,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCTS_LIST, CacheTags.PRODUCTS],
    });
  }

  private async fetchFromRepo(query: ProductQueryDto): Promise<ApiResponse<PaginatedProducts>> {
    this.logger.debug('Fetching products via repository...');

    const result = await this.productRepo.findAll(query);
    const products = result.items.map((entity) => {
      const p = ProductMapper.toPersistence(entity);
      return { ...p, id: entity.id, createdAt: entity.createdAt } as Product;
    });

    return ApiResponseBuilder.success(
      {
        products,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      { resultCount: products.length },
      'Products retrieved successfully',
    );
  }
}
