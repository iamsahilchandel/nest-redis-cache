import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_BUS, type IEventBus } from '@/shared/domain/ports/event-bus.port';
import { CACHE_PORT, type ICachePort } from '@/shared/domain/ports/cache.port';
import type { DomainEvent } from '@/shared/domain/domain-event';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
  InventoryUpdatedEvent,
} from '../../domain/events/product.events';
import type {
  ProductCreatedPayload,
  ProductUpdatedPayload,
  ProductDeletedPayload,
  InventoryUpdatedPayload,
} from '../../domain/events/product.events';
import { CacheKeys, CacheTags, InvalidationKeys } from '../../../cache/cache.keys';

@Injectable()
export class ProductCacheInvalidationHandler implements OnModuleInit {
  private readonly logger = new Logger(ProductCacheInvalidationHandler.name);

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CACHE_PORT) private readonly cache: ICachePort,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe(ProductCreatedEvent.EVENT_NAME, (event) =>
      this.onProductCreated(event as DomainEvent<ProductCreatedPayload>),
    );
    this.eventBus.subscribe(ProductUpdatedEvent.EVENT_NAME, (event) =>
      this.onProductUpdated(event as DomainEvent<ProductUpdatedPayload>),
    );
    this.eventBus.subscribe(ProductDeletedEvent.EVENT_NAME, (event) =>
      this.onProductDeleted(event as DomainEvent<ProductDeletedPayload>),
    );
    this.eventBus.subscribe(InventoryUpdatedEvent.EVENT_NAME, (event) =>
      this.onInventoryUpdated(event as DomainEvent<InventoryUpdatedPayload>),
    );
  }

  private async onProductCreated(event: DomainEvent<ProductCreatedPayload>): Promise<void> {
    this.logger.debug(`Cache invalidation for product.created (ID: ${event.payload.productId})`);
    await this.cache.invalidateMany(InvalidationKeys.PRODUCTS.onCreate as unknown as string[]);
  }

  private async onProductUpdated(event: DomainEvent<ProductUpdatedPayload>): Promise<void> {
    const { productId, oldSlug, newSlug } = event.payload;
    this.logger.debug(`Cache invalidation for product.updated (ID: ${productId})`);

    const keys = InvalidationKeys.PRODUCTS.onUpdate(productId, oldSlug);
    if (newSlug && newSlug !== oldSlug) {
      keys.push(CacheKeys.PRODUCTS.bySlug(newSlug));
    }
    await this.cache.invalidateMany(keys);
  }

  private async onProductDeleted(event: DomainEvent<ProductDeletedPayload>): Promise<void> {
    const { productId, slug } = event.payload;
    this.logger.debug(`Cache invalidation for product.deleted (ID: ${productId})`);
    await this.cache.invalidateMany(InvalidationKeys.PRODUCTS.onDelete(productId, slug));
  }

  private async onInventoryUpdated(event: DomainEvent<InventoryUpdatedPayload>): Promise<void> {
    const { productId } = event.payload;
    this.logger.debug(`Cache invalidation for product.inventory_updated (ID: ${productId})`);
    await this.cache.invalidateMany(InvalidationKeys.PRODUCTS.onInventoryUpdate(productId));
  }
}
