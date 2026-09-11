import assert = require('assert');
import { AxiosInstance } from 'axios';
import { useAssets } from '../../app/liquid/assets';

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
  await run('getAssets fetches and returns assets in order', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/asset/a', { asset_id: 'a' });
    responses.set('/asset/b', { asset_id: 'b' });

    const assets = useAssets(api);
    const result = await assets.getAssets({ asset_ids: ['a', 'b'] });

    assert.deepStrictEqual(result, [{ asset_id: 'a' }, { asset_id: 'b' }]);
    assert.deepStrictEqual(calls, ['/asset/a', '/asset/b']);
  });

  await run('getAssets returns [] and skips calls for empty asset_ids', async () => {
    const { api, calls } = createApi();
    const assets = useAssets(api);

    const result = await assets.getAssets({ asset_ids: [] });

    assert.deepStrictEqual(result, []);
    assert.deepStrictEqual(calls, []);
  });

  await run('getAssets rejects non-object params', async () => {
    const { api, calls } = createApi();
    const assets = useAssets(api);

    await expectTypeError(
      () =>
        (assets.getAssets as unknown as (
          params?: unknown
        ) => Promise<unknown>)(undefined),
      'params must be an object'
    );

    assert.deepStrictEqual(calls, []);
  });

  await run('getAssets rejects non-array asset_ids', async () => {
    const { api, calls } = createApi();
    const assets = useAssets(api);

    await expectTypeError(
      () =>
        assets.getAssets({
          asset_ids: undefined as unknown as string[],
        }),
      'asset_ids must be an array'
    );

    assert.deepStrictEqual(calls, []);
  });

  await run(
    'getAssets rejects empty, whitespace, or non-string asset_ids',
    async () => {
      const { api, calls } = createApi();
      const assets = useAssets(api);

      await expectTypeError(
        () =>
          assets.getAssets({
            asset_ids: ['valid', '', '   ', 1 as unknown as string],
          }),
        'asset_ids must contain non-empty strings'
      );

      assert.deepStrictEqual(calls, []);
    }
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
