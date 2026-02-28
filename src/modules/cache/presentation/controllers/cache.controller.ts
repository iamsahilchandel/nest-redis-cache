import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CacheService } from '../../cache.service';
import {
  InvalidateKeyDtoSchema,
  InvalidateTagDtoSchema,
  InvalidatePrefixDtoSchema,
  InvalidateManyDtoSchema,
  InvalidateKeyDtoSwagger,
  InvalidateTagDtoSwagger,
  InvalidatePrefixDtoSwagger,
  InvalidateManyDtoSwagger,
  ListKeysQuerySwagger,
} from '../dto/cache.dto';
import type { InvalidateKeyDto, InvalidateTagDto, InvalidatePrefixDto, InvalidateManyDto } from '../dto/cache.dto';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/presentation/guards/roles.guard';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';

@ApiTags('cache')
@Controller({ version: '1', path: 'cache' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT-auth')
export class CacheController {
  private readonly logger = new Logger(CacheController.name);

  constructor(private readonly cacheService: CacheService) {}

  // ===========================================================================
  // READ / INTROSPECTION ENDPOINTS
  // ===========================================================================

  @Get('stats')
  @ApiOperation({
    summary: 'Get cache statistics',
    description:
      'Returns Redis server stats including total keys, memory usage, uptime, hit rate, and in-flight requests.',
  })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getStats() {
    this.logger.log('Cache stats requested');
    const stats = await this.cacheService.getStats();
    return {
      success: true,
      data: stats,
      message: 'Cache statistics retrieved',
    };
  }

  @Get('keys')
  @ApiOperation({
    summary: 'List cached keys',
    description: 'Lists all cache keys matching a pattern. Uses Redis SCAN for production safety (non-blocking).',
  })
  @ApiQuery({ type: ListKeysQuerySwagger })
  @ApiResponse({ status: 200, description: 'Keys listed successfully' })
  async listKeys(@Query('pattern') pattern?: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const searchPattern = pattern || '*';
    this.logger.log(`Listing cache keys with pattern: "${searchPattern}", limit: ${limitNum}`);

    const keys = await this.cacheService.listKeys(searchPattern, limitNum);
    return {
      success: true,
      data: {
        pattern: searchPattern,
        count: keys.length,
        keys,
      },
      message: `Found ${keys.length} cache keys`,
    };
  }

  @Get('tags')
  @ApiOperation({
    summary: 'List all cache tags',
    description: 'List all registered cache tags and the keys associated with each tag.',
  })
  @ApiResponse({ status: 200, description: 'Tags listed successfully' })
  async listTags() {
    this.logger.log('Listing cache tags');
    const tags = await this.cacheService.listTags();
    return {
      success: true,
      data: {
        totalTags: tags.length,
        tags,
      },
      message: `Found ${tags.length} cache tags`,
    };
  }

  @Get('inspect/:key')
  @ApiOperation({
    summary: 'Inspect a cache entry',
    description: 'Get full metadata for a specific cache key including value, TTL, staleness, tags, and size.',
  })
  @ApiParam({
    name: 'key',
    description: 'Cache key to inspect',
    example: 'products:id:1',
  })
  @ApiResponse({ status: 200, description: 'Cache entry details retrieved' })
  async inspectKey(@Param('key') key: string) {
    this.logger.log(`Inspecting cache key: "${key}"`);
    const entry = await this.cacheService.inspectKey(key);
    return {
      success: true,
      data: entry,
      message: entry.exists ? `Cache entry found for "${key}"` : `No cache entry found for "${key}"`,
    };
  }

  // ===========================================================================
  // INVALIDATION ENDPOINTS
  // ===========================================================================

  @Delete('key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invalidate a specific cache key',
    description: 'Delete a single cache entry by its exact key.',
  })
  @ApiBody({ type: InvalidateKeyDtoSwagger })
  @ApiResponse({ status: 200, description: 'Key invalidated successfully' })
  async invalidateKey(@Body(new ZodValidationPipe(InvalidateKeyDtoSchema)) dto: InvalidateKeyDto) {
    this.logger.log(`Invalidating cache key: "${dto.key}"`);
    await this.cacheService.delete(dto.key);
    return {
      success: true,
      data: { key: dto.key, invalidated: true },
      message: `Cache key "${dto.key}" invalidated`,
    };
  }

  @Delete('tag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invalidate by tag',
    description:
      'Delete all cache entries associated with a specific tag. This is useful for bulk invalidation of related entries.',
  })
  @ApiBody({ type: InvalidateTagDtoSwagger })
  @ApiResponse({ status: 200, description: 'Tag invalidated successfully' })
  async invalidateTag(@Body(new ZodValidationPipe(InvalidateTagDtoSchema)) dto: InvalidateTagDto) {
    this.logger.log(`Invalidating cache tag: "${dto.tag}"`);
    const count = await this.cacheService.invalidateByTag(dto.tag);
    return {
      success: true,
      data: { tag: dto.tag, keysInvalidated: count },
      message: `Invalidated ${count} keys for tag "${dto.tag}"`,
    };
  }

  @Delete('prefix')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invalidate by prefix',
    description:
      'Delete all cache entries whose keys match a prefix pattern (e.g., "products" removes all "products:*" keys).',
  })
  @ApiBody({ type: InvalidatePrefixDtoSwagger })
  @ApiResponse({ status: 200, description: 'Prefix invalidated successfully' })
  async invalidateByPrefix(
    @Body(new ZodValidationPipe(InvalidatePrefixDtoSchema))
    dto: InvalidatePrefixDto,
  ) {
    this.logger.log(`Invalidating cache prefix: "${dto.prefix}"`);
    const count = await this.cacheService.invalidateByPrefix(dto.prefix);
    return {
      success: true,
      data: { prefix: dto.prefix, keysInvalidated: count },
      message: `Invalidated ${count} keys with prefix "${dto.prefix}"`,
    };
  }

  @Delete('many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invalidate multiple keys/tags',
    description:
      'Invalidate multiple cache keys or tags in a single request. Keys starting with "tag:" are treated as tag invalidations.',
  })
  @ApiBody({ type: InvalidateManyDtoSwagger })
  @ApiResponse({
    status: 200,
    description: 'Keys/tags invalidated successfully',
  })
  async invalidateMany(
    @Body(new ZodValidationPipe(InvalidateManyDtoSchema))
    dto: InvalidateManyDto,
  ) {
    this.logger.log(`Invalidating ${dto.keys.length} cache keys/tags`);
    await this.cacheService.invalidateMany(dto.keys);
    return {
      success: true,
      data: { count: dto.keys.length, keys: dto.keys },
      message: `Invalidated ${dto.keys.length} keys/tags`,
    };
  }

  // ===========================================================================
  // DANGER ZONE
  // ===========================================================================

  @Post('flush')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Flush all cache entries',
    description:
      '⚠️ DANGER: Removes ALL cache entries from the current Redis database. Use with extreme caution in production.',
  })
  @ApiResponse({ status: 200, description: 'Cache flushed successfully' })
  async flushAll() {
    this.logger.warn('Cache flush requested - this will clear ALL cached data');
    const result = await this.cacheService.flushAll();
    return {
      success: true,
      data: result,
      message: result.flushed
        ? `Flushed ${result.keysRemoved} cache entries`
        : 'Cache flush failed or caching is disabled',
    };
  }
}
