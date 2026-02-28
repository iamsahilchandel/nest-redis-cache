import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Product } from '@/infrastructure/database/schemas/product.schema';
import { EVENT_BUS, type IEventBus } from '@/shared/domain/ports/event-bus.port';
import { EntityNotFoundException, EntityConflictException } from '@/shared/domain/exceptions';
import { ApiResponseBuilder, ApiResponse } from '@/shared/helpers/api-response';
import { PRODUCT_REPOSITORY, type IProductRepository } from '../../domain/ports';
import { UpdateProductDto } from '../../presentation/dto/product.dto';
import { ProductUpdatedEvent } from '../../domain/events/product.events';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';
import { Money, Slug } from '../../domain/value-objects';

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(id: number, updateProductDto: UpdateProductDto): Promise<ApiResponse<Product>> {
    const entity = await this.productRepo.findById(id);
    if (!entity) {
      throw new EntityNotFoundException('Product', id);
    }

    const oldSlug = entity.slug.value;

    // Check slug uniqueness if updating slug
    if (updateProductDto.slug && updateProductDto.slug !== oldSlug) {
      const slugTaken = await this.productRepo.slugExists(updateProductDto.slug, id);
      if (slugTaken) {
        throw new EntityConflictException('Product with this slug already exists');
      }
    }

    // Build domain update
    const { images, tags, price, compareAtPrice, costPrice, slug, ...rest } = updateProductDto;

    const updates: Record<string, unknown> = { ...rest };

    if (price !== undefined) updates.price = new Money(String(price));
    if (compareAtPrice !== undefined)
      updates.compareAtPrice = compareAtPrice ? new Money(String(compareAtPrice)) : null;
    if (costPrice !== undefined) updates.costPrice = costPrice ? new Money(String(costPrice)) : null;
    if (slug !== undefined) updates.slug = new Slug(slug);
    if (images !== undefined) updates.images = JSON.stringify(images);
    if (tags !== undefined) updates.tags = JSON.stringify(tags);

    entity.updateDetails(updates);
    const saved = await this.productRepo.save(entity);

    // Emit domain event
    await this.eventBus.publish(
      new ProductUpdatedEvent({
        productId: id,
        oldSlug,
        newSlug: updateProductDto.slug !== oldSlug ? updateProductDto.slug : undefined,
      }),
    );

    this.logger.debug(`Updated product ${id}`);

    const product = ProductMapper.toPersistence(saved);
    return ApiResponseBuilder.success(
      { ...product, id: saved.id, createdAt: saved.createdAt } as Product,
      { productId: id },
      'Product updated successfully',
    );
  }
}
