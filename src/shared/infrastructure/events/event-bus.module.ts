import { Module, Global } from '@nestjs/common';
import { EVENT_BUS } from '@/shared/domain/ports/event-bus.port';
import { InMemoryEventBus } from './in-memory-event-bus';
import { RabbitMQEventBus } from './rabbitmq-event-bus';
import { RabbitMQEventForwarder } from './rabbitmq-event-forwarder';

@Global()
@Module({
  providers: [
    {
      provide: EVENT_BUS,
      useClass: InMemoryEventBus,
    },
    RabbitMQEventBus,
    RabbitMQEventForwarder,
  ],
  exports: [EVENT_BUS, RabbitMQEventBus],
})
export class EventBusModule {}
