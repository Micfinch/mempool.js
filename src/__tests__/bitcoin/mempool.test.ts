import assert = require('assert');
import { AxiosInstance } from 'axios';
import { useMempool } from '../../app/bitcoin/mempool';

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
  await run('getMempool returns the mempool stats object', async () => {
    const { api, calls, responses } = createApi();
    const expected = {
      count: 2,
      vsize: 12345,
      total_fee: 67890,
      fee_histogram: [1, 2],
    };
    responses.set('/mempool', expected);
    const mempool = useMempool(api);

    const result = await mempool.getMempool();

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, ['/mempool']);
  });

  await run('getMempoolBlocks calls projected mempool blocks endpoint', async () => {
    const { api, calls, responses } = createApi();
    const expected = [
      {
        blockSize: 1000000,
        blockVSize: 1000000,
        nTx: 2000,
        totalFees: 123456,
        medianFee: 12.3,
        feeRange: [1, 2, 3],
      },
    ];
    responses.set('/v1/fees/mempool-blocks', expected);
    const mempool = useMempool(api);

    const result = await mempool.getMempoolBlocks();

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, ['/v1/fees/mempool-blocks']);
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
