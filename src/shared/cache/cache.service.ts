import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../../infra/redis/redis.provider';
import Redis from 'ioredis';

interface CacheEntry<T> {
  value: T;
  cachedAt: number;
  expiresAt: number;
  tags?: string[];
}

interface GetOrFetchOptions {
  ttl: number;
  swrGrace?: number;
  tags?: string[];
}

/**
 * CacheService - Centralized caching with Single Flight, SWR, and Tag-based invalidation
 *
 * Features:
 * - Single Flight: Prevents thundering herd by coalescing concurrent requests
 * - SWR (Stale-While-Revalidate): Returns stale data immediately while revalidating in background
 * - Tag-based invalidation: Group cache entries by tags for bulk invalidation
 * - Prefix-based invalidation: Invalidate all keys matching a prefix
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly TAG_INDEX_PREFIX = 'cache:tags:';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if caching is enabled via environment variable
   */
  isEnabled(): boolean {
    return this.configService.get<string>('CACHE_ENABLED', 'true') === 'true';
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled()) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      const entry: CacheEntry<T> = JSON.parse(data);
      return entry.value;
    } catch (error) {
      this.logger.warn(`Cache get error for key "${key}": ${error}`);
      return null;
    }
  }

  /**
   * Get a value from cache with full metadata (for SWR)
   */
  private async getWithMetadata<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.isEnabled()) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      return JSON.parse(data) as CacheEntry<T>;
    } catch (error) {
      this.logger.warn(`Cache getWithMetadata error for key "${key}": ${error}`);
      return null;
    }
  }

  /**
   * Set a value in cache with optional tags
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - TTL in seconds
   * @param tags - Optional tags for grouped invalidation
   */
  async set<T>(key: string, value: T, ttl: number, tags?: string[]): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const now = Date.now();
      const entry: CacheEntry<T> = {
        value,
        cachedAt: now,
        expiresAt: now + ttl * 1000,
        tags,
      };

      // Set the cache entry with extended TTL for SWR grace period
      // We add extra time so stale data can still be served during SWR
      const extendedTtl = ttl + 120; // Extra 2 minutes for SWR
      await this.redis.setex(key, extendedTtl, JSON.stringify(entry));

      // Register key with tags for tag-based invalidation
      if (tags && tags.length > 0) {
        await this.registerKeyWithTags(key, tags, extendedTtl);
      }

      this.logger.debug(`Cached key "${key}" with TTL ${ttl}s`);
    } catch (error) {
      this.logger.warn(`Cache set error for key "${key}": ${error}`);
    }
  }

  /**
   * Delete a specific key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      await this.redis.del(key);
      this.logger.debug(`Deleted cache key "${key}"`);
    } catch (error) {
      this.logger.warn(`Cache delete error for key "${key}": ${error}`);
    }
  }

  // ===========================================================================
  // SINGLE FLIGHT + SWR: THE MAIN METHOD
  // ===========================================================================

  /**
   * Get from cache or fetch with Single Flight and SWR support
   *
   * Single Flight: If multiple requests hit a cache miss simultaneously,
   * only one will execute the fetch function. Others wait for the same result.
   *
   * SWR: If cache is stale but within grace period, return stale data immediately
   * and revalidate in background.
   *
   * @param key - Cache key
   * @param fetchFn - Function to fetch data if not in cache
   * @param options - TTL, SWR grace period, and tags
   */
  async getOrFetch<T>(key: string, fetchFn: () => Promise<T>, options: GetOrFetchOptions): Promise<T> {
    const { ttl, swrGrace = 0, tags } = options;

    // If caching is disabled, just fetch
    if (!this.isEnabled()) {
      return fetchFn();
    }

    // 1. Check cache with metadata
    const cached = await this.getWithMetadata<T>(key);
    const now = Date.now();

    if (cached) {
      const isStale = now > cached.expiresAt;
      const withinSwrGrace = now < cached.expiresAt + swrGrace * 1000;

      // Fresh cache hit
      if (!isStale) {
        this.logger.debug(`Cache HIT (fresh) for key "${key}"`);
        return cached.value;
      }

      // Stale but within SWR grace - return stale, revalidate in background
      if (isStale && withinSwrGrace) {
        this.logger.debug(`Cache HIT (stale, SWR) for key "${key}"`);
        this.revalidateInBackground(key, fetchFn, options);
        return cached.value;
      }
    }

    // 2. Cache miss - check for in-flight request (Single Flight)
    if (this.inFlight.has(key)) {
      this.logger.debug(`Single Flight: waiting for in-flight request for key "${key}"`);
      return this.inFlight.get(key) as Promise<T>;
    }

    // 3. No cache, no in-flight - fetch and cache
    this.logger.debug(`Cache MISS for key "${key}" - fetching from source`);

    const fetchPromise = this.executeAndCache<T>(key, fetchFn, ttl, tags);
    this.inFlight.set(key, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Execute fetch function and cache the result (only if data is cacheable)
   */
  private async executeAndCache<T>(key: string, fetchFn: () => Promise<T>, ttl: number, tags?: string[]): Promise<T> {
    const data = await fetchFn();

    // Only cache if data is valid (not null, not empty array, not empty object)
    if (this.shouldCache(data)) {
      await this.set(key, data, ttl, tags);
    } else {
      this.logger.debug(`Skipping cache for key "${key}" - empty or null result`);
    }

    return data;
  }

  /**
   * Determine if data should be cached
   * Returns false for null, undefined, empty arrays, or empty data properties
   */
  private shouldCache<T>(data: T): boolean {
    // Don't cache null or undefined
    if (data === null || data === undefined) {
      return false;
    }

    // Don't cache empty arrays
    if (Array.isArray(data) && data.length === 0) {
      return false;
    }

    // Check for API response with empty data
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // If it's an API response, check the data property
      if ('data' in obj) {
        const responseData = obj.data;

        // Empty array in data property
        if (Array.isArray(responseData) && responseData.length === 0) {
          return false;
        }

        // Null data property
        if (responseData === null || responseData === undefined) {
          return false;
        }

        // Check for paginated response with empty products
        if (typeof responseData === 'object' && responseData !== null) {
          const paginatedData = responseData as Record<string, unknown>;
          if (
            'products' in paginatedData &&
            Array.isArray(paginatedData.products) &&
            paginatedData.products.length === 0
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Revalidate cache in background (for SWR)
   */
  private revalidateInBackground<T>(key: string, fetchFn: () => Promise<T>, options: GetOrFetchOptions): void {
    // Don't start another revalidation if one is already in-flight
    if (this.inFlight.has(key)) {
      return;
    }

    const revalidatePromise = this.executeAndCache(key, fetchFn, options.ttl, options.tags);
    this.inFlight.set(key, revalidatePromise);

    revalidatePromise
      .then(() => {
        this.logger.debug(`Background revalidation complete for key "${key}"`);
      })
      .catch((error) => {
        this.logger.warn(`Background revalidation failed for key "${key}": ${error}`);
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
  }

  // ===========================================================================
  // INVALIDATION METHODS
  // ===========================================================================

  /**
   * Invalidate all cache entries with a specific tag
   * @param tag - Tag to invalidate
   * @returns Number of keys invalidated
   */
  async invalidateByTag(tag: string): Promise<number> {
    if (!this.isEnabled()) return 0;

    try {
      const tagIndexKey = `${this.TAG_INDEX_PREFIX}${tag}`;
      const keys = await this.redis.smembers(tagIndexKey);

      if (keys.length === 0) {
        return 0;
      }

      // Delete all keys associated with this tag
      await this.redis.del(...keys);
      // Delete the tag index itself
      await this.redis.del(tagIndexKey);

      this.logger.debug(`Invalidated ${keys.length} keys for tag "${tag}"`);
      return keys.length;
    } catch (error) {
      this.logger.warn(`Cache invalidateByTag error for tag "${tag}": ${error}`);
      return 0;
    }
  }

  /**
   * Invalidate all cache entries matching a prefix pattern
   * @param prefix - Key prefix to match
   * @returns Number of keys invalidated
   */
  async invalidateByPrefix(prefix: string): Promise<number> {
    if (!this.isEnabled()) return 0;

    try {
      const pattern = `${prefix}:*`;
      let cursor = '0';
      let totalDeleted = 0;

      // Use SCAN to find matching keys (production-safe, non-blocking)
      do {
        const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      this.logger.debug(`Invalidated ${totalDeleted} keys with prefix "${prefix}"`);
      return totalDeleted;
    } catch (error) {
      this.logger.warn(`Cache invalidateByPrefix error for prefix "${prefix}": ${error}`);
      return 0;
    }
  }

  /**
   * Invalidate multiple keys/tags at once
   * @param keysOrTags - Array of cache keys or tags to invalidate
   */
  async invalidateMany(keysOrTags: string[]): Promise<void> {
    if (!this.isEnabled() || keysOrTags.length === 0) return;

    const promises: Promise<unknown>[] = [];

    for (const keyOrTag of keysOrTags) {
      if (keyOrTag.startsWith('tag:')) {
        // It's a tag - invalidate by tag
        promises.push(this.invalidateByTag(keyOrTag));
      } else {
        // It's a regular key - delete directly
        promises.push(this.delete(keyOrTag));
      }
    }

    await Promise.all(promises);
    this.logger.debug(`Invalidated ${keysOrTags.length} keys/tags`);
  }

  // ===========================================================================
  // TAG MANAGEMENT (Internal)
  // ===========================================================================

  /**
   * Register a cache key with its associated tags
   */
  private async registerKeyWithTags(key: string, tags: string[], ttl: number): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const tag of tags) {
      const tagIndexKey = `${this.TAG_INDEX_PREFIX}${tag}`;
      pipeline.sadd(tagIndexKey, key);
      pipeline.expire(tagIndexKey, ttl);
    }

    await pipeline.exec();
  }
}
