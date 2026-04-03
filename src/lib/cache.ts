import NodeCache from 'node-cache';
import { injectable } from 'tsyringe';
import { CACHE_TTL_SECONDS, CACHE_CHECK_PERIOD } from '../constants/cache.js';

export interface ICacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  del(key: string): void;
  invalidateByPrefix(prefix: string): void;
  flush(): void;
}

@injectable()
export class NodeCacheService implements ICacheService {
  private readonly cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: CACHE_TTL_SECONDS,
      checkperiod: CACHE_CHECK_PERIOD,
      useClones: false,
    });
  }

  get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      if (value === undefined) return undefined;
      if (typeof value !== 'object' || value === null) {
        this.cache.del(key);
        return undefined;
      }
      return value;
    } catch {
      this.cache.del(key);
      return undefined;
    }
  }

  set<T>(key: string, value: T, ttl?: number): void {
    try {
      this.cache.set(key, value, ttl ?? CACHE_TTL_SECONDS);
    } catch {
      // Cache writes are best-effort — DB is source of truth
    }
  }

  del(key: string): void {
    this.cache.del(key);
  }

  invalidateByPrefix(prefix: string): void {
    const keys = this.cache.keys().filter((k) => k.startsWith(prefix));
    if (keys.length > 0) this.cache.del(keys);
  }

  flush(): void {
    this.cache.flushAll();
  }
}
