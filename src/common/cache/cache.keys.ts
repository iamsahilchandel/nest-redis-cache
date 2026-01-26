/**
 * Cache Keys, Tags, TTL, and Invalidation Configuration
 *
 * This file centralizes all cache-related constants for organized
 * cache management and invalidation strategies.
 */

// =============================================================================
// TTL DEFAULTS (in seconds)
// =============================================================================

export const CacheTTL = {
  PRODUCTS_LIST: 60,
  PRODUCT_SINGLE: 300,
  PRODUCTS_FEATURED: 120,
  SWR_GRACE: 60,
} as const;

export type CacheTTLKey = keyof typeof CacheTTL;

// =============================================================================
// CACHE TAGS - for grouped invalidation
// =============================================================================

export const CacheTags = {
  PRODUCTS: 'tag:products',
  PRODUCTS_LIST: 'tag:products:list',
  PRODUCT_FEATURED: 'tag:products:featured',
} as const;

export type CacheTagKey = keyof typeof CacheTags;

// =============================================================================
// CACHE KEYS - with generators for dynamic keys
// =============================================================================

export const CacheKeys = {
  PRODUCTS: {
    prefix: 'products',
    all: (queryHash: string) => `products:all:${queryHash}`,
    byId: (id: number) => `products:id:${id}`,
    bySlug: (slug: string) => `products:slug:${slug}`,
    featured: (limit: number) => `products:featured:${limit}`,
  },
} as const;

export type CacheKey = ReturnType<typeof CacheKeys.PRODUCTS.all>;

// =============================================================================
// INVALIDATION KEYS - define what to invalidate on each write operation
// =============================================================================

export const InvalidationKeys = {
  PRODUCTS: {
    /**
     * Keys to invalidate when a new product is created
     * - All list caches (new product appears in lists)
     * - Featured products (might affect featured)
     */
    onCreate: [CacheTags.PRODUCTS_LIST, CacheTags.PRODUCT_FEATURED],

    /**
     * Keys to invalidate when a product is updated
     * @param id - Product ID
     * @param slug - Product slug (optional, for slug changes)
     */
    onUpdate: (id: number, slug?: string): string[] =>
      [
        CacheKeys.PRODUCTS.byId(id),
        slug ? CacheKeys.PRODUCTS.bySlug(slug) : null,
        CacheTags.PRODUCTS_LIST,
        CacheTags.PRODUCT_FEATURED,
      ].filter((key): key is string => key !== null),

    /**
     * Keys to invalidate when a product is deleted
     * @param id - Product ID
     * @param slug - Product slug
     */
    onDelete: (id: number, slug?: string): string[] =>
      [
        CacheKeys.PRODUCTS.byId(id),
        slug ? CacheKeys.PRODUCTS.bySlug(slug) : null,
        CacheTags.PRODUCTS_LIST,
        CacheTags.PRODUCT_FEATURED,
      ].filter((key): key is string => key !== null),

    /**
     * Keys to invalidate when product inventory is updated
     * @param id - Product ID
     */
    onInventoryUpdate: (id: number): string[] => [CacheKeys.PRODUCTS.byId(id), CacheTags.PRODUCTS_LIST],
  },
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a hash from query parameters for cache key
 * @param query - Query object to hash
 */
export function hashQuery(query: Record<string, unknown>): string {
  const sorted = Object.keys(query)
    .sort()
    .reduce(
      (acc, key) => {
        if (query[key] !== undefined && query[key] !== null) {
          acc[key] = query[key];
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );

  return Buffer.from(JSON.stringify(sorted)).toString('base64url');
}
