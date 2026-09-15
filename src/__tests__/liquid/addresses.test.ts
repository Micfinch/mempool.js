import assert = require('assert');
import { AxiosInstance } from 'axios';
import { useAddresses } from '../../app/liquid/addresses';

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
  await run('getAddressAssetBalances validates params and address', async () => {
    const { api } = createApi();
    const addresses = useAddresses(api);

    await expectTypeError(
      () =>
        (addresses.getAddressAssetBalances as unknown as (
          params?: unknown
        ) => Promise<unknown>)(undefined),
      'params must be an object'
    );

    await expectTypeError(
      () =>
        addresses.getAddressAssetBalances({
          address: '   ',
        }),
      'address must be a non-empty string'
    );
  });

  await run('getAddressAssetBalances returns [] for empty utxo list', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/address/liquid-address/utxo', []);
    const addresses = useAddresses(api);

    const result = await addresses.getAddressAssetBalances({
      address: 'liquid-address',
    });

    assert.deepStrictEqual(result, []);
    assert.deepStrictEqual(calls, ['/address/liquid-address/utxo']);
  });

  await run('getAddressAssetBalances uses asset from utxo without tx fetches', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/address/liquid-address/utxo', [
      { txid: 'tx-1', vout: 0, value: 5, asset: 'asset-a', status: {} },
      { txid: 'tx-2', vout: 0, value: 7, asset: 'asset-a', status: {} },
      { txid: 'tx-3', vout: 1, value: 3, asset: 'asset-b', status: {} },
    ]);
    const addresses = useAddresses(api);

    const result = await addresses.getAddressAssetBalances({
      address: 'liquid-address',
    });

    assert.deepStrictEqual(result, [
      { asset_id: 'asset-a', value: 12, utxo_count: 2 },
      { asset_id: 'asset-b', value: 3, utxo_count: 1 },
    ]);
    assert.deepStrictEqual(calls, ['/address/liquid-address/utxo']);
  });

  await run('getAddressAssetBalances resolves missing asset from tx outputs', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/address/liquid-address/utxo', [
      { txid: 'tx-1', vout: 0, value: 10, status: {} },
      { txid: 'tx-1', vout: 1, value: 2, status: {} },
      { txid: 'tx-2', vout: 0, value: 3, status: {} },
    ]);
    responses.set('/tx/tx-1', {
      vout: [{ asset: 'asset-a' }, { asset: 'asset-b' }],
    });
    responses.set('/tx/tx-2', {
      vout: [{ asset: 'asset-a' }],
    });
    const addresses = useAddresses(api);

    const result = await addresses.getAddressAssetBalances({
      address: 'liquid-address',
    });

    assert.deepStrictEqual(result, [
      { asset_id: 'asset-a', value: 13, utxo_count: 2 },
      { asset_id: 'asset-b', value: 2, utxo_count: 1 },
    ]);
    assert.deepStrictEqual(calls, [
      '/address/liquid-address/utxo',
      '/tx/tx-1',
      '/tx/tx-2',
    ]);
  });

  await run('getAddressAssetBalances throws when asset cannot be resolved', async () => {
    const { api, responses } = createApi();
    responses.set('/address/liquid-address/utxo', [
      { txid: 'tx-1', vout: 0, value: 1, status: {} },
    ]);
    responses.set('/tx/tx-1', { vout: [{}] });
    const addresses = useAddresses(api);

    await assert.rejects(
      addresses.getAddressAssetBalances({ address: 'liquid-address' }),
      /Asset id not found for Liquid UTXO tx-1:0/
    );
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
