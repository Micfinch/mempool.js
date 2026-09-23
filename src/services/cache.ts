export interface CacheStore<T = unknown> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

export interface RequestCacheOptions {
  enabled?: boolean;
  ttl?: number;
  maxSize?: number;
  store?: CacheStore<CacheEntry<unknown>>;
}

export interface RequestCache {
  readonly enabled: boolean;
  readonly ttl: number;
  get<T>(key: string): CacheEntry<T> | undefined;
  set<T>(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
  getRequestKey(method: string, url: string, config?: Record<string, unknown>): string;
  wrap<T>(method: string, url: string, config: Record<string, unknown> | undefined, request: () => Promise<T>): Promise<T>;
}

export class MemoryCacheStore implements CacheStore<CacheEntry<unknown>> {
  private readonly values = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<unknown> | undefined {
    const entry = this.values.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, value: CacheEntry<unknown>): void {
    this.values.set(key, value);

    if (this.values.size > this.maxSize) {
      const oldestKey = this.values.keys().next().value as string | undefined;
      if (oldestKey) {
        this.values.delete(oldestKey);
      }
    }
  }

  delete(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }

  has(key: string): boolean {
    return this.values.has(key);
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sortedObjectKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortedObjectKeys);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = sortedObjectKeys(value[key]);
      return result;
    }, {} as Record<string, unknown>);
};

const stableStringify = (value: unknown): string => {
  try {
    return JSON.stringify(sortedObjectKeys(value));
  } catch (error) {
    return String(value);
  }
};

export const shouldSkipCache = (
  method: string,
  url: string,
  config?: Record<string, unknown>
): boolean => {
  const safeMethod = method.toLowerCase();
  if (!['get', 'head'].includes(safeMethod)) {
    return true;
  }

  if (typeof url !== 'string' || url.length === 0) {
    return true;
  }

  if (config && typeof config === 'object') {
    const cacheSetting = (config as { cache?: unknown }).cache;
    if (cacheSetting === false) {
      return true;
    }

    const headers = (config as { headers?: Record<string, unknown> }).headers;
    if (headers && isPlainObject(headers)) {
      const values = Object.keys(headers).map((key) => key.toLowerCase());
      const authHeader = values.some((key) => key === 'authorization' || key === 'cookie' || key === 'x-api-key');
      if (authHeader) {
        return true;
      }
    }
  }

  return false;
};

export const createRequestCache = ({
  enabled = false,
  ttl = 30_000,
  maxSize = 500,
  store,
}: RequestCacheOptions = {}): RequestCache => {
  const cacheStore = store ?? new MemoryCacheStore(maxSize);
  const pending = new Map<string, Promise<unknown>>();

  const get = <T>(key: string): CacheEntry<T> | undefined => {
    return cacheStore.get(key) as CacheEntry<T> | undefined;
  };

  const set = <T>(key: string, value: T, ttlMs = ttl): void => {
    cacheStore.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  };

  const clear = (): void => {
    cacheStore.clear();
    pending.clear();
  };

  const getRequestKey = (
    method: string,
    url: string,
    config: Record<string, unknown> = {}
  ): string => {
    const normalized = {
      method: method.toUpperCase(),
      url,
      params: sortedObjectKeys((config as { params?: unknown }).params),
      data: sortedObjectKeys((config as { data?: unknown }).data),
      headers: sortedObjectKeys((config as { headers?: unknown }).headers),
    };

    return stableStringify(normalized);
  };

  const wrap = async <T>(
    method: string,
    url: string,
    config: Record<string, unknown> | undefined,
    request: () => Promise<T>
  ): Promise<T> => {
    if (!enabled || shouldSkipCache(method, url, config)) {
      return request();
    }

    const key = getRequestKey(method, url, config ?? {});
    const existingEntry = get<T>(key);
    if (existingEntry) {
      return existingEntry.value;
    }

    const inFlight = pending.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const resultPromise = request()
      .then((value) => {
        set(key, value, ttl);
        return value;
      })
      .catch((error) => {
        cacheStore.delete(key);
        throw error;
      })
      .finally(() => {
        pending.delete(key);
      });

    pending.set(key, resultPromise);
    return resultPromise;
  };

  return {
    get enabled() {
      return enabled;
    },
    get ttl() {
      return ttl;
    },
    get,
    set,
    delete: (key: string) => cacheStore.delete(key),
    clear,
    getRequestKey,
    wrap,
  };
};

export default createRequestCache;
