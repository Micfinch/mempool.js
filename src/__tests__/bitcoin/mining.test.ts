import assert = require('assert');
import { AxiosInstance } from 'axios';
import { useMining } from '../../app/bitcoin/mining';
import { Pools } from '../../interfaces/bitcoin/mining';

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
  await run('getPools marks unknown pools using poolUniqueId', async () => {
    const { api, calls, responses } = createApi();
    const mining = useMining(api);
    const expected = [
      { name: 'Original', slug: 'unknown', poolUniqueId: 0 },
      { name: 'Known', slug: 'known', poolUniqueId: 1 },
    ];
    responses.set('/v1/mining/pools', expected);

    const pools = await mining.getPools();

    assert.deepStrictEqual(calls, ['/v1/mining/pools']);
    assert.strictEqual(Array.isArray(pools), true);
    assert.strictEqual(expected[0].name, 'Unknown');
    assert.strictEqual(expected[1].name, 'Known');
  });

  await run('getPools marks interval response unknown pools using poolUniqueId', async () => {
    const { api, calls, responses } = createApi();
    const mining = useMining(api);
    const expected: Pools = {
      blockCount: 1,
      lastEstimatedHashrate: 1,
      lastEstimatedHashrate3d: 1,
      lastEstimatedHashrate1w: 1,
      pools: [
        { name: 'Original', slug: 'unknown', poolUniqueId: 0 },
        { name: 'Known', slug: 'known', poolUniqueId: 1 },
      ],
    };
    responses.set('/v1/mining/pools/1w', expected);

    const response = await mining.getPools({ interval: '1w' }) as Pools;

    assert.deepStrictEqual(calls, ['/v1/mining/pools/1w']);
    assert.strictEqual(response.pools[0].name, 'Unknown');
    assert.strictEqual(response.pools[1].name, 'Known');
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
