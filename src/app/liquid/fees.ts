import { AxiosInstance } from 'axios';
import {
  FeesRecommended,
  FeesMempoolBlocks,
  FeeInstance,
} from '../../interfaces/bitcoin/fees';
import { normalizeTxId } from '../../services/normalize';

export const useFees = (api: AxiosInstance): FeeInstance => {
  const getFeesRecommended = async () => {
    const { data } = await api.get<FeesRecommended>(`/v1/fees/recommended`);
    return data;
  };

  const getFeesMempoolBlocks = async () => {
    const { data } = await api.get<FeesMempoolBlocks[]>(
      `/v1/fees/mempool-blocks`
    );
    return data;
  };

  const getCPFP = async (params: { txid: string }) => {
    const txid = normalizeTxId(params.txid);
    const { data } = await api.get<FeesMempoolBlocks[]>(
      `/v1/cpfp/${txid}`
    );
    return data;
  };

  return {
    getFeesRecommended,
    getFeesMempoolBlocks,
    getCPFP,
  };
};
