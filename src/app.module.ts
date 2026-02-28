import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { RedisModule } from '@/infrastructure/redis/redis.module';
import { RabbitMQModule } from '@/infrastructure/rabbitmq/rabbitmq.module';
import { EventBusModule } from '@/shared/infrastructure/events/event-bus.module';
import { CommonModule } from '@/shared/common.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { ProductsModule } from '@/modules/products/products.module';
import { CorrelationIdMiddleware } from '@/app/bootstrap/middleware/correlation-id.middleware';
import { HealthController } from '@/app/health/health.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeyGuard } from './app/bootstrap/guards/api-key.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    RedisModule,
    RabbitMQModule,
    EventBusModule,
    CommonModule,
    AuthModule,
    ProductsModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    CorrelationIdMiddleware,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
