import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, like, gte, lte, desc, asc, sql, SQL } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { products } from '../../../../infrastructure/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { ProductEntity } from '../../domain/entities/product.entity';
import type {
  IProductRepository,
  ProductQueryFilters,
  PaginatedResult,
  CreateProductData,
} from '../../domain/ports/product-repository.port';
import { ProductMapper } from '../mappers/product.mapper';

@Injectable()
export class DrizzleProductRepository implements IProductRepository {
  private readonly logger = new Logger(DrizzleProductRepository.name);

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase) {}

  async findById(id: number): Promise<ProductEntity | null> {
    const [row] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);

    return row ? ProductMapper.toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<ProductEntity | null> {
    const [row] = await this.db.select().from(products).where(eq(products.slug, slug)).limit(1);

    return row ? ProductMapper.toDomain(row) : null;
  }

  async findAll(filters: ProductQueryFilters): Promise<PaginatedResult<ProductEntity>> {
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
    } = filters;

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

    const [rows, countResult] = await Promise.all([
      this.db.select().from(products).where(whereClause).orderBy(orderFn(sortColumn)).limit(limit).offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items: rows.map(ProductMapper.toDomain),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findFeatured(limit: number): Promise<ProductEntity[]> {
    this.logger.debug(`Fetching ${limit} featured products from database...`);

    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.isFeatured, true), eq(products.status, 'active')))
      .orderBy(desc(products.createdAt))
      .limit(limit);

    return rows.map(ProductMapper.toDomain);
  }

  async create(data: CreateProductData): Promise<ProductEntity> {
    const [row] = await this.db.insert(products).values(data).returning();
    return ProductMapper.toDomain(row);
  }

  async save(entity: ProductEntity): Promise<ProductEntity> {
    const persistenceData = ProductMapper.toPersistence(entity);
    const { id, ...updateData } = persistenceData;

    const [row] = await this.db.update(products).set(updateData).where(eq(products.id, entity.id)).returning();

    return ProductMapper.toDomain(row);
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    const conditions: SQL[] = [eq(products.slug, slug)];
    if (excludeId !== undefined) {
      conditions.push(sql`${products.id} != ${excludeId}`);
    }

    const [row] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(...conditions))
      .limit(1);

    return !!row;
  }
}
