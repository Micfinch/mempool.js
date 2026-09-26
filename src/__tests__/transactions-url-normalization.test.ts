import assert = require('assert');
import { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { useFees as useBitcoinFees } from '../app/bitcoin/fees';
import { useTransactions as useBitcoinTransactions } from '../app/bitcoin/transactions';
import { useTransactions as useLiquidTransactions } from '../app/liquid/transactions';
import { normalizeTxId } from '../services/normalize';
import { wsTrackTransaction } from '../services/ws/ws-client-node';

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

const run = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n`);
    throw error;
  }
};

const main = async () => {
  const txid = '653609937043476689dc92ce62e9f7f360069e36664f747a7f1fe29fa3459724';
  const txUrl = `https://mempool.space/tx/${txid}`;

  await run('normalizeTxId extracts a txid from a mempool transaction URL', () => {
    assert.strictEqual(normalizeTxId(txUrl), txid);
    assert.strictEqual(normalizeTxId(`https://mempool.space/testnet/tx/${txid}?foo=bar`), txid);
  });

  await run('bitcoin transactions.getTx accepts a mempool transaction URL', async () => {
    const { api, calls, responses } = createApi();
    const expected = { txid };
    responses.set(`/tx/${txid}`, expected);
    const transactions = useBitcoinTransactions(api);

    const result = await transactions.getTx({ txid: txUrl });

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, [`/tx/${txid}`]);
  });

  await run('bitcoin fees.getCPFP accepts a mempool transaction URL', async () => {
    const { api, calls, responses } = createApi();
    const expected = [{ feeRange: [1, 2, 3] }];
    responses.set(`/v1/cpfp/${txid}`, expected);
    const fees = useBitcoinFees(api);

    const result = await fees.getCPFP({ txid: txUrl });

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, [`/v1/cpfp/${txid}`]);
  });

  await run('liquid transactions.getTxStatus accepts a mempool transaction URL', async () => {
    const { api, calls, responses } = createApi();
    const expected = { confirmed: true };
    responses.set(`/tx/${txid}/status`, expected);
    const transactions = useLiquidTransactions(api);

    const result = await transactions.getTxStatus({ txid: txUrl });

    assert.deepStrictEqual(result, expected);
    assert.deepStrictEqual(calls, [`/tx/${txid}/status`]);
  });

  await run('wsTrackTransaction sends a normalized txid', () => {
    const messages: string[] = [];
    const ws = {
      readyState: WebSocket.OPEN,
      send: (message: string) => messages.push(message),
    } as unknown as WebSocket;

    wsTrackTransaction(ws, txUrl);

    assert.deepStrictEqual(messages, [JSON.stringify({ 'track-tx': txid })]);
  });
};

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
