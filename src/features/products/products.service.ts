import { Injectable, Inject, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { eq, and, like, gte, lte, desc, asc, sql, SQL } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../core/database/database.provider';
import { products, Product, NewProduct } from '../../core/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../common/api-response';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import { CacheService } from '../../common/cache/cache.service';
import { CacheKeys, CacheTags, CacheTTL, InvalidationKeys, hashQuery } from '../../common/cache/cache.keys';

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async create(createProductDto: CreateProductDto, sellerId?: number): Promise<ApiResponse<Product>> {
    const { name, slug, images, tags, ...rest } = createProductDto;

    // Generate slug if not provided
    const productSlug = slug || this.generateSlug(name);

    // Check if slug already exists
    const existingProduct = await this.db.select().from(products).where(eq(products.slug, productSlug)).limit(1);

    if (existingProduct.length > 0) {
      throw new ConflictException('Product with this slug already exists');
    }

    const newProduct: NewProduct = {
      ...rest,
      name,
      slug: productSlug,
      sellerId,
      images: images ? JSON.stringify(images) : null,
      tags: tags ? JSON.stringify(tags) : null,
    };

    const [createdProduct] = await this.db.insert(products).values(newProduct).returning();

    // Invalidate related caches
    await this.cacheService.invalidateMany(InvalidationKeys.PRODUCTS.onCreate as unknown as string[]);
    this.logger.debug(`Created product ${createdProduct.id}, invalidated list caches`);

    return ApiResponseBuilder.success(createdProduct, { productId: createdProduct.id }, 'Product created successfully');
  }

  async findAll(query: ProductQueryDto): Promise<ApiResponse<PaginatedProducts>> {
    const queryHash = hashQuery(query as Record<string, unknown>);
    const cacheKey = CacheKeys.PRODUCTS.all(queryHash);

    return this.cacheService.getOrFetch(cacheKey, () => this.fetchAllFromDb(query), {
      ttl: CacheTTL.PRODUCTS_LIST,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCTS_LIST, CacheTags.PRODUCTS],
    });
  }

  private async fetchAllFromDb(query: ProductQueryDto): Promise<ApiResponse<PaginatedProducts>> {
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

    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }

    if (status) {
      conditions.push(eq(products.status, status));
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (brandId) {
      conditions.push(eq(products.brandId, brandId));
    }

    if (sellerId) {
      conditions.push(eq(products.sellerId, sellerId));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(products.price, String(minPrice)));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(products.price, String(maxPrice)));
    }

    if (isFeatured !== undefined) {
      conditions.push(eq(products.isFeatured, isFeatured));
    }

    // Build sort
    const sortColumn =
      {
        name: products.name,
        price: products.price,
        createdAt: products.createdAt,
        quantity: products.quantity,
      }[sortBy] || products.createdAt;

    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Execute queries
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

    const paginatedData: PaginatedProducts = {
      products: productList,
      total,
      page,
      limit,
      totalPages,
    };

    return ApiResponseBuilder.success(
      paginatedData,
      { resultCount: productList.length },
      'Products retrieved successfully',
    );
  }

  async findOne(id: number): Promise<ApiResponse<Product>> {
    const cacheKey = CacheKeys.PRODUCTS.byId(id);

    return this.cacheService.getOrFetch(cacheKey, () => this.fetchOneFromDb(id), {
      ttl: CacheTTL.PRODUCT_SINGLE,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCTS],
    });
  }

  private async fetchOneFromDb(id: number): Promise<ApiResponse<Product>> {
    this.logger.debug(`Fetching product ${id} from database...`);

    const [product] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return ApiResponseBuilder.success(product, undefined, 'Product retrieved successfully');
  }

  async findBySlug(slug: string): Promise<ApiResponse<Product>> {
    const cacheKey = CacheKeys.PRODUCTS.bySlug(slug);

    return this.cacheService.getOrFetch(cacheKey, () => this.fetchBySlugFromDb(slug), {
      ttl: CacheTTL.PRODUCT_SINGLE,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCTS],
    });
  }

  private async fetchBySlugFromDb(slug: string): Promise<ApiResponse<Product>> {
    this.logger.debug(`Fetching product by slug "${slug}" from database...`);

    const [product] = await this.db.select().from(products).where(eq(products.slug, slug)).limit(1);

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return ApiResponseBuilder.success(product, undefined, 'Product retrieved successfully');
  }

  async getFeatured(limit: number = 10): Promise<ApiResponse<Product[]>> {
    const cacheKey = CacheKeys.PRODUCTS.featured(limit);

    return this.cacheService.getOrFetch(cacheKey, () => this.fetchFeaturedFromDb(limit), {
      ttl: CacheTTL.PRODUCTS_FEATURED,
      swrGrace: CacheTTL.SWR_GRACE,
      tags: [CacheTags.PRODUCT_FEATURED, CacheTags.PRODUCTS],
    });
  }

  private async fetchFeaturedFromDb(limit: number): Promise<ApiResponse<Product[]>> {
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

  async update(id: number, updateProductDto: UpdateProductDto): Promise<ApiResponse<Product>> {
    const [existingProduct] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check slug uniqueness if updating slug
    if (updateProductDto.slug && updateProductDto.slug !== existingProduct.slug) {
      const [duplicateSlug] = await this.db
        .select()
        .from(products)
        .where(eq(products.slug, updateProductDto.slug))
        .limit(1);

      if (duplicateSlug) {
        throw new ConflictException('Product with this slug already exists');
      }
    }

    const { images, tags, ...rest } = updateProductDto;

    const updateData: Partial<NewProduct> = {
      ...rest,
      updatedAt: new Date(),
    };

    if (images !== undefined) {
      updateData.images = JSON.stringify(images);
    }

    if (tags !== undefined) {
      updateData.tags = JSON.stringify(tags);
    }

    const [updatedProduct] = await this.db.update(products).set(updateData).where(eq(products.id, id)).returning();

    // Invalidate related caches (old slug + new slug if changed)
    const invalidationKeys = InvalidationKeys.PRODUCTS.onUpdate(id, existingProduct.slug);
    if (updateProductDto.slug && updateProductDto.slug !== existingProduct.slug) {
      invalidationKeys.push(CacheKeys.PRODUCTS.bySlug(updateProductDto.slug));
    }
    await this.cacheService.invalidateMany(invalidationKeys);
    this.logger.debug(`Updated product ${id}, invalidated ${invalidationKeys.length} cache keys`);

    return ApiResponseBuilder.success(updatedProduct, { productId: id }, 'Product updated successfully');
  }

  async updateInventory(id: number, quantity: number): Promise<ApiResponse<Product>> {
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

  async remove(id: number): Promise<ApiResponse<{ message: string }>> {
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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
