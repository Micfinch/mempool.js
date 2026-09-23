import { Asset } from './assets';
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
  asset?: string;
}

export interface AddressParams {
  address: string;
}

export interface AddressAssetBalance {
  asset_id: string;
  value: number;
  utxo_count: number;
}

export interface AddressAsset extends AddressAssetBalance {
  asset: Asset;
}

export interface AddressSpendableUtxo extends AddressTxsUtxo {
  asset_id: string;
}

export interface AddressSpendableAsset extends AddressAsset {
  utxos: AddressSpendableUtxo[];
}

export type AddressParam = AddressParams | string;

export interface AddressLiquidInstance {
  getAddress: (params: AddressParam) => Promise<Address>;
  getAddressTxs: (params: { address: string, after_txid?: string }) => Promise<Tx[]>;
  getAddressTxsChain: (params: { address: string }) => Promise<Tx[]>;
  getAddressTxsMempool: (params: { address: string }) => Promise<Tx[]>;
  getAddressTxsUtxo: (params: AddressParam) => Promise<AddressTxsUtxo[]>;
  getAddressAssetBalances: (params: AddressParam) => Promise<AddressAssetBalance[]>;
  getAddressAssets: (params: AddressParam) => Promise<AddressAsset[]>;
  getSpendableAssets: (params: AddressParam) => Promise<AddressSpendableAsset[]>;
}
