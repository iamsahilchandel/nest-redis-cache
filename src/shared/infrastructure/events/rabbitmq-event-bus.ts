import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { DomainEvent } from '@/shared/domain/domain-event';
import type { IEventBus, EventHandler } from '@/shared/domain/ports/event-bus.port';
import { RabbitMQService } from '@/infrastructure/rabbitmq/rabbitmq.service';
import { EXCHANGES } from '@/infrastructure/rabbitmq/rabbitmq.constants';

/**
 * RabbitMQ-backed event bus adapter.
 *
 * - `publish()` sends domain events to the `domain_events` topic exchange
 *   using `event.eventName` as the routing key.
 *
 * - `subscribe()` registers an in-process handler that can be invoked by
 *   consumers (see `ProductNotificationConsumer` for the consumer pattern).
 *
 * This adapter complements (not replaces) the InMemoryEventBus — both can
 * coexist. The InMemoryEventBus handles synchronous, in-process events
 * (e.g. cache invalidation), while this adapter handles durable, cross-service
 * async communication via RabbitMQ.
 */
@Injectable()
export class RabbitMQEventBus implements IEventBus, OnModuleInit {
  private readonly logger = new Logger(RabbitMQEventBus.name);
  private readonly handlers = new Map<string, EventHandler[]>();

  constructor(private readonly rabbitmqService: RabbitMQService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('RabbitMQ Event Bus initialized');
  }

  async publish(event: DomainEvent): Promise<void> {
    try {
      await this.rabbitmqService.publish(EXCHANGES.DOMAIN_EVENTS, event.eventName, {
        eventName: event.eventName,
        occurredOn: event.occurredOn.toISOString(),
        aggregateId: event.aggregateId,
        payload: event.payload,
      });
      this.logger.debug(`Published event to RabbitMQ: ${event.eventName}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish event "${event.eventName}" to RabbitMQ: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
    this.logger.debug(`Subscribed handler to RabbitMQ event "${eventName}"`);
  }

  /**
   * Route a consumed message to locally registered handlers.
   * Called by queue consumers (e.g. `ProductNotificationConsumer`).
   */
  async routeToHandlers(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          `Handler failed for RabbitMQ event "${event.eventName}": ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
}
