import assert = require('assert');
import { AxiosInstance } from 'axios';
import { useAddresses } from '../../app/bitcoin/addresses';

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
  await run('getAddress validates address input', async () => {
    const { api } = createApi();
    const addresses = useAddresses(api);

    await expectTypeError(
      () =>
        (addresses.getAddress as unknown as (
          params?: unknown
        ) => Promise<unknown>)(undefined),
      'params must be a string or an object'
    );

    await expectTypeError(
      () => addresses.getAddress('   '),
      'address must be a non-empty string'
    );
  });

  await run('getAddress accepts a plain address string', async () => {
    const { api, calls, responses } = createApi();
    const address = '3BKe7WtZV6ftrHJKJ3HapDqGhhy9k4jcmM';
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

  await run('getAddressTxsUtxo accepts an address object', async () => {
    const { api, calls, responses } = createApi();
    const address = '3BKe7WtZV6ftrHJKJ3HapDqGhhy9k4jcmM';
    const expected = [{ txid: 'tx-1', vout: 0, value: 1, status: {} }];
    responses.set(`/address/${address}/utxo`, expected);
    const addresses = useAddresses(api);

    const result = await addresses.getAddressTxsUtxo({ address });

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, [`/address/${address}/utxo`]);
  });

  await run('getAddressTxsUtxo accepts a plain address string', async () => {
    const { api, calls, responses } = createApi();
    const address = '3BKe7WtZV6ftrHJKJ3HapDqGhhy9k4jcmM';
    const expected = [{ txid: 'tx-1', vout: 0, value: 1, status: {} }];
    responses.set(`/address/${address}/utxo`, expected);
    const addresses = useAddresses(api);

    const result = await addresses.getAddressTxsUtxo(address);

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, [`/address/${address}/utxo`]);
  });

  await run('getAddressBalance returns confirmed and unconfirmed totals', async () => {
    const { api, calls, responses } = createApi();
    const address = '3BKe7WtZV6ftrHJKJ3HapDqGhhy9k4jcmM';
    responses.set(`/address/${address}`, {
      address,
      chain_stats: {
        funded_txo_count: 2,
        funded_txo_sum: 125000,
        spent_txo_count: 1,
        spent_txo_sum: 25000,
        tx_count: 3,
      },
      mempool_stats: {
        funded_txo_count: 1,
        funded_txo_sum: 5000,
        spent_txo_count: 1,
        spent_txo_sum: 2000,
        tx_count: 2,
      },
    });
    const addresses = useAddresses(api);

    const result = await addresses.getAddressBalance({ address });

    assert.deepStrictEqual(result, {
      address,
      confirmed: 100000,
      unconfirmed: 3000,
      total: 103000,
    });
    assert.deepStrictEqual(calls, [`/address/${address}`]);
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
