import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { CacheService } from './cache.service';
import { CacheController } from './presentation/controllers/cache.controller';
import { CACHE_PORT } from '../../shared/domain/ports/cache.port';

/**
 * CacheModule - Provides centralized caching functionality.
 *
 * No longer @Global() — modules that need caching must import this explicitly.
 * Provides both the concrete CacheService and the ICachePort abstraction.
 *
 * Features:
 * - Single Flight pattern (prevents thundering herd)
 * - SWR (Stale-While-Revalidate)
 * - Tag-based cache invalidation
 * - Prefix-based cache invalidation
 * - Admin management API for cache introspection and invalidation
 */
@Module({
  imports: [ConfigModule, RedisModule],
  controllers: [CacheController],
  providers: [
    CacheService,
    {
      provide: CACHE_PORT,
      useExisting: CacheService,
    },
  ],
  exports: [CacheService, CACHE_PORT],
})
export class CacheModule {}
