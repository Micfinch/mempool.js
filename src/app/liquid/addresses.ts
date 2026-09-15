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
    const utxos = await getAddressTxsUtxo(params);

    if (utxos.length === 0) {
      return [];
    }

    const transactions = await Promise.all(
      [...new Set(utxos.map(({ txid }) => txid))].map(async (txid) => {
        const { data } = await api.get<Tx>(`/tx/${txid}`);
        return [txid, data] as const;
      })
    );

    const transactionMap = new Map<string, Tx>(transactions);
    const balances = new Map<string, AddressAssetBalance>();

    utxos.forEach((utxo) => {
      const tx = transactionMap.get(utxo.txid);
      const txOutput = tx?.vout[utxo.vout];
      const asset_id = utxo.asset || txOutput?.asset;

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
