import { Injectable, Inject, Logger, ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { products, Product, NewProduct } from '../../../../infrastructure/database/schemas/product.schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { CreateProductDto } from '../../presentation/dto/product.dto';
import { CacheService } from '../../../cache/cache.service';
import { InvalidationKeys } from '../../../cache/cache.keys';

@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async execute(createProductDto: CreateProductDto, sellerId?: number): Promise<ApiResponse<Product>> {
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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
