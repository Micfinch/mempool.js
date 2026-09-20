import assert = require('assert');
import { AxiosInstance } from 'axios';
import { useMining } from '../../app/bitcoin/mining';

const createApi = () => {
  const calls: string[] = [];
  const responses = new Map<string, unknown>();

  const api = {
    get: async (url: string) => {
      calls.push(url);
      return { data: responses.get(url) };
    },
  } as AxiosInstance;

  return { api, calls, responses };
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
  await run('listPools fetches pool metadata', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/v1/mining/pools', [{ slug: 'pool-a' }]);
    const mining = useMining(api);

    const result = await mining.listPools();

    assert.deepStrictEqual(result, [{ slug: 'pool-a' }]);
    assert.deepStrictEqual(calls, ['/v1/mining/pools']);
  });

  await run('getPools fetches interval-based pool stats', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/v1/mining/pools/1w', { pools: [] });
    const mining = useMining(api);

    const result = await mining.getPools({ interval: '1w' });

    assert.deepStrictEqual(result, { pools: [] });
    assert.deepStrictEqual(calls, ['/v1/mining/pools/1w']);
  });

  await run('getPool fetches a single pool summary', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/v1/mining/pool/foundryusa', { pool: { slug: 'foundryusa' } });
    const mining = useMining(api);

    const result = await mining.getPool({ slug: 'foundryusa' });

    assert.deepStrictEqual(result, { pool: { slug: 'foundryusa' } });
    assert.deepStrictEqual(calls, ['/v1/mining/pool/foundryusa']);
  });

  await run('getPoolHashrate fetches hashrate history for a pool', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/v1/mining/pool/f2pool/hashrate', [{ timestamp: 1 }]);
    const mining = useMining(api);

    const result = await mining.getPoolHashrate({ slug: 'f2pool' });

    assert.deepStrictEqual(result, [{ timestamp: 1 }]);
    assert.deepStrictEqual(calls, ['/v1/mining/pool/f2pool/hashrate']);
  });

  await run('getPoolBlocks omits height when not provided', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/v1/mining/pool/spiderpool/blocks', [{ height: 1 }]);
    const mining = useMining(api);

    const result = await mining.getPoolBlocks({ slug: 'spiderpool' });

    assert.deepStrictEqual(result, [{ height: 1 }]);
    assert.deepStrictEqual(calls, ['/v1/mining/pool/spiderpool/blocks']);
  });

  await run('getPoolBlocks appends the starting height when provided', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/v1/mining/pool/spiderpool/blocks/900000', [{ height: 900000 }]);
    const mining = useMining(api);

    const result = await mining.getPoolBlocks({
      slug: 'spiderpool',
      height: 900000,
    });

    assert.deepStrictEqual(result, [{ height: 900000 }]);
    assert.deepStrictEqual(calls, ['/v1/mining/pool/spiderpool/blocks/900000']);
  });

  await run('getPoolsHashrate supports optional intervals', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/v1/mining/hashrate/pools', [{ timestamp: 1 }]);
    responses.set('/v1/mining/hashrate/pools/3d', [{ timestamp: 2 }]);
    const mining = useMining(api);

    const latest = await mining.getPoolsHashrate();
    const interval = await mining.getPoolsHashrate({ interval: '3d' });

    assert.deepStrictEqual(latest, [{ timestamp: 1 }]);
    assert.deepStrictEqual(interval, [{ timestamp: 2 }]);
    assert.deepStrictEqual(calls, [
      '/v1/mining/hashrate/pools',
      '/v1/mining/hashrate/pools/3d',
    ]);
  });

  await run('historical block fee and reward helpers support optional intervals', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/v1/mining/blocks/fees', [{ timestamp: 1 }]);
    responses.set('/v1/mining/blocks/rewards/1m', [{ timestamp: 2 }]);
    const mining = useMining(api);

    const fees = await mining.getHistoricalBlockFees();
    const rewards = await mining.getHistoricalBlockRewards({ interval: '1m' });

    assert.deepStrictEqual(fees, [{ timestamp: 1 }]);
    assert.deepStrictEqual(rewards, [{ timestamp: 2 }]);
    assert.deepStrictEqual(calls, [
      '/v1/mining/blocks/fees',
      '/v1/mining/blocks/rewards/1m',
    ]);
  });

  await run('getRewardStats defaults to 144 blocks and accepts overrides', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/v1/mining/reward-stats/144', { totalReward: 1 });
    responses.set('/v1/mining/reward-stats/1008', { totalReward: 2 });
    const mining = useMining(api);

    const latest = await mining.getRewardStats();
    const weekly = await mining.getRewardStats({ blockCount: 1008 });

    assert.deepStrictEqual(latest, { totalReward: 1 });
    assert.deepStrictEqual(weekly, { totalReward: 2 });
    assert.deepStrictEqual(calls, [
      '/v1/mining/reward-stats/144',
      '/v1/mining/reward-stats/1008',
    ]);
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
