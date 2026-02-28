import { Injectable, Logger } from '@nestjs/common';
import type { DomainEvent } from '@/shared/domain/domain-event';
import type { IEventBus, EventHandler } from '@/shared/domain/ports/event-bus.port';

@Injectable()
export class InMemoryEventBus implements IEventBus {
  private readonly logger = new Logger(InMemoryEventBus.name);
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
    this.logger.debug(`Subscribed handler to event "${eventName}"`);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? [];

    if (handlers.length === 0) {
      this.logger.debug(`No handlers for event "${event.eventName}"`);
      return;
    }

    this.logger.debug(`Publishing event "${event.eventName}" to ${handlers.length} handler(s)`);

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          `Handler failed for event "${event.eventName}": ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
}
