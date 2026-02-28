import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_BUS, type IEventBus } from '@/shared/domain/ports/event-bus.port';
import type { DomainEvent } from '@/shared/domain/domain-event';
import { RabbitMQEventBus } from './rabbitmq-event-bus';

/**
 * Bridges the InMemoryEventBus → RabbitMQEventBus.
 *
 * Subscribes to all product domain events on the in-memory bus and forwards
 * them to RabbitMQ for durable, async processing. This avoids modifying any
 * existing use case code — events are still published to InMemoryEventBus
 * as before, and this forwarder replicates them into RabbitMQ.
 */
@Injectable()
export class RabbitMQEventForwarder implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQEventForwarder.name);

  /** Event name patterns to forward to RabbitMQ */
  private static readonly FORWARDED_EVENTS = [
    'product.created',
    'product.updated',
    'product.deleted',
    'product.inventory_updated',
  ];

  constructor(
    @Inject(EVENT_BUS) private readonly inMemoryBus: IEventBus,
    private readonly rabbitmqBus: RabbitMQEventBus,
  ) {}

  onModuleInit(): void {
    for (const eventName of RabbitMQEventForwarder.FORWARDED_EVENTS) {
      this.inMemoryBus.subscribe(eventName, (event: DomainEvent) => this.forward(event));
    }
    this.logger.log(`Forwarding ${RabbitMQEventForwarder.FORWARDED_EVENTS.length} event type(s) to RabbitMQ`);
  }

  private async forward(event: DomainEvent): Promise<void> {
    try {
      await this.rabbitmqBus.publish(event);
    } catch (error) {
      this.logger.error(
        `Failed to forward event "${event.eventName}" to RabbitMQ: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
