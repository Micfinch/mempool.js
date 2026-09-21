# Mempool JS API

[![npm version](https://img.shields.io/npm/v/@mempool/mempool.js.svg?style=flat-square)](https://www.npmjs.org/package/@mempool/mempool.js)
[![NPM](https://img.shields.io/david/mempool/mempool.js.svg?style=flat-square)](https://david-dm.org/mempool/mempool.js#info=dependencies)
[![Known Vulnerabilities](https://snyk.io/test/github/mempool/mempool.js/badge.svg?style=flat-square)](https://snyk.io/test/github/mempool/mempool.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

NPM package module for Mempool APIs.

Documentation: [https://mempool.space/api](https://mempool.space/api)

---

## **Installation**

### **ES Modules**

Install the npm module.

```bash
# npm
$ npm install @mempool/mempool.js --save

# yarn
$ yarn add @mempool/mempool.js
```

Or if you're not into package management, just [download a ZIP](https://github.com/mempool/mempool.js/archive/refs/heads/main.zip) file.

Import the module.

```js
import mempoolJS from '@mempool/mempool.js';

// default mempool.space endpointsconst { bitcoin, liquid } = mempoolJS();

// (optional) your custom endpoints
const { bitcoin } = mempoolJS({
  protocol: 'https', // optional, defaults to http for localhost, otherwise https
  hostname: 'mempool.space',
  network: 'testnet' // 'signet' | 'testnet' | 'mainnet',
  config: { // optional axios request config to add to requests
    headers: {
      authorization: 'Basic auth'
    }
  }
});

// Liquid API
const { liquid } = mempoolJS({
  protocol: 'https', // optional, defaults to http for localhost, otherwise https
  hostname: 'liquid.network',
  network: 'liquid' // 'liquid' | 'liquidtestnet'
});
```

### **Opt-in request caching**

Caching is disabled by default. When enabled, the client caches only `GET` requests, deduplicates concurrent cache misses for the same normalized request key, respects TTL expiry, and exposes `cache.clear()` for manual invalidation.

```js
const client = mempoolJS({
  hostname: 'mempool.space',
  cache: {
    enabled: true,
    ttlMs: 30000, // 30 seconds
    maxEntries: 100, // default bounded in-memory store size
  },
});

const tx = await client.bitcoin.transactions.getTx({ txid: '...' });
await client.cache.clear();
```

To use a custom or isolated store, pass your own store implementation or reuse the built-in bounded memory store factory:

```js
const privateStore = mempoolJS.createMemoryCacheStore({ maxEntries: 50 });

const client = mempoolJS({
  hostname: 'mempool.space',
  config: {
    headers: {
      authorization: '******',
    },
  },
  cache: {
    enabled: true,
    ttlMs: (request) => (request.url?.includes('/tx/') ? 60000 : 5000),
    store: privateStore,
    allowAuthorizedRequests: true,
    shouldCache: (request) => request.url !== '/fees/recommended',
  },
});
```

Recommended starting TTLs:

- Confirmed transaction or block lookups: `30s` to `5m`
- Address, stats, and Lightning summaries: `5s` to `30s`
- Mempool state, fees, and tips: `1s` to `5s`, or disable caching if you need the freshest view

Security and behavior notes:

- Requests are **not cached** unless `cache.enabled` is `true`.
- `POST` and other non-`GET` requests are never cached.
- Errors are never cached.
- Requests carrying `authorization`, `cookie`, `proxy-authorization`, `set-cookie`, or `x-api-key` headers are skipped unless you explicitly provide a custom store and set `allowAuthorizedRequests: true`.
- The default store is per-client-instance, in-memory, and bounded; use a custom store if you need cross-instance persistence.
- Cached responses are reused client-side only. This package does not add server-side Redis, CDN, or HTTP cache headers.

### **CommonJS**

Include the line below in the `head` tag of your html file.

```html
<script type="text/javascript" src="https://mempool.space/mempool.js"></script>
```

Call `mempoolJS()` function to access the API methods.

```js
// default mempool.space endpoints
const { bitcoin } = mempoolJS();

// (optional) your custom endpoints
const { bitcoin } = mempoolJS({
  protocol: 'https', // optional, defaults to http for localhost, otherwise https
  hostname: 'mempool.space',
  network: 'testnet', // 'signet' | 'testnet' | 'mainnet'
});

// Liquid API
const { liquid } = mempoolJS({
  protocol: 'https', // optional, defaults to http for localhost, otherwise https
  hostname: 'liquid.network',
  network: 'liquid', // 'liquid' | 'liquidtestnet'
});
```

---

## **Features**

- [Bitcoin](./README-bitcoin.md)
  - [Addresses](./README-bitcoin.md#get-address)
  - [Blocks](./README-bitcoin.md#get-blocks)
  - [Difficulty Adjustment](./README-bitcoin.md#get-difficulty-adjustment)
  - [Fees](./README-bitcoin.md#get-fees)
  - [Lightning](./README-bitcoin.md#get-network-stats)
  - [Mempool](./README-bitcoin.md#get-mempool)
  - [Transactions](./README-bitcoin.md#get-transactions)
  - [Websocket](./README-bitcoin.md#init-websocket)
- [Liquid](./README-liquid.md#get-address)
  - [Addresses](./README-liquid.md#get-address)
  - [Assets](./README-liquid.md#get-address)
  - [Blocks](./README-liquid.md#get-address)
  - [Fees](./README-liquid.md#get-address)
  - [Mempool](./README-liquid.md#get-address)
  - [Transactions](./README-liquid.md#get-address)
  - [Websocket](./README-liquid.md#init-websocket)

---

## **Contributing**

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## **License** [MIT](https://choosealicense.com/licenses/mit/)
