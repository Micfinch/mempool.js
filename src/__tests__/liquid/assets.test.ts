import assert from 'node:assert/strict';
import test from 'node:test';
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

test('getAssets fetches and returns assets in order', async () => {
  const { api, calls, responses } = createApi();
  responses.set('/asset/a', { asset_id: 'a' });
  responses.set('/asset/b', { asset_id: 'b' });

  const assets = useAssets(api);
  const result = await assets.getAssets({ asset_ids: ['a', 'b'] });

  assert.deepEqual(result, [{ asset_id: 'a' }, { asset_id: 'b' }]);
  assert.deepEqual(calls, ['/asset/a', '/asset/b']);
});

test('getAssets returns [] and skips calls for empty asset_ids', async () => {
  const { api, calls } = createApi();

  const assets = useAssets(api);
  const result = await assets.getAssets({ asset_ids: [] });

  assert.deepEqual(result, []);
  assert.deepEqual(calls, []);
});

test('getAssets rejects non-object params', async () => {
  const { api, calls } = createApi();
  const assets = useAssets(api);

  await assert.rejects(
    async () => await (assets.getAssets as unknown as (params?: unknown) => Promise<unknown>)(undefined),
    (error: unknown) =>
      error instanceof TypeError && error.message === 'params must be an object'
  );

  assert.deepEqual(calls, []);
});

test('getAssets rejects non-array asset_ids', async () => {
  const { api, calls } = createApi();
  const assets = useAssets(api);

  await assert.rejects(
    async () =>
      await assets.getAssets({
        asset_ids: undefined as unknown as string[],
      }),
    (error: unknown) =>
      error instanceof TypeError &&
      error.message === 'asset_ids must be an array'
  );

  assert.deepEqual(calls, []);
});

test('getAssets rejects empty, whitespace, or non-string asset_ids', async () => {
  const { api, calls } = createApi();
  const assets = useAssets(api);

  await assert.rejects(
    async () =>
      await assets.getAssets({
        asset_ids: ['valid', '', '   ', 1 as unknown as string],
      }),
    (error: unknown) =>
      error instanceof TypeError &&
      error.message === 'asset_ids must contain non-empty strings'
  );

  assert.deepEqual(calls, []);
});
