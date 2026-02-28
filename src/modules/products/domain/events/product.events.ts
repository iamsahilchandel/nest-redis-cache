import { BaseDomainEvent } from '@/shared/domain/domain-event';

export interface ProductCreatedPayload {
  productId: number;
  slug: string;
  sellerId?: number | null;
}

export interface ProductUpdatedPayload {
  productId: number;
  oldSlug: string;
  newSlug?: string;
}

export interface ProductDeletedPayload {
  productId: number;
  slug: string;
}

export interface InventoryUpdatedPayload {
  productId: number;
  newQuantity: number;
  oldQuantity: number;
}

export class ProductCreatedEvent extends BaseDomainEvent<ProductCreatedPayload> {
  static readonly EVENT_NAME = 'product.created';
  constructor(payload: ProductCreatedPayload) {
    super(ProductCreatedEvent.EVENT_NAME, payload, payload.productId);
  }
}

export class ProductUpdatedEvent extends BaseDomainEvent<ProductUpdatedPayload> {
  static readonly EVENT_NAME = 'product.updated';
  constructor(payload: ProductUpdatedPayload) {
    super(ProductUpdatedEvent.EVENT_NAME, payload, payload.productId);
  }
}

export class ProductDeletedEvent extends BaseDomainEvent<ProductDeletedPayload> {
  static readonly EVENT_NAME = 'product.deleted';
  constructor(payload: ProductDeletedPayload) {
    super(ProductDeletedEvent.EVENT_NAME, payload, payload.productId);
  }
}

export class InventoryUpdatedEvent extends BaseDomainEvent<InventoryUpdatedPayload> {
  static readonly EVENT_NAME = 'product.inventory_updated';
  constructor(payload: InventoryUpdatedPayload) {
    super(InventoryUpdatedEvent.EVENT_NAME, payload, payload.productId);
  }
}
