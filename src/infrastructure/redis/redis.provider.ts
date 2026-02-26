import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const logger = new Logger('Redis');

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: async (configService: ConfigService): Promise<Redis> => {
    const host = configService.get<string>('REDIS_HOST', 'localhost');
    const port = configService.get<number>('REDIS_PORT', 6379);
    const password = configService.get<string>('REDIS_PASSWORD');
    const db = configService.get<number>('REDIS_DB', 0);

    logger.log('🔄 Attempting to connect to Redis...');

    try {
      const client = new Redis({
        host,
        port,
        password: password || undefined,
        db,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.error('❌ Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        lazyConnect: false,
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        client.on('connect', () => {
          logger.log('✅ Successfully connected to Redis');
          logger.log(`📊 Redis connection: ${host}:${port}, db=${db}`);
          resolve();
        });
        client.on('error', (err) => {
          logger.error(`❌ Redis connection error: ${err.message}`);
          reject(err);
        });
      });

      return client;
    } catch (error) {
      logger.error('❌ Failed to connect to Redis');
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
  inject: [ConfigService],
};
