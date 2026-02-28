import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { rabbitmqProvider } from './rabbitmq.provider';
import { RabbitMQService } from './rabbitmq.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [rabbitmqProvider, RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
