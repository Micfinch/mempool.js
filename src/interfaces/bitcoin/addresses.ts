import { Tx, TxStatus } from './transactions';

export interface Address {
  address: string;
  chain_stats: StatsInfo;
  mempool_stats: StatsInfo;
}

export interface StatsInfo {
  funded_txo_count: number;
  funded_txo_sum: number;
  spent_txo_count: number;
  spent_txo_sum: number;
  tx_count: number;
}

export interface AddressTxsUtxo {
  txid: string;
  vout: number;
  status: TxStatus;
  value: number;
}

export interface AddressParams {
  address: string;
}

export interface AddressBalance {
  address: string;
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export type AddressParam = AddressParams | string;

export interface AddressInstance {
  getAddress: (params: AddressParam) => Promise<Address>;
  getAddressTxs: (params: { address: string, after_txid?: string }) => Promise<Tx[]>;
  getAddressTxsChain: (params: { address: string }) => Promise<Tx[]>;
  getAddressTxsMempool: (params: { address: string }) => Promise<Tx[]>;
  getAddressTxsUtxo: (params: AddressParam) => Promise<AddressTxsUtxo[]>;
  getAddressBalance: (params: AddressParam) => Promise<AddressBalance>;
}
