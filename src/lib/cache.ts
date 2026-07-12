"use client";

// Simple in-memory cache for client-side optimization
class ResponseCache {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private readonly TTL = 1000 * 60 * 5; // 5 minutes default

  set(key: string, data: unknown, ttl: number = this.TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
    });
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}

export const apiCache = new ResponseCache();

// Cache key generators
export const cacheKeys = {
  files: () => "files:list",
  file: (id: string) => `file:${id}`,
  comments: (fileId: string) => `comments:${fileId}`,
  activity: (fileId: string) => `activity:${fileId}`,
  versions: (fileId: string) => `versions:${fileId}`,
  templates: () => "templates:public",
  myTemplates: () => "templates:mine",
  workspaceMembers: (workspaceId: string) => `workspace:${workspaceId}:members`,
  collaborators: (fileId: string) => `collaborators:${fileId}`,
};

// Fetch wrapper with built-in caching
export async function cachedFetch<T>(
  url: string,
  cacheKey: string,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // Check cache first
  const cached = apiCache.get(cacheKey) as T | null;
  if (cached) {
    return cached;
  }

  // Fetch from API
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = (await response.json()) as T;

  // Cache the result
  apiCache.set(cacheKey, data, ttl);

  return data;
}

// Invalidate related caches
export function invalidateCache(pattern: string) {
  const keys = Array.from(apiCache["cache"].keys());
  keys.forEach((key) => {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  });
}
