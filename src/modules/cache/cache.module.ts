import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { CacheService } from './cache.service';
import { CacheController } from './presentation/controllers/cache.controller';

/**
 * CacheModule - Provides centralized caching functionality
 *
 * This module is marked as @Global so CacheService is available
 * throughout the application without explicit imports.
 *
 * Features:
 * - Single Flight pattern (prevents thundering herd)
 * - SWR (Stale-While-Revalidate)
 * - Tag-based cache invalidation
 * - Prefix-based cache invalidation
 * - Admin management API for cache introspection and invalidation
 */
@Global()
@Module({
  imports: [ConfigModule, RedisModule],
  controllers: [CacheController],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
