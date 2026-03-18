import { describe, it, expect, beforeEach } from 'vitest';
import { getCached, setCache, getCacheStats } from '../cache';

describe('cache', () => {
  beforeEach(() => {
    // Clear cache between tests by setting expired entries
    // (cache module doesn't export a clear function, so we test what we can)
  });

  it('returns null for missing key', () => {
    expect(getCached('nonexistent-key-' + Date.now())).toBeNull();
  });

  it('stores and retrieves a value', () => {
    const key = 'test-key-' + Date.now();
    setCache(key, { data: 'hello' }, 60000);
    expect(getCached(key)).toEqual({ data: 'hello' });
  });

  it('returns null for expired entry', () => {
    const key = 'expired-key-' + Date.now();
    setCache(key, 'old-data', 1); // 1ms TTL
    // Wait for expiry
    const start = Date.now();
    while (Date.now() - start < 10) {} // busy wait 10ms
    expect(getCached(key)).toBeNull();
  });

  it('getCacheStats returns object with size', () => {
    const stats = getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize');
    expect(typeof stats.size).toBe('number');
  });

  it('overwrites existing key', () => {
    const key = 'overwrite-key-' + Date.now();
    setCache(key, 'first', 60000);
    setCache(key, 'second', 60000);
    expect(getCached(key)).toBe('second');
  });
});
