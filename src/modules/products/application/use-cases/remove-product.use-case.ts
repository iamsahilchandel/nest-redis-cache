import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IProductRepository } from '../../domain/ports/product-repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product-repository.port';
import type { IEventBus } from '../../../../shared/domain/ports/event-bus.port';
import { EVENT_BUS } from '../../../../shared/domain/ports/event-bus.port';
import { EntityNotFoundException } from '../../../../shared/domain/exceptions';
import { ApiResponseBuilder, ApiResponse } from '../../../../shared/helpers/api-response';
import { ProductDeletedEvent } from '../../domain/events/product.events';

@Injectable()
export class RemoveProductUseCase {
  private readonly logger = new Logger(RemoveProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(id: number): Promise<ApiResponse<{ message: string }>> {
    const entity = await this.productRepo.findById(id);
    if (!entity) {
      throw new EntityNotFoundException('Product', id);
    }

    const slug = entity.slug.value;
    await this.productRepo.delete(id);

    // Emit domain event
    await this.eventBus.publish(new ProductDeletedEvent({ productId: id, slug }));

    this.logger.debug(`Deleted product ${id}`);

    return ApiResponseBuilder.success({ message: 'Product deleted successfully' }, { productId: id });
  }
}
