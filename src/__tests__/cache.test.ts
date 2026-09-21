import assert = require('assert');
import {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import mempoolJS = require('../index');
import { makeBitcoinAPI } from '../services/api';

type AdapterCall = {
  method?: string;
  url?: string;
  params?: unknown;
  data?: unknown;
  headers?: AxiosRequestConfig['headers'];
  baseURL?: string;
};

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const createAdapter = (
  responder: (
    config: AxiosRequestConfig,
    callIndex: number,
  ) => Promise<unknown> | unknown,
) => {
  const calls: AdapterCall[] = [];

  const adapter = async (
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse<unknown>> => {
    const callIndex =
      calls.push({
        method: config.method,
        url: config.url,
        params: config.params,
        data: config.data,
        headers: config.headers,
        baseURL: config.baseURL,
      }) - 1;

    const data = await responder(config, callIndex);

    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {
        callIndex,
        url: config.url,
      },
    };
  };

  return { adapter, calls };
};

const run = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n`);
    throw error;
  }
};

const main = async () => {
  await run('caching is disabled by default', async () => {
    const { adapter, calls } = createAdapter(() => ({ txid: 'abc' }));
    const client = mempoolJS({
      protocol: 'https',
      hostname: 'cache-disabled.test',
      config: { adapter },
    });

    await client.bitcoin.transactions.getTx({ txid: 'abc' });
    await client.bitcoin.transactions.getTx({ txid: 'abc' });

    assert.strictEqual(calls.length, 2);
  });

  await run('enabled caching reuses GET responses', async () => {
    const { adapter, calls } = createAdapter((_config, callIndex) => ({
      txid: `cached-${callIndex}`,
    }));
    const client = mempoolJS({
      protocol: 'https',
      hostname: 'cache-hit.test',
      cache: { enabled: true, ttlMs: 1000 },
      config: { adapter },
    });

    const first = await client.bitcoin.transactions.getTx({ txid: 'abc' });
    const second = await client.bitcoin.transactions.getTx({ txid: 'abc' });

    assert.deepStrictEqual(first, { txid: 'cached-0' });
    assert.deepStrictEqual(second, { txid: 'cached-0' });
    assert.strictEqual(calls.length, 1);
  });

  await run(
    'non-finite TTL values fall back to the default cache TTL',
    async () => {
      const { adapter, calls } = createAdapter(() => ({ txid: 'fallback' }));
      const client = mempoolJS({
        protocol: 'https',
        hostname: 'ttl-fallback.test',
        cache: { enabled: true, ttlMs: Number.POSITIVE_INFINITY },
        config: { adapter },
      });

      await client.bitcoin.transactions.getTx({ txid: 'abc' });
      await client.bitcoin.transactions.getTx({ txid: 'abc' });

      assert.strictEqual(calls.length, 1);
    },
  );

  await run('cache keys normalize equivalent query params', async () => {
    const { adapter, calls } = createAdapter(() => ({ ok: true }));
    const { api } = makeBitcoinAPI({
      protocol: 'https',
      hostname: 'normalize.test',
      network: 'main',
      cache: { enabled: true, ttlMs: 1000 },
      config: { adapter },
    });

    await api.get('/blocks', { params: { b: '2', a: '1' } });
    await api.get('/blocks?a=1', { params: { b: '2' } });

    assert.strictEqual(calls.length, 1);
  });

  await run(
    'cache hits preserve the original adapter request object',
    async () => {
      const { adapter } = createAdapter(() => ({ ok: true }));
      const { api } = makeBitcoinAPI({
        protocol: 'https',
        hostname: 'request-shape.test',
        network: 'main',
        cache: { enabled: true, ttlMs: 1000 },
        config: { adapter },
      });

      const first = await api.get('/blocks');
      const second = await api.get('/blocks');

      assert.deepStrictEqual(second.data, first.data);
      assert.deepStrictEqual(second.request, first.request);
    },
  );

  await run('expired cache entries are refreshed after TTL', async () => {
    const { adapter, calls } = createAdapter((_config, callIndex) => ({
      txid: `ttl-${callIndex}`,
    }));
    const client = mempoolJS({
      protocol: 'https',
      hostname: 'ttl.test',
      cache: { enabled: true, ttlMs: 10 },
      config: { adapter },
    });

    const first = await client.bitcoin.transactions.getTx({ txid: 'abc' });
    await sleep(25);
    const second = await client.bitcoin.transactions.getTx({ txid: 'abc' });

    assert.deepStrictEqual(first, { txid: 'ttl-0' });
    assert.deepStrictEqual(second, { txid: 'ttl-1' });
    assert.strictEqual(calls.length, 2);
  });

  await run(
    'concurrent cache misses are coalesced into one GET request',
    async () => {
      const { adapter, calls } = createAdapter(async (_config, callIndex) => {
        await sleep(25);
        return { txid: `coalesced-${callIndex}` };
      });
      const client = mempoolJS({
        protocol: 'https',
        hostname: 'coalesce.test',
        cache: { enabled: true, ttlMs: 1000 },
        config: { adapter },
      });

      const [first, second] = await Promise.all([
        client.bitcoin.transactions.getTx({ txid: 'abc' }),
        client.bitcoin.transactions.getTx({ txid: 'abc' }),
      ]);

      assert.deepStrictEqual(first, { txid: 'coalesced-0' });
      assert.deepStrictEqual(second, { txid: 'coalesced-0' });
      assert.strictEqual(calls.length, 1);
    },
  );

  await run('request failures are not cached', async () => {
    const { adapter, calls } = createAdapter((_config, callIndex) => {
      if (callIndex === 0) {
        throw new Error('boom');
      }

      return { txid: 'recovered' };
    });
    const client = mempoolJS({
      protocol: 'https',
      hostname: 'error.test',
      cache: { enabled: true, ttlMs: 1000 },
      config: { adapter },
    });

    await assert.rejects(
      client.bitcoin.transactions.getTx({ txid: 'abc' }),
      /boom/,
    );

    const result = await client.bitcoin.transactions.getTx({ txid: 'abc' });

    assert.deepStrictEqual(result, { txid: 'recovered' });
    assert.strictEqual(calls.length, 2);
  });

  await run(
    'authorization-bearing GET requests stay uncached unless explicitly opted in',
    async () => {
      const uncached = createAdapter(() => ({ txid: 'private' }));
      const uncachedClient = mempoolJS({
        protocol: 'https',
        hostname: 'private.test',
        cache: { enabled: true, ttlMs: 1000 },
        config: {
          adapter: uncached.adapter,
          headers: {
            authorization: '******',
          },
        },
      });

      await uncachedClient.bitcoin.transactions.getTx({ txid: 'abc' });
      await uncachedClient.bitcoin.transactions.getTx({ txid: 'abc' });

      assert.strictEqual(uncached.calls.length, 2);

      const isolatedStore = mempoolJS.createMemoryCacheStore({
        maxEntries: 10,
      });
      const cached = createAdapter(() => ({ txid: 'private-safe' }));
      const cachedClient = mempoolJS({
        protocol: 'https',
        hostname: 'private.test',
        cache: {
          enabled: true,
          ttlMs: 1000,
          store: isolatedStore,
          allowAuthorizedRequests: true,
        },
        config: {
          adapter: cached.adapter,
          headers: {
            authorization: '******',
          },
        },
      });

      await cachedClient.bitcoin.transactions.getTx({ txid: 'abc' });
      await cachedClient.bitcoin.transactions.getTx({ txid: 'abc' });

      assert.strictEqual(cached.calls.length, 1);
    },
  );

  await run(
    'shared stores still isolate entries across client configurations',
    async () => {
      const store = mempoolJS.createMemoryCacheStore({ maxEntries: 20 });
      const firstAdapter = createAdapter(() => ({ txid: 'host-a' }));
      const secondAdapter = createAdapter(() => ({ txid: 'host-b' }));

      const firstClient = mempoolJS({
        protocol: 'https',
        hostname: 'host-a.test',
        cache: { enabled: true, ttlMs: 1000, store },
        config: { adapter: firstAdapter.adapter },
      });
      const secondClient = mempoolJS({
        protocol: 'https',
        hostname: 'host-b.test',
        cache: { enabled: true, ttlMs: 1000, store },
        config: { adapter: secondAdapter.adapter },
      });

      await firstClient.bitcoin.transactions.getTx({ txid: 'abc' });
      await firstClient.bitcoin.transactions.getTx({ txid: 'abc' });
      await secondClient.bitcoin.transactions.getTx({ txid: 'abc' });

      assert.strictEqual(firstAdapter.calls.length, 1);
      assert.strictEqual(secondAdapter.calls.length, 1);
    },
  );

  await run(
    'cache clear and shouldCache opt-out work as expected',
    async () => {
      const { adapter, calls } = createAdapter((_config, callIndex) => ({
        txid: `value-${callIndex}`,
      }));
      const client = mempoolJS({
        protocol: 'https',
        hostname: 'clear.test',
        cache: {
          enabled: true,
          ttlMs: 1000,
          shouldCache: (request) => request.url !== '/tx/skip',
        },
        config: { adapter },
      });

      await client.bitcoin.transactions.getTx({ txid: 'cached' });
      await client.bitcoin.transactions.getTx({ txid: 'cached' });
      await client.bitcoin.transactions.getTx({ txid: 'skip' });
      await client.bitcoin.transactions.getTx({ txid: 'skip' });

      assert.strictEqual(calls.length, 3);

      assert.ok(client.cache);
      await client.cache.clear();
      await client.bitcoin.transactions.getTx({ txid: 'cached' });

      assert.strictEqual(calls.length, 4);
    },
  );

  await run('POST requests are never cached', async () => {
    const { adapter, calls } = createAdapter(
      (_config, callIndex) => `tx-${callIndex}`,
    );
    const client = mempoolJS({
      protocol: 'https',
      hostname: 'post.test',
      cache: { enabled: true, ttlMs: 1000 },
      config: { adapter },
    });

    await client.bitcoin.transactions.postTx({ txhex: 'deadbeef' });
    await client.bitcoin.transactions.postTx({ txhex: 'deadbeef' });

    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(
      calls.map((call) => call.method),
      ['post', 'post'],
    );
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
