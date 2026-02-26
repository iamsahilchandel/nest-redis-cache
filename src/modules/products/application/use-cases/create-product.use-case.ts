import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IProductRepository } from '../../domain/ports/product-repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product-repository.port';
import type { IEventBus } from '../../../../shared/domain/ports/event-bus.port';
import { EVENT_BUS } from '../../../../shared/domain/ports/event-bus.port';
import { EntityConflictException } from '../../../../shared/domain/exceptions';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { CreateProductDto } from '../../presentation/dto/product.dto';
import { ProductCreatedEvent } from '../../domain/events/product.events';
import { Slug } from '../../domain/value-objects/slug.value-object';
import type { ProductEntity } from '../../domain/entities/product.entity';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';
import type { Product } from '../../../../infrastructure/database/schemas/product.schema';

@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(createProductDto: CreateProductDto, sellerId?: number): Promise<ApiResponse<Product>> {
    const { name, slug, images, tags, ...rest } = createProductDto;

    // Generate slug if not provided
    const productSlug = slug || Slug.fromName(name).value;

    // Check if slug already exists
    const slugTaken = await this.productRepo.slugExists(productSlug);
    if (slugTaken) {
      throw new EntityConflictException('Product with this slug already exists');
    }

    const entity = await this.productRepo.create({
      ...rest,
      name,
      slug: productSlug,
      sellerId,
      images: images ? JSON.stringify(images) : null,
      tags: tags ? JSON.stringify(tags) : null,
    });

    // Emit domain event — cache invalidation handled by event handler
    await this.eventBus.publish(
      new ProductCreatedEvent({
        productId: entity.id,
        slug: entity.slug.value,
        sellerId: entity.sellerId,
      }),
    );

    this.logger.debug(`Created product ${entity.id}`);

    // Map back to ORM type for API response compatibility
    const persistenceData = ProductMapper.toPersistence(entity);
    return ApiResponseBuilder.success(
      { ...persistenceData, id: entity.id, createdAt: entity.createdAt } as Product,
      { productId: entity.id },
      'Product created successfully',
    );
  }
}
