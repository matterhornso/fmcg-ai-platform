const cache = new Map<string, { data: any; expires: number }>();

export function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: any, ttlMs: number = 3600000): void {
  // Cap at 100 entries
  if (cache.size >= 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

export function getCacheStats(): { size: number; maxSize: number } {
  return { size: cache.size, maxSize: 100 };
}
