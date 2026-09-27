import axios, {
  AxiosAdapter,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import {
  MempoolCacheConfig,
  MempoolCacheController,
  MempoolCacheEntry,
  MempoolCacheRequest,
  MempoolCacheStore,
  MempoolMemoryCacheStoreOptions,
} from '../../interfaces/cache';

const DEFAULT_TTL_MS = 30000;
const DEFAULT_MAX_ENTRIES = 100;
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'proxy-authorization',
  'set-cookie',
  'x-api-key',
];

const createKeyValuePairs = (
  value: unknown,
  prefix = '',
): Array<[string, string]> => {
  if (value === undefined || value === null) {
    return [];
  }

  if (value instanceof Date) {
    return [[prefix, value.toISOString()]];
  }

  if (value instanceof URLSearchParams) {
    const pairs: Array<[string, string]> = [];

    value.forEach((item, key) => {
      pairs.push([key, item]);
    });

    return pairs;
  }

  if (Array.isArray(value)) {
    return value.reduce<Array<[string, string]>>((pairs, item) => {
      return pairs.concat(
        createKeyValuePairs(item, prefix ? `${prefix}[]` : '[]'),
      );
    }, []);
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Array<[string, string]>>((pairs, key) => {
        return pairs.concat(
          createKeyValuePairs(
            (value as Record<string, unknown>)[key],
            prefix ? `${prefix}.${key}` : key,
          ),
        );
      }, []);
  }

  return [[prefix, String(value)]];
};

const normalizeHeaders = (
  headers: AxiosRequestConfig['headers'],
): Record<string, string> => {
  if (!headers) {
    return {};
  }

  let normalizedHeaders: Record<string, unknown> = {};

  if (typeof (headers as { toJSON?: () => unknown }).toJSON === 'function') {
    normalizedHeaders = (
      headers as { toJSON: () => Record<string, unknown> }
    ).toJSON();
  } else {
    normalizedHeaders = headers as Record<string, unknown>;
  }

  return Object.keys(normalizedHeaders)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, string>>((accumulator, key) => {
      const value = normalizedHeaders[key];

      if (value === undefined || value === null) {
        return accumulator;
      }

      const headerName = key.toLowerCase();
      const serializedValue = Array.isArray(value)
        ? value.join(',')
        : String(value);

      if (SENSITIVE_HEADERS.includes(headerName)) {
        return accumulator;
      }

      accumulator[headerName] = serializedValue;

      return accumulator;
    }, {});
};

const hasSensitiveHeaders = (
  headers: AxiosRequestConfig['headers'],
): boolean => {
  if (!headers) {
    return false;
  }

  let normalizedHeaders: Record<string, unknown> = {};

  if (typeof (headers as { toJSON?: () => unknown }).toJSON === 'function') {
    normalizedHeaders = (
      headers as { toJSON: () => Record<string, unknown> }
    ).toJSON();
  } else {
    normalizedHeaders = headers as Record<string, unknown>;
  }

  return Object.keys(normalizedHeaders).some((headerName) =>
    SENSITIVE_HEADERS.includes(headerName.toLowerCase()),
  );
};

const normalizeUrl = (request: MempoolCacheRequest): string => {
  const baseURL = request.baseURL || 'http://localhost';
  const url = new URL(request.url || '', baseURL);

  createKeyValuePairs(request.params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const entries: Array<[string, string]> = [];

  url.searchParams.forEach((value, key) => {
    entries.push([key, value]);
  });

  entries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (leftKey === rightKey) {
      return leftValue.localeCompare(rightValue);
    }

    return leftKey.localeCompare(rightKey);
  });

  url.search = '';
  entries.forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  return `${url.origin}${url.pathname}${url.search}`;
};

const toCacheRequest = (config: AxiosRequestConfig): MempoolCacheRequest => ({
  method: config.method,
  baseURL: config.baseURL,
  url: config.url,
  params: config.params,
  auth: config.auth,
  headers: config.headers,
  responseType: config.responseType,
});

const isAuthorizedRequest = (request: MempoolCacheRequest): boolean => {
  return hasSensitiveHeaders(request.headers) || Boolean(request.auth);
};

const createCacheKey = (
  request: MempoolCacheRequest,
  keyPrefix?: string,
): string => {
  const method = (request.method || 'get').toUpperCase();
  const responseType = request.responseType || 'json';
  const headers = normalizeHeaders(request.headers);

  return JSON.stringify({
    keyPrefix: keyPrefix || '',
    baseURL: request.baseURL || '',
    method,
    responseType,
    url: normalizeUrl(request),
    headers,
  });
};

const cloneResponse = <T = unknown>(
  cached: MempoolCacheEntry,
  config: InternalAxiosRequestConfig,
): AxiosResponse<T> => ({
  data: cached.response.data as T,
  headers: { ...(cached.response.headers || {}) },
  status: cached.response.status,
  statusText: cached.response.statusText,
  config,
  request: cached.response.request,
});

const resolveTtlMs = (
  cacheConfig: MempoolCacheConfig,
  request: MempoolCacheRequest,
): number => {
  if (typeof cacheConfig.ttlMs === 'function') {
    return cacheConfig.ttlMs(request);
  }

  if (typeof cacheConfig.ttlMs === 'number') {
    return Number.isFinite(cacheConfig.ttlMs)
      ? cacheConfig.ttlMs
      : DEFAULT_TTL_MS;
  }

  return DEFAULT_TTL_MS;
};

const shouldCacheRequest = (
  cacheConfig: MempoolCacheConfig,
  request: MempoolCacheRequest,
): boolean => {
  const method = (request.method || 'get').toLowerCase();

  if (method !== 'get' || request.responseType === 'stream') {
    return false;
  }

  const isAuthorized = isAuthorizedRequest(request);

  if (
    isAuthorized &&
    (!cacheConfig.store || cacheConfig.allowAuthorizedRequests !== true)
  ) {
    return false;
  }

  if (cacheConfig.shouldCache) {
    return cacheConfig.shouldCache(request);
  }

  return true;
};

export const createMemoryCacheStore = (
  options: MempoolMemoryCacheStoreOptions = {},
): MempoolCacheStore => {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const entries = new Map<string, MempoolCacheEntry>();

  return {
    get: async (key: string) => entries.get(key),
    set: async (key: string, value: MempoolCacheEntry) => {
      if (entries.has(key)) {
        entries.delete(key);
      }

      entries.set(key, value);

      while (entries.size > maxEntries) {
        const oldestEntry = entries.keys().next();

        if (oldestEntry.done) {
          break;
        }

        entries.delete(oldestEntry.value);
      }
    },
    delete: async (key: string) => {
      entries.delete(key);
    },
    clear: async () => {
      entries.clear();
    },
  };
};

export const applyCache = (
  api: AxiosInstance,
  cacheConfig?: MempoolCacheConfig,
): MempoolCacheController => {
  if (!cacheConfig || cacheConfig.enabled !== true) {
    return {
      clear: async () => undefined,
    };
  }

  const store =
    cacheConfig.store ||
    createMemoryCacheStore({ maxEntries: cacheConfig.maxEntries });
  const inflight = new Map<string, Promise<AxiosResponse>>();
  const baseAdapter = (
    axios as unknown as {
      getAdapter: (adapter: unknown) => AxiosAdapter;
      defaults: { adapter: unknown };
    }
  ).getAdapter(api.defaults.adapter || axios.defaults.adapter);

  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const request = toCacheRequest(config);

    if (!shouldCacheRequest(cacheConfig, request)) {
      return baseAdapter(config);
    }

    const ttlMs = resolveTtlMs(cacheConfig, request);

    if (ttlMs <= 0) {
      return baseAdapter(config);
    }

    const cacheKey = createCacheKey(request, cacheConfig.keyPrefix);
    const cached = await store.get(cacheKey);

    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cloneResponse(cached, config);
      }

      await store.delete(cacheKey);
    }

    const existingRequest = inflight.get(cacheKey);

    if (existingRequest) {
      return existingRequest;
    }

    const pendingRequest = baseAdapter(config)
      .then(async (response) => {
        try {
          await store.set(cacheKey, {
            expiresAt: Date.now() + ttlMs,
            response: {
              data: response.data,
              headers: response.headers,
              status: response.status,
              statusText: response.statusText,
              request: response.request,
            },
          });
        } catch (_error) {
          // Ignore cache-write failures so successful network responses still resolve.
        }

        return response;
      })
      .finally(() => {
        inflight.delete(cacheKey);
      });

    inflight.set(cacheKey, pendingRequest);
    return pendingRequest;
  };

  return {
    clear: async () => {
      inflight.clear();
      await store.clear();
    },
  };
};
