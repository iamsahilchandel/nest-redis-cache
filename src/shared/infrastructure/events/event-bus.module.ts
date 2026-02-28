import { Module, Global } from '@nestjs/common';
import { EVENT_BUS } from '@/shared/domain/ports/event-bus.port';
import { InMemoryEventBus } from './in-memory-event-bus';

@Global()
@Module({
  providers: [
    {
      provide: EVENT_BUS,
      useClass: InMemoryEventBus,
    },
  ],
  exports: [EVENT_BUS],
})
export class EventBusModule {}
