import { AxiosInstance } from 'axios';
import {
  Address,
  AddressTxsUtxo,
  AddressLiquidInstance,
  AddressAssetBalance,
} from '../../interfaces/liquid/addresses';
import { Tx } from '../../interfaces/liquid/transactions';

export const useAddresses = (api: AxiosInstance): AddressLiquidInstance => {
  const getAddress = async (params: { address: string }) => {
    const { data } = await api.get<Address>(`/address/${params.address}`);
    return data;
  };

  const getAddressTxs = async (params: { address: string, after_txid?: string }) => {
    if (params.after_txid) {
      const { data } = await api.get<Tx[]>(`/address/${params.address}/txs?after_txid=${params.after_txid}`);
      return data;
    }
    const { data } = await api.get<Tx[]>(`/address/${params.address}/txs`);
    return data;
  };

  const getAddressTxsChain = async (params: { address: string }) => {
    const { data } = await api.get<Tx[]>(
      `/address/${params.address}/txs/chain`
    );
    return data;
  };

  const getAddressTxsMempool = async (params: { address: string }) => {
    const { data } = await api.get<Tx[]>(
      `/address/${params.address}/txs/mempool`
    );
    return data;
  };

  const getAddressTxsUtxo = async (params: { address: string }) => {
    const { data } = await api.get<AddressTxsUtxo[]>(
      `/address/${params.address}/utxo`
    );
    return data;
  };

  const getAddressAssetBalances = async (params: { address: string }) => {
    if (typeof params !== 'object' || params === null) {
      throw new TypeError('params must be an object');
    }
    if (typeof params.address !== 'string' || params.address.trim().length === 0) {
      throw new TypeError('address must be a non-empty string');
    }

    const utxos = await getAddressTxsUtxo(params);

    if (utxos.length === 0) {
      return [];
    }

    const txidsToFetch = utxos.reduce((txids, { txid, asset }) => {
      if (!asset && txids.indexOf(txid) === -1) {
        txids.push(txid);
      }
      return txids;
    }, [] as string[]);

    const transactionMap = new Map<string, Tx>();
    if (txidsToFetch.length > 0) {
      const transactions = await Promise.all(
        txidsToFetch.map(async (txid) => {
          const { data } = await api.get<Tx>(`/tx/${txid}`);
          return [txid, data] as const;
        })
      );
      transactions.forEach(([txid, tx]) => transactionMap.set(txid, tx));
    }
    const balances = new Map<string, AddressAssetBalance>();

    utxos.forEach((utxo) => {
      let asset_id = utxo.asset;
      if (!asset_id) {
        const tx = transactionMap.get(utxo.txid);
        const txOutput = tx && tx.vout ? tx.vout[utxo.vout] : undefined;
        asset_id = txOutput && txOutput.asset;
      }

      if (!asset_id) {
        throw new Error(`Asset id not found for Liquid UTXO ${utxo.txid}:${utxo.vout}`);
      }

      const currentBalance = balances.get(asset_id);

      if (currentBalance) {
        currentBalance.value += utxo.value;
        currentBalance.utxo_count += 1;
        return;
      }

      balances.set(asset_id, {
        asset_id,
        value: utxo.value,
        utxo_count: 1,
      });
    });

    return Array.from(balances.values()).sort((a, b) => b.value - a.value);
  };

  return {
    getAddress,
    getAddressTxs,
    getAddressTxsChain,
    getAddressTxsMempool,
    getAddressTxsUtxo,
    getAddressAssetBalances,
  };
};
