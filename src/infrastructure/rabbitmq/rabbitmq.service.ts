import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import type { ConsumeMessage } from 'amqplib';
import { RABBITMQ_CONNECTION, EXCHANGES, QUEUES, ROUTING_KEYS } from './rabbitmq.constants';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private channel: ChannelWrapper;

  constructor(@Inject(RABBITMQ_CONNECTION) private readonly connection: AmqpConnectionManager) {}

  async onModuleInit(): Promise<void> {
    this.channel = this.connection.createChannel({
      json: true,
      setup: async (ch: import('amqplib').ConfirmChannel) => {
        // Assert the topic exchange for domain events
        await ch.assertExchange(EXCHANGES.DOMAIN_EVENTS, 'topic', { durable: true });

        // Assert the product notifications queue
        await ch.assertQueue(QUEUES.PRODUCT_NOTIFICATIONS, {
          durable: true,
          arguments: {
            'x-message-ttl': 86_400_000, // 24h TTL
          },
        });

        // Bind queue to exchange with routing key pattern
        await ch.bindQueue(QUEUES.PRODUCT_NOTIFICATIONS, EXCHANGES.DOMAIN_EVENTS, ROUTING_KEYS.PRODUCT_ALL);

        this.logger.log(
          `Exchange "${EXCHANGES.DOMAIN_EVENTS}", queue "${QUEUES.PRODUCT_NOTIFICATIONS}" asserted & bound`,
        );
      },
    });

    await this.channel.waitForConnect();
    this.logger.log('RabbitMQ channel established');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      this.logger.warn(`Error closing RabbitMQ: ${error instanceof Error ? error.message : error}`);
    }
  }

  // ─── Publish ──────────────────────────────────────────────────────

  async publish(exchange: string, routingKey: string, message: unknown): Promise<void> {
    try {
      await this.channel.publish(exchange, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });
      this.logger.debug(`Published to ${exchange}/${routingKey}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish to ${exchange}/${routingKey}: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  // ─── Consume ──────────────────────────────────────────────────────

  async consume(
    queue: string,
    onMessage: (msg: ConsumeMessage, content: unknown) => Promise<void> | void,
  ): Promise<void> {
    await this.channel.addSetup(async (ch: import('amqplib').ConfirmChannel) => {
      await ch.consume(
        queue,
        async (msg) => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString());
            await onMessage(msg, content);
            ch.ack(msg);
          } catch (error) {
            this.logger.error(
              `Error processing message from "${queue}": ${error instanceof Error ? error.message : error}`,
            );
            // Reject and don't requeue to avoid infinite loops
            ch.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.logger.log(`Consumer attached to queue "${queue}"`);
    });
  }

  // ─── Health ───────────────────────────────────────────────────────

  isConnected(): boolean {
    return this.connection?.isConnected() ?? false;
  }
}
