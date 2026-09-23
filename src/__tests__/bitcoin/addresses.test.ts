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

const main = async () => {
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
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
