export interface ICachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number, tags?: string[]): Promise<void>;
  delete(key: string): Promise<void>;
  getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { ttl: number; swrGrace?: number; tags?: string[] },
  ): Promise<T>;
  invalidateByTag(tag: string): Promise<number>;
  invalidateMany(keysOrTags: string[]): Promise<void>;
}

export const CACHE_PORT = Symbol('CACHE_PORT');
