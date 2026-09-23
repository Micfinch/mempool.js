import assert = require('assert');
import { AxiosInstance } from 'axios';
import { useMining } from '../../app/bitcoin/mining';

const createApi = () => {
  const getCalls: Array<{ url: string; config?: unknown }> = [];
  const responses = new Map<string, unknown>();

  const api = {
    get: async (url: string, config?: unknown) => {
      getCalls.push({ url, config });
      return { data: responses.get(url) };
    },
  } as AxiosInstance;

  return { api, getCalls, responses };
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

const expectTypeError = async (
  action: () => Promise<unknown>,
  expectedMessage: string
) => {
  try {
    await action();
    throw new Error('expected action to throw');
  } catch (error) {
    assert.ok(error instanceof TypeError);
    assert.strictEqual(error.message, expectedMessage);
  }
};

const main = async () => {
  await run('listPools fetches the mining pool catalogue', async () => {
    const { api, getCalls, responses } = createApi();
    const expected = [{ name: 'Foundry', slug: 'foundry-usa', unique_id: 1111 }];
    responses.set(`/v1/mining/pools`, expected);
    const mining = useMining(api);

    const result = await mining.listPools();

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(getCalls, [{ url: `/v1/mining/pools`, config: undefined }]);
  });

  await run('getPoolsStats supports interval-specific stats', async () => {
    const { api, getCalls, responses } = createApi();
    const expected = { pools: [], blockCount: 0, lastEstimatedHashrate: 0, lastEstimatedHashrate3d: 0, lastEstimatedHashrate1w: 0 };
    responses.set(`/v1/mining/pools/1w`, expected);
    const mining = useMining(api);

    const result = await mining.getPoolsStats({ interval: '1w' });

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(getCalls, [{ url: `/v1/mining/pools/1w`, config: undefined }]);
  });

  await run('getPoolBlocks routes optional start height to the pool blocks endpoint', async () => {
    const { api, getCalls, responses } = createApi();
    const expected = [{ id: 'block-1', height: 1 }];
    responses.set(`/v1/mining/pool/ocean/blocks/840000`, expected);
    const mining = useMining(api);

    const result = await mining.getPoolBlocks({ slug: 'ocean', height: 840000 });

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(getCalls, [
      { url: `/v1/mining/pool/ocean/blocks/840000`, config: undefined },
    ]);
  });

  await run('getRewardStats validates blockCount input', async () => {
    const { api } = createApi();
    const mining = useMining(api);

    await expectTypeError(
      () => mining.getRewardStats({ blockCount: 0 }),
      'blockCount must be a positive integer'
    );
  });

  await run('getRewardStats requests payout totals for a block window', async () => {
    const { api, getCalls, responses } = createApi();
    const expected = { totalReward: 123, totalFee: 45, totalTx: 67 };
    responses.set(`/v1/mining/reward-stats/144`, expected);
    const mining = useMining(api);

    const result = await mining.getRewardStats({ blockCount: 144 });

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(getCalls, [
      { url: `/v1/mining/reward-stats/144`, config: undefined },
    ]);
  });

  await run('getBlockFeesTimespan forwards from/to query params', async () => {
    const { api, getCalls, responses } = createApi();
    responses.set(`/v1/mining/blocks/fees`, 123456);
    const mining = useMining(api);

    const result = await mining.getBlockFeesTimespan({ from: 1, to: 2 });

    assert.strictEqual(result, 123456);
    assert.deepStrictEqual(getCalls, [
      {
        url: `/v1/mining/blocks/fees`,
        config: { params: { from: 1, to: 2 } },
      },
    ]);
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
