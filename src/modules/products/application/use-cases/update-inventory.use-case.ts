import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Product } from '@/infrastructure/database/schemas/product.schema';
import { EVENT_BUS, type IEventBus } from '@/shared/domain/ports/event-bus.port';
import { EntityNotFoundException } from '@/shared/domain/exceptions';
import { ApiResponseBuilder, ApiResponse } from '@/shared/helpers/api-response';
import { PRODUCT_REPOSITORY, type IProductRepository } from '../../domain/ports';
import { InventoryUpdatedEvent } from '../../domain/events/product.events';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';

@Injectable()
export class UpdateInventoryUseCase {
  private readonly logger = new Logger(UpdateInventoryUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(id: number, quantity: number): Promise<ApiResponse<Product>> {
    const entity = await this.productRepo.findById(id);
    if (!entity) {
      throw new EntityNotFoundException('Product', id);
    }

    const oldQuantity = entity.quantity;
    entity.updateInventory(quantity);
    const saved = await this.productRepo.save(entity);

    // Emit domain event
    await this.eventBus.publish(
      new InventoryUpdatedEvent({
        productId: id,
        newQuantity: quantity,
        oldQuantity,
      }),
    );

    this.logger.debug(`Updated inventory for product ${id}`);

    const product = ProductMapper.toPersistence(saved);
    return ApiResponseBuilder.success(
      { ...product, id: saved.id, createdAt: saved.createdAt } as Product,
      { productId: id },
      'Inventory updated successfully',
    );
  }
}
