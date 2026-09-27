import assert = require('assert');
import { AxiosInstance } from 'axios';
import { useDifficulty } from '../../app/bitcoin/difficulty';

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
  await run('getHashrate supports the default hashrate endpoint', async () => {
    const { api, calls, responses } = createApi();
    const expected = {
      hashrates: [],
      difficulty: [],
      currentHashrate: 1,
      currentDifficulty: 2,
    };
    responses.set('/v1/mining/hashrate', expected);
    const difficulty = useDifficulty(api);

    const result = await difficulty.getHashrate();

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, ['/v1/mining/hashrate']);
  });

  await run('getHashrate supports interval endpoint', async () => {
    const { api, calls, responses } = createApi();
    const expected = {
      hashrates: [],
      difficulty: [],
      currentHashrate: 3,
      currentDifficulty: 4,
    };
    responses.set('/v1/mining/hashrate/1y', expected);
    const difficulty = useDifficulty(api);

    const result = await difficulty.getHashrate({ interval: '1y' });

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, ['/v1/mining/hashrate/1y']);
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
