import { AxiosInstance } from 'axios';
import {
  Address,
  AddressBalance,
  AddressParam,
  AddressParams,
  AddressTxsUtxo,
  AddressInstance,
} from '../../interfaces/bitcoin/addresses';
import { Tx } from '../../interfaces/bitcoin/transactions';

export const useAddresses = (api: AxiosInstance): AddressInstance => {
  const normalizeAddressParam = (params: AddressParam): AddressParams => {
    if (typeof params === 'string') {
      const address = params.trim();
      if (address.length === 0) {
        throw new TypeError('address must be a non-empty string');
      }
      return { address };
    }

    if (typeof params !== 'object' || params === null) {
      throw new TypeError('params must be a string or an object');
    }

    if (typeof params.address !== 'string' || params.address.trim().length === 0) {
      throw new TypeError('address must be a non-empty string');
    }

    return { address: params.address.trim() };
  };

  const fetchAddress = async ({ address }: AddressParams) => {
    const { data } = await api.get<Address>(`/address/${address}`);
    return data;
  };

  const getAddress = async (params: AddressParam) => {
    const normalizedParams = normalizeAddressParam(params);
    return fetchAddress(normalizedParams);
  };

  const getAddressTxs = async (params: AddressParam | { address: string, after_txid?: string }) => {
    const { address } = normalizeAddressParam(params);
    if (typeof params === 'object' && params !== null && params.after_txid) {
      const { data } = await api.get<Tx[]>(`/address/${address}/txs?after_txid=${params.after_txid}`);
      return data;
    }
    const { data } = await api.get<Tx[]>(`/address/${address}/txs`);
    return data;
  };

  const getAddressTxsChain = async (params: AddressParam) => {
    const { address } = normalizeAddressParam(params);
    const { data } = await api.get<Tx[]>(
      `/address/${address}/txs/chain`
    );
    return data;
  };

  const getAddressTxsMempool = async (params: AddressParam) => {
    const { address } = normalizeAddressParam(params);
    const { data } = await api.get<Tx[]>(
      `/address/${address}/txs/mempool`
    );
    return data;
  };

  const getAddressTxsUtxo = async (params: AddressParam) => {
    const { address } = normalizeAddressParam(params);
    const { data } = await api.get<AddressTxsUtxo[]>(
      `/address/${address}/utxo`
    );
    return data;
  };

  const getAddressBalance = async (params: AddressParam): Promise<AddressBalance> => {
    const { address } = normalizeAddressParam(params);
    const addressInfo = await fetchAddress({ address });
    const confirmed = addressInfo.chain_stats.funded_txo_sum - addressInfo.chain_stats.spent_txo_sum;
    const unconfirmed = addressInfo.mempool_stats.funded_txo_sum - addressInfo.mempool_stats.spent_txo_sum;

    return {
      address,
      confirmed,
      unconfirmed,
      total: confirmed + unconfirmed,
    };
  };

  return {
    getAddress,
    getAddressTxs,
    getAddressTxsChain,
    getAddressTxsMempool,
    getAddressTxsUtxo,
    getAddressBalance,
  };
};
