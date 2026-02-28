import { Controller, Get, Inject, Logger, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.provider';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type Redis from 'ioredis';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

/**
 * HealthController - Liveness and readiness probes.
 *
 * - /health/live  → Is the process alive?
 * - /health/ready → Are DB and Redis connections healthy?
 */
@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe - checks DB and Redis connectivity' })
  @ApiResponse({ status: 200, description: 'All dependencies are healthy' })
  @ApiResponse({ status: 503, description: 'One or more dependencies are unhealthy' })
  async ready() {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // Check PostgreSQL
    const dbStart = Date.now();
    try {
      await this.db.execute(sql`SELECT 1`);
      checks.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        latencyMs: Date.now() - dbStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      await this.redis.ping();
      checks.redis = { status: 'healthy', latencyMs: Date.now() - redisStart };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        latencyMs: Date.now() - redisStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    return {
      status: allHealthy ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
