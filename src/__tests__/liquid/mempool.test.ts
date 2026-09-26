import assert = require('assert');
import { AxiosInstance } from 'axios';
import { useMempool } from '../../app/liquid/mempool';

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
  await run('liquid getMempool returns the mempool stats object', async () => {
    const { api, calls, responses } = createApi();
    const expected = {
      count: 3,
      vsize: 33333,
      total_fee: 44444,
      fee_histogram: [2, 4],
    };
    responses.set('/mempool', expected);
    const mempool = useMempool(api);

    const result = await mempool.getMempool();

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, ['/mempool']);
  });

  await run(
    'liquid getMempoolBlocks calls projected mempool blocks endpoint',
    async () => {
      const { api, calls, responses } = createApi();
      const expected = [
        {
          blockSize: 800000,
          blockVSize: 800000,
          nTx: 1000,
          totalFees: 98765,
          medianFee: 4.2,
          feeRange: [1, 2, 3],
        },
      ];
      responses.set('/v1/fees/mempool-blocks', expected);
      const mempool = useMempool(api);

      const result = await mempool.getMempoolBlocks();

      assert.deepStrictEqual(result, expected);
      assert.deepStrictEqual(calls, ['/v1/fees/mempool-blocks']);
    }
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
