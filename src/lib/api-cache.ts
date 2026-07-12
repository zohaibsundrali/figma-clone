// Simple in-memory cache with TTL for API responses
const cache = new Map<string, { data: unknown; expireAt: number }>();

export function setCacheWithTTL(key: string, data: unknown, ttlSeconds: number = 60) {
  const expireAt = Date.now() + ttlSeconds * 1000;
  cache.set(key, { data, expireAt });
}

export function getCacheIfValid(key: string): unknown | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expireAt) {
    cache.delete(key);
    return null;
  }
  return cached.data;
}

export function clearCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export function getCacheKey(userId: string, type: string): string {
  return `${userId}:${type}`;
}
