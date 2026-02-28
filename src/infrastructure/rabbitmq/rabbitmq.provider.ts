import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { RABBITMQ_CONNECTION } from './rabbitmq.constants';

export const rabbitmqProvider = {
  provide: RABBITMQ_CONNECTION,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): amqp.AmqpConnectionManager => {
    const logger = new Logger('RabbitMQProvider');
    const url = configService.get<string | undefined>('RABBITMQ_URL');

    if (!url) {
      throw new Error(
        'RabbitMQ connection string is not configured. Make sure to set the RABBITMQ_URL environment variable',
      );
    }

    const connection = amqp.connect([url], {
      heartbeatIntervalInSeconds: 15,
      reconnectTimeInSeconds: 5,
    });

    connection.on('connect', () => {
      logger.log('✅ RabbitMQ connected');
    });

    connection.on('disconnect', ({ err }) => {
      logger.warn(`⚠️  RabbitMQ disconnected: ${err?.message ?? 'unknown reason'}`);
    });

    connection.on('connectFailed', ({ err }) => {
      logger.error(`❌ RabbitMQ connection failed: ${err?.message ?? 'unknown error'}`);
    });

    return connection;
  },
};
