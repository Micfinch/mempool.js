import { AxiosInstance } from 'axios';
import {
  Mempool,
  MempoolRecent,
  MempoolInstance,
} from '../../interfaces/bitcoin/mempool';
import { FeesMempoolBlocks } from '../../interfaces/bitcoin/fees';

export const useMempool = (api: AxiosInstance): MempoolInstance => {
  const getMempool = async () => {
    const { data } = await api.get<Mempool>(`/mempool`);
    return data;
  };

  const getMempoolBlocks = async () => {
    const { data } = await api.get<FeesMempoolBlocks[]>(`/v1/fees/mempool-blocks`);
    return data;
  };

  const getMempoolTxids = async () => {
    const { data } = await api.get<string[]>(`/mempool/txids`);
    return data;
  };

  const getMempoolRecent = async () => {
    const { data } = await api.get<MempoolRecent[]>(`/mempool/recent`);
    return data;
  };

  return {
    getMempool,
    getMempoolBlocks,
    getMempoolTxids,
    getMempoolRecent,
  };
};
