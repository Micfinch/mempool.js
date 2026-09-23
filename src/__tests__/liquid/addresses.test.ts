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
      'params must be a string or an object'
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

    await run('getAddress accepts a plain address string', async () => {
      const { api, calls, responses } = createApi();
      const address = 'liquid-address';
      const expected = {
        address,
        chain_stats: {
          funded_txo_count: 1,
          funded_txo_sum: 5,
          spent_txo_count: 0,
          spent_txo_sum: 0,
          tx_count: 1,
        },
        mempool_stats: {
          funded_txo_count: 0,
          funded_txo_sum: 0,
          spent_txo_count: 0,
          spent_txo_sum: 0,
          tx_count: 0,
        },
      };
      responses.set(`/address/${address}`, expected);
      const addresses = useAddresses(api);

      const result = await addresses.getAddress(address);

      assert.deepStrictEqual(result, expected);
      assert.deepStrictEqual(calls, [`/address/${address}`]);
    });

    await run('getAddressTxsUtxo accepts a plain address string', async () => {
      const { api, calls, responses } = createApi();
      const address = 'liquid-address';
      const expected = [{ txid: 'tx-1', vout: 0, value: 1, asset: 'asset-a', status: {} }];
      responses.set(`/address/${address}/utxo`, expected);
      const addresses = useAddresses(api);

      const result = await addresses.getAddressTxsUtxo(address);

      assert.deepStrictEqual(result, expected);
      assert.deepStrictEqual(calls, [`/address/${address}/utxo`]);
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

  await run('getAddressAssets returns [] for empty utxo list', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/address/liquid-address/utxo', []);
    const addresses = useAddresses(api);

    const result = await addresses.getAddressAssets({
      address: 'liquid-address',
    });

    await run('getAddressAssetBalances accepts a plain address string', async () => {
      const { api, calls, responses } = createApi();
      const address = 'liquid-address';
      responses.set(`/address/${address}/utxo`, [
        { txid: 'tx-1', vout: 0, value: 5, asset: 'asset-a', status: {} },
        { txid: 'tx-2', vout: 0, value: 7, asset: 'asset-a', status: {} },
      ]);
      const addresses = useAddresses(api);

      const result = await addresses.getAddressAssetBalances(address);

      assert.deepStrictEqual(result, [
        { asset_id: 'asset-a', value: 12, utxo_count: 2 },
      ]);
      assert.deepStrictEqual(calls, [`/address/${address}/utxo`]);
    });

    assert.deepStrictEqual(result, []);
    assert.deepStrictEqual(calls, ['/address/liquid-address/utxo']);
  });

  await run('getAddressAssets returns balances with asset details', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/address/liquid-address/utxo', [
      { txid: 'tx-1', vout: 0, value: 7, asset: 'asset-a', status: {} },
      { txid: 'tx-2', vout: 0, value: 3, asset: 'asset-b', status: {} },
      { txid: 'tx-3', vout: 1, value: 5, asset: 'asset-a', status: {} },
    ]);
    responses.set('/asset/asset-a', {
      asset_id: 'asset-a',
      chain_stats: {
        tx_count: 1,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
      mempool_stats: {
        tx_count: 0,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
    });
    responses.set('/asset/asset-b', {
      asset_id: 'asset-b',
      chain_stats: {
        tx_count: 2,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
      mempool_stats: {
        tx_count: 1,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
    });
    const addresses = useAddresses(api);

    const result = await addresses.getAddressAssets({
      address: 'liquid-address',
    });

    assert.deepStrictEqual(result, [
      {
        asset_id: 'asset-a',
        value: 12,
        utxo_count: 2,
        asset: responses.get('/asset/asset-a'),
      },
      {
        asset_id: 'asset-b',
        value: 3,
        utxo_count: 1,
        asset: responses.get('/asset/asset-b'),
      },
    ]);
    assert.deepStrictEqual(calls, [
      '/address/liquid-address/utxo',
      '/asset/asset-a',
      '/asset/asset-b',
    ]);
  });

  await run('getAddressAssets throws when asset details cannot be loaded', async () => {
    const { api, responses } = createApi();
    responses.set('/address/liquid-address/utxo', [
      { txid: 'tx-1', vout: 0, value: 7, asset: 'asset-a', status: {} },
    ]);
    const addresses = useAddresses(api);

    await assert.rejects(
      addresses.getAddressAssets({ address: 'liquid-address' }),
      /Asset details not found for Liquid asset asset-a/
    );
  });

  await run('getAddressAssets accepts a plain address string', async () => {
    const { api, calls, responses } = createApi();
    const address = 'liquid-address';
    responses.set(`/address/${address}/utxo`, [
      { txid: 'tx-1', vout: 0, value: 7, asset: 'asset-a', status: {} },
    ]);
    responses.set('/asset/asset-a', {
      asset_id: 'asset-a',
      chain_stats: {
        tx_count: 1,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
      mempool_stats: {
        tx_count: 0,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
    });
    const addresses = useAddresses(api);

    const result = await addresses.getAddressAssets(address);

    assert.deepStrictEqual(result, [
      {
        asset_id: 'asset-a',
        value: 7,
        utxo_count: 1,
        asset: responses.get('/asset/asset-a'),
      },
    ]);
    assert.deepStrictEqual(calls, [`/address/${address}/utxo`, '/asset/asset-a']);
  });

  await run('getSpendableAssets returns [] for empty utxo list', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/address/liquid-address/utxo', []);
    const addresses = useAddresses(api);

    const result = await addresses.getSpendableAssets({
      address: 'liquid-address',
    });

    assert.deepStrictEqual(result, []);
    assert.deepStrictEqual(calls, ['/address/liquid-address/utxo']);
  });

  await run('getSpendableAssets returns grouped spendable utxos with asset details', async () => {
    const { api, calls, responses } = createApi();
    responses.set('/address/liquid-address/utxo', [
      { txid: 'tx-1', vout: 0, value: 7, asset: 'asset-a', status: { confirmed: true } },
      { txid: 'tx-2', vout: 1, value: 3, status: { confirmed: false } },
      { txid: 'tx-3', vout: 0, value: 5, asset: 'asset-a', status: { confirmed: true } },
    ]);
    responses.set('/tx/tx-2', {
      vout: [{}, { asset: 'asset-b' }],
    });
    responses.set('/asset/asset-a', {
      asset_id: 'asset-a',
      chain_stats: {
        tx_count: 1,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
      mempool_stats: {
        tx_count: 0,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
    });
    responses.set('/asset/asset-b', {
      asset_id: 'asset-b',
      chain_stats: {
        tx_count: 2,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
      mempool_stats: {
        tx_count: 1,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
    });
    const addresses = useAddresses(api);

    const result = await addresses.getSpendableAssets({
      address: 'liquid-address',
    });

    assert.deepStrictEqual(result, [
      {
        asset_id: 'asset-a',
        value: 12,
        utxo_count: 2,
        utxos: [
          { txid: 'tx-1', vout: 0, value: 7, asset: 'asset-a', asset_id: 'asset-a', status: { confirmed: true } },
          { txid: 'tx-3', vout: 0, value: 5, asset: 'asset-a', asset_id: 'asset-a', status: { confirmed: true } },
        ],
        asset: responses.get('/asset/asset-a'),
      },
      {
        asset_id: 'asset-b',
        value: 3,
        utxo_count: 1,
        utxos: [
          { txid: 'tx-2', vout: 1, value: 3, asset_id: 'asset-b', status: { confirmed: false } },
        ],
        asset: responses.get('/asset/asset-b'),
      },
    ]);
    assert.deepStrictEqual(calls, [
      '/address/liquid-address/utxo',
      '/tx/tx-2',
      '/asset/asset-a',
      '/asset/asset-b',
    ]);
  });

  await run('getSpendableAssets throws when asset details cannot be loaded', async () => {
    const { api, responses } = createApi();
    responses.set('/address/liquid-address/utxo', [
      { txid: 'tx-1', vout: 0, value: 7, asset: 'asset-a', status: {} },
    ]);
    const addresses = useAddresses(api);

    await assert.rejects(
      addresses.getSpendableAssets({ address: 'liquid-address' }),
      /Asset details not found for Liquid asset asset-a/
    );
  });

  await run('getSpendableAssets accepts a plain address string', async () => {
    const { api, calls, responses } = createApi();
    const address = 'liquid-address';
    responses.set(`/address/${address}/utxo`, [
      { txid: 'tx-1', vout: 0, value: 7, asset: 'asset-a', status: { confirmed: true } },
    ]);
    responses.set('/asset/asset-a', {
      asset_id: 'asset-a',
      chain_stats: {
        tx_count: 1,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
      mempool_stats: {
        tx_count: 0,
        peg_in_count: 0,
        peg_in_amount: 0,
        peg_out_count: 0,
        peg_out_amount: 0,
        burn_count: 0,
        burned_amount: 0,
      },
    });
    const addresses = useAddresses(api);

    const result = await addresses.getSpendableAssets(address);

    assert.deepStrictEqual(result, [
      {
        asset_id: 'asset-a',
        value: 7,
        utxo_count: 1,
        utxos: [
          { txid: 'tx-1', vout: 0, value: 7, asset: 'asset-a', asset_id: 'asset-a', status: { confirmed: true } },
        ],
        asset: responses.get('/asset/asset-a'),
      },
    ]);
    assert.deepStrictEqual(calls, [`/address/${address}/utxo`, '/asset/asset-a']);
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
