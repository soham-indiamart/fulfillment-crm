/**
 * A small in-memory cache with a time-to-live. Concurrent callers for the same key share one
 * load (single flight), so a burst of identical requests reaches the database once. Failed loads
 * are not cached. A TTL of 0 disables caching.
 */
export class TtlCache<V> {
  readonly #entries = new Map<string, { value: Promise<V>; expiresAt: number }>();
  readonly #ttlMs: number;
  readonly #maxEntries: number;
  readonly #now: () => number;

  constructor(ttlMs: number, { maxEntries = 500, now = Date.now }: { maxEntries?: number; now?: () => number } = {}) {
    this.#ttlMs = ttlMs;
    this.#maxEntries = maxEntries;
    this.#now = now;
  }

  getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    if (this.#ttlMs <= 0) return load();
    const hit = this.#entries.get(key);
    if (hit && hit.expiresAt > this.#now()) return hit.value;

    const value = load();
    this.#entries.set(key, { value, expiresAt: this.#now() + this.#ttlMs });
    value.catch(() => {
      if (this.#entries.get(key)?.value === value) this.#entries.delete(key);
    });
    if (this.#entries.size > this.#maxEntries) {
      const oldest = this.#entries.keys().next().value;
      if (oldest !== undefined) this.#entries.delete(oldest);
    }
    return value;
  }

  clear(): void {
    this.#entries.clear();
  }
}
