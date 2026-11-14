interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: string;
}

class ServerCacheManager {
  private store = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private rateWindow = new Map<string, { count: number; resetAt: number }>();

  get<T>(key: string): { value: T; createdAt: string } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return { value: entry.value as T, createdAt: entry.createdAt };
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: new Date().toISOString(),
    });
  }

  checkRateLimit(bucketKey: string, maxRequests = 30, windowMs = 60_000): boolean {
    const now = Date.now();
    const existing = this.rateWindow.get(bucketKey);
    if (!existing || now > existing.resetAt) {
      this.rateWindow.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (existing.count >= maxRequests) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  async fetchWithDedupeAndRetry<T>(
    cacheKey: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
    retries = 2
  ): Promise<{ data: T; fromCache: boolean; fetchedAt: string }> {
    const cached = this.get<T>(cacheKey);
    if (cached) {
      return { data: cached.value, fromCache: true, fetchedAt: cached.createdAt };
    }

    const existingPromise = this.inFlight.get(cacheKey) as Promise<T> | undefined;
    if (existingPromise) {
      const data = await existingPromise;
      return { data, fromCache: true, fetchedAt: new Date().toISOString() };
    }

    const runWithRetry = async (): Promise<T> => {
      let lastError: unknown;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await fetcher();
          this.set(cacheKey, result, ttlMs);
          return result;
        } catch (err) {
          lastError = err;
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          }
        }
      }
      throw lastError;
    };

    const promise = runWithRetry().finally(() => {
      this.inFlight.delete(cacheKey);
    });

    this.inFlight.set(cacheKey, promise);
    const data = await promise;
    return { data, fromCache: false, fetchedAt: new Date().toISOString() };
  }
}

export const serverCache = new ServerCacheManager();
