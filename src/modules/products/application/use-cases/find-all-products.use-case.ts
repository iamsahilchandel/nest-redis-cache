import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, like, gte, lte, desc, asc, sql, SQL } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { products, Product } from '../../../../infrastructure/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { ProductQueryDto } from '../../presentation/dto/product.dto';
import { CacheService } from '../../../cache/cache.service';
import { CacheKeys, CacheTags, CacheTTL, hashQuery } from '../../../cache/cache.keys';

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
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: ProductQueryDto): Promise<ApiResponse<PaginatedProducts>> {
    const queryHash = hashQuery(query as Record<string, unknown>);
    const cacheKey = CacheKeys.PRODUCTS.all(queryHash);

    return this.cacheService.getOrFetch(cacheKey, () => this.fetchFromDb(query), {
      ttl: CacheTTL.PRODUCTS_LIST,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCTS_LIST, CacheTags.PRODUCTS],
    });
  }

  private async fetchFromDb(query: ProductQueryDto): Promise<ApiResponse<PaginatedProducts>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      categoryId,
      brandId,
      sellerId,
      minPrice,
      maxPrice,
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];

    if (search) conditions.push(like(products.name, `%${search}%`));
    if (status) conditions.push(eq(products.status, status));
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (brandId) conditions.push(eq(products.brandId, brandId));
    if (sellerId) conditions.push(eq(products.sellerId, sellerId));
    if (minPrice !== undefined) conditions.push(gte(products.price, String(minPrice)));
    if (maxPrice !== undefined) conditions.push(lte(products.price, String(maxPrice)));
    if (isFeatured !== undefined) conditions.push(eq(products.isFeatured, isFeatured));

    const sortColumn =
      {
        name: products.name,
        price: products.price,
        createdAt: products.createdAt,
        quantity: products.quantity,
      }[sortBy] || products.createdAt;

    const orderFn = sortOrder === 'asc' ? asc : desc;
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    this.logger.debug('Fetching products from database...');

    const [productList, countResult] = await Promise.all([
      this.db.select().from(products).where(whereClause).orderBy(orderFn(sortColumn)).limit(limit).offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return ApiResponseBuilder.success(
      { products: productList, total, page, limit, totalPages },
      { resultCount: productList.length },
      'Products retrieved successfully',
    );
  }
}
