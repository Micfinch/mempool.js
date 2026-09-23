import { AxiosInstance } from 'axios';
import {
  Address,
  AddressAsset,
  AddressSpendableAsset,
  AddressSpendableUtxo,
  AddressTxsUtxo,
  AddressLiquidInstance,
  AddressAssetBalance,
} from '../../interfaces/liquid/addresses';
import { Tx } from '../../interfaces/liquid/transactions';
import { useAssets } from './assets';

export const useAddresses = (api: AxiosInstance): AddressLiquidInstance => {
  const assets = useAssets(api);

  const normalizeAddressParams = (params: { address: string }) => {
    if (typeof params !== 'object' || params === null) {
      throw new TypeError('params must be an object');
    }
    if (typeof params.address !== 'string' || params.address.trim().length === 0) {
      throw new TypeError('address must be a non-empty string');
    }

    return { address: params.address.trim() };
  };

  const resolveSpendableUtxos = async (params: { address: string }): Promise<AddressSpendableUtxo[]> => {
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

    return utxos.map((utxo) => {
      let asset_id = utxo.asset;
      if (!asset_id) {
        const tx = transactionMap.get(utxo.txid);
        const txOutput = tx && tx.vout ? tx.vout[utxo.vout] : undefined;
        asset_id = txOutput && txOutput.asset;
      }

      if (!asset_id) {
        throw new Error(`Asset id not found for Liquid UTXO ${utxo.txid}:${utxo.vout}`);
      }

      return {
        ...utxo,
        asset_id,
      };
    });
  };

  const groupSpendableAssets = (utxos: AddressSpendableUtxo[]) => {
    const grouped = new Map<string, {
      asset_id: string;
      value: number;
      utxo_count: number;
      utxos: AddressSpendableUtxo[];
    }>();

    utxos.forEach((utxo) => {
      const currentAsset = grouped.get(utxo.asset_id);

      if (currentAsset) {
        currentAsset.value += utxo.value;
        currentAsset.utxo_count += 1;
        currentAsset.utxos.push(utxo);
        return;
      }

      grouped.set(utxo.asset_id, {
        asset_id: utxo.asset_id,
        value: utxo.value,
        utxo_count: 1,
        utxos: [utxo],
      });
    });

    return Array.from(grouped.values()).sort((a, b) => b.value - a.value);
  };

  const getAddress = async (params: { address: string }) => {
    const { address } = normalizeAddressParams(params);
    const { data } = await api.get<Address>(`/address/${address}`);
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
    const { address } = normalizeAddressParams(params);
    const { data } = await api.get<AddressTxsUtxo[]>(
      `/address/${address}/utxo`
    );
    return data;
  };

  const getAddressAssetBalances = async (params: { address: string }) => {
    const spendableUtxos = await resolveSpendableUtxos(params);

    if (spendableUtxos.length === 0) {
      return [];
    }

    return groupSpendableAssets(spendableUtxos).map(({ asset_id, value, utxo_count }) => ({
      asset_id,
      value,
      utxo_count,
    }));
  };

  const getAddressAssets = async (params: { address: string }): Promise<AddressAsset[]> => {
    const balances = await getAddressAssetBalances(params);

    if (balances.length === 0) {
      return [];
    }

    const assetRecords = await assets.getAssets({
      asset_ids: balances.map(({ asset_id }) => asset_id),
    });
    const assetMap = new Map(assetRecords.map((asset) => [asset.asset_id, asset] as const));

    return balances.map((balance) => {
      const asset = assetMap.get(balance.asset_id);
      if (!asset) {
        throw new Error(`Asset details not found for Liquid asset ${balance.asset_id}`);
      }

      return {
        ...balance,
        asset,
      };
    });
  };

  const getSpendableAssets = async (params: { address: string }): Promise<AddressSpendableAsset[]> => {
    const spendableUtxos = await resolveSpendableUtxos(params);

    if (spendableUtxos.length === 0) {
      return [];
    }

    const groupedAssets = groupSpendableAssets(spendableUtxos);
    const assetRecords = await assets.getAssets({
      asset_ids: groupedAssets.map(({ asset_id }) => asset_id),
    });
    const assetMap = new Map(assetRecords.map((asset) => [asset.asset_id, asset] as const));

    return groupedAssets.map((groupedAsset) => {
      const asset = assetMap.get(groupedAsset.asset_id);
      if (!asset) {
        throw new Error(`Asset details not found for Liquid asset ${groupedAsset.asset_id}`);
      }

      return {
        ...groupedAsset,
        asset,
      };
    });
  };

  return {
    getAddress,
    getAddressTxs,
    getAddressTxsChain,
    getAddressTxsMempool,
    getAddressTxsUtxo,
    getAddressAssetBalances,
    getAddressAssets,
    getSpendableAssets,
  };
};
