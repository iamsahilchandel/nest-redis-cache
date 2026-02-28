import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@/infrastructure/rabbitmq/rabbitmq.service';
import { QUEUES } from '@/infrastructure/rabbitmq/rabbitmq.constants';

interface DomainEventMessage {
  eventName: string;
  occurredOn: string;
  aggregateId?: string | number;
  payload: Record<string, unknown>;
}

/**
 * Demo consumer: listens to the `product_notifications` queue and logs
 * every product domain event received from RabbitMQ.
 *
 * In a real application, this is where you'd send emails, push
 * notifications, trigger webhooks, update search indices, etc.
 */
@Injectable()
export class ProductNotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(ProductNotificationConsumer.name);

  constructor(private readonly rabbitmqService: RabbitMQService) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmqService.consume(QUEUES.PRODUCT_NOTIFICATIONS, async (_msg, content) => {
      const event = content as DomainEventMessage;

      this.logger.log(
        `📬 Received "${event.eventName}" | ` +
          `AggregateId: ${event.aggregateId ?? 'N/A'} | ` +
          `Occurred: ${event.occurredOn}`,
      );
      this.logger.debug(`   Payload: ${JSON.stringify(event.payload)}`);

      // ── Simulate downstream actions ──────────────────────────────
      switch (event.eventName) {
        case 'product.created':
          this.logger.log(`🆕 New product notification — would send welcome email / index in search`);
          break;
        case 'product.updated':
          this.logger.log(`✏️  Product updated notification — would sync to external catalog`);
          break;
        case 'product.deleted':
          this.logger.log(`🗑️  Product deleted notification — would clean up external references`);
          break;
        case 'product.inventory_updated':
          this.logger.log(`📦 Inventory changed notification — would alert warehouse system`);
          break;
        default:
          this.logger.log(`❓ Unhandled event type: ${event.eventName}`);
      }
    });

    this.logger.log(`Listening for product events on queue "${QUEUES.PRODUCT_NOTIFICATIONS}"`);
  }
}
