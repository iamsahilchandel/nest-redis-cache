import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../core/redis/redis.module';
import { CacheService } from './cache.service';

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
 */
@Global()
@Module({
  imports: [ConfigModule, RedisModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
