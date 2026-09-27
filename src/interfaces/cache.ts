import { AxiosRequestConfig, AxiosResponse } from 'axios';

type MaybePromise<T> = T | Promise<T>;

export interface MempoolCacheRequest {
  method?: string;
  baseURL?: string;
  url?: string;
  params?: unknown;
  auth?: AxiosRequestConfig['auth'];
  headers?: AxiosRequestConfig['headers'];
  responseType?: AxiosRequestConfig['responseType'];
}

export interface MempoolCacheEntry {
  expiresAt: number;
  response: Pick<
    AxiosResponse,
    'data' | 'headers' | 'status' | 'statusText' | 'request'
  >;
}

export interface MempoolCacheStore {
  get: (key: string) => MaybePromise<MempoolCacheEntry | undefined>;
  set: (key: string, value: MempoolCacheEntry) => MaybePromise<void>;
  delete: (key: string) => MaybePromise<void>;
  clear: () => MaybePromise<void>;
}

export interface MempoolMemoryCacheStoreOptions {
  maxEntries?: number;
}

export interface MempoolCacheConfig {
  enabled?: boolean;
  ttlMs?: number | ((request: MempoolCacheRequest) => number);
  store?: MempoolCacheStore;
  maxEntries?: number;
  keyPrefix?: string;
  allowAuthorizedRequests?: boolean;
  shouldCache?: (request: MempoolCacheRequest) => boolean;
}

export interface MempoolCacheController {
  clear: () => Promise<void>;
}
