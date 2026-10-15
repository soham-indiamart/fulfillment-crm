import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from '../src/lib/ttl-cache.js';

describe('TtlCache', () => {
  it('shares one load between concurrent callers and reuses it until it expires', async () => {
    let now = 0;
    const cache = new TtlCache<number>(1_000, { now: () => now });
    const load = vi.fn(async () => 42);

    const [a, b] = await Promise.all([cache.getOrLoad('k', load), cache.getOrLoad('k', load)]);
    expect([a, b]).toEqual([42, 42]);
    expect(load).toHaveBeenCalledTimes(1);

    now = 999;
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(1);

    now = 1_000;
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not keep failed loads', async () => {
    const cache = new TtlCache<number>(1_000);
    await expect(cache.getOrLoad('k', () => Promise.reject(new Error('down')))).rejects.toThrow('down');
    await expect(cache.getOrLoad('k', async () => 7)).resolves.toBe(7);
  });

  it('is a pass-through with a TTL of 0', async () => {
    const cache = new TtlCache<number>(0);
    const load = vi.fn(async () => 1);
    await cache.getOrLoad('k', load);
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('evicts the oldest entry beyond its size limit', async () => {
    const cache = new TtlCache<string>(1_000, { maxEntries: 2 });
    const load = vi.fn(async () => 'v');
    await cache.getOrLoad('a', load);
    await cache.getOrLoad('b', load);
    await cache.getOrLoad('c', load);
    await cache.getOrLoad('a', load);
    expect(load).toHaveBeenCalledTimes(4);
  });
});
