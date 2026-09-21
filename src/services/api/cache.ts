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

const hashString = (value: string): string => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16);
};

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

      accumulator[headerName] = SENSITIVE_HEADERS.includes(headerName)
        ? `sha256:${hashString(serializedValue)}`
        : serializedValue;

      return accumulator;
    }, {});
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
  if (!request.headers) {
    return false;
  }

  const headers = normalizeHeaders(request.headers);

  return (
    Object.keys(headers).some((header) => SENSITIVE_HEADERS.includes(header)) ||
    Boolean(request.auth)
  );
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
});

const resolveTtlMs = (
  cacheConfig: MempoolCacheConfig,
  request: MempoolCacheRequest,
): number => {
  if (typeof cacheConfig.ttlMs === 'function') {
    return cacheConfig.ttlMs(request);
  }

  if (typeof cacheConfig.ttlMs === 'number') {
    return cacheConfig.ttlMs;
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
  const maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
  const entries = new Map<string, MempoolCacheEntry>();

  return {
    get: async (key: string) => entries.get(key),
    set: async (key: string, value: MempoolCacheEntry) => {
      if (entries.has(key)) {
        entries.delete(key);
      }

      entries.set(key, value);

      while (entries.size > maxEntries) {
        const oldestKey = entries.keys().next().value;

        if (!oldestKey) {
          break;
        }

        entries.delete(oldestKey);
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
      delete: async () => undefined,
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
        await store.set(cacheKey, {
          expiresAt: Date.now() + ttlMs,
          response: {
            data: response.data,
            headers: response.headers,
            status: response.status,
            statusText: response.statusText,
          },
        });

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
    delete: async (key: string) => {
      inflight.delete(key);
      await store.delete(key);
    },
  };
};
